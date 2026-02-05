import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, Group, GroupWithMembers } from '@/lib/types'

// Validation schema for updating a group
const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  ageGroup: z.string().max(50).optional().nullable(),
  maxMembers: z.number().int().positive().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
}).partial()

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/groups/[id]
 * Get a specific group by ID with members
 * Access: Coaches, Club Admins, Super Admins, or group members
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<GroupWithMembers>>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the group with members
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        members:group_members(
          id,
          user_id,
          role,
          is_active,
          joined_at,
          left_at,
          user_profile:user_profiles!group_members_user_id_fkey(
            id,
            email,
            full_name,
            avatar_url,
            phone
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error || !group) {
      return NextResponse.json(
        { success: false, error: 'Group not found', data: null },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = await checkGroupAccess(user, group, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this group', data: null },
        { status: 403 }
      )
    }

    // Get athlete profiles for members
    const memberUserIds = group.members
      ?.filter((m: { is_active: boolean | null }) => m.is_active)
      .map((m: { user_id: string }) => m.user_id) ?? []

    let athleteProfiles: Record<string, unknown> = {}
    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('athlete_profiles')
        .select('*')
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
    const membersWithProfiles = group.members?.map((m: { user_id: string; [key: string]: unknown }) => ({
      ...m,
      athlete_profile: athleteProfiles[m.user_id] || null,
    })) ?? []

    return NextResponse.json({
      success: true,
      data: {
        ...group,
        members: membersWithProfiles,
      } as any,
      error: null,
    })
  } catch (error) {
    console.error('GET /api/groups/[id] error:', error)

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
 * PATCH /api/groups/[id]
 * Update a group
 * Access: Club Admins, Super Admins, or coaches assigned to the group
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Group>>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the existing group
    const { data: existingGroup, error: fetchError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingGroup) {
      return NextResponse.json(
        { success: false, error: 'Group not found', data: null },
        { status: 404 }
      )
    }

    // Check update permissions
    const canUpdate = await checkGroupUpdateAccess(user, existingGroup, supabase)

    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have permission to update this group', data: null },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateGroupSchema.safeParse(body)

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

    // Check for duplicate name if name is being updated
    if (validatedData.name && validatedData.name !== existingGroup.name) {
      const { data: duplicateGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('organization_id', existingGroup.organization_id)
        .eq('name', validatedData.name)
        .neq('id', id)
        .single()

      if (duplicateGroup) {
        return NextResponse.json(
          { success: false, error: 'A group with this name already exists in the organization', data: null },
          { status: 409 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.ageGroup !== undefined) updateData.age_group = validatedData.ageGroup
    if (validatedData.maxMembers !== undefined) updateData.max_members = validatedData.maxMembers
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive
    if (validatedData.settings !== undefined) updateData.settings = validatedData.settings

    // Perform the update
    const { data: updatedGroup, error: updateError } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating group:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update group', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedGroup,
      error: null,
    })
  } catch (error) {
    console.error('PATCH /api/groups/[id] error:', error)

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
 * DELETE /api/groups/[id]
 * Delete a group (soft delete by setting is_active to false)
 * Access: Club Admins, Super Admins only
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id } = await params

    // Only admins can delete groups
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: only administrators can delete groups', data: null },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the group to verify it exists and get organization
    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (fetchError || !group) {
      return NextResponse.json(
        { success: false, error: 'Group not found', data: null },
        { status: 404 }
      )
    }

    // Verify admin has access to this organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === group.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have admin access to this organization', data: null },
        { status: 403 }
      )
    }

    // Soft delete: set is_active to false and deactivate all members
    await supabase
      .from('group_members')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('group_id', id)

    const { error: deleteError } = await supabase
      .from('groups')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete group', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      error: null,
    })
  } catch (error) {
    console.error('DELETE /api/groups/[id] error:', error)

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
 * Helper function to check if user has access to view a group
 */
async function checkGroupAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  group: { organization_id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // Admins and coaches in the same org can access
  const isOrgStaff = user.memberships.some(
    m => m.organization_id === group.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin', 'coach'].includes(m.role)
  )

  if (isOrgStaff) return true

  // Group members can access their group
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', (group as any).id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (membership) return true

  return false
}

/**
 * Helper function to check if user has access to update a group
 */
async function checkGroupUpdateAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  group: { organization_id: string; id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // Admins in the same org can update
  const isOrgAdmin = user.memberships.some(
    m => m.organization_id === group.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin'].includes(m.role)
  )

  if (isOrgAdmin) return true

  // Coaches in the same org who are assistant_coach or captain of the group can update limited fields
  const isOrgCoach = user.memberships.some(
    m => m.organization_id === group.organization_id &&
         m.status === 'active' &&
         m.role === 'coach'
  )

  if (isOrgCoach) {
    // Check if they are assigned to this group
    const { data: groupMembership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (groupMembership && ['assistant_coach', 'captain'].includes(groupMembership.role ?? '')) {
      return true
    }
  }

  return false
}
