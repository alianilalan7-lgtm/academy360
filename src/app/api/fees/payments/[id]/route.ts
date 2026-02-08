import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled', 'refunded']).optional(),
  paid_date: z.string().optional(),
  payment_method: z.string().optional(),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('fee_payments')
      .select(`
        *,
        athlete:athlete_profiles(*, user_profile:user_profiles(*)),
        fee_plan:fee_plans(*),
        recorder:user_profiles!fee_payments_recorded_by_fkey(full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/fees/payments/[id] error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ success: false, data: null, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (!isAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const updates = updateSchema.parse(body)
    const supabase = await createServiceClient()

    const updateData: Record<string, unknown> = {}
    if (updates.status) updateData.status = updates.status
    if (updates.paid_date) updateData.paid_date = updates.paid_date
    if (updates.payment_method) updateData.payment_method = updates.payment_method
    if (updates.transaction_id) updateData.transaction_id = updates.transaction_id
    if (updates.notes !== undefined) updateData.notes = updates.notes

    if (updates.status === 'paid' && !updates.paid_date) {
      updateData.paid_date = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('fee_payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('PATCH /api/fees/payments/[id] error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ success: false, data: null, error: 'Internal server error' }, { status: 500 })
  }
}
