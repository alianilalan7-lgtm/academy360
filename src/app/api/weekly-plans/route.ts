import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uuidLikeSchema } from '@/lib/validation'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import type { ApiResponse, WeeklyPlan } from '@/lib/types'

const planQuerySchema = z.object({
  group_id: uuidLikeSchema().optional(),
  week_start: z.string().optional(),
})

const planCreateSchema = z.object({
  group_id: uuidLikeSchema().optional().nullable(),
  week_start: z.string().min(1),
  plan_data: z.record(z.string(), z.any()),
  notes: z.string().optional().nullable(),
  is_published: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validationResult = planQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { group_id, week_start } = validationResult.data

    let query = (supabase as any)
      .from('weekly_plans')
      .select('*')

    if (user.currentOrganizationId) {
      query = query.eq('organization_id', user.currentOrganizationId)
    }

    if (group_id) query = query.eq('group_id', group_id)
    if (week_start) query = query.eq('week_start', week_start)

    // Athletes and parents can only see published plans
    if (!isAdmin(user) && !isCoach(user)) {
      query = query.eq('is_published', true)
    }

    query = query.order('week_start', { ascending: false })

    const { data: plans, error } = await query

    if (error) {
      console.error('Error fetching weekly plans:', error)
      return NextResponse.json({ data: null, error: 'Planlar yüklenemedi', success: false }, { status: 500 })
    }

    const response: ApiResponse<WeeklyPlan[]> = { data: plans as any, error: null, success: true }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Weekly plans GET error:', error)
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

    const validationResult = planCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { data: plan, error } = await (supabase as any)
      .from('weekly_plans')
      .insert({
        ...validationResult.data,
        organization_id: user.currentOrganizationId!,
        coach_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating weekly plan:', error)
      if (error.code === '23505') {
        return NextResponse.json({ data: null, error: 'Bu hafta için zaten plan mevcut', success: false }, { status: 409 })
      }
      return NextResponse.json({ data: null, error: 'Plan oluşturulamadı', success: false }, { status: 500 })
    }

    return NextResponse.json({ data: plan, error: null, success: true }, { status: 201 })
  } catch (error) {
    console.error('Weekly plans POST error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}

const planUpdateSchema = z.object({
  id: uuidLikeSchema(),
  plan_data: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional().nullable(),
  is_published: z.boolean().optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json({ data: null, error: 'Yetkiniz yok', success: false }, { status: 403 })
    }

    const supabase = await createServiceClient()
    const body = await request.json()

    const validationResult = planUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { id, ...updateData } = validationResult.data

    const { data: plan, error } = await (supabase as any)
      .from('weekly_plans')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', user.currentOrganizationId!)
      .select()
      .single()

    if (error) {
      console.error('Error updating weekly plan:', error)
      return NextResponse.json({ data: null, error: 'Plan guncellenemedi', success: false }, { status: 500 })
    }

    return NextResponse.json({ data: plan, error: null, success: true })
  } catch (error) {
    console.error('Weekly plans PUT error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}
