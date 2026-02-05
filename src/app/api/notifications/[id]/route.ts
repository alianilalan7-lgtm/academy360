import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const supabase = await createClient()

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
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
