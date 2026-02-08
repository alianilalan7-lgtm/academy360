import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ athleteId: string }>
}

interface MetricType {
  id: string
  code: string
  name: string
  unit: string | null
  category: string | null
  is_higher_better: boolean | null
}

interface PerformanceRecord {
  id: string
  value: number
  recorded_at: string | null
  is_verified: boolean | null
  notes: string | null
  metric_type: MetricType | null
}

interface DataPoint {
  id: string
  value: number
  date: string
  isVerified: boolean
  notes: string | null
}

interface MetricHistory {
  metricType: MetricType
  dataPoints: DataPoint[]
  statistics: {
    count: number
    min: number
    max: number
    average: number
    median: number
    standardDeviation: number
    latestValue: number
    latestDate: string | null
    firstValue: number
    firstDate: string | null
    totalChange: number
    totalChangePercent: number | null
    trend: TrendAnalysis
  }
  benchmarks: {
    personalBest: number
    personalBestDate: string | null
    personalWorst: number
    personalWorstDate: string | null
  }
}

interface TrendAnalysis {
  direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  recentTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  momentum: number // -1 to 1, negative = declining, positive = improving
  consistency: number // 0 to 1, how consistent the values are
  projectedValue: number | null // extrapolated next value
  improvementRate: number | null // average improvement per measurement
}

/**
 * GET /api/performance/athlete/[athleteId]/history
 * Get historical performance data formatted for charts with trend analysis
 *
 * Query parameters:
 * - metric: Filter by metric code (e.g., 'sprint_40m', 'agility_test')
 * - metricTypeId: Filter by metric type ID
 * - category: Filter by metric category
 * - startDate: Filter records from this date (ISO string)
 * - endDate: Filter records until this date (ISO string)
 * - interval: Group by interval (daily, weekly, monthly) - returns averaged values
 * - limit: Maximum records per metric (default: 100)
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
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const metricCode = searchParams.get('metric')
    const metricTypeId = searchParams.get('metricTypeId')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const interval = searchParams.get('interval') as 'daily' | 'weekly' | 'monthly' | null
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)))

    // Verify athlete exists
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select(`
        id,
        user_id,
        user:user_profiles!athlete_profiles_user_id_fkey(
          id,
          full_name
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
        value,
        recorded_at,
        is_verified,
        notes,
        metric_type:metric_types(
          id,
          code,
          name,
          unit,
          category,
          is_higher_better
        )
      `)
      .eq('athlete_id', athleteId)
      .order('recorded_at', { ascending: true })

    // Apply metric type filter
    if (metricTypeId) {
      query = query.eq('metric_type_id', metricTypeId)
    }

    // Apply date range filters
    if (startDate) {
      query = query.gte('recorded_at', startDate)
    }

    if (endDate) {
      query = query.lte('recorded_at', endDate)
    }

    const { data: records, error: recordsError } = await query

    if (recordsError) {
      console.error('Error fetching performance history:', recordsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch performance history' },
        { status: 500 }
      )
    }

    // Type the records
    const typedRecords = records as PerformanceRecord[]

    // Filter by metric code or category if specified
    let filteredRecords = typedRecords
    if (metricCode) {
      filteredRecords = filteredRecords.filter(
        r => r.metric_type?.code === metricCode
      )
    }
    if (category) {
      filteredRecords = filteredRecords.filter(
        r => r.metric_type?.category === category
      )
    }

    // Group records by metric type
    const groupedByMetric = groupByMetric(filteredRecords)

    // Calculate trends and format for charts
    const historyData = calculateTrendsAndFormat(groupedByMetric, interval, limit)

    return NextResponse.json({
      success: true,
      data: {
        athleteId,
        athleteName: (athlete.user as { full_name: string | null } | null)?.full_name,
        metrics: historyData,
        filters: {
          metric: metricCode,
          metricTypeId,
          category,
          startDate,
          endDate,
          interval,
        },
      },
    })
  } catch (error) {
    console.error('Performance history GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Group records by metric type
 */
