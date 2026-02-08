import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const supabase = await createServiceClient()

    const { data: exercise, error } = await (supabase as any)
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !exercise) {
      return NextResponse.json({ data: null, error: 'Egzersiz bulunamadı', success: false }, { status: 404 })
    }

    return NextResponse.json({ data: exercise, error: null, success: true })
  } catch (error) {
    console.error('Exercise GET error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json({ data: null, error: 'Yetkiniz yok', success: false }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createServiceClient()
    const body = await request.json()

    const { data: exercise, error } = await (supabase as any)
      .from('exercises')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating exercise:', error)
      return NextResponse.json({ data: null, error: 'Egzersiz güncellenemedi', success: false }, { status: 500 })
    }

    return NextResponse.json({ data: exercise, error: null, success: true })
  } catch (error) {
    console.error('Exercise PUT error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json({ data: null, error: 'Yetkiniz yok', success: false }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createServiceClient()

    const { error } = await (supabase as any)
      .from('exercises')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting exercise:', error)
      return NextResponse.json({ data: null, error: 'Egzersiz silinemedi', success: false }, { status: 500 })
    }

    return NextResponse.json({ data: null, error: null, success: true })
  } catch (error) {
    console.error('Exercise DELETE error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ data: null, error: 'Unauthorized', success: false }, { status: 401 })
    }
    return NextResponse.json({ data: null, error: 'Internal server error', success: false }, { status: 500 })
  }
}
