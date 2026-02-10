import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uuidLikeSchema } from '@/lib/validation'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach, isAthlete } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, AssignedProgram } from '@/lib/types'

// Validation schemas
const assignmentCreateSchema = z.object({
  program_id: uuidLikeSchema('Invalid program ID'),
  athlete_ids: z.array(uuidLikeSchema()).min(1, 'At least one athlete is required'),
  group_id: uuidLikeSchema().optional().nullable(),
  start_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

const assignmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  program_id: uuidLikeSchema().optional(),
  athlete_id: uuidLikeSchema().optional(),
  group_id: uuidLikeSchema().optional(),
  status: z.enum(['assigned', 'in_progress', 'completed', 'cancelled']).optional(),
  assigned_by: uuidLikeSchema().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'due_date', 'start_date', 'status', 'progress_percentage']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

/**
 * GET /api/assignments
 * List assignments with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validationResult = assignmentQuerySchema.safeParse(queryParams)
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
      program_id,
      athlete_id,
      group_id,
      status,
      assigned_by,
      from_date,
      to_date,
      sort_by,
      sort_order,
    } = validationResult.data

    // Build query with relations
    let query = supabase
      .from('assigned_programs')
      .select(`
        *,
        program:programs(id, title, category, difficulty_level, thumbnail_url),
        athlete:athlete_profiles(
          id,
          user_id,
          organization_id,
          user_profile:user_profiles(id, full_name, email, avatar_url)
        ),
        assigned_by_user:user_profiles!assigned_programs_assigned_by_fkey(id, full_name, email),
        group:groups(id, name)
      `, { count: 'exact' })

    // Athletes can only see their own assignments
    if (isAthlete(user) && !isCoach(user) && !isAdmin(user)) {
      // Get athlete profile ID for this user
      const { data: athleteProfile } = await supabase
        .from('athlete_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (athleteProfile) {
        query = query.eq('athlete_id', athleteProfile.id)
      } else {
        // No athlete profile, return empty result
        const response: PaginatedResponse<AssignedProgram> = {
          data: [],
          error: null,
          success: true,
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        }
        return NextResponse.json(response)
      }
    } else if (isCoach(user) && !isAdmin(user)) {
      // Coaches can see assignments for athletes in their organization
      if (user.currentOrganizationId) {
        query = query.eq('athlete.organization_id', user.currentOrganizationId)
      }
    }
    // Admins can see all assignments in their organization

    // Apply filters
    if (program_id) {
      query = query.eq('program_id', program_id)
    }

    if (athlete_id) {
      query = query.eq('athlete_id', athlete_id)
    }

    if (group_id) {
      query = query.eq('group_id', group_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (assigned_by) {
      query = query.eq('assigned_by', assigned_by)
    }

    if (from_date) {
      query = query.gte('created_at', from_date)
    }

    if (to_date) {
      query = query.lte('created_at', to_date)
    }

    // Sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: assignments, error, count } = await query

    if (error) {
      console.error('Error fetching assignments:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to fetch assignments',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: PaginatedResponse<typeof assignments[0]> = {
      data: assignments,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Assignments GET error:', error)

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
 * POST /api/assignments
 * Assign a program to one or more athletes
 * Only coaches and admins can create assignments
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Only coaches and admins can create assignments
    if (!isAdmin(user) && !isCoach(user)) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: Only coaches and admins can create assignments',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    const supabase = await createServiceClient()
    const body = await request.json()

    // Validate request body
    const validationResult = assignmentCreateSchema.safeParse(body)
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    const { program_id, athlete_ids, group_id, start_date, due_date, notes } = validationResult.data

    // Verify program exists and is active
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, organization_id, is_active')
      .eq('id', program_id)
      .single()

    if (programError || !program) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Program not found',
        success: false,
      }
      return NextResponse.json(response, { status: 404 })
    }

    if (!program.is_active) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Cannot assign inactive program',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Verify all athletes exist and belong to user's organization
    const { data: athletes, error: athletesError } = await supabase
      .from('athlete_profiles')
      .select('id, organization_id')
      .in('id', athlete_ids)

    if (athletesError) {
      console.error('Error fetching athletes:', athletesError)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to verify athletes',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    if (!athletes || athletes.length !== athlete_ids.length) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'One or more athletes not found',
        success: false,
      }
      return NextResponse.json(response, { status: 404 })
    }

    // Non-admins can only assign to athletes in their organization
    if (!isAdmin(user)) {
      const invalidAthletes = athletes.filter(a => a.organization_id !== user.currentOrganizationId)
      if (invalidAthletes.length > 0) {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Forbidden: You can only assign programs to athletes in your organization',
          success: false,
        }
        return NextResponse.json(response, { status: 403 })
      }
    }

    // Check for existing active assignments (prevent duplicates)
    const { data: existingAssignments } = await supabase
      .from('assigned_programs')
      .select('athlete_id')
      .eq('program_id', program_id)
      .in('athlete_id', athlete_ids)
      .in('status', ['assigned', 'in_progress'])

    if (existingAssignments && existingAssignments.length > 0) {
      const duplicateIds = existingAssignments.map(a => a.athlete_id)
      const response: ApiResponse<null> = {
        data: null,
        error: `Some athletes already have active assignments for this program: ${duplicateIds.join(', ')}`,
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Create assignments for all athletes
    const now = new Date().toISOString()
    const assignmentsToCreate = athlete_ids.map(athleteId => ({
      program_id,
      athlete_id: athleteId,
      group_id: group_id ?? null,
      assigned_by: user.id,
      start_date: start_date ?? now,
      due_date: due_date ?? null,
      notes: notes ?? null,
      status: 'assigned' as const,
      progress_percentage: 0,
      created_at: now,
      updated_at: now,
    }))

    const { data: assignments, error: createError } = await supabase
      .from('assigned_programs')
      .insert(assignmentsToCreate)
      .select(`
        *,
        program:programs(id, title, category),
        athlete:athlete_profiles(
          id,
          user_profile:user_profiles(id, full_name, email)
        )
      `)

    if (createError) {
      console.error('Error creating assignments:', createError)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to create assignments',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: ApiResponse<typeof assignments> = {
      data: assignments,
      error: null,
      success: true,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Assignments POST error:', error)

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
