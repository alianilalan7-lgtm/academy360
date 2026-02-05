import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, AthleteGoal, MetricType } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string; goalId: string }>
}

// Extended type for goal with metric type details
interface AthleteGoalWithMetric extends AthleteGoal {
  metric_type?: MetricType | null
}

// Schema for updating a goal
const updateGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  metricTypeId: z.string().uuid('Invalid metric type ID').optional().nullable(),
  targetValue: z.number().optional().nullable(),
  currentValue: z.number().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  completedAt: z.string().datetime().optional().nullable(),
}).partial()

/**
 * GET /api/athletes/[id]/goals/[goalId]
 * Get a specific goal by ID
 * Access: The athlete themselves, their parents (with permission), coaches in their org, or admins
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AthleteGoalWithMetric>>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id, goalId } = await params

    // Validate UUID formats
    const uuidSchema = z.string().uuid()

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
        { status: 400 }
      )
    }

    if (!uuidSchema.safeParse(goalId).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the athlete profile to verify it exists and check access
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, user_id, organization_id')
      .eq('id', id)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found', data: null },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = await checkGoalAccess(user, athlete, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this athlete\'s goals', data: null },
        { status: 403 }
      )
    }

    // Fetch the specific goal
    const { data: goal, error: goalError } = await supabase
      .from('athlete_goals')
      .select(`
        id,
        athlete_id,
        title,
        description,
        metric_type_id,
        target_value,
        current_value,
        start_date,
        target_date,
        is_active,
        completed_at,
        created_at,
        updated_at,
        metric_type:metric_types(
          id,
          name,
          code,
          unit,
          category,
          is_higher_better
        )
      `)
      .eq('id', goalId)
      .eq('athlete_id', id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found', data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: goal as AthleteGoalWithMetric,
      error: null,
    })
  } catch (error) {
    console.error('GET /api/athletes/[id]/goals/[goalId] error:', error)

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
 * PATCH /api/athletes/[id]/goals/[goalId]
 * Update a specific goal
 * Access: The athlete themselves (for their own goals), coaches in their org, or admins
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AthleteGoalWithMetric>>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id, goalId } = await params

    // Validate UUID formats
    const uuidSchema = z.string().uuid()

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
        { status: 400 }
      )
    }

    if (!uuidSchema.safeParse(goalId).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, user_id, organization_id')
      .eq('id', id)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found', data: null },
        { status: 404 }
      )
    }

    // Check if user can update this goal
    const canUpdate = await checkGoalUpdateAccess(user, athlete, supabase)

    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have permission to update this goal', data: null },
        { status: 403 }
      )
    }

    // Verify the goal exists and belongs to this athlete
    const { data: existingGoal, error: goalError } = await supabase
      .from('athlete_goals')
      .select('id, start_date, target_date')
      .eq('id', goalId)
      .eq('athlete_id', id)
      .single()

    if (goalError || !existingGoal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found', data: null },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateGoalSchema.safeParse(body)

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

    // Check if there's anything to update
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update', data: null },
        { status: 400 }
      )
    }

    // If metric_type_id is being updated, verify it exists and is accessible
    if (validatedData.metricTypeId) {
      const { data: metricType, error: metricError } = await supabase
        .from('metric_types')
        .select('id, organization_id, is_system')
        .eq('id', validatedData.metricTypeId)
        .single()

      if (metricError || !metricType) {
        return NextResponse.json(
          { success: false, error: 'Invalid metric type', data: null },
          { status: 400 }
        )
      }

      if (!metricType.is_system && metricType.organization_id !== athlete.organization_id) {
        return NextResponse.json(
          { success: false, error: 'Metric type not available for this organization', data: null },
          { status: 400 }
        )
      }
    }

    // Validate date logic if dates are being updated
    const effectiveStartDate = validatedData.startDate ?? existingGoal.start_date
    const effectiveTargetDate = validatedData.targetDate ?? existingGoal.target_date

    if (effectiveStartDate && effectiveTargetDate) {
      const startDate = new Date(effectiveStartDate)
      const targetDate = new Date(effectiveTargetDate)

      if (targetDate <= startDate) {
        return NextResponse.json(
          { success: false, error: 'Target date must be after start date', data: null },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }
    if (validatedData.metricTypeId !== undefined) {
      updateData.metric_type_id = validatedData.metricTypeId
    }
    if (validatedData.targetValue !== undefined) {
      updateData.target_value = validatedData.targetValue
    }
    if (validatedData.currentValue !== undefined) {
      updateData.current_value = validatedData.currentValue
    }
    if (validatedData.startDate !== undefined) {
      updateData.start_date = validatedData.startDate
    }
    if (validatedData.targetDate !== undefined) {
      updateData.target_date = validatedData.targetDate
    }
    if (validatedData.isActive !== undefined) {
      updateData.is_active = validatedData.isActive
    }
    if (validatedData.completedAt !== undefined) {
      updateData.completed_at = validatedData.completedAt
      // If completed_at is set, also set is_active to false
      if (validatedData.completedAt !== null) {
        updateData.is_active = false
      }
    }

    // Auto-complete goal if current_value reaches target_value
    if (validatedData.currentValue != null && validatedData.targetValue != null) {
      if (validatedData.currentValue >= validatedData.targetValue) {
        updateData.completed_at = updateData.completed_at ?? new Date().toISOString()
        updateData.is_active = false
      }
    }

    // Perform the update
    const { data: updatedGoal, error: updateError } = await supabase
      .from('athlete_goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('athlete_id', id)
      .select(`
        id,
        athlete_id,
        title,
        description,
        metric_type_id,
        target_value,
        current_value,
        start_date,
        target_date,
        is_active,
        completed_at,
        created_at,
        updated_at,
        metric_type:metric_types(
          id,
          name,
          code,
          unit,
          category,
          is_higher_better
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating goal:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update goal', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedGoal as AthleteGoalWithMetric,
      error: null,
    })
  } catch (error) {
    console.error('PATCH /api/athletes/[id]/goals/[goalId] error:', error)

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
 * DELETE /api/athletes/[id]/goals/[goalId]
 * Delete a specific goal
 * Access: The athlete themselves (for their own goals), coaches in their org, or admins
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id, goalId } = await params

    // Validate UUID formats
    const uuidSchema = z.string().uuid()

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
        { status: 400 }
      )
    }

    if (!uuidSchema.safeParse(goalId).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, user_id, organization_id')
      .eq('id', id)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found', data: null },
        { status: 404 }
      )
    }

    // Check if user can delete this goal
    const canDelete = await checkGoalDeleteAccess(user, athlete, supabase)

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have permission to delete this goal', data: null },
        { status: 403 }
      )
    }

    // Verify the goal exists and belongs to this athlete
    const { data: existingGoal, error: goalError } = await supabase
      .from('athlete_goals')
      .select('id')
      .eq('id', goalId)
      .eq('athlete_id', id)
      .single()

    if (goalError || !existingGoal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found', data: null },
        { status: 404 }
      )
    }

    // Delete the goal
    const { error: deleteError } = await supabase
      .from('athlete_goals')
      .delete()
      .eq('id', goalId)
      .eq('athlete_id', id)

    if (deleteError) {
      console.error('Error deleting goal:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete goal', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      error: null,
    })
  } catch (error) {
    console.error('DELETE /api/athletes/[id]/goals/[goalId] error:', error)

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
 * Helper function to check if user has access to view athlete goals
 */
