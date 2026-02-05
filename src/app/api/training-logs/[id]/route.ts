import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach, isAthlete } from '@/lib/auth'
import type { ApiResponse, TrainingLog, CompletionStatus } from '@/lib/types'
import type { Json } from '@/lib/types/database'

// XP calculation constants
const XP_REWARDS = {
  completed: 50,
  in_progress: 25,
  not_started: 0,
  skipped: 0,
} as const

// JSON value schema for exercises_completed - accepts any valid JSON
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
const trainingLogUpdateSchema = z.object({
  completion_status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  intensity_level: z.number().int().min(1).max(10).optional().nullable(),
  exercises_completed: jsonValueSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  coach_feedback: z.string().max(2000).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Calculate XP based on completion status
 */
function calculateXp(completionStatus: CompletionStatus): number {
  return XP_REWARDS[completionStatus] ?? 0
}

/**
 * Update athlete's total XP
 */
async function updateAthleteXp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
  xpDelta: number
): Promise<void> {
  if (xpDelta === 0) return

  const { data: athlete, error: fetchError } = await supabase
    .from('athlete_profiles')
    .select('total_xp')
    .eq('id', athleteId)
    .single()

  if (fetchError) {
    console.error('Error fetching athlete for XP update:', fetchError)
    return
  }

  const currentXp = athlete?.total_xp ?? 0
  const newTotalXp = Math.max(0, currentXp + xpDelta) // Ensure non-negative

  const { error: updateError } = await supabase
    .from('athlete_profiles')
    .update({
      total_xp: newTotalXp,
      last_activity_date: new Date().toISOString(),
    })
    .eq('id', athleteId)

  if (updateError) {
    console.error('Error updating athlete XP:', updateError)
  }
}

/**
 * Update assignment progress based on training logs
 */
async function updateAssignmentProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignedProgramId: string
): Promise<void> {
  const { data: logs, error: logsError } = await supabase
    .from('training_logs')
    .select('completion_status')
    .eq('assigned_program_id', assignedProgramId)

  if (logsError || !logs || logs.length === 0) {
    return
  }

  const completedCount = logs.filter(l => l.completion_status === 'completed').length
  const progressPercentage = Math.round((completedCount / logs.length) * 100)

  let status: 'assigned' | 'in_progress' | 'completed' = 'assigned'
  if (progressPercentage === 100) {
    status = 'completed'
  } else if (progressPercentage > 0) {
    status = 'in_progress'
  }

  const updateData: Record<string, unknown> = {
    progress_percentage: progressPercentage,
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  await supabase
    .from('assigned_programs')
    .update(updateData)
    .eq('id', assignedProgramId)
}

/**
 * GET /api/training-logs/[id]
 * Get a single training log by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id } = await params

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Invalid training log ID format',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Fetch training log with related data
    const { data: trainingLog, error } = await supabase
      .from('training_logs')
      .select(`
        *,
        athlete:athlete_profiles(
          id,
          user_id,
          organization_id,
          total_xp,
          current_level,
          user_profile:user_profiles(id, full_name, email, avatar_url)
        ),
        assigned_program:assigned_programs(
          id,
          status,
          progress_percentage,
          program:programs(id, title, description, category, content_data)
        ),
        session:sessions(id, title, scheduled_start),
        feedback_by_user:user_profiles!training_logs_feedback_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Training log not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }
      console.error('Error fetching training log:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to fetch training log',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    // Check access permissions
    let canAccess = isAdmin(user)

    if (!canAccess && isCoach(user)) {
      canAccess = trainingLog.athlete?.organization_id === user.currentOrganizationId
    }

    if (!canAccess && isAthlete(user)) {
      canAccess = trainingLog.athlete?.user_id === user.id
    }

    if (!canAccess) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You do not have access to this training log',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    const response: ApiResponse<typeof trainingLog> = {
      data: trainingLog,
      error: null,
      success: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Training log GET error:', error)

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
 * PATCH /api/training-logs/[id]
 * Update a training log
 * Athletes can update their own logs (completion, notes, exercises)
 * Coaches/admins can add feedback and update any field
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id } = await params

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Invalid training log ID format',
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Fetch existing training log
    const { data: existingLog, error: fetchError } = await supabase
      .from('training_logs')
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
          error: 'Training log not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }
      throw fetchError
    }

    // Check access permissions
    let canUpdate = isAdmin(user)
    let isAthleteOwner = false
    let canAddFeedback = false

    if (!canUpdate && isCoach(user)) {
      canUpdate = existingLog.athlete?.organization_id === user.currentOrganizationId
      canAddFeedback = canUpdate
    }

    if (!canUpdate && isAthlete(user)) {
      isAthleteOwner = existingLog.athlete?.user_id === user.id
      canUpdate = isAthleteOwner
    }

    if (isAdmin(user)) {
      canAddFeedback = true
    }

    if (!canUpdate) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You do not have permission to update this training log',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validationResult = trainingLogUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    let updateData = validationResult.data

    // Athletes cannot add coach feedback
    if (isAthleteOwner && !isCoach(user) && !isAdmin(user)) {
      if (updateData.coach_feedback !== undefined) {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Athletes cannot add coach feedback',
          success: false,
        }
        return NextResponse.json(response, { status: 403 })
      }
    }

    // Calculate XP difference if completion status changed
    let xpDelta = 0
    const previousStatus = existingLog.completion_status as CompletionStatus
    const newStatus = updateData.completion_status as CompletionStatus | undefined

    if (newStatus && newStatus !== previousStatus) {
      const previousXp = calculateXp(previousStatus)
      const newXp = calculateXp(newStatus)
      xpDelta = newXp - previousXp
    }

    // Build final update data
    const now = new Date().toISOString()
    const finalUpdateData: Record<string, unknown> = {
      ...updateData,
      updated_at: now,
    }

    // Update XP earned if status changed
    if (newStatus && newStatus !== previousStatus) {
      finalUpdateData.xp_earned = calculateXp(newStatus)
    }

    // Add feedback metadata if coach is adding feedback
    if (updateData.coach_feedback !== undefined && canAddFeedback) {
      finalUpdateData.feedback_by = user.id
      finalUpdateData.feedback_at = now
    }

    // Update the training log
    const { data: trainingLog, error } = await supabase
      .from('training_logs')
      .update(finalUpdateData)
      .eq('id', id)
      .select(`
        *,
        athlete:athlete_profiles(
          id,
          user_profile:user_profiles(id, full_name, email)
        ),
        assigned_program:assigned_programs(
          id,
          program:programs(id, title)
        ),
        feedback_by_user:user_profiles!training_logs_feedback_by_fkey(id, full_name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating training log:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to update training log',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    // Update athlete's XP if there was a change
    if (xpDelta !== 0 && existingLog.athlete_id) {
      await updateAthleteXp(supabase, existingLog.athlete_id, xpDelta)
    }

    // Update assignment progress if linked to an assignment
    if (existingLog.assigned_program_id && newStatus) {
      await updateAssignmentProgress(supabase, existingLog.assigned_program_id)
    }

    const response: ApiResponse<typeof trainingLog> = {
      data: trainingLog,
      error: null,
      success: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Training log PATCH error:', error)

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
