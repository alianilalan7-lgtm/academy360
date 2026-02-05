import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (!isAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id: orgId } = await params
    const supabase = await createClient()

    // Parallel queries
    const [
      membersResult,
      athletesResult,
      coachesResult,
      groupsResult,
      paymentsResult,
      pendingPaymentsResult,
      overduePaymentsResult,
      recentNotificationsResult,
    ] = await Promise.all([
      supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
      supabase.from('athlete_profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('coach_profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('groups').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
      supabase.from('fee_payments').select('amount').eq('organization_id', orgId).eq('status', 'paid')
        .gte('paid_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
      supabase.from('fee_payments').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'pending'),
      supabase.from('fee_payments').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'overdue'),
      supabase.from('notifications').select('id, title, notification_type, priority, created_at')
        .eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
    ])

    const monthlyRevenue = paymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        totalMembers: membersResult.count || 0,
        activeAthletes: athletesResult.count || 0,
        coaches: coachesResult.count || 0,
        groups: groupsResult.count || 0,
        monthlyRevenue,
        pendingPayments: pendingPaymentsResult.count || 0,
        paymentStats: {
          paid: (paymentsResult.data?.length || 0),
          pending: pendingPaymentsResult.count || 0,
          overdue: overduePaymentsResult.count || 0,
        },
        recentNotifications: recentNotificationsResult.data || [],
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