async function checkGoalAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  athlete: { user_id: string; organization_id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // Admins and coaches in the same org can access
  const isOrgStaff = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin', 'coach'].includes(m.role)
  )

  if (isOrgStaff) return true

  // Athletes can view their own goals
  if (athlete.user_id === user.id) return true

  // Parents can view their linked athletes' goals
  const { data: parentRelation } = await supabase
    .from('parent_athlete_relations')
    .select('id, can_view_progress')
    .eq('parent_user_id', user.id)
    .eq('athlete_user_id', athlete.user_id)
    .eq('verified', true)
    .single()

  if (parentRelation?.can_view_progress) return true

  return false
}

/**
 * Helper function to check if user can update a goal
 */
async function checkGoalUpdateAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  athlete: { user_id: string; organization_id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // Admins in the same org can update
  const isOrgAdmin = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin'].includes(m.role)
  )

  if (isOrgAdmin) return true

  // Coaches in the same org can update
  const isOrgCoach = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         m.role === 'coach'
  )

  if (isOrgCoach) return true

  // Athletes can update their own goals
  if (athlete.user_id === user.id) return true

  // Parents cannot update goals
  return false
}

/**
 * Helper function to check if user can delete a goal
 */
async function checkGoalDeleteAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  athlete: { user_id: string; organization_id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // Admins in the same org can delete
  const isOrgAdmin = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin'].includes(m.role)
  )

  if (isOrgAdmin) return true

  // Coaches in the same org can delete
  const isOrgCoach = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         m.role === 'coach'
  )

  if (isOrgCoach) return true

  // Athletes can delete their own goals
  if (athlete.user_id === user.id) return true

  // Parents cannot delete goals
  return false
}
