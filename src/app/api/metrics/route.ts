import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser, isAdmin } from '@/lib/auth'

/**
 * GET /api/metrics
 * List all available metric types (system metrics + organization custom metrics)
 *
 * Query parameters:
 * - category: Filter by category (e.g., 'speed', 'agility', 'strength', 'endurance')
 * - isSystem: Filter by system metrics only (true) or custom only (false)
 * - isActive: Filter by active status (default: true)
 * - organizationId: Filter by organization (for custom metrics)
 * - search: Search by name or code
 * - sortBy: Field to sort by (default: display_order)
 * - sortOrder: asc or desc (default: asc)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const category = searchParams.get('category')
    const isSystem = searchParams.get('isSystem')
    const isActive = searchParams.get('isActive')
    const organizationId = searchParams.get('organizationId') || user.currentOrganizationId
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'display_order'
    const sortOrder = searchParams.get('sortOrder') === 'desc'

    // Build query - get system metrics and organization-specific metrics
    let query = supabase
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

    // Filter: system metrics OR metrics belonging to user's organization
    if (isSystem === 'true') {
      query = query.eq('is_system', true)
    } else if (isSystem === 'false') {
      query = query.eq('is_system', false)
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }
    } else {
      // Default: show system metrics and organization's custom metrics
      query = query.or(`is_system.eq.true,organization_id.eq.${organizationId}`)
    }

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (isActive !== null && isActive !== 'all') {
      query = query.eq('is_active', isActive !== 'false')
    } else if (isActive === null) {
      // Default to active only
      query = query.eq('is_active', true)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    // Apply sorting
    const validSortFields = ['display_order', 'name', 'code', 'category', 'created_at']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'display_order'

    // Handle null display_order values
    if (sortField === 'display_order') {
      query = query.order('display_order', { ascending: !sortOrder, nullsFirst: false })
        .order('name', { ascending: true })
    } else {
      query = query.order(sortField, { ascending: !sortOrder })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching metric types:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch metric types' },
        { status: 500 }
      )
    }

    // Group by category for easier consumption
    const groupedByCategory = groupMetricsByCategory(data || [])

    // Get usage statistics for each metric
    const metricsWithStats = await addUsageStatistics(supabase, data || [], organizationId)

    return NextResponse.json({
      success: true,
      data: {
        metrics: metricsWithStats,
        grouped: groupedByCategory,
        categories: [...new Set((data || []).map(m => m.category).filter(Boolean))],
      },
    })
  } catch (error) {
    console.error('Metric types GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/metrics
 * Create a new custom metric type (admin only)
 *
 * Request body:
 * - code: Unique identifier (snake_case, required)
 * - name: Display name (required)
 * - description: Metric description (optional)
 * - unit: Unit of measurement (e.g., 'seconds', 'meters', 'kg') (optional)
 * - category: Metric category (optional)
 * - dataType: Data type (number, time, etc.) (optional, default: 'number')
 * - isHigherBetter: Whether higher values are better (optional, default: true)
 * - minValue: Minimum allowed value (optional)
 * - maxValue: Maximum allowed value (optional)
 * - displayOrder: Order for display (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can create custom metrics
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can create custom metrics' },
        { status: 403 }
      )
    }

    if (!user.currentOrganizationId) {
      return NextResponse.json(
        { success: false, error: 'No organization context' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      code,
      name,
      description,
      unit,
      category,
      dataType,
      isHigherBetter,
      minValue,
      maxValue,
      displayOrder,
    } = body

    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'code is required' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    // Validate code format (snake_case, alphanumeric)
    const codeRegex = /^[a-z][a-z0-9_]*$/
    if (!codeRegex.test(code)) {
      return NextResponse.json(
        { success: false, error: 'code must be snake_case (lowercase letters, numbers, underscores, starting with a letter)' },
        { status: 400 }
      )
    }

    // Validate min/max values
    if (minValue !== undefined && maxValue !== undefined && minValue >= maxValue) {
      return NextResponse.json(
        { success: false, error: 'minValue must be less than maxValue' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if code already exists for this organization or as a system metric
    const { data: existing, error: existingError } = await supabase
      .from('metric_types')
      .select('id, code, is_system, organization_id')
      .eq('code', code)
      .or(`is_system.eq.true,organization_id.eq.${user.currentOrganizationId}`)

    if (existingError) {
      console.error('Error checking existing metric:', existingError)
      return NextResponse.json(
        { success: false, error: 'Failed to validate metric code' },
        { status: 500 }
      )
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A metric with this code already exists' },
        { status: 409 }
      )
    }

    // Create the metric type
    const metricData = {
      code,
      name,
      description: description || null,
      unit: unit || null,
      category: category || null,
      data_type: dataType || 'number',
      is_higher_better: isHigherBetter ?? true,
      min_value: minValue ?? null,
      max_value: maxValue ?? null,
      display_order: displayOrder ?? null,
      is_system: false,
      is_active: true,
      organization_id: user.currentOrganizationId,
    }

    const { data: newMetric, error: insertError } = await supabase
      .from('metric_types')
      .insert(metricData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating metric type:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create metric type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newMetric,
    }, { status: 201 })
  } catch (error) {
    console.error('Metric types POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface MetricType {
  id: string
  code: string
  name: string
  description: string | null
  unit: string | null
  category: string | null
  data_type: string | null
  is_higher_better: boolean | null
  min_value: number | null
  max_value: number | null
  display_order: number | null
  is_system: boolean | null
  is_active: boolean | null
  organization_id: string | null
  created_at: string | null
}

interface MetricWithStats extends MetricType {
  usageCount?: number
  lastUsed?: string | null
}

/**
 * Group metrics by category
 */
function groupMetricsByCategory(
  metrics: MetricType[]
): Record<string, MetricType[]> {
  const grouped: Record<string, MetricType[]> = {}

  for (const metric of metrics) {
    const category = metric.category || 'other'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(metric)
  }

  return grouped
}

/**
 * Add usage statistics to metrics
 */
async function addUsageStatistics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  metrics: MetricType[],
  organizationId: string | null
): Promise<MetricWithStats[]> {
  if (metrics.length === 0) return []

  const metricIds = metrics.map(m => m.id)

  // Get usage counts and last used dates
  const { data: usageData, error } = await supabase
    .from('performance_records')
    .select('metric_type_id, recorded_at')
    .in('metric_type_id', metricIds)

  if (error) {
    console.error('Error fetching metric usage:', error)
    // Return metrics without stats on error
    return metrics
  }

  // Calculate stats per metric
  const statsMap = new Map<string, { count: number; lastUsed: string | null }>()

  for (const record of usageData || []) {
    const existing = statsMap.get(record.metric_type_id)
    if (existing) {
      existing.count++
      if (record.recorded_at && (!existing.lastUsed || record.recorded_at > existing.lastUsed)) {
        existing.lastUsed = record.recorded_at
      }
    } else {
      statsMap.set(record.metric_type_id, {
        count: 1,
        lastUsed: record.recorded_at,
      })
    }
  }

  return metrics.map(metric => ({
    ...metric,
    usageCount: statsMap.get(metric.id)?.count || 0,
    lastUsed: statsMap.get(metric.id)?.lastUsed || null,
  }))
}
