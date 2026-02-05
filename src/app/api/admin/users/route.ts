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
    const role = searchParams.get('role') || ''
    const organizationId = searchParams.get('organizationId') || ''

    const supabase = await createClient()

    // Build query for users with their memberships
    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        full_name,
        phone,
        avatar_url,
        created_at,
        onboarding_completed,
        memberships(
          id,
          role,
          status,
          organization_id,
          organizations(id, name)
        )
      `, { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    // Filter by role or organization if specified (post-query)
    let filteredUsers = users || []

    if (role) {
      filteredUsers = filteredUsers.filter((u: any) =>
        u.memberships?.some((m: any) => m.role === role && m.status === 'active')
      )
    }

    if (organizationId) {
      filteredUsers = filteredUsers.filter((u: any) =>
        u.memberships?.some((m: any) => m.organization_id === organizationId)
      )
    }

    // Format users data
    const formattedUsers = filteredUsers.map((u: any) => {
      const activeMemberships = (u.memberships || []).filter((m: any) => m.status === 'active')
      const primaryMembership = activeMemberships[0]

      return {
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        phone: u.phone,
        avatarUrl: u.avatar_url,
        createdAt: u.created_at,
        onboardingCompleted: u.onboarding_completed,
        role: primaryMembership?.role || null,
        organization: primaryMembership?.organizations?.name || null,
        organizationId: primaryMembership?.organization_id || null,
        membershipCount: activeMemberships.length,
        status: activeMemberships.length > 0 ? 'active' : 'inactive',
      }
    })

    // Get role statistics
    const { data: allMemberships } = await supabase
      .from('memberships')
      .select('role, status')
      .eq('status', 'active')

    const roleStats = {
      total: count || 0,
      athletes: (allMemberships || []).filter((m) => m.role === 'athlete').length,
      coaches: (allMemberships || []).filter((m) => m.role === 'coach').length,
      admins: (allMemberships || []).filter((m) => m.role === 'club_admin').length,
      parents: (allMemberships || []).filter((m) => m.role === 'parent').length,
      superAdmins: (allMemberships || []).filter((m) => m.role === 'super_admin').length,
    }

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      stats: roleStats,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { success: false, error: 'Kullanıcılar yüklenemedi' },
      { status: 500 }
    )
  }
}
