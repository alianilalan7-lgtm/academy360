import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, GroupMember } from '@/lib/types'

// Group member roles
const GROUP_MEMBER_ROLES = ['member', 'captain', 'assistant_coach'] as const
type GroupMemberRole = typeof GROUP_MEMBER_ROLES[number]

// Validation schema for adding members
const addMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
  role: z.enum(GROUP_MEMBER_ROLES).optional().default('member'),
})

// Query params schema
const queryParamsSchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  role: z.enum(GROUP_MEMBER_ROLES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

interface GroupMemberWithProfile extends GroupMember {
  user_profile: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    phone: string | null
  }
  athlete_profile?: {
    id: string
    position: string | null
    jersey_number: number | null
    total_xp: number | null
    current_level: number | null
  } | null
}

/**
 * GET /api/groups/[id]/members
 * List members of a group
 * Access: Coaches, Club Admins, Super Admins, or group members
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<GroupMemberWithProfile[]> & { total?: number; page?: number; pageSize?: number; totalPages?: number }>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id: groupId } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(groupId)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the group to verify it exists and check access
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, organization_id, is_active')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { success: false, error: 'Group not found', data: null },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = await checkMemberListAccess(user, group, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this group', data: null },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryResult = queryParamsSchema.safeParse({
      isActive: searchParams.get('isActive'),
      role: searchParams.get('role'),
      page: searchParams.get('page') ?? 1,
      pageSize: searchParams.get('pageSize') ?? 50,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: `Invalid query parameters: ${queryResult.error.message}`, data: null },
        { status: 400 }
      )
    }

    const { isActive, role, page, pageSize } = queryResult.data

    // Build the query
    let query = supabase
      .from('group_members')
      .select(`
        *,
        user_profile:user_profiles!group_members_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          phone
        )
      `, { count: 'exact' })
      .eq('group_id', groupId)

    // Apply filters
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (role) {
      query = query.eq('role', role)
    }

    // Apply pagination
    const offset = (page - 1) * pageSize
    query = query
      .order('joined_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data: members, error, count } = await query

    if (error) {
      console.error('Error fetching group members:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch group members', data: null },
        { status: 500 }
      )
    }

    // Get athlete profiles for members
    const memberUserIds = members?.map(m => m.user_id) ?? []
    let athleteProfiles: Record<string, unknown> = {}

    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('athlete_profiles')
        .select('id, user_id, position, jersey_number, total_xp, current_level')
        .in('user_id', memberUserIds)
        .eq('organization_id', group.organization_id)

      if (profiles) {
        athleteProfiles = profiles.reduce((acc, p) => {
          acc[p.user_id] = p
          return acc
        }, {} as Record<string, unknown>)
      }
    }

    // Attach athlete profiles to members
    const membersWithProfiles: GroupMemberWithProfile[] = (members ?? []).map(m => ({
      ...m,
      athlete_profile: athleteProfiles[m.user_id] || null,
    })) as GroupMemberWithProfile[]

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: membersWithProfiles,
      error: null,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/groups/[id]/members error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    )
  }
}

/**
 * POST /api/groups/[id]/members
 * Add member(s) to a group
 * Access: Club Admins, Super Admins, or coaches assigned to the group
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ added: number; skipped: number; errors: string[] }>>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id: groupId } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(groupId)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the group to verify it exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, organization_id, is_active, max_members')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { success: false, error: 'Group not found', data: null },
        { status: 404 }
      )
    }

    if (!group.is_active) {
      return NextResponse.json(
        { success: false, error: 'Cannot add members to an inactive group', data: null },
        { status: 400 }
      )
    }

    // Check if user has permission to add members
    const canManageMembers = await checkMemberManageAccess(user, group, supabase)

    if (!canManageMembers) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have permission to manage group members', data: null },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = addMembersSchema.safeParse(body)

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

    const { userIds, role } = validationResult.data

    // Check max_members limit
    if (group.max_members) {
      const { count: currentMemberCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('is_active', true)

      const remainingSlots = group.max_members - (currentMemberCount ?? 0)
      if (userIds.length > remainingSlots) {
        return NextResponse.json(
          {
            success: false,
            error: `Group has only ${remainingSlots} remaining slots. Cannot add ${userIds.length} members.`,
            data: null
          },
          { status: 400 }
        )
      }
    }

    // Verify all users exist and are members of the organization
    const { data: validUsers } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('organization_id', group.organization_id)
      .eq('status', 'active')
      .in('user_id', userIds)

    const validUserIds = new Set(validUsers?.map(u => u.user_id) ?? [])
    const invalidUserIds = userIds.filter(id => !validUserIds.has(id))

    // Check existing memberships
    const { data: existingMembers } = await supabase
      .from('group_members')
      .select('user_id, is_active')
      .eq('group_id', groupId)
      .in('user_id', Array.from(validUserIds))

    const existingMemberMap = new Map(
      existingMembers?.map(m => [m.user_id, m.is_active]) ?? []
    )

    const errors: string[] = []
    let added = 0
    let skipped = 0

    // Add invalid user errors
    invalidUserIds.forEach(id => {
      errors.push(`User ${id} is not a member of this organization`)
      skipped++
    })

    // Process valid users
    const now = new Date().toISOString()
    const toInsert: Array<{
      group_id: string
      user_id: string
      role: GroupMemberRole
      is_active: boolean
      joined_at: string
    }> = []
    const toReactivate: string[] = []

    for (const userId of validUserIds) {
      const existingStatus = existingMemberMap.get(userId)

      if (existingStatus === true) {
        // Already active member
        errors.push(`User ${userId} is already a member of this group`)
        skipped++
      } else if (existingStatus === false) {
        // Inactive member - reactivate
        toReactivate.push(userId)
      } else {
        // New member
        toInsert.push({
          group_id: groupId,
          user_id: userId,
          role: role,
          is_active: true,
          joined_at: now,
        })
      }
    }

    // Insert new members
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('group_members')
        .insert(toInsert)

      if (insertError) {
        console.error('Error inserting group members:', insertError)
        errors.push('Failed to add some members')
      } else {
        added += toInsert.length
      }
    }

    // Reactivate inactive members
    if (toReactivate.length > 0) {
      const { error: updateError } = await supabase
        .from('group_members')
        .update({ is_active: true, role: role, joined_at: now, left_at: null })
        .eq('group_id', groupId)
        .in('user_id', toReactivate)

      if (updateError) {
        console.error('Error reactivating group members:', updateError)
        errors.push('Failed to reactivate some members')
      } else {
        added += toReactivate.length
      }
    }

    return NextResponse.json({
      success: true,
      data: { added, skipped, errors },
      error: null,
    })
  } catch (error) {
    console.error('POST /api/groups/[id]/members error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    )
  }
}

/**
 * Helper function to check if user has access to list group members
 */
async function checkMemberListAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  group: { organization_id: string; id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // Admins and coaches in the same org can access
  const isOrgStaff = user.memberships.some(
    m => m.organization_id === group.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin', 'coach'].includes(m.role)
  )

  if (isOrgStaff) return true

  // Group members can see other members
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (membership) return true

  return false
}

/**
 * Helper function to check if user can manage group members
 */
async function checkMemberManageAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  group: { organization_id: string; id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // Admins can always manage members
  if (isAdmin(user)) {
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === group.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )
    if (hasOrgAccess) return true
  }

  // Coaches in the org can manage members
  if (isCoach(user)) {
    const isOrgCoach = user.memberships.some(
      m => m.organization_id === group.organization_id &&
           m.status === 'active' &&
           m.role === 'coach'
    )
    if (isOrgCoach) return true
  }

  // Captains and assistant coaches of the group can manage members
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (membership && ['captain', 'assistant_coach'].includes(membership.role ?? '')) {
    return true
  }

  return false
}
