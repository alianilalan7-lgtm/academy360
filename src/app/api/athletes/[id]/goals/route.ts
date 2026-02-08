import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach, isParent } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, AthleteGoal, MetricType } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Extended type for goal with metric type details
interface AthleteGoalWithMetric extends AthleteGoal {
  metric_type?: MetricType | null
}

// Query params schema for listing goals
const queryParamsSchema = z.object({
  isActive: z.enum(['true', 'false', 'all']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'target_date', 'title']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Schema for creating a new goal
const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional().nullable(),
  metricTypeId: z.string().uuid('Invalid metric type ID').optional().nullable(),
  targetValue: z.number().optional().nullable(),
  currentValue: z.number().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
})

/**
 * GET /api/athletes/[id]/goals
 * List all goals for an athlete
 * Access: The athlete themselves, their parents (with permission), coaches in their org, or admins
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AthleteGoalWithMetric[]> | { success: false; error: string; total?: number; page?: number; pageSize?: number; totalPages?: number }>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryResult = queryParamsSchema.safeParse({
      isActive: searchParams.get('isActive') ?? 'all',
      page: searchParams.get('page') ?? 1,
      pageSize: searchParams.get('pageSize') ?? 20,
      sortBy: searchParams.get('sortBy') ?? 'created_at',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: `Invalid query parameters: ${queryResult.error.message}` },
        { status: 400 }
      )
    }

    const { isActive, page, pageSize, sortBy, sortOrder } = queryResult.data

    // Fetch the athlete profile to verify it exists and check access
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, user_id, organization_id')
      .eq('id', id)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = await checkGoalsAccess(user, athlete, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this athlete\'s goals' },
        { status: 403 }
      )
    }

    // Build the query for goals
    let query = supabase
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
      `, { count: 'exact' })
      .eq('athlete_id', id)

    // Filter by active status
    if (isActive === 'true') {
      query = query.eq('is_active', true)
    } else if (isActive === 'false') {
      query = query.eq('is_active', false)
    }
    // 'all' doesn't add any filter

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching goals:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch goals' },
        { status: 500 }
      )
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: data as AthleteGoalWithMetric[],
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/athletes/[id]/goals error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/athletes/[id]/goals
 * Create a new goal for an athlete
 * Access: The athlete themselves (for their own goals), coaches in their org, or admins
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AthleteGoalWithMetric>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
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

    // Check if user can create goals for this athlete
    const canCreate = await checkGoalCreateAccess(user, athlete, supabase)

    if (!canCreate) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have permission to create goals for this athlete', data: null },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createGoalSchema.safeParse(body)

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

    // If metric_type_id is provided, verify it exists and belongs to the same org or is a system metric
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

      // Verify metric is accessible (either system metric or from same org)
      if (!metricType.is_system && metricType.organization_id !== athlete.organization_id) {
        return NextResponse.json(
          { success: false, error: 'Metric type not available for this organization', data: null },
          { status: 400 }
        )
      }
    }

    // Validate date logic
    if (validatedData.startDate && validatedData.targetDate) {
      const startDate = new Date(validatedData.startDate)
      const targetDate = new Date(validatedData.targetDate)

      if (targetDate <= startDate) {
        return NextResponse.json(
          { success: false, error: 'Target date must be after start date', data: null },
          { status: 400 }
        )
      }
    }

    // Create the goal
    const { data: newGoal, error: insertError } = await supabase
      .from('athlete_goals')
      .insert({
        athlete_id: id,
        title: validatedData.title,
        description: validatedData.description ?? null,
        metric_type_id: validatedData.metricTypeId ?? null,
        target_value: validatedData.targetValue ?? null,
        current_value: validatedData.currentValue ?? 0,
        start_date: validatedData.startDate ?? new Date().toISOString(),
        target_date: validatedData.targetDate ?? null,
        is_active: validatedData.isActive,
      })
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

    if (insertError) {
      console.error('Error creating goal:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create goal', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: newGoal as AthleteGoalWithMetric, error: null },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/athletes/[id]/goals error:', error)

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
async function checkGoalsAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  athlete: { user_id: string; organization_id: string },
  supabase: Awaited<ReturnType<typeof createServiceClient>>
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

  // Parents can view their linked athletes' goals if they have progress viewing permission
  if (isParent(user)) {
    const { data: parentRelation } = await supabase
      .from('parent_athlete_relations')
      .select('id, can_view_progress')
      .eq('parent_user_id', user.id)
      .eq('athlete_user_id', athlete.user_id)
      .eq('verified', true)
      .single()

    if (parentRelation?.can_view_progress) return true
  }

  return false
}

/**
 * Helper function to check if user can create goals for an athlete
 */
async function checkGoalCreateAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  athlete: { user_id: string; organization_id: string },
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<boolean> {
  // Admins and coaches in the same org can create goals
  const isOrgStaff = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin', 'coach'].includes(m.role)
  )

  if (isOrgStaff) return true

  // Athletes can create their own goals
  if (athlete.user_id === user.id) return true

  // Parents cannot create goals for their children
  return false
}