function groupByMetric(
  records: PerformanceRecord[]
): Map<string, { metricType: MetricType; records: PerformanceRecord[] }> {
  const grouped = new Map<string, { metricType: MetricType; records: PerformanceRecord[] }>()

  for (const record of records) {
    if (!record.metric_type) continue

    const metricId = record.metric_type.id
    if (!grouped.has(metricId)) {
      grouped.set(metricId, {
        metricType: record.metric_type,
        records: [],
      })
    }
    grouped.get(metricId)!.records.push(record)
  }

  return grouped
}

/**
 * Calculate trends and format data for charts
 */
function calculateTrendsAndFormat(
  groupedData: Map<string, { metricType: MetricType; records: PerformanceRecord[] }>,
  interval: 'daily' | 'weekly' | 'monthly' | null,
  limit: number
): MetricHistory[] {
  const result: MetricHistory[] = []

  for (const [, { metricType, records }] of groupedData) {
    // Apply limit
    const limitedRecords = records.slice(-limit)

    // Aggregate by interval if specified
    const dataPoints = interval
      ? aggregateByInterval(limitedRecords, interval)
      : limitedRecords.map(r => ({
          id: r.id,
          value: r.value,
          date: r.recorded_at || new Date().toISOString(),
          isVerified: r.is_verified ?? false,
          notes: r.notes,
        }))

    if (dataPoints.length === 0) continue

    const values = dataPoints.map(dp => dp.value)
    const isHigherBetter = metricType.is_higher_better ?? true

    // Calculate statistics
    const statistics = calculateStatistics(dataPoints, isHigherBetter)

    // Calculate benchmarks
    const benchmarks = calculateBenchmarks(dataPoints, isHigherBetter)

    result.push({
      metricType,
      dataPoints,
      statistics,
      benchmarks,
    })
  }

  return result
}

/**
 * Aggregate data points by time interval
 */
function aggregateByInterval(
  records: PerformanceRecord[],
  interval: 'daily' | 'weekly' | 'monthly'
): DataPoint[] {
  const buckets = new Map<string, { values: number[]; dates: string[]; records: PerformanceRecord[] }>()

  for (const record of records) {
    if (!record.recorded_at) continue

    const date = new Date(record.recorded_at)
    let bucketKey: string

    switch (interval) {
      case 'daily':
        bucketKey = date.toISOString().split('T')[0]
        break
      case 'weekly':
        // Get start of week (Monday)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const weekStart = new Date(date.setDate(diff))
        bucketKey = weekStart.toISOString().split('T')[0]
        break
      case 'monthly':
        bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        break
    }

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { values: [], dates: [], records: [] })
    }
    const bucket = buckets.get(bucketKey)!
    bucket.values.push(record.value)
    bucket.dates.push(record.recorded_at)
    bucket.records.push(record)
  }

  // Convert buckets to data points (using average value per bucket)
  const result: DataPoint[] = []
  for (const [date, bucket] of Array.from(buckets.entries()).sort()) {
    const avgValue = bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length
    result.push({
      id: bucket.records[bucket.records.length - 1].id,
      value: Math.round(avgValue * 100) / 100,
      date,
      isVerified: bucket.records.every(r => r.is_verified),
      notes: null,
    })
  }

  return result
}

/**
 * Calculate comprehensive statistics for a metric
 */
function calculateStatistics(
  dataPoints: DataPoint[],
  isHigherBetter: boolean
): MetricHistory['statistics'] {
  const values = dataPoints.map(dp => dp.value)
  const n = values.length

  // Basic statistics
  const min = Math.min(...values)
  const max = Math.max(...values)
  const sum = values.reduce((a, b) => a + b, 0)
  const average = Math.round((sum / n) * 100) / 100

  // Median
  const sorted = [...values].sort((a, b) => a - b)
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]

  // Standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - average, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / n
  const standardDeviation = Math.round(Math.sqrt(avgSquaredDiff) * 100) / 100

  // First and last values
  const firstDataPoint = dataPoints[0]
  const lastDataPoint = dataPoints[n - 1]

  // Total change
  const totalChange = Math.round((lastDataPoint.value - firstDataPoint.value) * 100) / 100
  const totalChangePercent = firstDataPoint.value !== 0
    ? Math.round(((lastDataPoint.value - firstDataPoint.value) / Math.abs(firstDataPoint.value)) * 10000) / 100
    : null

  // Trend analysis
  const trend = calculateTrendAnalysis(dataPoints, isHigherBetter)

  return {
    count: n,
    min,
    max,
    average,
    median: Math.round(median * 100) / 100,
    standardDeviation,
    latestValue: lastDataPoint.value,
    latestDate: lastDataPoint.date,
    firstValue: firstDataPoint.value,
    firstDate: firstDataPoint.date,
    totalChange,
    totalChangePercent,
    trend,
  }
}

