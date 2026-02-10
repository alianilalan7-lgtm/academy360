import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uuidLikeSchema } from '@/lib/validation'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, DevelopmentNote } from '@/lib/types'

const noteQuerySchema = z.object({
  athlete_id: uuidLikeSchema().optional(),
  session_id: uuidLikeSchema().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const noteCreateSchema = z.object({
  athlete_id: uuidLikeSchema(),
  session_id: uuidLikeSchema().optional().nullable(),
  note: z.string().min(1),
  category: z.string().optional().nullable(),
  is_private: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validationResult = noteQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => e.message).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { athlete_id, session_id, category, page, pageSize } = validationResult.data

    let query = (supabase as any)
      .from('development_notes')
      .select('*', { count: 'exact' })

    if (user.currentOrganizationId) {
      query = query.eq('organization_id', user.currentOrganizationId)
    }

    if (athlete_id) query = query.eq('athlete_id', athlete_id)
    if (session_id) query = query.eq('session_id', session_id)
    if (category) query = query.eq('category', category)

    // Athletes and parents can only see non-private notes
    if (!isAdmin(user) && !isCoach(user)) {
      query = query.eq('is_private', false)
    }

    query = query.order('created_at', { ascending: false })

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: notes, error, count } = await query

    if (error) {
      console.error('Error fetching development notes:', error)
      return NextResponse.json({ data: null, error: 'Notlar yüklenemedi', success: false }, { status: 500 })
    }

    const response: PaginatedResponse<DevelopmentNote> = {
      data: notes as any,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Development notes GET error:', error)
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

    const validationResult = noteCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        data: null,
        error: validationResult.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', '),
        success: false,
      }, { status: 400 })
    }

    const { data: note, error } = await (supabase as any)
      .from('development_notes')
      .insert({
        ...validationResult.data,
        organization_id: user.currentOrganizationId!,
        coach_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating development note:', error)
      return NextResponse.json({ data: null, error: 'Not oluşturulamadı', success: false }, { status: 500 })
    }

    return NextResponse.json({ data: note, error: null, success: true }, { status: 201 })
  } catch (error) {
    console.error('Development notes POST error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}
