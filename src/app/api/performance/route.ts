import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthUser, isAdmin, isCoach } from '@/lib/auth'
import type { PerformanceRecordInsert } from '@/lib/types'

/**
 * GET /api/performance
 * List performance records with filtering options
 *
 * Query parameters:
 * - athleteId: Filter by specific athlete
 * - metricTypeId: Filter by metric type
 * - metricCode: Filter by metric code
 * - startDate: Filter records from this date (ISO string)
 * - endDate: Filter records until this date (ISO string)
 * - sessionId: Filter by session
 * - isVerified: Filter by verification status
 * - page: Page number (default: 1)
 * - pageSize: Records per page (default: 20, max: 100)
 * - sortBy: Field to sort by (default: recorded_at)
 * - sortOrder: asc or desc (default: desc)
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

    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const athleteId = searchParams.get('athleteId')
    const metricTypeId = searchParams.get('metricTypeId')
    const metricCode = searchParams.get('metricCode')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sessionId = searchParams.get('sessionId')
    const isVerified = searchParams.get('isVerified')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const sortBy = searchParams.get('sortBy') || 'recorded_at'
    const sortOrder = searchParams.get('sortOrder') === 'asc'

    // Build query with related data
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
          min_value,
          max_value,
          description
        ),
        athlete:athlete_profiles!performance_records_athlete_id_fkey(
          id,
          user_id,
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
        )
      `, { count: 'exact' })

    // Apply filters
    if (athleteId) {
      query = query.eq('athlete_id', athleteId)
    }

    if (metricTypeId) {
      query = query.eq('metric_type_id', metricTypeId)
    }

    if (metricCode) {
      // Filter by metric code through the relationship
      query = query.eq('metric_type.code', metricCode)
    }

    if (startDate) {
      query = query.gte('recorded_at', startDate)
    }

    if (endDate) {
      query = query.lte('recorded_at', endDate)
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (isVerified !== null && isVerified !== undefined) {
      query = query.eq('is_verified', isVerified === 'true')
    }

    // Apply sorting
    const validSortFields = ['recorded_at', 'created_at', 'value']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'recorded_at'
    query = query.order(sortField, { ascending: sortOrder })

    // Apply pagination
    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching performance records:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch performance records' },
        { status: 500 }
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / pageSize)

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error('Performance records GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/performance
 * Create a new performance measurement record
 *
 * Request body:
 * - athleteId: UUID of the athlete
 * - metricTypeId: UUID of the metric type
 * - value: Numeric measurement value
 * - recordedAt: ISO date string (optional, defaults to now)
 * - sessionId: UUID of the session (optional)
 * - notes: Additional notes (optional)
 * - isVerified: Whether the measurement is verified (optional, default: false)
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

    // Only coaches and admins can record measurements
    if (!isCoach(user) && !isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only coaches and admins can record measurements' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { athleteId, metricTypeId, value, recordedAt, sessionId, notes, isVerified } = body

    // Validate required fields
    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'athleteId is required' },
        { status: 400 }
      )
    }

    if (!metricTypeId) {
      return NextResponse.json(
        { success: false, error: 'metricTypeId is required' },
        { status: 400 }
      )
    }

    if (value === undefined || value === null || typeof value !== 'number') {
      return NextResponse.json(
        { success: false, error: 'value must be a valid number' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Validate that the metric type exists and get its constraints
    const { data: metricType, error: metricError } = await supabase
      .from('metric_types')
      .select('id, code, name, min_value, max_value, is_active')
      .eq('id', metricTypeId)
      .single()

    if (metricError || !metricType) {
      return NextResponse.json(
        { success: false, error: 'Invalid metric type' },
        { status: 400 }
      )
    }

    if (!metricType.is_active) {
      return NextResponse.json(
        { success: false, error: 'Metric type is not active' },
        { status: 400 }
      )
    }

    // Validate value against metric constraints
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

    // Validate that the athlete exists
    const { data: athlete, error: athleteError } = await supabase
      .from('athlete_profiles')
      .select('id')
      .eq('id', athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        { success: false, error: 'Invalid athlete' },
        { status: 400 }
      )
    }

    // Validate session if provided
    if (sessionId) {
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

    // Create the performance record
    const recordData: PerformanceRecordInsert = {
      athlete_id: athleteId,
      metric_type_id: metricTypeId,
      value,
      recorded_at: recordedAt || new Date().toISOString(),
      recorded_by: user.id,
      session_id: sessionId || null,
      notes: notes || null,
      is_verified: isVerified ?? false,
    }

    const { data: newRecord, error: insertError } = await supabase
      .from('performance_records')
      .insert(recordData)
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

    if (insertError) {
      console.error('Error creating performance record:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create performance record' },
        { status: 500 }
      )
    }

    // Fetch previous record for the same athlete and metric to calculate change
    const { data: previousRecords } = await supabase
      .from('performance_records')
      .select('value, recorded_at')
      .eq('athlete_id', athleteId)
      .eq('metric_type_id', metricTypeId)
      .neq('id', newRecord.id)
      .order('recorded_at', { ascending: false })
      .limit(1)

    let percentageChange: number | null = null
    let previousValue: number | null = null

    if (previousRecords && previousRecords.length > 0) {
      previousValue = previousRecords[0].value
      if (previousValue !== 0) {
        percentageChange = ((value - previousValue) / Math.abs(previousValue)) * 100
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newRecord,
        comparison: {
          previousValue,
          percentageChange: percentageChange !== null ? Math.round(percentageChange * 100) / 100 : null,
          isImprovement: percentageChange !== null
            ? (newRecord.metric_type as { is_higher_better?: boolean })?.is_higher_better
              ? percentageChange > 0
              : percentageChange < 0
            : null,
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Performance records POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
