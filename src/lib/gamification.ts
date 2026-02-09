import { SupabaseClient } from '@supabase/supabase-js'

// XP rewards for different actions
export const XP_REWARDS = {
    EXERCISE_COMPLETE: 50,
    SESSION_ATTEND: 25,
    STREAK_BONUS: 10, // Per day of streak
    ACHIEVEMENT_BONUS: 100,
}

// Achievement definitions - codes match existing DB entries
export const ACHIEVEMENTS = {
    FIRST_TRAINING: {
        code: 'first_training', // Matches DB
        name: 'İlk Antrenman',
        description: 'İlk egzersizini tamamla',
        icon: '🎯',
        xp_reward: 100,
        check: (stats: AchievementStats) => stats.totalCompletions >= 1,
    },
    WEEK_WARRIOR: {
        code: 'week_warrior', // Matches DB
        name: 'Hafta Savaşçısı',
        description: '5+ egzersiz tamamla',
        icon: '💪',
        xp_reward: 200,
        check: (stats: AchievementStats) => stats.totalCompletions >= 5,
    },
    STREAK_7: {
        code: 'streak_7', // Matches DB
        name: '7 Gün Serisi',
        description: '7 gün üst üste aktif ol',
        icon: '🔥',
        xp_reward: 300,
        check: (stats: AchievementStats) => stats.currentStreak >= 7,
    },
    STREAK_30: {
        code: 'streak_30', // Matches DB
        name: '30 Gün Serisi',
        description: '30 gün üst üste aktif ol',
        icon: '⭐',
        xp_reward: 1000,
        check: (stats: AchievementStats) => stats.currentStreak >= 30,
    },
    SPEED_DEMON: {
        code: 'speed_demon', // Matches DB
        name: 'Hız Canavarı',
        description: 'Seviye 5\'e ulaş',
        icon: '🥉',
        xp_reward: 150,
        check: (stats: AchievementStats) => stats.currentLevel >= 5,
    },
    ENDURANCE_KING: {
        code: 'endurance_king', // Matches DB
        name: 'Dayanıklılık Kralı',
        description: 'Seviye 10\'a ulaş',
        icon: '🥈',
        xp_reward: 300,
        check: (stats: AchievementStats) => stats.currentLevel >= 10,
    },
}

interface AchievementStats {
    totalCompletions: number
    currentStreak: number
    currentLevel: number
    totalXp: number
}

/**
 * Calculate level from total XP
 */
export function calculateLevel(totalXp: number): number {
    const XP_PER_LEVEL = 100
    return Math.floor(totalXp / XP_PER_LEVEL) + 1
}

/**
 * Add XP to athlete and return new total
 */
export async function addXP(
    supabase: SupabaseClient,
    athleteId: string,
    xpAmount: number,
    reason?: string
): Promise<{ newTotalXp: number; leveledUp: boolean; newLevel: number }> {
    // Get current XP
    const { data: athlete } = await supabase
        .from('athlete_profiles')
        .select('total_xp')
        .eq('id', athleteId)
        .single()

    const currentXp = athlete?.total_xp || 0
    const oldLevel = calculateLevel(currentXp)
    const newTotalXp = currentXp + xpAmount
    const newLevel = calculateLevel(newTotalXp)
    const leveledUp = newLevel > oldLevel

    // Update athlete XP
    await supabase
        .from('athlete_profiles')
        .update({ total_xp: newTotalXp })
        .eq('id', athleteId)

    // Log XP transaction (optional - for history)
    try {
        await supabase.from('xp_transactions').insert({
            athlete_id: athleteId,
            amount: xpAmount,
            reason: reason || 'exercise_complete',
            created_at: new Date().toISOString(),
        })
    } catch {
        // Table might not exist, ignore
    }

    return { newTotalXp, leveledUp, newLevel }
}

/**
 * Update athlete streak
 */
