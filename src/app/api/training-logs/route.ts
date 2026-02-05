import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach, isAthlete } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, TrainingLog, CompletionStatus } from '@/lib/types'
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
const trainingLogCreateSchema = z.object({
  athlete_id: z.string().uuid('Invalid athlete ID'),
  assigned_program_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  completion_status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional().default('not_started'),
  duration_minutes: z.number().int().positive().optional().nullable(),
  intensity_level: z.number().int().min(1).max(10).optional().nullable(),
  exercises_completed: jsonValueSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const trainingLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  athlete_id: z.string().uuid().optional(),
  assigned_program_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  completion_status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  has_feedback: z.enum(['true', 'false']).optional(),
  sort_by: z.enum(['date', 'created_at', 'completion_status', 'xp_earned']).optional().default('date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

/**
 * Calculate XP based on completion status
 */
function calculateXp(completionStatus: CompletionStatus): number {
  return XP_REWARDS[completionStatus] ?? 0
}

/**
 * Update athlete's total XP and last activity date
 */
async function updateAthleteXp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
  xpEarned: number
): Promise<void> {
  // Get current athlete stats
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
  const newTotalXp = currentXp + xpEarned

  // Update athlete's total XP and last activity
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
  // Count training logs for this assignment
  const { data: logs, error: logsError } = await supabase
    .from('training_logs')
    .select('completion_status')
    .eq('assigned_program_id', assignedProgramId)

  if (logsError || !logs || logs.length === 0) {
    return
  }

  // Calculate progress percentage
  const completedCount = logs.filter(l => l.completion_status === 'completed').length
  const progressPercentage = Math.round((completedCount / logs.length) * 100)

  // Determine assignment status
  let status: 'assigned' | 'in_progress' | 'completed' = 'assigned'
  if (progressPercentage === 100) {
    status = 'completed'
  } else if (progressPercentage > 0) {
    status = 'in_progress'
  }

  // Update assignment
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
 * GET /api/training-logs
 * List training logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validationResult = trainingLogQuerySchema.safeParse(queryParams)
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
      athlete_id,
      assigned_program_id,
      session_id,
      completion_status,
      from_date,
      to_date,
      has_feedback,
      sort_by,
      sort_order,
    } = validationResult.data

    // Build query with relations
    let query = supabase
      .from('training_logs')
      .select(`
        *,
        athlete:athlete_profiles(
          id,
          user_id,
          organization_id,
          user_profile:user_profiles(id, full_name, email, avatar_url)
        ),
        assigned_program:assigned_programs(
          id,
          program:programs(id, title, category)
        ),
        feedback_by_user:user_profiles!training_logs_feedback_by_fkey(id, full_name, email)
      `, { count: 'exact' })

    // Access control
    if (isAthlete(user) && !isCoach(user) && !isAdmin(user)) {
      // Athletes can only see their own training logs
      const { data: athleteProfile } = await supabase
        .from('athlete_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (athleteProfile) {
        query = query.eq('athlete_id', athleteProfile.id)
      } else {
        const response: PaginatedResponse<TrainingLog> = {
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
      // Coaches can see logs for athletes in their organization
      if (user.currentOrganizationId) {
        query = query.eq('athlete.organization_id', user.currentOrganizationId)
      }
    }

    // Apply filters
    if (athlete_id) {
      query = query.eq('athlete_id', athlete_id)
    }

    if (assigned_program_id) {
      query = query.eq('assigned_program_id', assigned_program_id)
    }

    if (session_id) {
      query = query.eq('session_id', session_id)
    }

    if (completion_status) {
      query = query.eq('completion_status', completion_status)
    }

    if (from_date) {
      query = query.gte('date', from_date)
    }

    if (to_date) {
      query = query.lte('date', to_date)
    }

    if (has_feedback !== undefined) {
      if (has_feedback === 'true') {
        query = query.not('coach_feedback', 'is', null)
      } else {
        query = query.is('coach_feedback', null)
      }
    }

    // Sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('Error fetching training logs:', error)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to fetch training logs',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    const response: PaginatedResponse<typeof logs[0]> = {
      data: logs,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Training logs GET error:', error)

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
 * POST /api/training-logs
 * Create a new training log
 * Athletes can create logs for themselves, coaches/admins can create for athletes in their org
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validationResult = trainingLogCreateSchema.safeParse(body)
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    const logData = validationResult.data

    // Verify athlete exists
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, user_id, organization_id')
      .eq('id', logData.athlete_id)
      .single()

    if (athleteError || !athlete) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Athlete not found',
        success: false,
      }
      return NextResponse.json(response, { status: 404 })
    }

    // Check access permissions
    let canCreate = isAdmin(user)

    if (!canCreate && isCoach(user)) {
      canCreate = athlete.organization_id === user.currentOrganizationId
    }

    if (!canCreate && isAthlete(user)) {
      canCreate = athlete.user_id === user.id
    }

    if (!canCreate) {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Forbidden: You do not have permission to create training logs for this athlete',
        success: false,
      }
      return NextResponse.json(response, { status: 403 })
    }

    // If assigned_program_id is provided, verify the assignment exists and belongs to the athlete
    if (logData.assigned_program_id) {
      const { data: assignment, error: assignmentError } = await supabase
        .from('assigned_programs')
        .select('id, athlete_id, status')
        .eq('id', logData.assigned_program_id)
        .single()

      if (assignmentError || !assignment) {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Assignment not found',
          success: false,
        }
        return NextResponse.json(response, { status: 404 })
      }

      if (assignment.athlete_id !== logData.athlete_id) {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Assignment does not belong to this athlete',
          success: false,
        }
        return NextResponse.json(response, { status: 400 })
      }

      if (assignment.status === 'cancelled') {
        const response: ApiResponse<null> = {
          data: null,
          error: 'Cannot create training log for cancelled assignment',
          success: false,
        }
        return NextResponse.json(response, { status: 400 })
      }
    }

    // Calculate XP based on completion status
    const completionStatus = logData.completion_status as CompletionStatus
    const xpEarned = calculateXp(completionStatus)

    // Create the training log
    const now = new Date().toISOString()
    const today = new Date().toISOString().split('T')[0]

    const { data: trainingLog, error: createError } = await supabase
      .from('training_logs')
      .insert({
        athlete_id: logData.athlete_id,
        assigned_program_id: logData.assigned_program_id ?? null,
        session_id: logData.session_id ?? null,
        date: logData.date ?? today,
        completion_status: completionStatus,
        duration_minutes: logData.duration_minutes ?? null,
        intensity_level: logData.intensity_level ?? null,
        exercises_completed: logData.exercises_completed ?? null,
        notes: logData.notes ?? null,
        xp_earned: xpEarned,
        created_at: now,
        updated_at: now,
      })
      .select(`
        *,
        athlete:athlete_profiles(
          id,
          user_profile:user_profiles(id, full_name, email)
        ),
        assigned_program:assigned_programs(
          id,
          program:programs(id, title)
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating training log:', createError)
      const response: ApiResponse<null> = {
        data: null,
        error: 'Failed to create training log',
        success: false,
      }
      return NextResponse.json(response, { status: 500 })
    }

    // Update athlete's XP if earned
    if (xpEarned > 0) {
      await updateAthleteXp(supabase, logData.athlete_id, xpEarned)
    }

    // Update assignment progress if linked to an assignment
    if (logData.assigned_program_id) {
      await updateAssignmentProgress(supabase, logData.assigned_program_id)
    }

    const response: ApiResponse<typeof trainingLog> = {
      data: trainingLog,
      error: null,
      success: true,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Training logs POST error:', error)

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
