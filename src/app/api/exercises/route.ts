import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, Exercise } from '@/lib/types'

const exerciseQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
  category: z.enum(['warmup', 'coordination', 'strength_agility', 'ball_work', 'cooldown']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  search: z.string().optional(),
  is_system: z.enum(['true', 'false']).optional(),
})

const exerciseCreateSchema = z.object({
  category: z.enum(['warmup', 'coordination', 'strength_agility', 'ball_work', 'cooldown']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  order_number: z.number().int().min(1).max(7),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  video_url: z.string().url().optional().nullable(),
  animation_url: z.string().url().optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  repetitions: z.number().int().positive().optional().nullable(),
  duration_seconds: z.number().int().positive().optional().nullable(),
  rest_seconds: z.number().int().min(0).optional().nullable(),
  sets: z.number().int().positive().optional().default(1),
  equipment: z.array(z.string()).optional().nullable(),
  instructions: z.any().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validationResult = exerciseQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
        success: false,
      }
      return NextResponse.json(response, { status: 400 })
    }

    const { page, pageSize, category, difficulty, search, is_system } = validationResult.data

    let query = (supabase as any)
      .from('exercises')
      .select('*', { count: 'exact' })

    // Show system exercises + org exercises
    if (is_system === 'true') {
      query = query.eq('is_system', true)
    } else if (user.currentOrganizationId) {
      query = query.or(`is_system.eq.true,organization_id.eq.${user.currentOrganizationId}`)
    } else {
      query = query.eq('is_system', true)
    }

    if (category) query = query.eq('category', category)
    if (difficulty) query = query.eq('difficulty', difficulty)
    if (search) query = query.ilike('name', `%${search}%`)

    query = query.eq('is_active', true)
    query = query.order('category').order('difficulty').order('order_number')

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: exercises, error, count } = await query

    if (error) {
      console.error('Error fetching exercises:', error)
      const response: ApiResponse<null> = { data: null, error: 'Egzersizler yüklenemedi', success: false }
      return NextResponse.json(response, { status: 500 })
    }

    const response: PaginatedResponse<Exercise> = {
      data: exercises as any,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Exercises GET error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json({ data: null, error: 'Yetkiniz yok', success: false }, { status: 403 })
    }

    const supabase = await createClient()
    const body = await request.json()

    const validationResult = exerciseCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { data: exercise, error } = await (supabase as any)
      .from('exercises')
      .insert({
        ...validationResult.data,
        organization_id: user.currentOrganizationId,
        created_by: user.id,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating exercise:', error)
      return NextResponse.json({ data: null, error: 'Egzersiz oluşturulamadı', success: false }, { status: 500 })
    }

    return NextResponse.json({ data: exercise, error: null, success: true }, { status: 201 })
  } catch (error) {
    console.error('Exercises POST error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}
