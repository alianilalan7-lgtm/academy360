import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uuidLikeSchema } from '@/lib/validation'
import type { SessionInsert, ApiResponse, Session, SessionWithAttendance } from '@/lib/types'

// Session types and statuses
const SESSION_TYPES = ['training', 'match', 'assessment', 'other'] as const
const SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const

// Validation schema for creating a session
const createSessionSchema = z.object({
  organizationId: uuidLikeSchema('Invalid organization ID'),
  groupId: uuidLikeSchema('Invalid group ID').optional().nullable(),
  coachId: uuidLikeSchema('Invalid coach ID').optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().nullable(),
  sessionType: z.enum(SESSION_TYPES).default('training'),
  status: z.enum(SESSION_STATUSES).default('scheduled'),
  scheduledStart: z.string().datetime('Invalid scheduled start datetime'),
  scheduledEnd: z.string().datetime('Invalid scheduled end datetime').optional().nullable(),
  location: z.string().max(500, 'Location must be less than 500 characters').optional().nullable(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
})

// Query params schema for filtering sessions
const queryParamsSchema = z.object({
  organizationId: uuidLikeSchema().optional(),
  groupId: uuidLikeSchema().optional(),
  coachId: uuidLikeSchema().optional(),
  sessionType: z.enum(SESSION_TYPES).optional(),
  status: z.enum(SESSION_STATUSES).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeAttendance: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['scheduled_start', 'created_at', 'title']).default('scheduled_start'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

function optionalParam(value: string | null): string | undefined {
  return value ?? undefined
}

/**
 * GET /api/sessions
 * List sessions with filtering, pagination, and optional attendance data
 * Access: Coaches, Club Admins, Super Admins, and Athletes (their own sessions)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Session[] | SessionWithAttendance[]> & { total?: number; page?: number; pageSize?: number; totalPages?: number }>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryResult = queryParamsSchema.safeParse({
      organizationId: optionalParam(searchParams.get('organizationId')),
      groupId: optionalParam(searchParams.get('groupId')),
      coachId: optionalParam(searchParams.get('coachId')),
      sessionType: optionalParam(searchParams.get('sessionType')),
      status: optionalParam(searchParams.get('status')),
      startDate: optionalParam(searchParams.get('startDate')),
      endDate: optionalParam(searchParams.get('endDate')),
      includeAttendance: searchParams.get('includeAttendance') ?? 'false',
      page: searchParams.get('page') ?? 1,
      pageSize: searchParams.get('pageSize') ?? 20,
      sortBy: searchParams.get('sortBy') ?? 'scheduled_start',
      sortOrder: searchParams.get('sortOrder') ?? 'asc',
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: `Invalid query parameters: ${queryResult.error.message}`, data: null },
        { status: 400 }
      )
    }

    const {
      organizationId,
      groupId,
      coachId,
      sessionType,
      status,
      startDate,
      endDate,
      includeAttendance,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = queryResult.data

    // Use the user's current organization if none specified
    const effectiveOrgId = organizationId ?? user.currentOrganizationId

    if (!effectiveOrgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required', data: null },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === effectiveOrgId && m.status === 'active'
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: not a member of this organization', data: null },
        { status: 403 }
      )
    }

    // Build the select query based on whether attendance is included
    const selectQuery = includeAttendance === 'true'
      ? `
        *,
        group:groups(id, name, age_group),
        coach:user_profiles!sessions_coach_id_fkey(id, full_name, avatar_url),
        attendance(
          id,
          athlete_id,
          status,
          check_in_time,
          check_out_time,
          notes,
          athlete:athlete_profiles!attendance_athlete_id_fkey(
            id,
            user_id,
            jersey_number,
            position,
            user_profile:user_profiles!athlete_profiles_user_id_fkey(id, full_name, avatar_url)
          )
        )
      `
      : `
        *,
        group:groups(id, name, age_group),
        coach:user_profiles!sessions_coach_id_fkey(id, full_name, avatar_url)
      `

    // Build the query
    let query = supabase
      .from('sessions')
      .select(selectQuery, { count: 'exact' })
      .eq('organization_id', effectiveOrgId)

    // Apply filters
    if (groupId) {
      query = query.eq('group_id', groupId)
    }

    if (coachId) {
      query = query.eq('coach_id', coachId)
    }

    if (sessionType) {
      query = query.eq('session_type', sessionType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('scheduled_start', startDate)
    }

    if (endDate) {
      query = query.lte('scheduled_start', endDate)
    }

    // For athletes, only show sessions for their groups
    const isStaff = isAdmin(user) || isCoach(user)
    if (!isStaff) {
      // Get groups the athlete belongs to
      const { data: athleteGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (athleteGroups && athleteGroups.length > 0) {
        const groupIds = athleteGroups.map(g => g.group_id)
        query = query.in('group_id', groupIds)
      } else {
        // Athlete is not in any groups, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          error: null,
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        })
      }
    }

    // Apply sorting and pagination
    const offset = (page - 1) * pageSize
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sessions', data: null },
        { status: 500 }
      )
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: data as any,
      error: null,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/sessions error:', error)

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', data: null },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { success: false, error: error.message, data: null },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sessions
 * Create a new session
 * Access: Coaches, Club Admins, Super Admins
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Session>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()

    // Verify user has appropriate role to create sessions
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: only coaches and admins can create sessions', data: null },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createSessionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${validationResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          data: null
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Verify the user has access to the specified organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === validatedData.organizationId && m.status === 'active'
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: not a member of this organization', data: null },
        { status: 403 }
      )
    }

    // Validate that scheduled_end is after scheduled_start if provided
    if (validatedData.scheduledEnd) {
      const start = new Date(validatedData.scheduledStart)
      const end = new Date(validatedData.scheduledEnd)
      if (end <= start) {
        return NextResponse.json(
          { success: false, error: 'Scheduled end must be after scheduled start', data: null },
          { status: 400 }
        )
      }
    }

    // If groupId is provided, verify it belongs to the organization
    if (validatedData.groupId) {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, organization_id')
        .eq('id', validatedData.groupId)
        .eq('organization_id', validatedData.organizationId)
        .single()

      if (groupError || !group) {
        return NextResponse.json(
          { success: false, error: 'Group not found or does not belong to this organization', data: null },
          { status: 400 }
        )
      }
    }

    // If coachId is provided, verify they are a coach in the organization
    if (validatedData.coachId) {
      const { data: coachMembership, error: coachError } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', validatedData.coachId)
        .eq('organization_id', validatedData.organizationId)
        .eq('role', 'coach')
        .eq('status', 'active')
        .single()

      if (coachError || !coachMembership) {
        return NextResponse.json(
          { success: false, error: 'Coach not found or is not an active coach in this organization', data: null },
          { status: 400 }
        )
      }
    }

    // Create the session
    const insertData: SessionInsert = {
      organization_id: validatedData.organizationId,
      group_id: validatedData.groupId ?? null,
      coach_id: validatedData.coachId ?? user.id, // Default to current user if they're a coach
      title: validatedData.title,
      description: validatedData.description ?? null,
      session_type: validatedData.sessionType,
      status: validatedData.status,
      scheduled_start: validatedData.scheduledStart,
      scheduled_end: validatedData.scheduledEnd ?? null,
      location: validatedData.location ?? null,
      notes: validatedData.notes ?? null,
    }

    const { data: newSession, error: insertError } = await supabase
      .from('sessions')
      .insert(insertData)
      .select(`
        *,
        group:groups(id, name, age_group),
        coach:user_profiles!sessions_coach_id_fkey(id, full_name, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error('Error creating session:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create session', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: newSession as Session, error: null },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/sessions error:', error)

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', data: null },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { success: false, error: error.message, data: null },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    )
  }
}
