import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser, isAdmin, isCoach } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/performance/[id]
 * Get a single performance record by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('performance_records')
      .select(`
        id,
        athlete_id,
        metric_type_id,
        value,
        recorded_at,
        recorded_by,
        session_id,
        is_verified,
        notes,
        created_at,
        metric_type:metric_types(
          id,
          code,
          name,
          unit,
          category,
          is_higher_better,
          min_value,
          max_value,
          description
        ),
        athlete:athlete_profiles!performance_records_athlete_id_fkey(
          id,
          user_id,
          position,
          jersey_number,
          user:user_profiles!athlete_profiles_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        ),
        recorder:user_profiles!performance_records_recorded_by_fkey(
          id,
          full_name,
          email
        ),
        session:sessions(
          id,
          title,
          scheduled_start,
          session_type
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Performance record not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching performance record:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch performance record' },
        { status: 500 }
      )
    }

    // Fetch adjacent records for context (previous and next measurements)
    const [previousResult, nextResult] = await Promise.all([
      supabase
        .from('performance_records')
        .select('id, value, recorded_at')
        .eq('athlete_id', data.athlete_id)
        .eq('metric_type_id', data.metric_type_id)
        .lt('recorded_at', data.recorded_at)
        .order('recorded_at', { ascending: false })
        .limit(1),
      supabase
        .from('performance_records')
        .select('id, value, recorded_at')
        .eq('athlete_id', data.athlete_id)
        .eq('metric_type_id', data.metric_type_id)
        .gt('recorded_at', data.recorded_at)
        .order('recorded_at', { ascending: true })
        .limit(1),
    ])

    const previousRecord = previousResult.data?.[0] || null
    const nextRecord = nextResult.data?.[0] || null

    // Calculate percentage change from previous
    let percentageChange: number | null = null
    if (previousRecord && previousRecord.value !== 0) {
      percentageChange = ((data.value - previousRecord.value) / Math.abs(previousRecord.value)) * 100
    }

    const metricType = data.metric_type as { is_higher_better?: boolean } | null

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        comparison: {
          previous: previousRecord,
          next: nextRecord,
          percentageChange: percentageChange !== null ? Math.round(percentageChange * 100) / 100 : null,
          isImprovement: percentageChange !== null && metricType
            ? metricType.is_higher_better
              ? percentageChange > 0
              : percentageChange < 0
            : null,
        },
      },
    })
  } catch (error) {
    console.error('Performance record GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/performance/[id]
 * Update a performance record
 *
 * Request body (all optional):
 * - value: New measurement value
 * - recordedAt: New recording date
 * - notes: Updated notes
 * - isVerified: Updated verification status
 * - sessionId: Updated session reference
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only coaches and admins can update measurements
    if (!isCoach(user) && !isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only coaches and admins can update measurements' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { value, recordedAt, notes, isVerified, sessionId } = body

    const supabase = await createClient()

    // Fetch existing record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('performance_records')
      .select(`
        id,
        athlete_id,
        metric_type_id,
        recorded_by,
        metric_type:metric_types(min_value, max_value)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Performance record not found' },
        { status: 404 }
      )
    }

    // Check if user can update this record (recorded_by or admin)
    if (existingRecord.recorded_by !== user.id && !isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own recordings' },
        { status: 403 }
      )
    }

    // Validate value if provided
    if (value !== undefined) {
      if (typeof value !== 'number') {
        return NextResponse.json(
          { success: false, error: 'value must be a valid number' },
          { status: 400 }
        )
      }

      const metricType = existingRecord.metric_type as { min_value: number | null; max_value: number | null } | null
      if (metricType) {
        if (metricType.min_value !== null && value < metricType.min_value) {
          return NextResponse.json(
            { success: false, error: `Value must be at least ${metricType.min_value}` },
            { status: 400 }
          )
        }

        if (metricType.max_value !== null && value > metricType.max_value) {
          return NextResponse.json(
            { success: false, error: `Value must be at most ${metricType.max_value}` },
            { status: 400 }
          )
        }
      }
    }

    // Validate session if provided
    if (sessionId !== undefined && sessionId !== null) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return NextResponse.json(
          { success: false, error: 'Invalid session' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (value !== undefined) updateData.value = value
    if (recordedAt !== undefined) updateData.recorded_at = recordedAt
    if (notes !== undefined) updateData.notes = notes
    if (isVerified !== undefined) updateData.is_verified = isVerified
    if (sessionId !== undefined) updateData.session_id = sessionId

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from('performance_records')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        athlete_id,
        metric_type_id,
        value,
        recorded_at,
        recorded_by,
        session_id,
        is_verified,
        notes,
        created_at,
        metric_type:metric_types(
          id,
          code,
          name,
          unit,
          category,
          is_higher_better
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating performance record:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update performance record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedRecord,
    })
  } catch (error) {
    console.error('Performance record PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/performance/[id]
 * Delete a performance record
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only coaches and admins can delete measurements
    if (!isCoach(user) && !isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only coaches and admins can delete measurements' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = await createClient()

    // Fetch existing record to check permissions
    const { data: existingRecord, error: fetchError } = await supabase
      .from('performance_records')
      .select('id, recorded_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Performance record not found' },
        { status: 404 }
      )
    }

    // Check if user can delete this record (recorded_by or admin)
    if (existingRecord.recorded_by !== user.id && !isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only delete your own recordings' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from('performance_records')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting performance record:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete performance record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Performance record deleted successfully',
    })
  } catch (error) {
    console.error('Performance record DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