export async function updateStreak(
    supabase: SupabaseClient,
    athleteId: string
): Promise<{ currentStreak: number; isNewDay: boolean }> {
    // Get athlete's last activity
    const { data: lastCompletion } = await supabase
        .from('exercise_completions')
        .select('completed_at')
        .eq('athlete_id', athleteId)
        .order('completed_at', { ascending: false })
        .limit(2)

    if (!lastCompletion || lastCompletion.length === 0) {
        return { currentStreak: 1, isNewDay: true }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Get current streak from athlete profile
    const { data: athlete } = await supabase
        .from('athlete_profiles')
        .select('streak_days, last_activity_date')
        .eq('id', athleteId)
        .single()

    const lastActivityDate = athlete?.last_activity_date ? new Date(athlete.last_activity_date) : null
    lastActivityDate?.setHours(0, 0, 0, 0)

    let currentStreak = athlete?.streak_days || 0
    let isNewDay = false

    if (!lastActivityDate || lastActivityDate < yesterday) {
        // Streak broken - reset to 1
        currentStreak = 1
        isNewDay = true
    } else if (lastActivityDate.getTime() === yesterday.getTime()) {
        // Consecutive day - increase streak
        currentStreak += 1
        isNewDay = true
    } else if (lastActivityDate.getTime() === today.getTime()) {
        // Same day - no change
        isNewDay = false
    } else {
        // First activity
        currentStreak = 1
        isNewDay = true
    }

    // Update athlete profile
    if (isNewDay) {
        await supabase
            .from('athlete_profiles')
            .update({
                streak_days: currentStreak,
                last_activity_date: today.toISOString().split('T')[0],
            })
            .eq('id', athleteId)
    }

    return { currentStreak, isNewDay }
}

/**
 * Check and award new achievements
 */
export async function checkAndAwardAchievements(
    supabase: SupabaseClient,
    athleteId: string
): Promise<{ newAchievements: string[]; totalXpAwarded: number }> {
    // Get athlete stats
    const { count: completionCount } = await supabase
        .from('exercise_completions')
        .select('id', { count: 'exact', head: true })
        .eq('athlete_id', athleteId)

    const { data: athlete } = await supabase
        .from('athlete_profiles')
        .select('total_xp, streak_days')
        .eq('id', athleteId)
        .single()

    const stats: AchievementStats = {
        totalCompletions: completionCount || 0,
        currentStreak: athlete?.streak_days || 0,
        totalXp: athlete?.total_xp || 0,
        currentLevel: calculateLevel(athlete?.total_xp || 0),
    }

    // Get already earned achievements
    const { data: earnedAchievements } = await supabase
        .from('athlete_achievements')
        .select('achievement_id')
        .eq('athlete_id', athleteId)

    const earnedCodes = new Set(earnedAchievements?.map(a => a.achievement_id) || [])

    // Check for new achievements
    const newAchievements: string[] = []
    let totalXpAwarded = 0

    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
        if (!earnedCodes.has(achievement.code) && achievement.check(stats)) {
            // First, ensure achievement exists in achievements table
            let achievementId: string | null = null

            try {
                // Check if achievement already exists by code
                const { data: existing } = await supabase
                    .from('achievements')
                    .select('id')
                    .eq('code', achievement.code)
                    .single()

                if (existing) {
                    achievementId = existing.id
                } else {
                    // Insert new achievement
                    const { data: newAchievement } = await supabase
                        .from('achievements')
                        .insert({
                            code: achievement.code,
                            name: achievement.name,
                            description: achievement.description,
                            icon_url: achievement.icon,
                            xp_reward: achievement.xp_reward,
                            category: 'general',
                            is_system: true,
                            is_active: true,
                        })
                        .select('id')
                        .single()

                    achievementId = newAchievement?.id || null
                }
            } catch {
                // Try to get existing achievement if insert failed
                const { data: existing } = await supabase
                    .from('achievements')
                    .select('id')
                    .eq('code', achievement.code)
                    .single()
                achievementId = existing?.id || null
            }

            if (!achievementId) continue

            // Check if already earned (by achievement ID)
            const { data: alreadyEarned } = await supabase
                .from('athlete_achievements')
                .select('id')
                .eq('athlete_id', athleteId)
                .eq('achievement_id', achievementId)
                .single()

            if (alreadyEarned) continue

            // Award achievement
            const { error } = await supabase.from('athlete_achievements').insert({
                athlete_id: athleteId,
                achievement_id: achievementId,
                earned_at: new Date().toISOString(),
            })

            if (!error) {
                newAchievements.push(achievement.name)
                totalXpAwarded += achievement.xp_reward
            }
        }
    }

    // Add bonus XP for achievements
    if (totalXpAwarded > 0) {
        await addXP(supabase, athleteId, totalXpAwarded, 'achievement_bonus')
    }

    return { newAchievements, totalXpAwarded }
}

/**
 * Process exercise completion - main entry point
 */
export async function processExerciseCompletion(
    supabase: SupabaseClient,
    athleteId: string
): Promise<{
    xpEarned: number
    newTotalXp: number
    leveledUp: boolean
    newLevel: number
    currentStreak: number
    newAchievements: string[]
}> {
    // 1. Add base XP for exercise
    const { newTotalXp, leveledUp, newLevel } = await addXP(
        supabase,
        athleteId,
        XP_REWARDS.EXERCISE_COMPLETE,
        'exercise_complete'
    )

    // 2. Update streak
    const { currentStreak, isNewDay } = await updateStreak(supabase, athleteId)

    // 3. Add streak bonus if new day
    let totalXpEarned = XP_REWARDS.EXERCISE_COMPLETE
    if (isNewDay && currentStreak > 1) {
        const streakBonus = Math.min(currentStreak * XP_REWARDS.STREAK_BONUS, 100) // Cap at 100
        await addXP(supabase, athleteId, streakBonus, 'streak_bonus')
        totalXpEarned += streakBonus
    }

    // 4. Check for new achievements
    const { newAchievements, totalXpAwarded } = await checkAndAwardAchievements(supabase, athleteId)
    totalXpEarned += totalXpAwarded

    return {
        xpEarned: totalXpEarned,
        newTotalXp: newTotalXp + (isNewDay && currentStreak > 1 ? Math.min(currentStreak * XP_REWARDS.STREAK_BONUS, 100) : 0) + totalXpAwarded,
        leveledUp,
        newLevel,
        currentStreak,
        newAchievements,
    }
}
