import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

const completionSchema = z.object({
  program_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  duration_seconds: z.number().int().positive().optional().nullable(),
  sets_completed: z.number().int().positive().optional().default(1),
  reps_completed: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: exerciseId } = await params
    const supabase = await createClient()

    // Get athlete profile
    const { data: athleteProfile } = await supabase
      .from('athlete_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!athleteProfile) {
      return NextResponse.json({ data: null, error: 'Sporcu profili bulunamadı', success: false }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = completionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { data: completion, error } = await (supabase as any)
      .from('exercise_completions')
      .insert({
        athlete_id: athleteProfile.id,
        exercise_id: exerciseId,
        ...validationResult.data,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating completion:', error)
      return NextResponse.json({ data: null, error: 'Tamamlama kaydedilemedi', success: false }, { status: 500 })
    }

    // TODO: Update athlete XP (function to be implemented)

    return NextResponse.json({ data: completion, error: null, success: true }, { status: 201 })
  } catch (error) {
    console.error('Exercise complete POST error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}
