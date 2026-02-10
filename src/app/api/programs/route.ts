import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uuidLikeSchema } from '@/lib/validation'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, Program } from '@/lib/types'
import type { Json } from '@/lib/types/database'

// JSON value schema for content_data - accepts any valid JSON
const jsonValueSchema = z.any().refine(
  (val): val is Json => {
    if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return true
    }
    if (Array.isArray(val)) {
      return val.every((item) => jsonValueSchema.safeParse(item).success)
    }
    if (typeof val === 'object') {
      return Object.values(val).every((item) => jsonValueSchema.safeParse(item).success)
    }
    return false
  },
  { message: 'Invalid JSON value' }
)

// Validation schemas
const programCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  difficulty_level: z.number().int().min(1).max(10).optional().nullable(),
  estimated_duration_minutes: z.number().int().positive().optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  content_data: jsonValueSchema.optional().nullable(),
  is_active: z.boolean().optional().default(true),
  is_public: z.boolean().optional().default(false),
  organization_id: uuidLikeSchema().optional().nullable(),
  source: z.string().optional().nullable(),
  external_id: z.string().optional().nullable(),
})

const programQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  category: z.string().optional(),
  difficulty: z.coerce.number().int().min(1).max(10).optional(),
  organization_id: uuidLikeSchema().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  is_public: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  sort_by: z.enum(['title', 'created_at', 'difficulty_level', 'category']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

/**
 * GET /api/programs
 * List programs with filtering, searching, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validationResult = programQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    const {
      page,
      pageSize,
      category,
      difficulty,
      organization_id,
      is_active,
      is_public,
      search,
      tags,
      sort_by,
      sort_order,
    } = validationResult.data

    // Build query
    let query = supabase
      .from('programs')
      .select('*', { count: 'exact' })

    // Filter by organization - users can see their org's programs plus public programs
    if (organization_id) {
      query = query.eq('organization_id', organization_id)
    } else if (user.currentOrganizationId) {
      // Show org programs + public programs
      query = query.or(`organization_id.eq.${user.currentOrganizationId},is_public.eq.true`)
    } else {
      // Only show public programs if user has no org
      query = query.eq('is_public', true)
    }

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (difficulty) {
      query = query.eq('difficulty_level', difficulty)
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (is_public !== undefined) {
      query = query.eq('is_public', is_public === 'true')
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim())
      query = query.overlaps('tags', tagArray)
    }

    // Sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: programs, error, count } = await query

    if (error) {
      console.error('Error fetching programs:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to fetch programs',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: PaginatedResponse<Program> = {
      data: programs,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Programs GET error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Unauthorized',
        success: false,
      }
      return NextResponse.json(response, { status: 401 })
    }

    const response: ApiResponse<null> = {
      data: null,
      error: 'Internal server error',
      success: false,
    }
    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * POST /api/programs
 * Create a new program
 * Only coaches and admins can create programs
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Only coaches and admins can create programs
    if (!isAdmin(user) && !isCoach(user)) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: Only coaches and admins can create programs',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    const supabase = await createServiceClient()
    const body = await request.json()

    // Validate request body
    const validationResult = programCreateSchema.safeParse(body)
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    const programData = validationResult.data

    // Set organization_id if not provided
    if (!programData.organization_id && user.currentOrganizationId) {
      programData.organization_id = user.currentOrganizationId
    }

    // Non-admins can only create programs for their own organization
    if (!isAdmin(user) && programData.organization_id !== user.currentOrganizationId) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You can only create programs for your organization',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    // Create the program
    const { data: program, error } = await supabase
      .from('programs')
      .insert({
        ...programData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating program:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to create program',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: ApiResponse<Program> = {
      data: program,
      error: null,
      success: true,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Programs POST error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Unauthorized',
        success: false,
      }
      return NextResponse.json(response, { status: 401 })
    }

    const response: ApiResponse<null> = {
      data: null,
      error: 'Internal server error',
      success: false,
    }
    return NextResponse.json(response, { status: 500 })
  }
}
