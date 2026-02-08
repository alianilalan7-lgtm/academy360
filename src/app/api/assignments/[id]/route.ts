import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach, isAthlete } from '@/lib/auth'
import type { ApiResponse, AssignedProgram } from '@/lib/types'

// Validation schemas
const assignmentUpdateSchema = z.object({
  status: z.enum(['assigned', 'in_progress', 'completed', 'cancelled']).optional(),
  progress_percentage: z.number().int().min(0).max(100).optional(),
  start_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/assignments/[id]
 * Get a single assignment by ID
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
    if (!z.string().uuid().safeParse(id).success) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Invalid assignment ID format',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Fetch assignment with related data
    const { data: assignment, error } = await supabase
      .from('assigned_programs')
      .select(`
        *,
        program:programs(
          id,
          title,
          description,
          category,
          difficulty_level,
          estimated_duration_minutes,
          thumbnail_url,
          content_data,
          tags
        ),
        athlete:athlete_profiles(
          id,
          user_id,
          organization_id,
          user_profile:user_profiles(id, full_name, email, avatar_url)
        ),
        assigned_by_user:user_profiles!assigned_programs_assigned_by_fkey(id, full_name, email),
        group:groups(id, name),
        training_logs(id, date, completion_status, xp_earned, duration_minutes)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Assignment not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }
      console.error('Error fetching assignment:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to fetch assignment',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    // Check access permissions
    let canAccess = isAdmin(user)

    if (!canAccess && isCoach(user)) {
      // Coaches can see assignments in their organization
      canAccess = assignment.athlete?.organization_id === user.currentOrganizationId
    }

    if (!canAccess && isAthlete(user)) {
      // Athletes can see their own assignments
      canAccess = assignment.athlete?.user_id === user.id
    }

    if (!canAccess) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You do not have access to this assignment',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    const response: ApiResponse<typeof assignment> = {
      data: assignment,
      error: null,
      success: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Assignment GET error:', error)

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
 * PATCH /api/assignments/[id]
 * Update an assignment
 * Coaches/admins can update all fields, athletes can only update status and progress
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Invalid assignment ID format',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Fetch existing assignment
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('assigned_programs')
      .select(`
        *,
        athlete:athlete_profiles(id, user_id, organization_id)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Assignment not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }
      throw fetchError
    }

    // Check access permissions
    let canUpdate = isAdmin(user)
    let isAthleteOwner = false

    if (!canUpdate && isCoach(user)) {
      canUpdate = existingAssignment.athlete?.organization_id === user.currentOrganizationId
    }

    if (!canUpdate && isAthlete(user)) {
      isAthleteOwner = existingAssignment.athlete?.user_id === user.id
      canUpdate = isAthleteOwner
    }

    if (!canUpdate) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You do not have permission to update this assignment',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validationResult = assignmentUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    let updateData = validationResult.data

    // Athletes can only update status to 'in_progress' and progress_percentage
    if (isAthleteOwner && !isCoach(user) && !isAdmin(user)) {
      const { status, progress_percentage } = updateData

      // Athletes cannot set status to 'cancelled'
      if (status === 'cancelled') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Athletes cannot cancel assignments',
          success: false,
        }
        return NextResponse.json(response, { status: 403 })
      }

      // Athletes can only update status and progress
      updateData = {
        status,
        progress_percentage,
      }
    }

    // Handle completion
    const now = new Date().toISOString()
    const finalUpdateData: Record<string, unknown> = {
      ...updateData,
      updated_at: now,
    }

    if (updateData.status === 'completed' && existingAssignment.status !== 'completed') {
      finalUpdateData.completed_at = now
    }

    // Update the assignment
    const { data: assignment, error } = await supabase
      .from('assigned_programs')
      .update(finalUpdateData)
      .eq('id', id)
      .select(`
        *,
        program:programs(id, title, category),
        athlete:athlete_profiles(
          id,
          user_profile:user_profiles(id, full_name, email)
        )
      `)
      .single()

    if (error) {
      console.error('Error updating assignment:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to update assignment',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: ApiResponse<typeof assignment> = {
      data: assignment,
      error: null,
      success: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Assignment PATCH error:', error)

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
 * DELETE /api/assignments/[id]
 * Cancel an assignment (soft delete by setting status to 'cancelled')
 * Only coaches and admins can cancel assignments
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Only coaches and admins can cancel assignments
    if (!isAdmin(user) && !isCoach(user)) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: Only coaches and admins can cancel assignments',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Invalid assignment ID format',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Fetch existing assignment
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('assigned_programs')
      .select(`
        *,
        athlete:athlete_profiles(id, organization_id)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Assignment not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }
      throw fetchError
    }

    // Non-admins can only cancel assignments in their organization
    if (!isAdmin(user) && existingAssignment.athlete?.organization_id !== user.currentOrganizationId) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You can only cancel assignments in your organization',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    // Cannot cancel already completed or cancelled assignments
    if (existingAssignment.status === 'completed') {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Cannot cancel a completed assignment',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    if (existingAssignment.status === 'cancelled') {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Assignment is already cancelled',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Soft delete: set status to 'cancelled'
    const { error } = await supabase
      .from('assigned_programs')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error cancelling assignment:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to cancel assignment',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: ApiResponse<{ message: string }> = {
      data: { message: 'Assignment cancelled successfully' },
      error: null,
      success: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Assignment DELETE error:', error)

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
