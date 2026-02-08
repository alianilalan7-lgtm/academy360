import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    await notificationService.markAsRead(id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/notifications/[id]/read error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ success: false, data: null, error: 'Internal server error' }, { status: 500 })
  }
}
