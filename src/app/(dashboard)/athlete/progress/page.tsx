'use client'

import { useEffect, useState } from 'react'

interface DataPoint {
  id: string
  value: number
  date: string
  isVerified: boolean
  notes: string | null
}

interface MetricType {
  id: string
  code: string
  name: string
  unit: string | null
  category: string | null
  is_higher_better: boolean | null
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
    trend: {
      direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
      recentTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
      momentum: number
      consistency: number
      projectedValue: number | null
      improvementRate: number | null
    }
  }
  benchmarks: {
    personalBest: number
    personalBestDate: string | null
    personalWorst: number
    personalWorstDate: string | null
  }
}

interface ProgressData {
  athleteId: string
  athleteName: string | null
  metrics: MetricHistory[]
}

export default function AthleteProgress() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) {
          setError('Oturum bilgisi alinamadi')
          return
        }

        const athleteProfile = me.data.athleteProfile || me.data.athleteProfiles?.[0]
        if (!athleteProfile) {
          setError('Sporcu profili bulunamadi')
          return
        }

        const historyRes = await fetch(`/api/performance/athlete/${athleteProfile.id}/history`)
        const history = await historyRes.json()

        if (history.success) {
          setData(history.data)
        } else {
          setError(history.error || 'Veriler yuklenemedi')
        }
      } catch {
        setError('Bir hata olustu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-56 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Gelisim Takibi</h1>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">&#9888;</div>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const metrics = data?.metrics || []

  // Calculate summary stats
  const totalMeasurements = metrics.reduce((sum, m) => sum + m.statistics.count, 0)

  const improvingMetrics = metrics.filter(
    m => m.statistics.trend.direction === 'improving'
  )
  const avgImprovementPercent = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.statistics.totalChangePercent || 0), 0) / metrics.length
    : 0

  // Find the best performing metric (highest positive change %)
  const bestMetric = metrics.length > 0
    ? metrics.reduce((best, m) => {
        const currentChange = Math.abs(m.statistics.totalChangePercent || 0)
        const bestChange = Math.abs(best.statistics.totalChangePercent || 0)
        if (m.statistics.trend.direction === 'improving' && currentChange > bestChange) {
          return m
        }
        return best
      }, metrics[0])
    : null

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatChangePercent(value: number | null): string {
    if (value === null || value === undefined) return '-'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  // Get all data points across metrics, sorted by date descending for the recent list
  const allRecentMeasurements: {
    metric: MetricType
    dataPoint: DataPoint
    prevValue: number | null
    isHigherBetter: boolean
  }[] = []

  for (const m of metrics) {
    const isHigherBetter = m.metricType.is_higher_better ?? true
    for (let i = 0; i < m.dataPoints.length; i++) {
      allRecentMeasurements.push({
        metric: m.metricType,
        dataPoint: m.dataPoints[i],
        prevValue: i > 0 ? m.dataPoints[i - 1].value : null,
        isHigherBetter,
      })
    }
  }

  allRecentMeasurements.sort(
    (a, b) => new Date(b.dataPoint.date).getTime() - new Date(a.dataPoint.date).getTime()
  )

  // Group by metric for the grouped view
  const groupedByCategory: Record<string, MetricHistory[]> = {}
  for (const m of metrics) {
    const category = m.metricType.category || 'Diger'
    if (!groupedByCategory[category]) {
      groupedByCategory[category] = []
    }
    groupedByCategory[category].push(m)
  }

  const trendLabels: Record<string, string> = {
    improving: 'Gelisiyor',
    declining: 'Geriliyor',
    stable: 'Stabil',
    insufficient_data: 'Yetersiz Veri',
  }

  const trendColors: Record<string, string> = {
    improving: 'bg-emerald-100 text-emerald-700',
    declining: 'bg-red-100 text-red-700',
    stable: 'bg-blue-100 text-blue-700',
    insufficient_data: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gelisim Takibi</h1>
        <p className="text-gray-500">Performans olcumlerini ve ilerleme durumunu takip et</p>
      </div>

      {metrics.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">&#128202;</div>
          <p className="text-gray-500">Henuz performans olcumu yapilmadi.</p>
          <p className="text-sm text-gray-400 mt-1">Antrenorun olcum yaptiktan sonra burada gorunecek.</p>
        </div>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-500">Toplam Olcum</div>
              <div className="text-3xl font-bold text-emerald-600 mt-1">{totalMeasurements}</div>
              <div className="text-xs text-gray-400 mt-1">{metrics.length} metrik takip ediliyor</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-500">Ortalama Degisim</div>
              <div className={`text-3xl font-bold mt-1 ${avgImprovementPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatChangePercent(avgImprovementPercent)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {improvingMetrics.length} / {metrics.length} metrik gelisiyor
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-500">En Iyi Metrik</div>
              <div className="text-xl font-bold text-blue-600 mt-1 truncate">
                {bestMetric?.metricType.name || '-'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {bestMetric ? formatChangePercent(bestMetric.statistics.totalChangePercent) : '-'}
              </div>
            </div>
          </div>

          {/* Metrics grouped by category */}
          {Object.entries(groupedByCategory).map(([category, categoryMetrics]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800">{category}</h2>

              {categoryMetrics.map((m) => {
                const latestPoints = m.dataPoints.slice(-5).reverse()
                const trend = m.statistics.trend

                return (
                  <div key={m.metricType.id} className="bg-white p-5 rounded-xl border border-gray-200">
                    {/* Metric Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{m.metricType.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend.direction]}`}>
                            {trendLabels[trend.direction]}
                          </span>
                          {m.metricType.unit && (
                            <span className="text-xs text-gray-400">Birim: {m.metricType.unit}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {m.statistics.latestValue}
                          {m.metricType.unit && (
                            <span className="text-sm font-normal text-gray-400 ml-1">{m.metricType.unit}</span>
                          )}
                        </div>
                        <div className={`text-sm font-medium ${m.statistics.totalChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatChangePercent(m.statistics.totalChangePercent)}
                        </div>
                      </div>
                    </div>

                    {/* Mini bar chart for last 5 measurements */}
                    {m.dataPoints.length > 1 && (
                      <div className="mb-4">
                        <div className="flex items-end gap-1 h-16">
                          {m.dataPoints.slice(-7).map((dp, i) => {
                            const min = m.statistics.min
                            const max = m.statistics.max
                            const range = max - min || 1
                            const heightPct = Math.max(8, ((dp.value - min) / range) * 100)
                            return (
                              <div key={dp.id} className="flex-1 flex flex-col items-center gap-0.5">
                                <span className="text-[10px] text-gray-400">{dp.value}</span>
                                <div
                                  className="w-full bg-emerald-400 rounded-t transition-all"
                                  style={{ height: `${heightPct}%` }}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                      <div>
                        <span className="text-gray-400">En Iyi: </span>
                        <span className="font-medium text-gray-700">{m.benchmarks.personalBest}{m.metricType.unit ? ` ${m.metricType.unit}` : ''}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Ortalama: </span>
                        <span className="font-medium text-gray-700">{m.statistics.average}{m.metricType.unit ? ` ${m.metricType.unit}` : ''}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Olcum: </span>
                        <span className="font-medium text-gray-700">{m.statistics.count} kez</span>
                      </div>
                    </div>

                    {/* Recent measurements list */}
                    <div className="mt-3 space-y-1">
                      {latestPoints.map((dp, i) => {
                        // Compare with the next (older) point
                        const olderIndex = m.dataPoints.length - 1 - i
                        const prevPoint = olderIndex > 0 ? m.dataPoints[olderIndex - 1] : null
                        const change = prevPoint ? dp.value - prevPoint.value : null
                        const isHigherBetter = m.metricType.is_higher_better ?? true
                        const isPositiveChange = change !== null
                          ? (isHigherBetter ? change > 0 : change < 0)
                          : null

                        return (
                          <div key={dp.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 w-24">{formatDate(dp.date)}</span>
                              <span className="text-sm font-medium text-gray-900">
                                {dp.value}{m.metricType.unit ? ` ${m.metricType.unit}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {change !== null && change !== 0 && (
                                <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositiveChange ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {isPositiveChange ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )}
                                  {change > 0 ? '+' : ''}{change.toFixed(1)}
                                </span>
                              )}
                              {change === 0 && (
                                <span className="text-xs text-gray-400">=</span>
                              )}
                              {dp.isVerified && (
                                <span className="text-emerald-500 ml-1" title="Dogrulanmis">
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
