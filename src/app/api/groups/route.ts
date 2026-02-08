import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiResponse, Group, GroupInsert } from '@/lib/types'

// Validation schema for creating a group
const createGroupSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500).optional().nullable(),
  ageGroup: z.string().max(50).optional().nullable(),
  maxMembers: z.number().int().positive().max(1000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
})

// Query params schema for filtering groups
const queryParamsSchema = z.object({
  organizationId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  ageGroup: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'name', 'age_group']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

interface GroupWithMemberCount extends Group {
  member_count: number
}

/**
 * GET /api/groups
 * List groups with filtering, pagination, and search
 * Access: Coaches, Club Admins, Super Admins
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<GroupWithMemberCount[]> & { total?: number; page?: number; pageSize?: number; totalPages?: number }>> {
  try {
    const user = await requireAuth()

    // Verify user has appropriate role to view groups
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: insufficient permissions to view groups', data: null },
        { status: 403 }
      )
    }

    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryResult = queryParamsSchema.safeParse({
      organizationId: searchParams.get('organizationId'),
      isActive: searchParams.get('isActive'),
      ageGroup: searchParams.get('ageGroup'),
      search: searchParams.get('search'),
      page: searchParams.get('page') ?? 1,
      pageSize: searchParams.get('pageSize') ?? 20,
      sortBy: searchParams.get('sortBy') ?? 'name',
      sortOrder: searchParams.get('sortOrder') ?? 'asc',
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: `Invalid query parameters: ${queryResult.error.message}`, data: null },
        { status: 400 }
      )
    }

    const { organizationId, isActive, ageGroup, search, page, pageSize, sortBy, sortOrder } = queryResult.data

    // Use the user's current organization if none specified
    const effectiveOrgId = organizationId ?? user.currentOrganizationId

    if (!effectiveOrgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required', data: null },
        { status: 400 }
      )
    }

    // Build the query
    let query = supabase
      .from('groups')
      .select('*', { count: 'exact' })
      .eq('organization_id', effectiveOrgId)

    // Apply filters
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (ageGroup) {
      query = query.eq('age_group', ageGroup)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Apply sorting and pagination
    const offset = (page - 1) * pageSize
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1)

    const { data: groups, error, count } = await query

    if (error) {
      console.error('Error fetching groups:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch groups', data: null },
        { status: 500 }
      )
    }

    // Get member counts for each group
    const groupIds = groups?.map(g => g.id) ?? []
    let memberCounts: Record<string, number> = {}

    if (groupIds.length > 0) {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('is_active', true)

      if (memberData) {
        memberCounts = memberData.reduce((acc, m) => {
          acc[m.group_id] = (acc[m.group_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Add member count to groups
    const groupsWithCounts: GroupWithMemberCount[] = (groups ?? []).map(g => ({
      ...g,
      member_count: memberCounts[g.id] || 0,
    }))

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: groupsWithCounts,
      error: null,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/groups error:', error)

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

/**
 * POST /api/groups
 * Create a new group
 * Access: Club Admins, Super Admins, or Coaches with permission
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Group>>> {
  try {
    const user = await requireAuth()

    // Only admins and coaches can create groups
    if (!isAdmin(user) && !isCoach(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: insufficient permissions to create groups', data: null },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createGroupSchema.safeParse(body)

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

    // Check for duplicate group name in the organization
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('organization_id', validatedData.organizationId)
      .eq('name', validatedData.name)
      .single()

    if (existingGroup) {
      return NextResponse.json(
        { success: false, error: 'A group with this name already exists in the organization', data: null },
        { status: 409 }
      )
    }

    // Create the group
    const insertData: GroupInsert = {
      organization_id: validatedData.organizationId,
      name: validatedData.name,
      description: validatedData.description ?? null,
      age_group: validatedData.ageGroup ?? null,
      max_members: validatedData.maxMembers ?? null,
      is_active: validatedData.isActive,
      settings: (validatedData.settings ?? null) as any,
    }

    const { data: newGroup, error: insertError } = await supabase
      .from('groups')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating group:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create group', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: newGroup, error: null },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/groups error:', error)

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
