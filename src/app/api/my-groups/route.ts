import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/my-groups
 * Returns the authenticated user's groups (via group_members)
 * Uses service client to bypass RLS (auth checked via requireAuth)
 */
export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()

    // Find groups the user belongs to
    const { data: memberships, error } = await supabase
      .from('group_members')
      .select('group_id, joined_at, groups!inner(id, name, age_group, organization_id)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching my groups:', error)
      return NextResponse.json({ success: false, data: null, error: 'Gruplar yuklenemedi' }, { status: 500 })
    }

    // Filter by current org
    const groups = (memberships || [])
      .filter((m: any) => !user.currentOrganizationId || m.groups?.organization_id === user.currentOrganizationId)
      .map((m: any) => ({
        id: m.groups?.id || m.group_id,
        name: m.groups?.name || 'Grup',
        age_group: m.groups?.age_group,
        joined_at: m.joined_at,
      }))

    return NextResponse.json({ success: true, data: groups, error: null })
  } catch (error) {
    console.error('GET /api/my-groups error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ success: false, data: null, error: 'Internal server error' }, { status: 500 })
  }
}
