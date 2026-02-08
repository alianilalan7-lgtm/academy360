import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()

    // Check if user is super_admin
    const isSuperAdmin = user.memberships?.some(
      (m) => m.role === 'super_admin' && m.status === 'active'
    )

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Bu sayfaya erişim yetkiniz yok' },
        { status: 403 }
      )
    }

    const supabase = await createServiceClient()

    // Get all stats in parallel
    const [
      orgsResult,
      usersResult,
      athletesResult,
      coachesResult,
      sessionsResult,
      paymentsResult,
    ] = await Promise.all([
      // Total organizations
      supabase.from('organizations').select('id', { count: 'exact', head: true }),

      // Total users
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),

      // Total athletes
      supabase.from('athlete_profiles').select('id', { count: 'exact', head: true }),

      // Total coaches
      supabase.from('coach_profiles').select('id', { count: 'exact', head: true }),

      // Active sessions (scheduled for today or future)
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .gte('scheduled_start', new Date().toISOString().split('T')[0])
        .in('status', ['scheduled', 'in_progress']),

      // Payment stats - this month
      supabase
        .from('fee_payments')
        .select('amount, status')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ])

    // Calculate payment stats
    const payments = paymentsResult.data || []
    const totalRevenue = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
    const pendingPayments = payments.filter((p) => p.status === 'pending' || p.status === 'overdue').length

    // Get recent activity - new members this month
    const { count: newMembersThisMonth } = await supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    // Get organizations with details for breakdown
    const { data: orgBreakdown } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        subscription_tier,
        memberships(id)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    const stats = {
      totalOrganizations: orgsResult.count || 0,
      totalUsers: usersResult.count || 0,
      totalAthletes: athletesResult.count || 0,
      totalCoaches: coachesResult.count || 0,
      activeSessions: sessionsResult.count || 0,
      monthlyRevenue: totalRevenue,
      pendingPayments,
      newMembersThisMonth: newMembersThisMonth || 0,
      recentOrganizations: (orgBreakdown || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        tier: org.subscription_tier,
        memberCount: org.memberships?.length || 0,
      })),
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { success: false, error: 'İstatistikler yüklenemedi' },
      { status: 500 }
    )
  }
}
