import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { notificationService } from '@/lib/services/notification'

const createSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  type: z.string().default('general'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  targetRoles: z.array(z.enum(['athlete', 'coach', 'club_admin', 'parent', 'super_admin'])).optional(),
  targetGroupIds: z.array(z.string().uuid()).optional(),
  targetUserIds: z.array(z.string().uuid()).optional(),
  scheduledFor: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const result = await notificationService.getUserNotifications(user.id, page, pageSize)

    return NextResponse.json({
      success: true,
      data: result.notifications,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const payload = createSchema.parse(body)

    const result = await notificationService.create({
      ...payload,
      createdBy: user.id,
      scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : undefined,
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
