import { createServiceClient } from '@/lib/supabase/server'
import type { EmailAdapter } from '@/lib/adapters/email'
import { generateEmailTemplate } from '@/lib/adapters/email'
import { ResendAdapter } from '@/lib/adapters/email/resend'
import { ConsoleEmailAdapter } from '@/lib/adapters/email/console'
import type { UserRole, Database } from '@/lib/types'

type Json = Database['public']['Tables']['notifications']['Row']['metadata']

interface NotificationPayload {
  organizationId: string
  title: string
  body: string
  type: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  targetRoles?: UserRole[]
  targetGroupIds?: string[]
  targetUserIds?: string[]
  metadata?: Json
  scheduledFor?: Date
  createdBy: string
}

interface SendResult {
  notificationId: string
  recipientCount: number
  sentCount: number
  failedCount: number
}

class NotificationService {
  private emailAdapter: EmailAdapter

  constructor() {
    // Use console adapter in development, Resend in production
    const isDev = process.env.NODE_ENV === 'development' || !process.env.EMAIL_API_KEY
    this.emailAdapter = isDev ? new ConsoleEmailAdapter() : new ResendAdapter()
  }

  async create(payload: NotificationPayload): Promise<SendResult> {
    const supabase = await createServiceClient()

    // Create the notification record
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        organization_id: payload.organizationId,
        title: payload.title,
        body: payload.body,
        notification_type: payload.type,
        priority: payload.priority || 'normal',
        target_roles: payload.targetRoles,
        target_groups: payload.targetGroupIds,
        metadata: payload.metadata ?? null,
        scheduled_for: payload.scheduledFor?.toISOString(),
        created_by: payload.createdBy,
      })
      .select()
      .single()

    if (notificationError || !notification) {
      throw new Error(`Failed to create notification: ${notificationError?.message}`)
    }

    // Determine recipients
    const recipientIds = await this.resolveRecipients(
      payload.organizationId,
      payload.targetRoles,
      payload.targetGroupIds,
      payload.targetUserIds
    )

    if (recipientIds.length === 0) {
      return {
        notificationId: notification.id,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
      }
    }

    // Create recipient records
    const recipientRecords = recipientIds.map(userId => ({
      notification_id: notification.id,
      user_id: userId,
      status: 'pending' as const,
      channel: 'email' as const,
    }))

    const { error: recipientError } = await supabase
      .from('notification_recipients')
      .insert(recipientRecords)

    if (recipientError) {
      console.error('Failed to create notification recipients:', recipientError)
    }

    // If not scheduled, send immediately
    if (!payload.scheduledFor) {
      return await this.sendNotification(notification.id)
    }

    return {
      notificationId: notification.id,
      recipientCount: recipientIds.length,
      sentCount: 0,
      failedCount: 0,
    }
  }

  async sendNotification(notificationId: string): Promise<SendResult> {
    const supabase = await createServiceClient()

    // Get notification with recipients
    const { data: notification } = await supabase
      .from('notifications')
      .select(`
        *,
        notification_recipients (
          id,
          user_id,
          channel,
          status
        )
      `)
      .eq('id', notificationId)
      .single()

    if (!notification) {
      throw new Error('Notification not found')
    }

    const pendingRecipients = notification.notification_recipients?.filter(
      r => r.status === 'pending'
    ) || []

    let sentCount = 0
    let failedCount = 0

    // Process each recipient
    for (const recipient of pendingRecipients) {
      try {
        // Get user profile for email
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('email, full_name, notification_preferences')
          .eq('id', recipient.user_id)
          .single()

        if (!userProfile) continue

        // Check if user has email notifications enabled
        const prefs = userProfile.notification_preferences as Record<string, boolean> | null
        if (prefs && prefs.email === false) {
          await supabase
            .from('notification_recipients')
            .update({ status: 'delivered', delivered_at: new Date().toISOString() })
            .eq('id', recipient.id)
          continue
        }

        // Generate and send email
        const template = generateEmailTemplate('notification', {
          name: userProfile.full_name || 'Kullanıcı',
          title: notification.title,
          body: notification.body,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/notifications/${notificationId}`,
        })

        const result = await this.emailAdapter.send({
          to: userProfile.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })

        if (result.success) {
          await supabase
            .from('notification_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', recipient.id)
          sentCount++
        } else {
          await supabase
            .from('notification_recipients')
            .update({
              status: 'failed',
              error_message: result.error,
            })
            .eq('id', recipient.id)
          failedCount++
        }
      } catch (error) {
        console.error(`Failed to send notification to ${recipient.user_id}:`, error)
        failedCount++
      }
    }

    // Update notification sent_at
    await supabase
      .from('notifications')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', notificationId)

    return {
      notificationId,
      recipientCount: pendingRecipients.length,
      sentCount,
      failedCount,
    }
  }

  private async resolveRecipients(
    organizationId: string,
    targetRoles?: UserRole[],
    targetGroupIds?: string[],
    targetUserIds?: string[]
  ): Promise<string[]> {
    const supabase = await createServiceClient()
    const userIds = new Set<string>()

    // If specific user IDs provided, use those
    if (targetUserIds && targetUserIds.length > 0) {
      targetUserIds.forEach(id => userIds.add(id))
      return Array.from(userIds)
    }

    // Get users by role
    if (targetRoles && targetRoles.length > 0) {
      const { data: memberships } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('role', targetRoles)

      memberships?.forEach(m => userIds.add(m.user_id))
    }

    // Get users by group
    if (targetGroupIds && targetGroupIds.length > 0) {
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .in('group_id', targetGroupIds)
        .eq('is_active', true)

      groupMembers?.forEach(gm => userIds.add(gm.user_id))
    }

    return Array.from(userIds)
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const supabase = await createServiceClient()

    await supabase
      .from('notification_recipients')
      .update({ read_at: new Date().toISOString(), status: 'read' })
      .eq('notification_id', notificationId)
      .eq('user_id', userId)
  }

  async getUserNotifications(userId: string, page = 1, pageSize = 20) {
    const supabase = await createServiceClient()

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('notification_recipients')
      .select(`
        *,
        notification:notifications (*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    return {
      notifications: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const supabase = await createServiceClient()

    const { count } = await supabase
      .from('notification_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)

    return count || 0
  }
}

export const notificationService = new NotificationService()
