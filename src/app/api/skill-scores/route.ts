import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, SkillScore } from '@/lib/types'

const skillScoreQuerySchema = z.object({
  athlete_id: z.string().uuid().optional(),
  category: z.enum(['technical', 'physical', 'behavioral']).optional(),
  skill_name: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
})

const skillScoreCreateSchema = z.object({
  athlete_id: z.string().uuid(),
  category: z.enum(['technical', 'physical', 'behavioral']),
  skill_name: z.string().min(1).max(100),
  score: z.number().int().min(1).max(10),
  session_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const bulkSkillScoreSchema = z.object({
  athlete_id: z.string().uuid(),
  session_id: z.string().uuid().optional().nullable(),
  scores: z.array(z.object({
    category: z.enum(['technical', 'physical', 'behavioral']),
    skill_name: z.string().min(1).max(100),
    score: z.number().int().min(1).max(10),
    notes: z.string().optional().nullable(),
  })).min(1),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validationResult = skillScoreQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { athlete_id, category, skill_name, page, pageSize } = validationResult.data

    let query = (supabase as any)
      .from('skill_scores')
      .select('*', { count: 'exact' })

    if (user.currentOrganizationId) {
      query = query.eq('organization_id', user.currentOrganizationId)
    }

    if (athlete_id) query = query.eq('athlete_id', athlete_id)
    if (category) query = query.eq('category', category)
    if (skill_name) query = query.eq('skill_name', skill_name)

    query = query.order('measured_at', { ascending: false })

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: scores, error, count } = await query

    if (error) {
      console.error('Error fetching skill scores:', error)
      return NextResponse.json({ data: null, error: 'Puanlar yüklenemedi', success: false }, { status: 500 })
    }

    const response: PaginatedResponse<SkillScore> = {
      data: scores as any,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Skill scores GET error:', error)
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

    const supabase = await createServiceClient()
    const body = await request.json()

    // Check if bulk or single
    const bulkResult = bulkSkillScoreSchema.safeParse(body)
    if (bulkResult.success) {
      const { athlete_id, session_id, scores } = bulkResult.data
      const insertData = scores.map(s => ({
        athlete_id,
        organization_id: user.currentOrganizationId!,
        scorer_id: user.id,
        session_id: session_id ?? null,
        measured_at: new Date().toISOString(),
        ...s,
      }))

      const { data: results, error } = await (supabase as any)
        .from('skill_scores')
        .insert(insertData)
        .select()

      if (error) {
        console.error('Error creating bulk skill scores:', error)
        return NextResponse.json({ data: null, error: 'Puanlar kaydedilemedi', success: false }, { status: 500 })
      }

      return NextResponse.json({ data: results, error: null, success: true }, { status: 201 })
    }

    // Single score
    const singleResult = skillScoreCreateSchema.safeParse(body)
    if (!singleResult.success) {
      return NextResponse.json({
        data: null,
        error: singleResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { data: score, error } = await (supabase as any)
      .from('skill_scores')
      .insert({
        ...singleResult.data,
        organization_id: user.currentOrganizationId!,
        scorer_id: user.id,
        measured_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating skill score:', error)
      return NextResponse.json({ data: null, error: 'Puan kaydedilemedi', success: false }, { status: 500 })
    }

    return NextResponse.json({ data: score, error: null, success: true }, { status: 201 })
  } catch (error) {
    console.error('Skill scores POST error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}
