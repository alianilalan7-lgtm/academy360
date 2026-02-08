import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAdmin, isCoach, isAthlete, isParent } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { AthleteProfileUpdate, ApiResponse, AthleteWithProfile } from '@/lib/types'

// Validation schema for updating an athlete profile
const updateAthleteSchema = z.object({
  birthDate: z.string().datetime().optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  jerseyNumber: z.number().int().min(0).max(999).optional().nullable(),
  dominantFoot: z.enum(['left', 'right', 'both']).optional().nullable(),
  heightCm: z.number().positive().max(300).optional().nullable(),
  weightKg: z.number().positive().max(500).optional().nullable(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactPhone: z.string().max(50).optional().nullable(),
  medicalNotes: z.string().max(2000).optional().nullable(),
}).partial()

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/athletes/[id]
 * Get a specific athlete profile by ID
 * Access: The athlete themselves, their parents, coaches in their org, or admins
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AthleteWithProfile>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the athlete profile with related data
    const { data: athlete, error } = await supabase
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
          timezone,
          created_at
        ),
        group_members(
          id,
          group_id,
          role,
          is_active,
          joined_at,
          group:groups(id, name, age_group, description)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found', data: null },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = await checkAthleteAccess(user, athlete, supabase)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have access to this athlete', data: null },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: athlete as any,
      error: null,
    })
  } catch (error) {
    console.error('GET /api/athletes/[id] error:', error)

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
 * PATCH /api/athletes/[id]
 * Update an athlete profile
 * Access: The athlete themselves (limited fields), coaches in their org, or admins
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AthleteWithProfile>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the existing athlete profile
    const { data: existingAthlete, error: fetchError } = await supabase
      .from('athlete_profiles')
      .select('*, user_profile:user_profiles!athlete_profiles_user_id_fkey(id)')
      .eq('id', id)
      .single()

    if (fetchError || !existingAthlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found', data: null },
        { status: 404 }
      )
    }

    // Check update permissions
    const canUpdate = await checkAthleteUpdateAccess(user, existingAthlete, supabase)

    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have permission to update this athlete', data: null },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateAthleteSchema.safeParse(body)

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

    // Athletes can only update limited fields for themselves
    const isSelf = existingAthlete.user_id === user.id
    const isStaff = isAdmin(user) || isCoach(user)

    // Build update object
    const updateData: AthleteProfileUpdate = {}

    // Fields athletes can update themselves
    if (validatedData.emergencyContactName !== undefined) {
      updateData.emergency_contact_name = validatedData.emergencyContactName
    }
    if (validatedData.emergencyContactPhone !== undefined) {
      updateData.emergency_contact_phone = validatedData.emergencyContactPhone
    }

    // Fields only staff can update
    if (isStaff) {
      if (validatedData.birthDate !== undefined) {
        updateData.birth_date = validatedData.birthDate
      }
      if (validatedData.position !== undefined) {
        updateData.position = validatedData.position
      }
      if (validatedData.jerseyNumber !== undefined) {
        updateData.jersey_number = validatedData.jerseyNumber
      }
      if (validatedData.dominantFoot !== undefined) {
        updateData.dominant_foot = validatedData.dominantFoot
      }
      if (validatedData.heightCm !== undefined) {
        updateData.height_cm = validatedData.heightCm
      }
      if (validatedData.weightKg !== undefined) {
        updateData.weight_kg = validatedData.weightKg
      }
      if (validatedData.medicalNotes !== undefined) {
        updateData.medical_notes = validatedData.medicalNotes
      }
    } else if (isSelf) {
      // Athletes trying to update restricted fields
      const restrictedFields = ['birthDate', 'position', 'jerseyNumber', 'dominantFoot', 'heightCm', 'weightKg', 'medicalNotes']
      const attemptedRestrictedUpdates = restrictedFields.filter(field => validatedData[field as keyof typeof validatedData] !== undefined)

      if (attemptedRestrictedUpdates.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Athletes cannot update these fields: ${attemptedRestrictedUpdates.join(', ')}. Contact your coach or admin.`,
            data: null
          },
          { status: 403 }
        )
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update', data: null },
        { status: 400 }
      )
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString()

    // Perform the update
    const { data: updatedAthlete, error: updateError } = await supabase
      .from('athlete_profiles')
      .update(updateData)
      .eq('id', id)
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
        ),
        group_members(
          id,
          group_id,
          role,
          is_active,
          group:groups(id, name, age_group)
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating athlete:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update athlete profile', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedAthlete as any,
      error: null,
    })
  } catch (error) {
    console.error('PATCH /api/athletes/[id] error:', error)

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
 * DELETE /api/athletes/[id]
 * Delete an athlete profile (soft delete by removing from organization)
 * Access: Club Admins, Super Admins only
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const user = await requireAuth()
    const supabase = await createServiceClient()
    const { id } = await params

    // Only admins can delete athlete profiles
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: only administrators can delete athlete profiles', data: null },
        { status: 403 }
      )
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const idValidation = uuidSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete ID format', data: null },
        { status: 400 }
      )
    }

    // Fetch the athlete profile to verify it exists and get organization
    const { data: athlete, error: fetchError } = await supabase
      .from('athlete_profiles')
      .select('id, user_id, organization_id')
      .eq('id', id)
      .single()

    if (fetchError || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found', data: null },
        { status: 404 }
      )
    }

    // Verify admin has access to this organization
    const hasOrgAccess = user.memberships.some(
      m => m.organization_id === athlete.organization_id &&
           m.status === 'active' &&
           ['club_admin', 'super_admin'].includes(m.role)
    )

    if (!hasOrgAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you do not have admin access to this organization', data: null },
        { status: 403 }
      )
    }

    // Start deletion process - we'll use a transaction-like approach
    // First, remove from all groups
    await supabase
      .from('group_members')
      .delete()
      .eq('user_id', athlete.user_id)

    // Update the athlete membership to inactive
    await supabase
      .from('memberships')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('user_id', athlete.user_id)
      .eq('organization_id', athlete.organization_id)
      .eq('role', 'athlete')

    // Delete the athlete profile
    const { error: deleteError } = await supabase
      .from('athlete_profiles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting athlete profile:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete athlete profile', data: null },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      error: null,
    })
  } catch (error) {
    console.error('DELETE /api/athletes/[id] error:', error)

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
 * Helper function to check if user has access to view an athlete
 */
async function checkAthleteAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  athlete: { user_id: string; organization_id: string },
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<boolean> {
  // Admins and coaches in the same org can access
  const isOrgStaff = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin', 'coach'].includes(m.role)
  )

  if (isOrgStaff) return true

  // Athletes can view their own profile
  if (athlete.user_id === user.id) return true

  // Parents can view their linked athletes
  if (isParent(user)) {
    const { data: parentRelation } = await supabase
      .from('parent_athlete_relations')
      .select('id')
      .eq('parent_user_id', user.id)
      .eq('athlete_user_id', athlete.user_id)
      .eq('verified', true)
      .single()

    if (parentRelation) return true
  }

  return false
}

/**
 * Helper function to check if user has access to update an athlete
 */
async function checkAthleteUpdateAccess(
  user: Awaited<ReturnType<typeof requireAuth>>,
  athlete: { user_id: string; organization_id: string },
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<boolean> {
  // Admins in the same org can update
  const isOrgAdmin = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         ['club_admin', 'super_admin'].includes(m.role)
  )

  if (isOrgAdmin) return true

  // Coaches in the same org can update
  const isOrgCoach = user.memberships.some(
    m => m.organization_id === athlete.organization_id &&
         m.status === 'active' &&
         m.role === 'coach'
  )

  if (isOrgCoach) return true

  // Athletes can update their own profile (limited fields - handled in PATCH)
  if (athlete.user_id === user.id) return true

  return false
}
