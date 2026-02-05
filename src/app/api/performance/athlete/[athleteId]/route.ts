import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ athleteId: string }>
}

/**
 * GET /api/performance/athlete/[athleteId]
 * Get all performance measurements for a specific athlete
 *
 * Query parameters:
 * - metricTypeId: Filter by specific metric type
 * - metricCode: Filter by metric code
 * - category: Filter by metric category (e.g., 'speed', 'agility', 'strength')
 * - startDate: Filter records from this date (ISO string)
 * - endDate: Filter records until this date (ISO string)
 * - isVerified: Filter by verification status
 * - page: Page number (default: 1)
 * - pageSize: Records per page (default: 50, max: 100)
 * - sortOrder: asc or desc (default: desc)
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

    const { athleteId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const metricTypeId = searchParams.get('metricTypeId')
    const metricCode = searchParams.get('metricCode')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const isVerified = searchParams.get('isVerified')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)))
    const sortOrder = searchParams.get('sortOrder') === 'asc'

    // Verify athlete exists and get their info
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select(`
        id,
        user_id,
        organization_id,
        position,
        jersey_number,
        user:user_profiles!athlete_profiles_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Athlete not found' },
        { status: 404 }
      )
    }

    // Build query for performance records
    let query = supabase
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
          description
        ),
        recorder:user_profiles!performance_records_recorded_by_fkey(
          id,
          full_name
        ),
        session:sessions(
          id,
          title,
          session_type
        )
      `, { count: 'exact' })
      .eq('athlete_id', athleteId)

    // Apply filters
    if (metricTypeId) {
      query = query.eq('metric_type_id', metricTypeId)
    }

    if (startDate) {
      query = query.gte('recorded_at', startDate)
    }

    if (endDate) {
      query = query.lte('recorded_at', endDate)
    }

    if (isVerified !== null && isVerified !== undefined) {
      query = query.eq('is_verified', isVerified === 'true')
    }

    // Apply sorting
    query = query.order('recorded_at', { ascending: sortOrder })

    // Apply pagination
    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    const { data: records, error: recordsError, count } = await query

    if (recordsError) {
      console.error('Error fetching athlete performance records:', recordsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch performance records' },
        { status: 500 }
      )
    }

    // Filter by metric code or category if specified (post-query filter for nested fields)
    let filteredRecords = records || []
    if (metricCode) {
      filteredRecords = filteredRecords.filter(
        r => (r.metric_type as { code?: string } | null)?.code === metricCode
      )
    }
    if (category) {
      filteredRecords = filteredRecords.filter(
        r => (r.metric_type as { category?: string } | null)?.category === category
      )
    }

    // Calculate summary statistics per metric type
    const summaryByMetric = calculateMetricSummaries(filteredRecords)

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / pageSize)

    return NextResponse.json({
      success: true,
      data: {
        athlete,
        records: filteredRecords,
        summary: summaryByMetric,
      },
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error('Athlete performance GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface PerformanceRecord {
  id: string
  value: number
  recorded_at: string | null
  metric_type_id: string
  metric_type: {
    id: string
    code: string
    name: string
    unit: string | null
    category: string | null
    is_higher_better: boolean | null
  } | null
}

interface MetricSummary {
  metricTypeId: string
  code: string
  name: string
  unit: string | null
  category: string | null
  isHigherBetter: boolean | null
  recordCount: number
  latestValue: number
  latestDate: string | null
  previousValue: number | null
  percentageChange: number | null
  isImprovement: boolean | null
  bestValue: number
  worstValue: number
  averageValue: number
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
}

/**
 * Calculate summary statistics for each metric type
 */
function calculateMetricSummaries(records: unknown[]): MetricSummary[] {
  const typedRecords = records as PerformanceRecord[]

  // Group records by metric type
  const groupedByMetric = new Map<string, PerformanceRecord[]>()

  for (const record of typedRecords) {
    if (!record.metric_type) continue

    const metricId = record.metric_type_id
    if (!groupedByMetric.has(metricId)) {
      groupedByMetric.set(metricId, [])
    }
    groupedByMetric.get(metricId)!.push(record)
  }

  const summaries: MetricSummary[] = []

  for (const [metricId, metricRecords] of groupedByMetric) {
    // Sort by date descending
    const sortedRecords = metricRecords.sort((a, b) => {
      const dateA = a.recorded_at ? new Date(a.recorded_at).getTime() : 0
      const dateB = b.recorded_at ? new Date(b.recorded_at).getTime() : 0
      return dateB - dateA
    })

    const latestRecord = sortedRecords[0]
    const previousRecord = sortedRecords[1] || null
    const metricType = latestRecord.metric_type!

    const values = sortedRecords.map(r => r.value)
    const isHigherBetter = metricType.is_higher_better ?? true

    // Calculate percentage change
    let percentageChange: number | null = null
    let isImprovement: boolean | null = null

    if (previousRecord && previousRecord.value !== 0) {
      percentageChange = ((latestRecord.value - previousRecord.value) / Math.abs(previousRecord.value)) * 100
      percentageChange = Math.round(percentageChange * 100) / 100
      isImprovement = isHigherBetter ? percentageChange > 0 : percentageChange < 0
    }

    // Calculate trend based on recent values (last 5 records)
    const trend = calculateTrend(sortedRecords.slice(0, 5), isHigherBetter)

    // Calculate best/worst considering the direction
    const bestValue = isHigherBetter ? Math.max(...values) : Math.min(...values)
    const worstValue = isHigherBetter ? Math.min(...values) : Math.max(...values)
    const averageValue = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100

    summaries.push({
      metricTypeId: metricId,
      code: metricType.code,
      name: metricType.name,
      unit: metricType.unit,
      category: metricType.category,
      isHigherBetter: metricType.is_higher_better,
      recordCount: sortedRecords.length,
      latestValue: latestRecord.value,
      latestDate: latestRecord.recorded_at,
      previousValue: previousRecord?.value ?? null,
      percentageChange,
      isImprovement,
      bestValue,
      worstValue,
      averageValue,
      trend,
    })
  }

  return summaries
}

/**
 * Calculate trend direction based on recent values
 */
function calculateTrend(
  recentRecords: PerformanceRecord[],
  isHigherBetter: boolean
): 'improving' | 'declining' | 'stable' | 'insufficient_data' {
  if (recentRecords.length < 3) {
    return 'insufficient_data'
  }

  // Calculate simple linear regression slope
  const n = recentRecords.length
  const values = recentRecords.map((r, i) => ({ x: n - i, y: r.value }))

  const sumX = values.reduce((acc, v) => acc + v.x, 0)
  const sumY = values.reduce((acc, v) => acc + v.y, 0)
  const sumXY = values.reduce((acc, v) => acc + v.x * v.y, 0)
  const sumXX = values.reduce((acc, v) => acc + v.x * v.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

  // Calculate relative change threshold (5% of average)
  const avgValue = sumY / n
  const threshold = Math.abs(avgValue * 0.05)

  if (Math.abs(slope) < threshold) {
    return 'stable'
  }

  const isPositiveSlope = slope > 0

  if (isHigherBetter) {
    return isPositiveSlope ? 'improving' : 'declining'
  } else {
    return isPositiveSlope ? 'declining' : 'improving'
  }
}
