import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin } from '@/lib/auth'
import type { ApiResponse, FeePlan } from '@/lib/types'

// Billing cycle enum values
const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'one_time'] as const

// Validation schemas
const feePlanUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  amount: z.number().positive('Amount must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  billing_cycle: z.enum(BILLING_CYCLES).optional(),
  is_active: z.boolean().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/fees/plans/[id]
 * Get a specific fee plan by ID
 * Access: Club Admins, Super Admins
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<FeePlan>>> {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Only admins can view fee plans
    if (!isAdmin(user)) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: Only administrators can view fee plans', success: false },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { data: null, error: 'Invalid fee plan ID format', success: false },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch the fee plan
    const { data: plan, error } = await supabase
      .from('fee_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !plan) {
      return NextResponse.json(
        { data: null, error: 'Fee plan not found', success: false },
        { status: 404 }
      )
    }

    // Verify user has access to this organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === plan.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: You do not have access to this fee plan', success: false },
        { status: 403 }
      )
    }

    return NextResponse.json({
      data: plan,
      error: null,
      success: true,
    })
  } catch (error) {
    console.error('GET /api/fees/plans/[id] error:', error)

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
 * PATCH /api/fees/plans/[id]
 * Update a fee plan
 * Access: Club Admins, Super Admins
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<FeePlan>>> {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Only admins can update fee plans
    if (!isAdmin(user)) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: Only administrators can update fee plans', success: false },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { data: null, error: 'Invalid fee plan ID format', success: false },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch the existing fee plan
    const { data: existingPlan, error: fetchError } = await supabase
      .from('fee_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingPlan) {
      return NextResponse.json(
        { data: null, error: 'Fee plan not found', success: false },
        { status: 404 }
      )
    }

    // Verify user has admin access to this organization
    const hasOrgAdminAccess = user.memberships.some(
      m => m.organization_id === existingPlan.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )

    if (!hasOrgAdminAccess) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: You do not have admin access to this fee plan', success: false },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = feePlanUpdateSchema.safeParse(body)

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

    const updateData = validationResult.data

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { data: null, error: 'No valid fields to update', success: false },
        { status: 400 }
      )
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== existingPlan.name) {
      const { data: duplicatePlan } = await supabase
        .from('fee_plans')
        .select('id')
        .eq('organization_id', existingPlan.organization_id)
        .eq('name', updateData.name)
        .neq('id', id)
        .single()

      if (duplicatePlan) {
        return NextResponse.json(
          { data: null, error: 'A fee plan with this name already exists in this organization', success: false },
          { status: 409 }
        )
      }
    }

    // Perform the update
    const { data: updatedPlan, error: updateError } = await supabase
      .from('fee_plans')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating fee plan:', updateError)
      return NextResponse.json(
        { data: null, error: 'Failed to update fee plan', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedPlan,
      error: null,
      success: true,
    })
  } catch (error) {
    console.error('PATCH /api/fees/plans/[id] error:', error)

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
 * DELETE /api/fees/plans/[id]
 * Delete a fee plan (soft delete by setting is_active to false)
 * Access: Club Admins, Super Admins
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Only admins can delete fee plans
    if (!isAdmin(user)) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: Only administrators can delete fee plans', success: false },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { data: null, error: 'Invalid fee plan ID format', success: false },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch the existing fee plan
    const { data: existingPlan, error: fetchError } = await supabase
      .from('fee_plans')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingPlan) {
      return NextResponse.json(
        { data: null, error: 'Fee plan not found', success: false },
        { status: 404 }
      )
    }

    // Verify user has admin access to this organization
    const hasOrgAdminAccess = user.memberships.some(
      m => m.organization_id === existingPlan.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )

    if (!hasOrgAdminAccess) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: You do not have admin access to this fee plan', success: false },
        { status: 403 }
      )
    }

    // Check if there are any pending or paid payments associated with this plan
    const { count: paymentCount } = await supabase
      .from('fee_payments')
      .select('id', { count: 'exact', head: true })
      .eq('fee_plan_id', id)
      .in('status', ['pending', 'paid'])

    if (paymentCount && paymentCount > 0) {
      // Soft delete - set is_active to false
      const { error: updateError } = await supabase
        .from('fee_plans')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error deactivating fee plan:', updateError)
        return NextResponse.json(
          { data: null, error: 'Failed to deactivate fee plan', success: false },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: { deleted: true },
        error: null,
        success: true,
      })
    }

    // Hard delete if no active payments
    const { error: deleteError } = await supabase
      .from('fee_plans')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting fee plan:', deleteError)
      return NextResponse.json(
        { data: null, error: 'Failed to delete fee plan', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { deleted: true },
      error: null,
      success: true,
    })
  } catch (error) {
    console.error('DELETE /api/fees/plans/[id] error:', error)

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
