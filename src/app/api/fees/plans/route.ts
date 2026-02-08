import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, FeePlan } from '@/lib/types'

// Billing cycle enum values
const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'one_time'] as const
type BillingCycle = typeof BILLING_CYCLES[number]

// Validation schemas
const feePlanCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('TRY'),
  billing_cycle: z.enum(BILLING_CYCLES).default('monthly'),
  is_active: z.boolean().optional().default(true),
  organization_id: z.string().uuid().optional(),
})

const feePlanQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  organization_id: z.string().uuid().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  billing_cycle: z.enum(BILLING_CYCLES).optional(),
  search: z.string().optional(),
  sort_by: z.enum(['name', 'amount', 'created_at', 'billing_cycle']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

/**
 * GET /api/fees/plans
 * List fee plans with filtering, searching, and pagination
 * Access: Club Admins, Super Admins
 */
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<FeePlan> | ApiResponse<null>>> {
  try {
    const user = await requireAuth()

    // Only admins can view fee plans
    if (!isAdmin(user)) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: Only administrators can view fee plans', success: false },
        { status: 403 }
      )
    }

    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const validationResult = feePlanQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          data: null,
          error: validationResult.error.issues.map(e => e.message).join(', '),
          success: false,
        },
        { status: 400 }
      )
    }

    const {
      page,
      pageSize,
      organization_id,
      is_active,
      billing_cycle,
      search,
      sort_by,
      sort_order,
    } = validationResult.data

    // Determine organization to query
    const effectiveOrgId = organization_id ?? user.currentOrganizationId

    if (!effectiveOrgId) {
      return NextResponse.json(
        { data: null, error: 'Organization ID is required', success: false },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === effectiveOrgId && m.status === 'active'
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: Not a member of this organization', success: false },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('fee_plans')
      .select('*', { count: 'exact' })
      .eq('organization_id', effectiveOrgId)

    // Apply filters
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (billing_cycle) {
      query = query.eq('billing_cycle', billing_cycle)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: plans, error, count } = await query

    if (error) {
      console.error('Error fetching fee plans:', error)
      return NextResponse.json(
        { data: null, error: 'Failed to fetch fee plans', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: plans,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    })
  } catch (error) {
    console.error('GET /api/fees/plans error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { data: null, error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { data: null, error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

/**
 * POST /api/fees/plans
 * Create a new fee plan
 * Access: Club Admins, Super Admins
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<FeePlan>>> {
  try {
    const user = await requireAuth()

    // Only admins can create fee plans
    if (!isAdmin(user)) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: Only administrators can create fee plans', success: false },
        { status: 403 }
      )
    }

    const supabase = await createServiceClient()
    const body = await request.json()

    // Validate request body
    const validationResult = feePlanCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          data: null,
          error: validationResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          success: false,
        },
        { status: 400 }
      )
    }

    const planData = validationResult.data

    // Set organization_id if not provided
    const effectiveOrgId = planData.organization_id ?? user.currentOrganizationId

    if (!effectiveOrgId) {
      return NextResponse.json(
        { data: null, error: 'Organization ID is required', success: false },
        { status: 400 }
      )
    }

    // Verify user has admin access to this organization
    const hasOrgAdminAccess = user.memberships.some(
      m => m.organization_id === effectiveOrgId &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )

    if (!hasOrgAdminAccess) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: You do not have admin access to this organization', success: false },
        { status: 403 }
      )
    }

    // Check for duplicate plan name in the same organization
    const { data: existingPlan } = await supabase
      .from('fee_plans')
      .select('id')
      .eq('organization_id', effectiveOrgId)
      .eq('name', planData.name)
      .single()

    if (existingPlan) {
      return NextResponse.json(
        { data: null, error: 'A fee plan with this name already exists in this organization', success: false },
        { status: 409 }
      )
    }

    // Create the fee plan
    const { data: plan, error } = await supabase
      .from('fee_plans')
      .insert({
        name: planData.name,
        description: planData.description ?? null,
        amount: planData.amount,
        currency: planData.currency,
        billing_cycle: planData.billing_cycle,
        is_active: planData.is_active,
        organization_id: effectiveOrgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating fee plan:', error)
      return NextResponse.json(
        { data: null, error: 'Failed to create fee plan', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: plan, error: null, success: true },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/fees/plans error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { data: null, error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { data: null, error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
