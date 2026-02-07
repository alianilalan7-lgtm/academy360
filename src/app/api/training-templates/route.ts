import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, TrainingTemplate } from '@/lib/types'

const templateQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
  age_group: z.enum(['U9', 'U11', 'U13', 'U15', 'U17', 'U18', 'academy']).optional(),
  template_type: z.enum(['technical', 'tactical', 'physical', 'game_based']).optional(),
})

const templateCreateSchema = z.object({
  age_group: z.enum(['U9', 'U11', 'U13', 'U15', 'U17', 'U18', 'academy']),
  template_type: z.enum(['technical', 'tactical', 'physical', 'game_based']),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  exercise_ids: z.array(z.string().uuid()).optional().default([]),
  duration_minutes: z.number().int().positive().optional().nullable(),
  intensity_level: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validationResult = templateQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { page, pageSize, age_group, template_type } = validationResult.data

    let query = (supabase as any)
      .from('training_templates')
      .select('*', { count: 'exact' })

    if (user.currentOrganizationId) {
      query = query.or(`is_system.eq.true,organization_id.eq.${user.currentOrganizationId}`)
    } else {
      query = query.eq('is_system', true)
    }

    if (age_group) query = query.eq('age_group', age_group)
    if (template_type) query = query.eq('template_type', template_type)

    query = query.eq('is_active', true)
    query = query.order('age_group').order('template_type')

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: templates, error, count } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ data: null, error: 'Şablonlar yüklenemedi', success: false }, { status: 500 })
    }

    const response: PaginatedResponse<TrainingTemplate> = {
      data: templates as any,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Templates GET error:', error)
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

    const validationResult = templateCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { data: template, error } = await (supabase as any)
      .from('training_templates')
      .insert({
        ...validationResult.data,
        organization_id: user.currentOrganizationId,
        created_by: user.id,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ data: null, error: 'Şablon oluşturulamadı', success: false }, { status: 500 })
    }

    return NextResponse.json({ data: template, error: null, success: true }, { status: 201 })
  } catch (error) {
    console.error('Templates POST error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}
