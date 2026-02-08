import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const selectRoleSchema = z.object({
  role: z.enum(['athlete', 'coach', 'parent']),
  organizationSlug: z.string().optional(),
  organizationName: z.string().optional(),
  inviteCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { role, organizationSlug, organizationName, inviteCode } = selectRoleSchema.parse(body)
    const supabase = await createClient()

    let organizationId: string | null = null

    // If invite code provided, find the organization
    if (inviteCode) {
      const { data: membership } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single()

      if (membership) {
        organizationId = membership.organization_id
        // Activate the membership
        await supabase
          .from('memberships')
          .update({ status: 'active', role, joined_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
      }
    }

    // If slug provided, find org
    if (organizationSlug && !organizationId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', organizationSlug)
        .single()

      if (org) {
        organizationId = org.id
      }
    }

    // If club_admin role with new org name, create organization
    if (organizationName && !organizationId) {
      const slug = organizationName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: organizationName, slug: `${slug}-${Date.now().toString(36)}` })
        .select()
        .single()

      if (orgError) return NextResponse.json({ success: false, error: orgError.message }, { status: 400 })
      organizationId = newOrg.id
    }

    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 400 })
    }

    // Check existing membership
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('role', role)
      .single()

    if (!existingMembership) {
      // Create membership
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          role,
          status: 'active',
          joined_at: new Date().toISOString(),
        })

      if (memberError) return NextResponse.json({ success: false, error: memberError.message }, { status: 400 })
    }

    // Create role-specific profile
    if (role === 'athlete') {
      const { data: existing } = await supabase
        .from('athlete_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single()

      if (!existing) {
        await supabase.from('athlete_profiles').insert({
          user_id: user.id,
          organization_id: organizationId,
        })
      }
    } else if (role === 'coach') {
      const { data: existing } = await supabase
        .from('coach_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single()

      if (!existing) {
        await supabase.from('coach_profiles').insert({
          user_id: user.id,
          organization_id: organizationId,
        })
      }
    }

    // Mark onboarding as completed
    await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      data: { role, organizationId },
    })
  } catch (error) {
    console.error('POST /api/auth/select-role error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ success: false, data: null, error: 'Internal server error' }, { status: 500 })
  }
}
