import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier') || ''

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        logo_url,
        subscription_tier,
        subscription_valid_until,
        created_at,
        settings
      `, { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    if (tier) {
      query = query.eq('subscription_tier', tier)
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: organizations, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    // Get member counts for each organization
    const orgIds = organizations?.map((o) => o.id) || []

    const { data: memberCounts } = await supabase
      .from('memberships')
      .select('organization_id, role, status')
      .in('organization_id', orgIds)
      .eq('status', 'active')

    // Calculate stats for each org
    const orgsWithStats = (organizations || []).map((org) => {
      const orgMembers = (memberCounts || []).filter((m) => m.organization_id === org.id)
      const athletes = orgMembers.filter((m) => m.role === 'athlete').length
      const coaches = orgMembers.filter((m) => m.role === 'coach').length
      const admins = orgMembers.filter((m) => m.role === 'club_admin').length

      return {
        ...org,
        stats: {
          totalMembers: orgMembers.length,
          athletes,
          coaches,
          admins,
        },
        isActive: org.subscription_valid_until
          ? new Date(org.subscription_valid_until) > new Date()
          : true,
      }
    })

    return NextResponse.json({
      success: true,
      data: orgsWithStats,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error('Admin organizations error:', error)
    return NextResponse.json(
      { success: false, error: 'Organizasyonlar yüklenemedi' },
      { status: 500 }
    )
  }
}