/**
 * Calculate detailed trend analysis
 */
function calculateTrendAnalysis(
  dataPoints: DataPoint[],
  isHigherBetter: boolean
): TrendAnalysis {
  const n = dataPoints.length

  if (n < 2) {
    return {
      direction: 'insufficient_data',
      recentTrend: 'insufficient_data',
      momentum: 0,
      consistency: 0,
      projectedValue: null,
      improvementRate: null,
    }
  }

  const values = dataPoints.map(dp => dp.value)

  // Calculate linear regression for overall trend
  const { slope, intercept } = linearRegression(values)

  // Calculate recent trend (last 5 data points)
  const recentValues = values.slice(-5)
  const { slope: recentSlope } = linearRegression(recentValues)

  // Determine direction
  const avgValue = values.reduce((a, b) => a + b, 0) / n
  const threshold = Math.abs(avgValue * 0.03) // 3% threshold

  const getDirection = (s: number): 'improving' | 'declining' | 'stable' => {
    if (Math.abs(s) < threshold) return 'stable'
    const isPositive = s > 0
    if (isHigherBetter) {
      return isPositive ? 'improving' : 'declining'
    } else {
      return isPositive ? 'declining' : 'improving'
    }
  }

  const direction = n < 3 ? 'insufficient_data' : getDirection(slope)
  const recentTrend = recentValues.length < 3 ? 'insufficient_data' : getDirection(recentSlope)

  // Calculate momentum (-1 to 1)
  // Positive momentum = improving faster recently than historically
  const normalizedSlope = slope / (avgValue || 1)
  const normalizedRecentSlope = recentSlope / (avgValue || 1)
  let momentum = normalizedRecentSlope - normalizedSlope

  // Adjust for direction preference
  if (!isHigherBetter) {
    momentum = -momentum
  }

  // Clamp to -1 to 1
  momentum = Math.max(-1, Math.min(1, momentum * 10))
  momentum = Math.round(momentum * 100) / 100

  // Calculate consistency (coefficient of variation)
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - avgValue, 2), 0) / n
  )
  const cv = avgValue !== 0 ? stdDev / Math.abs(avgValue) : 0
  const consistency = Math.round(Math.max(0, Math.min(1, 1 - cv)) * 100) / 100

  // Project next value
  const projectedValue = Math.round((intercept + slope * (n + 1)) * 100) / 100

  // Calculate improvement rate (average change per measurement)
  let totalImprovement = 0
  for (let i = 1; i < n; i++) {
    const change = values[i] - values[i - 1]
    totalImprovement += isHigherBetter ? change : -change
  }
  const improvementRate = n > 1
    ? Math.round((totalImprovement / (n - 1)) * 100) / 100
    : null

  return {
    direction,
    recentTrend,
    momentum,
    consistency,
    projectedValue,
    improvementRate,
  }
}

/**
 * Simple linear regression
 */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] || 0 }

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }

  const denominator = n * sumXX - sumX * sumX
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n }
  }

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

/**
 * Calculate personal benchmarks
 */
function calculateBenchmarks(
  dataPoints: DataPoint[],
  isHigherBetter: boolean
): MetricHistory['benchmarks'] {
  const values = dataPoints.map((dp, i) => ({ value: dp.value, date: dp.date, index: i }))

  // Sort to find best and worst
  const sorted = [...values].sort((a, b) => a.value - b.value)

  const best = isHigherBetter ? sorted[sorted.length - 1] : sorted[0]
  const worst = isHigherBetter ? sorted[0] : sorted[sorted.length - 1]

  return {
    personalBest: best.value,
    personalBestDate: best.date,
    personalWorst: worst.value,
    personalWorstDate: worst.date,
  }
}
