import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Type for membership with organization
interface MembershipWithOrg {
  id: string
  role: string
  status: string
  joined_at: string | null
  invited_at: string | null
  organization_id: string
  organizations: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    subscription_tier: string | null
    settings: Record<string, unknown> | null
  }
}

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile with memberships
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Failed to retrieve session',
        },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Not authenticated',
        },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        phone,
        locale,
        timezone,
        kvkk_consent,
        kvkk_consent_date,
        notification_preferences,
        onboarding_completed,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single()

    if (profileError) {
      // If profile not found, user may need to complete onboarding
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: session.user.id,
              email: session.user.email,
              emailConfirmedAt: session.user.email_confirmed_at,
              lastSignInAt: session.user.last_sign_in_at,
              createdAt: session.user.created_at,
            },
            profile: null,
            memberships: [],
            needsOnboarding: true,
          },
          error: null,
        })
      }

      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Failed to retrieve user profile',
        },
        { status: 500 }
      )
    }

    // Fetch memberships separately to avoid relationship ambiguity
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select(`
        id,
        role,
        status,
        joined_at,
        invited_at,
        organization_id,
        organizations (
          id,
          name,
          slug,
          logo_url,
          subscription_tier,
          settings
        )
      `)
      .eq('user_id', userId)

    if (membershipsError) {
      console.error('Memberships fetch error:', membershipsError)
    }

    const membershipsList = (memberships || []) as unknown as MembershipWithOrg[]

    // Fetch role-specific profiles if user has active memberships
    const activeMemberships = membershipsList.filter(
      (m) => m.status === 'active'
    )

    let athleteProfiles: Record<string, unknown>[] = []
    let coachProfiles: Record<string, unknown>[] = []
    let parentRelations: Record<string, unknown>[] = []

    if (activeMemberships.length > 0) {
      const orgIds = activeMemberships.map((m) => m.organization_id)

      // Fetch athlete profiles
      const { data: athletes } = await supabase
        .from('athlete_profiles')
        .select(`
          id,
          organization_id,
          birth_date,
          position,
          jersey_number,
          height_cm,
          weight_kg,
          dominant_foot,
          total_xp,
          current_level,
          streak_days,
          last_activity_date
        `)
        .eq('user_id', userId)
        .in('organization_id', orgIds)

      if (athletes) {
        athleteProfiles = athletes
      }

      // Fetch coach profiles
      const { data: coaches } = await supabase
        .from('coach_profiles')
        .select(`
          id,
          organization_id,
          specialization,
          license_type,
          license_number,
          years_experience,
          bio
        `)
        .eq('user_id', userId)
        .in('organization_id', orgIds)

      if (coaches) {
        coachProfiles = coaches
      }

      // Fetch parent-athlete relations
      const { data: relations } = await supabase
        .from('parent_athlete_relations')
        .select(`
          id,
          organization_id,
          athlete_user_id,
          relationship_type,
          is_primary,
          can_view_progress,
          can_view_payments,
          verified
        `)
        .eq('parent_user_id', userId)
        .in('organization_id', orgIds)

      if (relations) {
        // Fetch athlete user profiles separately
        const athleteUserIds = relations.map((r) => r.athlete_user_id)
        const { data: athleteUsers } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .in('id', athleteUserIds)

        const athleteUserMap = new Map(
          (athleteUsers || []).map((u) => [u.id, u])
        )

        parentRelations = relations.map((r) => ({
          ...r,
          athlete: athleteUserMap.get(r.athlete_user_id) || null,
        }))
      }
    }

    // Transform memberships to include organization directly
    const transformedMemberships = membershipsList.map((membership) => ({
      id: membership.id,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joined_at,
      invitedAt: membership.invited_at,
      organization_id: membership.organization_id,
      organizationId: membership.organization_id,
      organization: membership.organizations,
    }))

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: session.user.id,
          email: session.user.email,
          emailConfirmedAt: session.user.email_confirmed_at,
          lastSignInAt: session.user.last_sign_in_at,
          createdAt: session.user.created_at,
        },
        profile: {
          id: userProfile.id,
          email: userProfile.email,
          fullName: userProfile.full_name,
          avatarUrl: userProfile.avatar_url,
          phone: userProfile.phone,
          locale: userProfile.locale,
          timezone: userProfile.timezone,
          kvkkConsent: userProfile.kvkk_consent,
          kvkkConsentDate: userProfile.kvkk_consent_date,
          notificationPreferences: userProfile.notification_preferences,
          onboardingCompleted: userProfile.onboarding_completed,
          createdAt: userProfile.created_at,
          updatedAt: userProfile.updated_at,
        },
        memberships: transformedMemberships,
        athleteProfiles,
        coachProfiles,
        parentRelations,
        needsOnboarding: !userProfile.onboarding_completed,
      },
      error: null,
    })
  } catch (err) {
    console.error('Get current user error:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'An unexpected error occurred while retrieving user data',
      },
      { status: 500 }
    )
  }
}
