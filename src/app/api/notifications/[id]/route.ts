import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        created_by_user:user_profiles!notifications_created_by_fkey(full_name, email),
        notification_recipients(
          id, user_id, status, channel, sent_at, delivered_at, read_at,
          user_profile:user_profiles(full_name, email)
        )
      `)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/notifications/[id] error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ success: false, data: null, error: 'Internal server error' }, { status: 500 })
  }
}
