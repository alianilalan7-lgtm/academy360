import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, Attendance, AttendanceUpdate } from '@/lib/types'

// Attendance status values
const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const

// Validation schema for updating attendance
const updateAttendanceSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().nullable(),
  checkInTime: z.string().datetime('Invalid check-in time').optional().nullable(),
  checkOutTime: z.string().datetime('Invalid check-out time').optional().nullable(),
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
  params: Promise<{ id: string; athleteId: string }>
}

/**
 * GET /api/sessions/[id]/attendance/[athleteId]
 * Get a specific athlete's attendance record for a session
 * Access: Coaches, Club Admins, Super Admins, or the athlete themselves
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AttendanceWithAthlete>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id: sessionId, athleteId } = await params

    // Validate UUID formats
    const uuidSchema = z.string().uuid()
    const sessionIdValidation = uuidSchema.safeParse(sessionId)
    const athleteIdValidation = uuidSchema.safeParse(athleteId)

    if (!sessionIdValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format', data: null },
        { status: 400 }
      )
    }

    if (!athleteIdValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
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
    const canAccess = await checkAttendanceAccess(user, session, athleteId, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this attendance record', data: null },
        { status: 403 }
      )
    }

    // Fetch the attendance record
    const { data: attendance, error: attendanceError } = await supabase
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
      .eq('session_id', sessionId)
      .eq('athlete_id', athleteId)
      .single()

    if (attendanceError || !attendance) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found', data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: attendance as AttendanceWithAthlete,
      error: null,
    })
  } catch (error) {
    console.error('GET /api/sessions/[id]/attendance/[athleteId] error:', error)

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
 * PATCH /api/sessions/[id]/attendance/[athleteId]
 * Update a specific athlete's attendance record
 * Access: Coaches, Club Admins, Super Admins
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AttendanceWithAthlete>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id: sessionId, athleteId } = await params

    // Verify user has appropriate role to update attendance
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: only coaches and admins can update attendance', data: null },
        { status: 403 }
      )
    }

    // Validate UUID formats
    const uuidSchema = z.string().uuid()
    const sessionIdValidation = uuidSchema.safeParse(sessionId)
    const athleteIdValidation = uuidSchema.safeParse(athleteId)

    if (!sessionIdValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format', data: null },
        { status: 400 }
      )
    }

    if (!athleteIdValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
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
        { success: false, error: 'Forbidden: not authorized to update attendance for this session', data: null },
        { status: 403 }
      )
    }

    // Check if session is cancelled
    if (session.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot update attendance for a cancelled session', data: null },
        { status: 400 }
      )
    }

    // Check if attendance record exists
    const { data: existingAttendance, error: fetchError } = await supabase
      .from('attendance')
      .select('id')
      .eq('session_id', sessionId)
      .eq('athlete_id', athleteId)
      .single()

    if (fetchError || !existingAttendance) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found. Use POST to create a new record.', data: null },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateAttendanceSchema.safeParse(body)

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

    // Build update object
    const updateData: AttendanceUpdate = {
      updated_at: new Date().toISOString(),
      recorded_by: user.id,
    }

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status

      // Auto-set check_in_time when status is present or late and not already set
      if ((validatedData.status === 'present' || validatedData.status === 'late') &&
          validatedData.checkInTime === undefined) {
        // We'll set check_in_time only if it wasn't explicitly provided
        // and we're changing to a present/late status
      }
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    if (validatedData.checkInTime !== undefined) {
      updateData.check_in_time = validatedData.checkInTime
    }

    if (validatedData.checkOutTime !== undefined) {
      updateData.check_out_time = validatedData.checkOutTime
    }

    // Validate check_in/check_out time consistency
    if (updateData.check_in_time && updateData.check_out_time) {
      const checkIn = new Date(updateData.check_in_time)
      const checkOut = new Date(updateData.check_out_time)
      if (checkOut <= checkIn) {
        return NextResponse.json(
          { success: false, error: 'Check-out time must be after check-in time', data: null },
          { status: 400 }
        )
      }
    }

    // Check if there's anything meaningful to update
    if (Object.keys(updateData).length <= 2) { // Only updated_at and recorded_by
      return NextResponse.json(
        { success: false, error: 'No valid fields to update', data: null },
        { status: 400 }
      )
    }

    // Perform the update
    const { data: updatedAttendance, error: updateError } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', existingAttendance.id)
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
      .single()

    if (updateError) {
      console.error('Error updating attendance:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update attendance record', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedAttendance as AttendanceWithAthlete,
      error: null,
    })
  } catch (error) {
    console.error('PATCH /api/sessions/[id]/attendance/[athleteId] error:', error)

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
 * DELETE /api/sessions/[id]/attendance/[athleteId]
 * Delete a specific athlete's attendance record
 * Access: Club Admins, Super Admins only
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id: sessionId, athleteId } = await params

    // Only admins can delete attendance records
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: only administrators can delete attendance records', data: null },
        { status: 403 }
      )
    }

    // Validate UUID formats
    const uuidSchema = z.string().uuid()
    const sessionIdValidation = uuidSchema.safeParse(sessionId)
    const athleteIdValidation = uuidSchema.safeParse(athleteId)

    if (!sessionIdValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format', data: null },
        { status: 400 }
      )
    }

    if (!athleteIdValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
        { status: 400 }
      )
    }

    // Verify session exists and get organization info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found', data: null },
        { status: 404 }
      )
    }

    // Verify admin has access to this organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === session.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have admin access to this organization', data: null },
        { status: 403 }
      )
    }

    // Check if attendance record exists
    const { data: existingAttendance, error: fetchError } = await supabase
      .from('attendance')
      .select('id')
      .eq('session_id', sessionId)
      .eq('athlete_id', athleteId)
      .single()

    if (fetchError || !existingAttendance) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found', data: null },
        { status: 404 }
      )
    }

    // Delete the attendance record
    const { error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('id', existingAttendance.id)

    if (deleteError) {
      console.error('Error deleting attendance:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete attendance record', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      error: null,
    })
  } catch (error) {
    console.error('DELETE /api/sessions/[id]/attendance/[athleteId] error:', error)

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
 * Helper function to check if user has access to view an attendance record
 */
async function checkAttendanceAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  session: { organization_id: string; group_id: string | null },
  athleteId: string,
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<boolean> {
  // Admins and coaches in the same org can access all attendance
  const isOrgStaff = user.memberships.some(
    m => m.organization_id === session.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin', 'coach'].includes(m.role)
  )

  if (isOrgStaff) return true

  // Athletes can view their own attendance records
  const { data: athleteProfile } = await supabase
    .from('athlete_profiles')
    .select('id, user_id')
    .eq('id', athleteId)
    .single()

  if (athleteProfile && athleteProfile.user_id === user.id) {
    return true
  }

  // Parents can view their children's attendance
  if (athleteProfile) {
    const { data: parentRelation } = await supabase
      .from('parent_athlete_relations')
      .select('id')
      .eq('parent_user_id', user.id)
      .eq('athlete_user_id', athleteProfile.user_id)
      .eq('verified', true)
      .single()

    if (parentRelation) return true
  }

  return false
}
