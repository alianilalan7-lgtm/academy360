import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/exercises/my-completions
 * Get today's completed exercise IDs for the current athlete
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth()
        const supabase = await createServiceClient()

        // Get athlete profile
        const { data: athleteProfile } = await supabase
            .from('athlete_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!athleteProfile) {
            return NextResponse.json({ data: [], error: null, success: true })
        }

        // Use last 24 hours instead of "today" to handle timezone differences
        const now = new Date()
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        // Fetch completions for last 24 hours
        const { data: completions, error } = await supabase
            .from('exercise_completions')
            .select('exercise_id, completed_at')
            .eq('athlete_id', athleteProfile.id)
            .gte('completed_at', twentyFourHoursAgo.toISOString())

        if (error) {
            console.error('Error fetching completions:', error)
            return NextResponse.json({ data: [], error: 'Tamamlamalar yüklenemedi', success: false }, { status: 500 })
        }

        // Extract unique exercise IDs
        const completedExerciseIds = [...new Set(completions?.map(c => c.exercise_id) || [])]

        return NextResponse.json({
            data: completedExerciseIds,
            error: null,
            success: true,
            count: completedExerciseIds.length
        })
    } catch (error) {
        console.error('My completions GET error:', error)
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ data: [], error: 'Unauthorized', success: false }, { status: 401 })
        }
        return NextResponse.json({ data: [], error: 'Internal server error', success: false }, { status: 500 })
    }
}
