import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach, isParent } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, AthleteAchievement, Achievement } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Extended type for achievement with details
interface AthleteAchievementWithDetails extends AthleteAchievement {
  achievement: Achievement
}

// Query params schema
const queryParamsSchema = z.object({
  category: z.string().max(50).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['earned_at', 'xp_reward', 'name']).default('earned_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * GET /api/athletes/[id]/achievements
 * List all achievements earned by an athlete
 * Access: The athlete themselves, their parents, coaches in their org, or admins
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AthleteAchievementWithDetails[]> | { success: false; error: string; total?: number; page?: number; pageSize?: number; totalPages?: number }>> {
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
      category: searchParams.get('category'),
      page: searchParams.get('page') ?? 1,
      pageSize: searchParams.get('pageSize') ?? 20,
      sortBy: searchParams.get('sortBy') ?? 'earned_at',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: `Invalid query parameters: ${queryResult.error.message}` },
        { status: 400 }
      )
    }

    const { category, page, pageSize, sortBy, sortOrder } = queryResult.data

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
    const canAccess = await checkAchievementsAccess(user, athlete, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this athlete\'s achievements' },
        { status: 403 }
      )
    }

    // Build the query for achievements
    let query = supabase
      .from('athlete_achievements')
      .select(`
        id,
        athlete_id,
        achievement_id,
        earned_at,
        progress_data,
        achievement:achievements(
          id,
          name,
          code,
          description,
          icon_url,
          xp_reward,
          category,
          criteria,
          is_active,
          is_system
        )
      `, { count: 'exact' })
      .eq('athlete_id', id)

    // Filter by category if specified
    if (category) {
      // We need to filter by the achievement's category
      // First get achievement IDs in this category
      const { data: categoryAchievements } = await supabase
        .from('achievements')
        .select('id')
        .eq('category', category)

      if (categoryAchievements && categoryAchievements.length > 0) {
        const achievementIds = categoryAchievements.map(a => a.id)
        query = query.in('achievement_id', achievementIds)
      } else {
        // No achievements in this category
        return NextResponse.json({
          success: true,
          data: [] as AthleteAchievementWithDetails[],
          error: null,
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        })
      }
    }

    // Determine sort column based on sortBy
    // Note: We can only sort by columns in athlete_achievements directly
    // For sorting by achievement properties, we'd need to do post-processing
    const sortColumn = sortBy === 'earned_at' ? 'earned_at' : 'earned_at'

    // Apply sorting and pagination
    const offset = (page - 1) * pageSize
    query = query
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching achievements:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch achievements' },
        { status: 500 }
      )
    }

    // Post-process to sort by achievement properties if needed
    let processedData = data as AthleteAchievementWithDetails[]

    if (sortBy === 'xp_reward' || sortBy === 'name') {
      processedData = [...processedData].sort((a, b) => {
        const aValue = sortBy === 'xp_reward'
          ? (a.achievement?.xp_reward ?? 0)
          : (a.achievement?.name ?? '')
        const bValue = sortBy === 'xp_reward'
          ? (b.achievement?.xp_reward ?? 0)
          : (b.achievement?.name ?? '')

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
        }

        const comparison = String(aValue).localeCompare(String(bValue))
        return sortOrder === 'asc' ? comparison : -comparison
      })
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: processedData,
      error: null,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/athletes/[id]/achievements error:', error)

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
 * Helper function to check if user has access to view athlete achievements
 */
async function checkAchievementsAccess(
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

  // Athletes can view their own achievements
  if (athlete.user_id === user.id) return true

  // Parents can view their linked athletes' achievements
  if (isParent(user)) {
    const { data: parentRelation } = await supabase
      .from('parent_athlete_relations')
      .select('id, can_view_progress')
      .eq('parent_user_id', user.id)
      .eq('athlete_user_id', athlete.user_id)
      .eq('verified', true)
      .single()

    // Check if parent has permission to view progress (achievements are part of progress)
    if (parentRelation?.can_view_progress) return true
  }

  return false
}
