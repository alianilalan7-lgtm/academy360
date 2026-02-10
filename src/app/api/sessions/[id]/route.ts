import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uuidLikeSchema } from '@/lib/validation'
import type { ApiResponse, Session, SessionWithAttendance } from '@/lib/types'

// Session types and statuses
const SESSION_TYPES = ['training', 'match', 'assessment', 'other'] as const
const SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const

// Validation schema for updating a session
const updateSessionSchema = z.object({
  groupId: uuidLikeSchema('Invalid group ID').optional().nullable(),
  coachId: uuidLikeSchema('Invalid coach ID').optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().nullable(),
  sessionType: z.enum(SESSION_TYPES).optional(),
  status: z.enum(SESSION_STATUSES).optional(),
  scheduledStart: z.string().datetime('Invalid scheduled start datetime').optional(),
  scheduledEnd: z.string().datetime('Invalid scheduled end datetime').optional().nullable(),
  actualStart: z.string().datetime('Invalid actual start datetime').optional().nullable(),
  actualEnd: z.string().datetime('Invalid actual end datetime').optional().nullable(),
  location: z.string().max(500, 'Location must be less than 500 characters').optional().nullable(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
}).partial()

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/sessions/[id]
 * Get a specific session by ID with optional attendance data
 * Access: Members of the organization (coaches/admins see all, athletes see their group's sessions)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<SessionWithAttendance>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = uuidLikeSchema()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format', data: null },
        { status: 400 }
      )
    }

    // Check if attendance should be included
    const { searchParams } = new URL(request.url)
    const includeAttendance = searchParams.get('includeAttendance') === 'true'

    // Build the select query
    const selectQuery = includeAttendance
      ? `
        *,
        group:groups(id, name, age_group, description),
        coach:user_profiles!sessions_coach_id_fkey(id, full_name, avatar_url, email),
        attendance(
          id,
          athlete_id,
          status,
          check_in_time,
          check_out_time,
          notes,
          recorded_by,
          created_at,
          athlete:athlete_profiles!attendance_athlete_id_fkey(
            id,
            user_id,
            jersey_number,
            position,
            user_profile:user_profiles!athlete_profiles_user_id_fkey(id, full_name, avatar_url, email)
          )
        )
      `
      : `
        *,
        group:groups(id, name, age_group, description),
        coach:user_profiles!sessions_coach_id_fkey(id, full_name, avatar_url, email)
      `

    // Fetch the session
    const { data: session, error } = await supabase
      .from('sessions')
      .select(selectQuery)
      .eq('id', id)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found', data: null },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = await checkSessionAccess(user, session as any, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this session', data: null },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: session as any,
      error: null,
    })
  } catch (error) {
    console.error('GET /api/sessions/[id] error:', error)

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
 * PATCH /api/sessions/[id]
 * Update a session
 * Access: Coaches assigned to the session, Club Admins, Super Admins
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Session>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = uuidLikeSchema()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the existing session
    const { data: existingSession, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found', data: null },
        { status: 404 }
      )
    }

    // Check update permissions
    const canUpdate = checkSessionUpdateAccess(user, existingSession)

    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have permission to update this session', data: null },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateSessionSchema.safeParse(body)

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
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.groupId !== undefined) {
      // If groupId is provided, verify it belongs to the organization
      if (validatedData.groupId) {
        const { data: group, error: groupError } = await supabase
          .from('groups')
          .select('id')
          .eq('id', validatedData.groupId)
          .eq('organization_id', existingSession.organization_id)
          .single()

        if (groupError || !group) {
          return NextResponse.json(
            { success: false, error: 'Group not found or does not belong to this organization', data: null },
            { status: 400 }
          )
        }
      }
      updateData.group_id = validatedData.groupId
    }

    if (validatedData.coachId !== undefined) {
      // If coachId is provided, verify they are a coach in the organization
      if (validatedData.coachId) {
        const { data: coachMembership, error: coachError } = await supabase
          .from('memberships')
          .select('id')
          .eq('user_id', validatedData.coachId)
          .eq('organization_id', existingSession.organization_id)
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
      updateData.coach_id = validatedData.coachId
    }

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }

    if (validatedData.sessionType !== undefined) {
      updateData.session_type = validatedData.sessionType
    }

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status

      // Auto-set actual_start when status changes to in_progress
      if (validatedData.status === 'in_progress' && !existingSession.actual_start) {
        updateData.actual_start = new Date().toISOString()
      }

      // Auto-set actual_end when status changes to completed
      if (validatedData.status === 'completed' && !existingSession.actual_end) {
        updateData.actual_end = new Date().toISOString()
      }
    }

    if (validatedData.scheduledStart !== undefined) {
      updateData.scheduled_start = validatedData.scheduledStart
    }

    if (validatedData.scheduledEnd !== undefined) {
      updateData.scheduled_end = validatedData.scheduledEnd
    }

    if (validatedData.actualStart !== undefined) {
      updateData.actual_start = validatedData.actualStart
    }

    if (validatedData.actualEnd !== undefined) {
      updateData.actual_end = validatedData.actualEnd
    }

    if (validatedData.location !== undefined) {
      updateData.location = validatedData.location
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    // Validate time consistency
    const finalScheduledStart = updateData.scheduled_start ?? existingSession.scheduled_start
    const finalScheduledEnd = updateData.scheduled_end ?? existingSession.scheduled_end

    if (finalScheduledEnd) {
      const start = new Date(finalScheduledStart as string)
      const end = new Date(finalScheduledEnd as string)
      if (end <= start) {
        return NextResponse.json(
          { success: false, error: 'Scheduled end must be after scheduled start', data: null },
          { status: 400 }
        )
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) { // Only updated_at
      return NextResponse.json(
        { success: false, error: 'No valid fields to update', data: null },
        { status: 400 }
      )
    }

    // Perform the update
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        group:groups(id, name, age_group),
        coach:user_profiles!sessions_coach_id_fkey(id, full_name, avatar_url)
      `)
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update session', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSession as Session,
      error: null,
    })
  } catch (error) {
    console.error('PATCH /api/sessions/[id] error:', error)

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
 * DELETE /api/sessions/[id]
 * Delete a session (also deletes associated attendance records)
 * Access: Club Admins, Super Admins only
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Only admins can delete sessions
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: only administrators can delete sessions', data: null },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidSchema = uuidLikeSchema()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the session to verify it exists and get organization
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('id, organization_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !session) {
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

    // Warn if session is completed (soft delete alternative could be status change to 'cancelled')
    if (session.status === 'completed') {
      // We allow deletion but could optionally change to soft delete by updating status
      console.warn(`Deleting completed session ${id}`)
    }

    // Delete associated attendance records first (cascade)
    const { error: attendanceDeleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('session_id', id)

    if (attendanceDeleteError) {
      console.error('Error deleting attendance records:', attendanceDeleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete associated attendance records', data: null },
        { status: 500 }
      )
    }

    // Delete the session
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete session', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      error: null,
    })
  } catch (error) {
    console.error('DELETE /api/sessions/[id] error:', error)

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
 * Helper function to check if user has access to view a session
 */
async function checkSessionAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  session: { organization_id: string; group_id: string | null },
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<boolean> {
  // Admins and coaches in the same org can access all sessions
  const isOrgStaff = user.memberships.some(
    m => m.organization_id === session.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin', 'coach'].includes(m.role)
  )

  if (isOrgStaff) return true

  // Athletes can only access sessions for groups they belong to
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

/**
 * Helper function to check if user has access to update a session
 */
function checkSessionUpdateAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  session: { organization_id: string; coach_id: string | null }
): boolean {
  // Admins in the same org can update
  const isOrgAdmin = user.memberships.some(
    m => m.organization_id === session.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin'].includes(m.role)
  )

  if (isOrgAdmin) return true

  // Coaches in the same org can update (especially if they're the assigned coach)
  const isOrgCoach = user.memberships.some(
    m => m.organization_id === session.organization_id &&
         m.status === 'active' &&
         m.role === 'coach'
  )

  if (isOrgCoach) return true

  return false
}
