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
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
