import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isParent } from '@/lib/auth'
import type { ApiResponse, PaginatedResponse, FeePayment } from '@/lib/types'

// Payment status enum values
const PAYMENT_STATUSES = ['pending', 'paid', 'overdue', 'cancelled', 'refunded'] as const
type PaymentStatus = typeof PAYMENT_STATUSES[number]

// Payment method options
const PAYMENT_METHODS = ['cash', 'credit_card', 'bank_transfer', 'online', 'other'] as const

// Extended fee payment type with relations
interface FeePaymentWithRelations extends FeePayment {
  athlete?: {
    id: string
    user_id: string
    user_profile?: {
      id: string
      full_name: string | null
      email: string
    }
  }
  fee_plan?: {
    id: string
    name: string
    billing_cycle: string | null
  }
  recorded_by_user?: {
    id: string
    full_name: string | null
  }
}

// Validation schemas
const feePaymentCreateSchema = z.object({
  athlete_id: z.string().uuid('Invalid athlete ID'),
  fee_plan_id: z.string().uuid('Invalid fee plan ID').optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('TRY'),
  due_date: z.string().datetime({ message: 'Invalid due date format' }),
  status: z.enum(PAYMENT_STATUSES).default('pending'),
  payment_method: z.enum(PAYMENT_METHODS).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  transaction_id: z.string().max(255).optional().nullable(),
  organization_id: z.string().uuid().optional(),
})

const feePaymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  organization_id: z.string().uuid().optional(),
  athlete_id: z.string().uuid().optional(),
  fee_plan_id: z.string().uuid().optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  due_date_from: z.string().datetime().optional(),
  due_date_to: z.string().datetime().optional(),
  paid_date_from: z.string().datetime().optional(),
  paid_date_to: z.string().datetime().optional(),
  include_athlete: z.enum(['true', 'false']).optional().default('true'),
  include_plan: z.enum(['true', 'false']).optional().default('true'),
  sort_by: z.enum(['due_date', 'amount', 'created_at', 'status', 'paid_date']).optional().default('due_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

/**
 * GET /api/fees/payments
 * List fee payments with filtering, searching, and pagination
 * Access: Club Admins, Super Admins, Parents (own children only)
 */
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<FeePaymentWithRelations> | ApiResponse<null>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const validationResult = feePaymentQuerySchema.safeParse(queryParams)
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
      athlete_id,
      fee_plan_id,
      status,
      due_date_from,
      due_date_to,
      paid_date_from,
      paid_date_to,
      include_athlete,
      include_plan,
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

    // Access control
    const isUserAdmin = isAdmin(user)
    const isUserParent = isParent(user)

    // Parents can only view payments for their own children
    let allowedAthleteIds: string[] | null = null

    if (!isUserAdmin) {
      if (isUserParent) {
        // Get athletes linked to this parent
        const { data: parentRelations } = await supabase
          .from('parent_athlete_relations')
          .select('athlete_user_id')
          .eq('parent_user_id', user.id)
          .eq('organization_id', effectiveOrgId)
          .eq('verified', true)
          .eq('can_view_payments', true)

        if (!parentRelations || parentRelations.length === 0) {
          return NextResponse.json(
            { data: null, error: 'Forbidden: No payment viewing permissions', success: false },
            { status: 403 }
          )
        }

        // Get athlete profile IDs from user IDs
        const athleteUserIds = parentRelations.map(r => r.athlete_user_id)
        const { data: athleteProfiles } = await supabase
          .from('athlete_profiles')
          .select('id')
          .in('user_id', athleteUserIds)
          .eq('organization_id', effectiveOrgId)

        allowedAthleteIds = athleteProfiles?.map(a => a.id) ?? []

        if (allowedAthleteIds.length === 0) {
          return NextResponse.json({
            data: [],
            error: null,
            success: true,
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          })
        }
      } else {
        return NextResponse.json(
          { data: null, error: 'Forbidden: Only administrators and parents can view payments', success: false },
          { status: 403 }
        )
      }
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

    // Build select query with optional relations
    let selectQuery = '*'
    if (include_athlete === 'true') {
      selectQuery += `, athlete:athlete_profiles!fee_payments_athlete_id_fkey(
        id,
        user_id,
        user_profile:user_profiles!athlete_profiles_user_id_fkey(
          id,
          full_name,
          email
        )
      )`
    }
    if (include_plan === 'true') {
      selectQuery += `, fee_plan:fee_plans!fee_payments_fee_plan_id_fkey(
        id,
        name,
        billing_cycle
      )`
    }

    // Build query
    let query = supabase
      .from('fee_payments')
      .select(selectQuery, { count: 'exact' })
      .eq('organization_id', effectiveOrgId)

    // Apply athlete restriction for parents
    if (allowedAthleteIds !== null) {
      query = query.in('athlete_id', allowedAthleteIds)
    }

    // Apply filters
    if (athlete_id) {
      // If parent, verify they have access to this athlete
      if (allowedAthleteIds !== null && !allowedAthleteIds.includes(athlete_id)) {
        return NextResponse.json(
          { data: null, error: 'Forbidden: No access to this athlete', success: false },
          { status: 403 }
        )
      }
      query = query.eq('athlete_id', athlete_id)
    }

    if (fee_plan_id) {
      query = query.eq('fee_plan_id', fee_plan_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (due_date_from) {
      query = query.gte('due_date', due_date_from)
    }

    if (due_date_to) {
      query = query.lte('due_date', due_date_to)
    }

    if (paid_date_from) {
      query = query.gte('paid_date', paid_date_from)
    }

    if (paid_date_to) {
      query = query.lte('paid_date', paid_date_to)
    }

    // Sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: payments, error, count } = await query

    if (error) {
      console.error('Error fetching fee payments:', error)
      return NextResponse.json(
        { data: null, error: 'Failed to fetch fee payments', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: payments as any,
      error: null,
      success: true,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    })
  } catch (error) {
    console.error('GET /api/fees/payments error:', error)

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
 * POST /api/fees/payments
 * Record a new fee payment
 * Access: Club Admins, Super Admins
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<FeePayment>>> {
  try {
    const user = await requireAuth()

    // Only admins can record payments
    if (!isAdmin(user)) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: Only administrators can record payments', success: false },
        { status: 403 }
      )
    }

    const supabase = await createServiceClient()
    const body = await request.json()

    // Validate request body
    const validationResult = feePaymentCreateSchema.safeParse(body)
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

    const paymentData = validationResult.data

    // Set organization_id if not provided
    const effectiveOrgId = paymentData.organization_id ?? user.currentOrganizationId

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

    // Verify athlete exists and belongs to this organization
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id, organization_id')
      .eq('id', paymentData.athlete_id)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        { data: null, error: 'Athlete not found', success: false },
        { status: 404 }
      )
    }

    if (athlete.organization_id !== effectiveOrgId) {
      return NextResponse.json(
        { data: null, error: 'Athlete does not belong to this organization', success: false },
        { status: 400 }
      )
    }

    // Verify fee plan if provided
    if (paymentData.fee_plan_id) {
      const { data: feePlan, error: planError } = await supabase
        .from('fee_plans')
        .select('id, organization_id, is_active')
        .eq('id', paymentData.fee_plan_id)
        .single()

      if (planError || !feePlan) {
        return NextResponse.json(
          { data: null, error: 'Fee plan not found', success: false },
          { status: 404 }
        )
      }

      if (feePlan.organization_id !== effectiveOrgId) {
        return NextResponse.json(
          { data: null, error: 'Fee plan does not belong to this organization', success: false },
          { status: 400 }
        )
      }

      if (!feePlan.is_active) {
        return NextResponse.json(
          { data: null, error: 'Cannot create payment for inactive fee plan', success: false },
          { status: 400 }
        )
      }
    }

    // Determine paid_date based on status
    const paidDate = paymentData.status === 'paid' ? new Date().toISOString() : null

    // Create the fee payment
    const { data: payment, error } = await supabase
      .from('fee_payments')
      .insert({
        athlete_id: paymentData.athlete_id,
        fee_plan_id: paymentData.fee_plan_id ?? null,
        amount: paymentData.amount,
        currency: paymentData.currency,
        due_date: paymentData.due_date,
        status: paymentData.status,
        payment_method: paymentData.payment_method ?? null,
        notes: paymentData.notes ?? null,
        transaction_id: paymentData.transaction_id ?? null,
        organization_id: effectiveOrgId,
        recorded_by: user.id,
        paid_date: paidDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating fee payment:', error)
      return NextResponse.json(
        { data: null, error: 'Failed to create fee payment', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: payment, error: null, success: true },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/fees/payments error:', error)

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
