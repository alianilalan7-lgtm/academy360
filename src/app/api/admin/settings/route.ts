import { NextRequest, NextResponse } from 'next/server'
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

    // Get platform-wide stats
    const [
      { count: totalOrgs },
      { count: totalUsers },
      { count: totalAthletes },
      { count: totalSessions },
      { count: activeSubscriptions },
    ] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('athlete_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase.from('organizations').select('id', { count: 'exact', head: true })
        .gt('subscription_valid_until', new Date().toISOString()),
    ])

    // Get recent activity
    const { data: recentUsers } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    // Calculate growth (users in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: newUsersThisMonth } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalOrgs: totalOrgs || 0,
          totalUsers: totalUsers || 0,
          totalAthletes: totalAthletes || 0,
          totalSessions: totalSessions || 0,
          activeSubscriptions: activeSubscriptions || 0,
          newUsersThisMonth: newUsersThisMonth || 0,
        },
        recentUsers: recentUsers || [],
        // Platform settings (can be extended)
        platformSettings: {
          platformName: 'Academy360',
          defaultLanguage: 'tr',
          timezone: 'Europe/Istanbul',
          sessionDuration: 120, // minutes
          maxFileUploadSize: 10, // MB
          maintenanceMode: false,
        }
      },
    })
  } catch (error) {
    console.error('Admin settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Ayarlar yüklenemedi' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()

    // For now, just acknowledge the settings update
    // In a real implementation, this would save to a platform_settings table
    console.log('Settings update requested:', body)

    return NextResponse.json({
      success: true,
      data: { message: 'Ayarlar güncellendi' },
    })
  } catch (error) {
    console.error('Admin settings update error:', error)
    return NextResponse.json(
      { success: false, error: 'Ayarlar güncellenemedi' },
      { status: 500 }
    )
  }
}
