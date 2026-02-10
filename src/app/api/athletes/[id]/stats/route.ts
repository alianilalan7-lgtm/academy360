import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach, isParent } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { uuidLikeSchema } from '@/lib/validation'
import type { ApiResponse, AthleteDashboardStats } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/athletes/[id]/stats
 * Get athlete dashboard statistics (XP, level, streak, achievements, progress)
 * Access: The athlete themselves, their parents, coaches in their org, or admins
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AthleteDashboardStats>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = uuidLikeSchema()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the athlete profile
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, user_id, organization_id, total_xp, current_level, streak_days, last_activity_date')
      .eq('id', id)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found', data: null },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = await checkStatsAccess(user, athlete, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this athlete\'s stats', data: null },
        { status: 403 }
      )
    }

    // Fetch completed programs count
    const { count: completedPrograms } = await supabase
      .from('assigned_programs')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', id)
      .eq('status', 'completed')

    // Fetch upcoming sessions count (sessions in the future where athlete is in the group or individually assigned)
    const now = new Date().toISOString()

    // Get groups the athlete belongs to
    const { data: athleteGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', athlete.user_id)
      .eq('is_active', true)

    const groupIds = athleteGroups?.map(g => g.group_id) ?? []

    let upcomingSessionsCount = 0
    if (groupIds.length > 0) {
      const { count } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .in('group_id', groupIds)
        .gte('scheduled_start', now)
        .eq('organization_id', athlete.organization_id)

      upcomingSessionsCount = count ?? 0
    }

    // Fetch recent achievements (last 5)
    const { data: recentAchievements } = await supabase
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
          category
        )
      `)
      .eq('athlete_id', id)
      .order('earned_at', { ascending: false })
      .limit(5)

    // Fetch weekly progress (training logs for the last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: weeklyLogs } = await supabase
      .from('training_logs')
      .select('date, completion_status')
      .eq('athlete_id', id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Process weekly progress
    const weeklyProgress = generateWeeklyProgress(weeklyLogs ?? [])

    // Calculate actual streak (verify it's current)
    const calculatedStreak = calculateStreak(athlete.last_activity_date, athlete.streak_days ?? 0)

    // Build the stats response
    const stats: AthleteDashboardStats = {
      totalXp: athlete.total_xp ?? 0,
      currentLevel: athlete.current_level ?? 1,
      streakDays: calculatedStreak,
      completedPrograms: completedPrograms ?? 0,
      upcomingSessionsCount,
      recentAchievements: (recentAchievements ?? []).map(ra => ({
        id: ra.id,
        athlete_id: ra.athlete_id,
        achievement_id: ra.achievement_id,
        earned_at: ra.earned_at,
        progress_data: ra.progress_data,
        achievement: ra.achievement as AthleteDashboardStats['recentAchievements'][0]['achievement'],
      })),
      weeklyProgress,
    }

    return NextResponse.json({
      success: true,
      data: stats,
      error: null,
    })
  } catch (error) {
    console.error('GET /api/athletes/[id]/stats error:', error)

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
 * Helper function to check if user has access to view athlete stats
 */
async function checkStatsAccess(
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

  // Athletes can view their own stats
  if (athlete.user_id === user.id) return true

  // Parents can view their linked athletes' stats
  if (isParent(user)) {
    const { data: parentRelation } = await supabase
      .from('parent_athlete_relations')
      .select('id, can_view_progress')
      .eq('parent_user_id', user.id)
      .eq('athlete_user_id', athlete.user_id)
      .eq('verified', true)
      .single()

    // Check if parent has permission to view progress
    if (parentRelation?.can_view_progress) return true
  }

  return false
}

/**
 * Generate weekly progress data for the last 7 days
 */
function generateWeeklyProgress(
  logs: { date: string; completion_status: string | null }[]
): AthleteDashboardStats['weeklyProgress'] {
  const result: AthleteDashboardStats['weeklyProgress'] = []
  const today = new Date()

  // Create a map of date to completed count
  const completedByDate = new Map<string, number>()
  logs.forEach(log => {
    if (log.completion_status === 'completed') {
      const dateKey = log.date.split('T')[0]
      completedByDate.set(dateKey, (completedByDate.get(dateKey) ?? 0) + 1)
    }
  })

  // Generate data for each of the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

    result.push({
      day: dayNames[date.getDay()],
      completed: completedByDate.get(dateKey) ?? 0,
    })
  }

  return result
}

/**
 * Calculate the actual streak based on last activity date
 */
function calculateStreak(lastActivityDate: string | null, storedStreak: number): number {
  if (!lastActivityDate || storedStreak === 0) return 0

  const lastActivity = new Date(lastActivityDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  lastActivity.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - lastActivity.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Streak is valid if last activity was today or yesterday
  if (diffDays <= 1) {
    return storedStreak
  }

  // Streak is broken if more than 1 day gap
  return 0
}
