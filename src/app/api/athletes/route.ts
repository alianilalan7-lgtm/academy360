import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireRole, isAdmin, isCoach, isParent } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { AthleteProfileInsert, ApiResponse, AthleteWithProfile } from '@/lib/types'

// Validation schema for creating an athlete profile
const createAthleteSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  birthDate: z.string().datetime().optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  jerseyNumber: z.number().int().min(0).max(999).optional().nullable(),
  dominantFoot: z.enum(['left', 'right', 'both']).optional().nullable(),
  heightCm: z.number().positive().max(300).optional().nullable(),
  weightKg: z.number().positive().max(500).optional().nullable(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactPhone: z.string().max(50).optional().nullable(),
  medicalNotes: z.string().max(2000).optional().nullable(),
})

// Query params schema for filtering athletes
const queryParamsSchema = z.object({
  organizationId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'full_name', 'total_xp', 'current_level']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * GET /api/athletes
 * List athletes with filtering, pagination, and search
 * Access: Coaches, Club Admins, Super Admins, Parents (only linked athletes)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AthleteWithProfile[]> | { success: false; error: string; total?: number; page?: number; pageSize?: number; totalPages?: number }>> {
  try {
    const user = await requireAuth()
    const isUserAdmin = isAdmin(user)
    const isUserCoach = isCoach(user)
    const isUserParent = isParent(user)

    // Verify user has appropriate role to view athletes
    if (!isUserAdmin && !isUserCoach && !isUserParent) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: insufficient permissions to view athletes' },
        { status: 403 }
      )
    }

    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryResult = queryParamsSchema.safeParse({
      organizationId: searchParams.get('organizationId') || undefined,
      groupId: searchParams.get('groupId') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ?? 1,
      pageSize: searchParams.get('pageSize') ?? 20,
      sortBy: searchParams.get('sortBy') ?? 'created_at',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: `Invalid query parameters: ${queryResult.error.message}` },
        { status: 400 }
      )
    }

    const { organizationId, groupId, search, page, pageSize, sortBy, sortOrder } = queryResult.data

    // Use the user's current organization if none specified
    const effectiveOrgId = organizationId ?? user.currentOrganizationId

    if (!effectiveOrgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Parents can only see their verified linked athletes in the current org.
    let parentAthleteUserIds: string[] | null = null
    if (isUserParent && !isUserAdmin && !isUserCoach) {
      const { data: parentRelations, error: parentRelationsError } = await supabase
        .from('parent_athlete_relations')
        .select('athlete_user_id')
        .eq('parent_user_id', user.id)
        .eq('organization_id', effectiveOrgId)
        .eq('verified', true)
        .eq('can_view_progress', true)

      if (parentRelationsError) {
        console.error('Error fetching parent-athlete relations:', parentRelationsError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch linked athletes' },
          { status: 500 }
        )
      }

      parentAthleteUserIds = (parentRelations ?? []).map(r => r.athlete_user_id)

      if (parentAthleteUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        })
      }
    }

    // Build the query
    let query = supabase
      .from('athlete_profiles')
      .select(`
        *,
        user_profile:user_profiles!athlete_profiles_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          phone,
          locale,
          timezone
        )
      `, { count: 'exact' })
      .eq('organization_id', effectiveOrgId)

    if (parentAthleteUserIds) {
      query = query.in('user_id', parentAthleteUserIds)
    }

    // Filter by group if specified
    if (groupId) {
      // Get athlete IDs that are members of the specified group
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('is_active', true)

      if (groupMembers && groupMembers.length > 0) {
        const userIds = groupMembers.map(gm => gm.user_id)
        query = query.in('user_id', userIds)
      } else {
        // No members in group, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        })
      }
    }

    // Apply search filter on user's full name
    if (search) {
      // We need to filter by the joined user_profile's full_name
      // Since Supabase doesn't support filtering on joined tables directly in all cases,
      // we'll fetch user IDs that match the search first
      const { data: matchingUsers } = await supabase
        .from('user_profiles')
        .select('id')
        .ilike('full_name', `%${search}%`)

      if (matchingUsers && matchingUsers.length > 0) {
        const userIds = matchingUsers.map(u => u.id)
        query = query.in('user_id', userIds)
      } else {
        // No matching users, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        })
      }
    }

    // Determine the actual sort column
    const sortColumn = sortBy === 'full_name' ? 'user_id' : sortBy

    // Apply sorting and pagination
    const offset = (page - 1) * pageSize
    query = query
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching athletes:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch athletes' },
        { status: 500 }
      )
    }

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: data as any[],
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/athletes error:', error)

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/athletes
 * Create a new athlete profile
 * Access: Club Admins, Super Admins, or Coaches with permission
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AthleteWithProfile>>> {
  try {
    const user = await requireRole(['club_admin', 'super_admin', 'coach'])
    const supabase = await createServiceClient()

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createAthleteSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${validationResult.error.issues.map(e => e.message).join(', ')}`,
          data: null
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Verify the user has access to the specified organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === validatedData.organizationId && m.status === 'active'
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: not a member of this organization', data: null },
        { status: 403 }
      )
    }

    // Verify the target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', validatedData.userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found', data: null },
        { status: 404 }
      )
    }

    // Check if athlete profile already exists for this user in this organization
    const { data: existingProfile } = await supabase
      .from('athlete_profiles')
      .select('id')
      .eq('user_id', validatedData.userId)
      .eq('organization_id', validatedData.organizationId)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: 'Athlete profile already exists for this user in this organization', data: null },
        { status: 409 }
      )
    }

    // Create the athlete profile
    const insertData: AthleteProfileInsert = {
      user_id: validatedData.userId,
      organization_id: validatedData.organizationId,
      birth_date: validatedData.birthDate ?? null,
      position: validatedData.position ?? null,
      jersey_number: validatedData.jerseyNumber ?? null,
      dominant_foot: validatedData.dominantFoot ?? null,
      height_cm: validatedData.heightCm ?? null,
      weight_kg: validatedData.weightKg ?? null,
      emergency_contact_name: validatedData.emergencyContactName ?? null,
      emergency_contact_phone: validatedData.emergencyContactPhone ?? null,
      medical_notes: validatedData.medicalNotes ?? null,
      total_xp: 0,
      current_level: 1,
      streak_days: 0,
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('athlete_profiles')
      .insert(insertData)
      .select(`
        *,
        user_profile:user_profiles!athlete_profiles_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          phone,
          locale,
          timezone
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating athlete profile:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create athlete profile', data: null },
        { status: 500 }
      )
    }

    // Also ensure the user has an athlete membership if they don't already
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', validatedData.userId)
      .eq('organization_id', validatedData.organizationId)
      .eq('role', 'athlete')
      .single()

    if (!existingMembership) {
      await supabase
        .from('memberships')
        .insert({
          user_id: validatedData.userId,
          organization_id: validatedData.organizationId,
          role: 'athlete',
          status: 'active',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        })
    }

    return NextResponse.json(
      { success: true, data: newProfile as any, error: null },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/athletes error:', error)

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', data: null },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { success: false, error: error.message, data: null },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    )
  }
}
