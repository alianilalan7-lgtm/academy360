import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uuidLikeSchema } from '@/lib/validation'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import type { ApiResponse, Program } from '@/lib/types'

import type { Json } from '@/lib/types/database'

// JSON value schema for content_data - accepts any valid JSON
const jsonValueSchema = z.any().refine(
  (val): val is Json => {
    if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return true
    }
    if (Array.isArray(val)) {
      return true // Allow nested arrays
    }
    if (typeof val === 'object') {
      return true // Allow nested objects
    }
    return false
  },
  { message: 'Invalid JSON value' }
)

// Validation schemas
const programUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  difficulty_level: z.number().int().min(1).max(10).optional().nullable(),
  estimated_duration_minutes: z.number().int().positive().optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  content_data: jsonValueSchema.optional().nullable(),
  is_active: z.boolean().optional(),
  is_public: z.boolean().optional(),
  source: z.string().optional().nullable(),
  external_id: z.string().optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/programs/[id]
 * Get a single program by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID
    if (!uuidLikeSchema().safeParse(id).success) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Invalid program ID format',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Fetch program with related data
    const { data: program, error } = await supabase
      .from('programs')
      .select(`
        *,
        organization:organizations(id, name, slug)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Program not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }
      console.error('Error fetching program:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to fetch program',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    // Check access: user can see their org's programs or public programs
    const canAccess =
      program.is_public ||
      program.organization_id === user.currentOrganizationId ||
      isAdmin(user)

    if (!canAccess) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You do not have access to this program',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    const response: ApiResponse<typeof program> = {
      data: program,
      error: null,
      success: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Program GET error:', error)

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
 * PATCH /api/programs/[id]
 * Update a program
 * Only coaches and admins can update programs
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Only coaches and admins can update programs
    if (!isAdmin(user) && !isCoach(user)) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: Only coaches and admins can update programs',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    // Validate UUID
    if (!uuidLikeSchema().safeParse(id).success) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Invalid program ID format',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Check if program exists and user has access
    const { data: existingProgram, error: fetchError } = await supabase
      .from('programs')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Program not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }
      throw fetchError
    }

    // Non-admins can only update programs in their organization
    if (!isAdmin(user) && existingProgram.organization_id !== user.currentOrganizationId) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You can only update programs in your organization',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validationResult = programUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    const updateData = {
      ...validationResult.data,
      updated_at: new Date().toISOString(),
    }

    // Update the program
    const { data: program, error } = await supabase
      .from('programs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating program:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to update program',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: ApiResponse<Program> = {
      data: program,
      error: null,
      success: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Program PATCH error:', error)

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
 * DELETE /api/programs/[id]
 * Delete a program (soft delete by setting is_active to false)
 * Only coaches and admins can delete programs
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Only coaches and admins can delete programs
    if (!isAdmin(user) && !isCoach(user)) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: Only coaches and admins can delete programs',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    // Validate UUID
    if (!uuidLikeSchema().safeParse(id).success) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Invalid program ID format',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Check if program exists and user has access
    const { data: existingProgram, error: fetchError } = await supabase
      .from('programs')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Program not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }
      throw fetchError
    }

    // Non-admins can only delete programs in their organization
    if (!isAdmin(user) && existingProgram.organization_id !== user.currentOrganizationId) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You can only delete programs in your organization',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    // Check if program has active assignments
    const { count: activeAssignments } = await supabase
      .from('assigned_programs')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', id)
      .in('status', ['assigned', 'in_progress'])

    if (activeAssignments && activeAssignments > 0) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Cannot delete program with active assignments. Please complete or cancel assignments first.',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Soft delete: set is_active to false
    const { error } = await supabase
      .from('programs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting program:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to delete program',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: ApiResponse<{ message: string }> = {
      data: { message: 'Program deleted successfully' },
      error: null,
      success: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Program DELETE error:', error)

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
