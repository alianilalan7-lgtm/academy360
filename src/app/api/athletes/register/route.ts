import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const registerAthleteSchema = z.object({
  fullName: z.string().min(2, 'Ad en az 2 karakter olmali'),
  position: z.string().max(100).optional().nullable(),
  jerseyNumber: z.number().int().min(0).max(999).optional().nullable(),
  birthDate: z.string().optional().nullable(),
  dominantFoot: z.enum(['left', 'right', 'both']).optional().nullable(),
})

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pass = 'Sp0r'
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
}

/**
 * POST /api/athletes/register
 * Create a new user account + athlete profile + membership in one step
 * Access: Coaches, Club Admins
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json(
        { success: false, error: 'Yetkiniz yok' },
        { status: 403 }
      )
    }

    const orgId = user.currentOrganizationId
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organizasyon bulunamadi' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = registerAthleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { fullName, position, jerseyNumber, birthDate, dominantFoot } = parsed.data
    const password = generatePassword()
    const placeholderEmail = `player_${crypto.randomUUID()}@academy360.local`

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Create auth user with placeholder email
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: placeholderEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { success: false, error: 'Kullanici olusturulamadi' },
        { status: 500 }
      )
    }

    const newUserId = authData.user.id

    // 2. Create user profile
    await serviceClient.from('user_profiles').upsert({
      id: newUserId,
      email: placeholderEmail,
      full_name: fullName,
      locale: 'tr',
      timezone: 'Europe/Istanbul',
      onboarding_completed: false,
    })

    // 3. Create membership
    await serviceClient.from('memberships').insert({
      user_id: newUserId,
      organization_id: orgId,
      role: 'athlete',
      status: 'active',
      invited_by: user.id,
      invited_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    })

    // 4. Create athlete profile
    const { data: athleteProfile, error: athleteError } = await serviceClient
      .from('athlete_profiles')
      .insert({
        user_id: newUserId,
        organization_id: orgId,
        position: position || null,
        jersey_number: jerseyNumber ?? null,
        birth_date: birthDate || null,
        dominant_foot: dominantFoot || null,
        total_xp: 0,
        current_level: 1,
        streak_days: 0,
      })
      .select(`
        *,
        user_profile:user_profiles!athlete_profiles_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          phone
        )
      `)
      .single()

    if (athleteError) {
      console.error('Error creating athlete profile:', athleteError)
      return NextResponse.json(
        { success: false, error: 'Sporcu profili olusturulamadi' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: athleteProfile,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/athletes/register error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Sunucu hatasi' },
      { status: 500 }
    )
  }
}
