import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string; userId: string }>
}

/**
 * DELETE /api/groups/[id]/members/[userId]
 * Remove a member from a group
 * Access: Club Admins, Super Admins, coaches, captains, or the user themselves
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ removed: boolean }>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id: groupId, userId: targetUserId } = await params

    // Validate UUID formats
    const uuidSchema = z.string().uuid()
    const groupIdValidation = uuidSchema.safeParse(groupId)
    const userIdValidation = uuidSchema.safeParse(targetUserId)

    if (!groupIdValidation.success || !userIdValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID or user ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the group to verify it exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, organization_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { success: false, error: 'Group not found', data: null },
        { status: 404 }
      )
    }

    // Fetch the existing membership
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('id, user_id, role, is_active')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this group', data: null },
        { status: 404 }
      )
    }

    if (!membership.is_active) {
      return NextResponse.json(
        { success: false, error: 'Member is already inactive', data: null },
        { status: 400 }
      )
    }

    // Check if user has permission to remove this member
    const canRemove = await checkRemoveMemberAccess(user, group, membership, supabase)

    if (!canRemove) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have permission to remove this member', data: null },
        { status: 403 }
      )
    }

    // Soft delete: set is_active to false and record left_at
    const { error: updateError } = await supabase
      .from('group_members')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
      })
      .eq('id', membership.id)

    if (updateError) {
      console.error('Error removing group member:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove member from group', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { removed: true },
      error: null,
    })
  } catch (error) {
    console.error('DELETE /api/groups/[id]/members/[userId] error:', error)

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
 * Helper function to check if user can remove a member from the group
 */
async function checkRemoveMemberAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  group: { organization_id: string; id: string },
  targetMembership: { user_id: string; role: string | null },
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<boolean> {
  // Users can remove themselves from a group
  if (user.id === targetMembership.user_id) {
    return true
  }

  // Admins can always remove members
  if (isAdmin(user)) {
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === group.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )
    if (hasOrgAccess) return true
  }

  // Coaches in the org can remove members (except other coaches)
  if (isCoach(user)) {
    const isOrgCoach = user.memberships.some(
      m => m.organization_id === group.organization_id &&
           m.status === 'active' &&
           m.role === 'coach'
    )
    if (isOrgCoach && targetMembership.role !== 'assistant_coach') {
      return true
    }
  }

  // Captains can remove regular members (not other captains or assistant coaches)
  const { data: userMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (userMembership?.role === 'captain' && targetMembership.role === 'member') {
    return true
  }

  // Assistant coaches can remove regular members
  if (userMembership?.role === 'assistant_coach' && targetMembership.role === 'member') {
    return true
  }

  return false
}
