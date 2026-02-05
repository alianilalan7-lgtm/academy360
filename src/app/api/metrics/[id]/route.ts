import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser, isAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/metrics/[id]
 * Get a single metric type by ID with usage statistics
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

    const { data: metric, error } = await supabase
      .from('metric_types')
      .select(`
        id,
        code,
        name,
        description,
        unit,
        category,
        data_type,
        is_higher_better,
        min_value,
        max_value,
        display_order,
        is_system,
        is_active,
        organization_id,
        created_at
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Metric type not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching metric type:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch metric type' },
        { status: 500 }
      )
    }

    // Check access: system metrics are accessible to all, custom metrics only to org members
    if (!metric.is_system && metric.organization_id !== user.currentOrganizationId) {
      return NextResponse.json(
        { success: false, error: 'Metric type not found' },
        { status: 404 }
      )
    }

    // Get usage statistics
    const { data: usageData, error: usageError } = await supabase
      .from('performance_records')
      .select('id, recorded_at, athlete_id')
      .eq('metric_type_id', id)

    const usageStats = {
      totalRecords: usageData?.length || 0,
      uniqueAthletes: new Set(usageData?.map(r => r.athlete_id)).size,
      lastUsed: usageData?.length
        ? usageData.sort((a, b) =>
            new Date(b.recorded_at || 0).getTime() - new Date(a.recorded_at || 0).getTime()
          )[0]?.recorded_at
        : null,
      firstUsed: usageData?.length
        ? usageData.sort((a, b) =>
            new Date(a.recorded_at || 0).getTime() - new Date(b.recorded_at || 0).getTime()
          )[0]?.recorded_at
        : null,
    }

    // Get distribution of values for this metric
    const { data: valueDistribution } = await supabase
      .from('performance_records')
      .select('value')
      .eq('metric_type_id', id)
      .limit(1000)

    let distributionStats = null
    if (valueDistribution && valueDistribution.length > 0) {
      const values = valueDistribution.map(r => r.value).sort((a, b) => a - b)
      const n = values.length

      distributionStats = {
        min: values[0],
        max: values[n - 1],
        median: n % 2 === 0
          ? (values[n / 2 - 1] + values[n / 2]) / 2
          : values[Math.floor(n / 2)],
        average: Math.round((values.reduce((a, b) => a + b, 0) / n) * 100) / 100,
        percentile25: values[Math.floor(n * 0.25)],
        percentile75: values[Math.floor(n * 0.75)],
        sampleSize: n,
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...metric,
        usage: usageStats,
        distribution: distributionStats,
      },
    })
  } catch (error) {
    console.error('Metric type GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/metrics/[id]
 * Update a custom metric type (admin only, cannot modify system metrics)
 *
 * Request body (all optional):
 * - name: Display name
 * - description: Metric description
 * - unit: Unit of measurement
 * - category: Metric category
 * - isHigherBetter: Whether higher values are better
 * - minValue: Minimum allowed value
 * - maxValue: Maximum allowed value
 * - displayOrder: Order for display
 * - isActive: Whether the metric is active
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

    // Only admins can update metrics
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can update metrics' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Fetch existing metric
    const { data: existingMetric, error: fetchError } = await supabase
      .from('metric_types')
      .select('id, code, is_system, organization_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingMetric) {
      return NextResponse.json(
        { success: false, error: 'Metric type not found' },
        { status: 404 }
      )
    }

    // Cannot modify system metrics
    if (existingMetric.is_system) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot modify system metrics' },
        { status: 403 }
      )
    }

    // Check organization ownership
    if (existingMetric.organization_id !== user.currentOrganizationId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot modify metrics from other organizations' },
        { status: 403 }
      )
    }

    const {
      name,
      description,
      unit,
      category,
      isHigherBetter,
      minValue,
      maxValue,
      displayOrder,
      isActive,
    } = body

    // Validate min/max values
    const newMinValue = minValue !== undefined ? minValue : null
    const newMaxValue = maxValue !== undefined ? maxValue : null

    if (newMinValue !== null && newMaxValue !== null && newMinValue >= newMaxValue) {
      return NextResponse.json(
        { success: false, error: 'minValue must be less than maxValue' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (unit !== undefined) updateData.unit = unit
    if (category !== undefined) updateData.category = category
    if (isHigherBetter !== undefined) updateData.is_higher_better = isHigherBetter
    if (minValue !== undefined) updateData.min_value = minValue
    if (maxValue !== undefined) updateData.max_value = maxValue
    if (displayOrder !== undefined) updateData.display_order = displayOrder
    if (isActive !== undefined) updateData.is_active = isActive

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: updatedMetric, error: updateError } = await supabase
      .from('metric_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating metric type:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update metric type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedMetric,
    })
  } catch (error) {
    console.error('Metric type PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/metrics/[id]
 * Delete a custom metric type (admin only, cannot delete system metrics)
 *
 * Note: This will fail if there are existing performance records using this metric.
 * Consider using PATCH to set isActive=false for soft deletion.
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

    // Only admins can delete metrics
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can delete metrics' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = await createClient()

    // Fetch existing metric
    const { data: existingMetric, error: fetchError } = await supabase
      .from('metric_types')
      .select('id, code, name, is_system, organization_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingMetric) {
      return NextResponse.json(
        { success: false, error: 'Metric type not found' },
        { status: 404 }
      )
    }

    // Cannot delete system metrics
    if (existingMetric.is_system) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot delete system metrics' },
        { status: 403 }
      )
    }

    // Check organization ownership
    if (existingMetric.organization_id !== user.currentOrganizationId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cannot delete metrics from other organizations' },
        { status: 403 }
      )
    }

    // Check if there are existing performance records using this metric
    const { count: recordCount, error: countError } = await supabase
      .from('performance_records')
      .select('id', { count: 'exact', head: true })
      .eq('metric_type_id', id)

    if (countError) {
      console.error('Error checking metric usage:', countError)
      return NextResponse.json(
        { success: false, error: 'Failed to check metric usage' },
        { status: 500 }
      )
    }

    if (recordCount && recordCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete metric "${existingMetric.name}" - it has ${recordCount} associated performance records. Consider deactivating it instead.`,
          suggestion: 'Use PATCH to set isActive=false for soft deletion'
        },
        { status: 409 }
      )
    }

    // Check if there are athlete goals using this metric
    const { count: goalCount, error: goalCountError } = await supabase
      .from('athlete_goals')
      .select('id', { count: 'exact', head: true })
      .eq('metric_type_id', id)

    if (goalCountError) {
      console.error('Error checking metric goals:', goalCountError)
      return NextResponse.json(
        { success: false, error: 'Failed to check metric usage in goals' },
        { status: 500 }
      )
    }

    if (goalCount && goalCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete metric "${existingMetric.name}" - it has ${goalCount} associated athlete goals. Consider deactivating it instead.`,
          suggestion: 'Use PATCH to set isActive=false for soft deletion'
        },
        { status: 409 }
      )
    }

    // Safe to delete
    const { error: deleteError } = await supabase
      .from('metric_types')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting metric type:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete metric type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Metric type "${existingMetric.name}" deleted successfully`,
    })
  } catch (error) {
    console.error('Metric type DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
