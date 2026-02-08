import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, Attendance, AttendanceInsert } from '@/lib/types'

// Attendance status values
const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const

// Validation schema for bulk attendance recording
const bulkAttendanceSchema = z.object({
  attendees: z.array(z.object({
    athleteId: z.string().uuid('Invalid athlete ID'),
    status: z.enum(ATTENDANCE_STATUSES),
    notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
    checkInTime: z.string().datetime().optional(),
    checkOutTime: z.string().datetime().optional(),
  })).min(1, 'At least one attendee is required').max(100, 'Maximum 100 attendees per request'),
})

// Query params schema for filtering attendance
const queryParamsSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

// Extended attendance type with athlete info
interface AttendanceWithAthlete extends Attendance {
  athlete: {
    id: string
    user_id: string
    jersey_number: number | null
    position: string | null
    user_profile: {
      id: string
      full_name: string | null
      avatar_url: string | null
      email: string
    }
  }
  recorded_by_user?: {
    id: string
    full_name: string | null
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/sessions/[id]/attendance
 * List attendance records for a session
 * Access: Coaches, Club Admins, Super Admins, or Athletes in the session's group
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AttendanceWithAthlete[]> & { total?: number; page?: number; pageSize?: number; totalPages?: number }>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id: sessionId } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(sessionId)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format', data: null },
        { status: 400 }
      )
    }

    // Verify session exists and get organization info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id, group_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found', data: null },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = await checkAttendanceAccess(user, session, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this session\'s attendance', data: null },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryResult = queryParamsSchema.safeParse({
      status: searchParams.get('status'),
      page: searchParams.get('page') ?? 1,
      pageSize: searchParams.get('pageSize') ?? 50,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: `Invalid query parameters: ${queryResult.error.message}`, data: null },
        { status: 400 }
      )
    }

    const { status, page, pageSize } = queryResult.data

    // Build the query
    let query = supabase
      .from('attendance')
      .select(`
        *,
        athlete:athlete_profiles!attendance_athlete_id_fkey(
          id,
          user_id,
          jersey_number,
          position,
          user_profile:user_profiles!athlete_profiles_user_id_fkey(id, full_name, avatar_url, email)
        ),
        recorded_by_user:user_profiles!attendance_recorded_by_fkey(id, full_name)
      `, { count: 'exact' })
      .eq('session_id', sessionId)

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    const offset = (page - 1) * pageSize
    query = query
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching attendance:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attendance records', data: null },
        { status: 500 }
      )
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: data as AttendanceWithAthlete[],
      error: null,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/sessions/[id]/attendance error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sessions/[id]/attendance
 * Record attendance for multiple athletes in bulk
 * Access: Coaches, Club Admins, Super Admins
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ created: number; updated: number; records: AttendanceWithAthlete[] }>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id: sessionId } = await params

    // Verify user has appropriate role to record attendance
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: only coaches and admins can record attendance', data: null },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(sessionId)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format', data: null },
        { status: 400 }
      )
    }

    // Verify session exists and get organization info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id, group_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found', data: null },
        { status: 404 }
      )
    }

    // Verify user has access to this organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === session.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin', 'coach'].includes(m.role)
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: not authorized to record attendance for this session', data: null },
        { status: 403 }
      )
    }

    // Warn if session is cancelled
    if (session.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot record attendance for a cancelled session', data: null },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = bulkAttendanceSchema.safeParse(body)

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

    const { attendees } = validationResult.data

    // Get all athlete IDs to validate
    const athleteIds = attendees.map(a => a.athleteId)

    // Verify all athletes exist and belong to the organization
    const { data: validAthletes, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id')
      .eq('organization_id', session.organization_id)
      .in('id', athleteIds)

    if (athleteError) {
      console.error('Error validating athletes:', athleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to validate athletes', data: null },
        { status: 500 }
      )
    }

    const validAthleteIds = new Set(validAthletes?.map(a => a.id) ?? [])
    const invalidAthletes = athleteIds.filter(id => !validAthleteIds.has(id))

    if (invalidAthletes.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid athlete IDs: ${invalidAthletes.join(', ')}`, data: null },
        { status: 400 }
      )
    }

    // Check for existing attendance records
    const { data: existingRecords } = await supabase
      .from('attendance')
      .select('id, athlete_id')
      .eq('session_id', sessionId)
      .in('athlete_id', athleteIds)

    const existingByAthlete = new Map(existingRecords?.map(r => [r.athlete_id, r.id]) ?? [])

    // Separate new records from updates
    const toCreate: AttendanceInsert[] = []
    const toUpdate: { id: string; data: Partial<AttendanceInsert> }[] = []

    for (const attendee of attendees) {
      const existingId = existingByAthlete.get(attendee.athleteId)

      const recordData = {
        status: attendee.status,
        notes: attendee.notes ?? null,
        check_in_time: attendee.checkInTime ?? (attendee.status === 'present' || attendee.status === 'late' ? new Date().toISOString() : null),
        check_out_time: attendee.checkOutTime ?? null,
        recorded_by: user.id,
        updated_at: new Date().toISOString(),
      }

      if (existingId) {
        toUpdate.push({ id: existingId, data: recordData })
      } else {
        toCreate.push({
          session_id: sessionId,
          athlete_id: attendee.athleteId,
          ...recordData,
        })
      }
    }

    // Perform creates
    let createdRecords: Attendance[] = []
    if (toCreate.length > 0) {
      const { data: created, error: createError } = await supabase
        .from('attendance')
        .insert(toCreate)
        .select()

      if (createError) {
        console.error('Error creating attendance records:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create attendance records', data: null },
          { status: 500 }
        )
      }

      createdRecords = created ?? []
    }

    // Perform updates
    let updatedRecords: Attendance[] = []
    if (toUpdate.length > 0) {
      // Supabase doesn't support bulk updates with different values, so we do them individually
      // For better performance in production, consider using a stored procedure
      const updatePromises = toUpdate.map(async ({ id, data }) => {
        const { data: updated, error } = await supabase
          .from('attendance')
          .update(data)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error(`Error updating attendance ${id}:`, error)
          return null
        }
        return updated
      })

      const results = await Promise.all(updatePromises)
      updatedRecords = results.filter((r): r is Attendance => r !== null)
    }

    // Fetch the full records with athlete data
    const allRecordIds = [
      ...createdRecords.map(r => r.id),
      ...updatedRecords.map(r => r.id),
    ]

    const { data: fullRecords } = await supabase
      .from('attendance')
      .select(`
        *,
        athlete:athlete_profiles!attendance_athlete_id_fkey(
          id,
          user_id,
          jersey_number,
          position,
          user_profile:user_profiles!athlete_profiles_user_id_fkey(id, full_name, avatar_url, email)
        ),
        recorded_by_user:user_profiles!attendance_recorded_by_fkey(id, full_name)
      `)
      .in('id', allRecordIds)

    return NextResponse.json({
      success: true,
      data: {
        created: createdRecords.length,
        updated: updatedRecords.length,
        records: (fullRecords as AttendanceWithAthlete[]) ?? [],
      },
      error: null,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/sessions/[id]/attendance error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    )
  }
}

/**
 * Helper function to check if user has access to view attendance
 */
async function checkAttendanceAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  session: { organization_id: string; group_id: string | null },
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<boolean> {
  // Admins and coaches in the same org can access all attendance
  const isOrgStaff = user.memberships.some(
    m => m.organization_id === session.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin', 'coach'].includes(m.role)
  )

  if (isOrgStaff) return true

  // Athletes can view attendance for sessions in their groups
  if (session.group_id) {
    const { data: groupMembership } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('group_id', session.group_id)
      .eq('is_active', true)
      .single()

    if (groupMembership) return true
  }

  return false
}
