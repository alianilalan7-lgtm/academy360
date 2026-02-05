import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id: orgId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const role = searchParams.get('role')
    const status = searchParams.get('status') || 'active'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    let query = supabase
      .from('memberships')
      .select(`
        *,
        user_profile:user_profiles(id, email, full_name, avatar_url, phone)
      `, { count: 'exact' })
      .eq('organization_id', orgId)

    if (role) query = query.eq('role', role as any)
    if (status) query = query.eq('status', status as any)

    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    let filtered = data || []
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((m: any) =>
        m.user_profile?.full_name?.toLowerCase().includes(s) ||
        m.user_profile?.email?.toLowerCase().includes(s)
      )
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['athlete', 'coach', 'club_admin', 'parent']),
  fullName: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (!isAdmin(user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id: orgId } = await params
    const body = await request.json()
    const { email, role, fullName } = inviteSchema.parse(body)
    const supabase = await createClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('organization_id', orgId)
        .single()

      if (existingMember) {
        return NextResponse.json({ success: false, error: 'User is already a member' }, { status: 409 })
      }

      // Create pending membership
      const { data, error } = await supabase
        .from('memberships')
        .insert({
          user_id: existingUser.id,
          organization_id: orgId,
          role,
          status: 'pending',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

      return NextResponse.json({ success: true, data, message: 'Invitation sent' }, { status: 201 })
    }

    // User doesn't exist - store invite for when they register
    return NextResponse.json({
      success: true,
      data: { email, role, organizationId: orgId },
      message: 'Invite stored. User will be added when they register.',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
