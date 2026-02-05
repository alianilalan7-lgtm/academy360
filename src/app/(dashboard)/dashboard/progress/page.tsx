'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

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
    latestValue: number
    latestDate: string | null
    totalChange: number
    totalChangePercent: number | null
    trend: {
      direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
    }
  }
  benchmarks: {
    personalBest: number
    personalBestDate: string | null
  }
}

interface ProgressData {
  athleteId: string
  athleteName: string | null
  metrics: MetricHistory[]
}

export default function ProgressPage() {
  const { activeRole, isLoading: roleLoading } = useRole()

  // Athlete and Parent can view progress
  const canView = activeRole === 'athlete' || activeRole === 'parent'

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['athlete', 'parent']} />
  }

  return <ProgressContent />
}

function ProgressContent() {
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

        const athleteProfiles = me.data.athleteProfiles || []
        const athleteProfile = athleteProfiles[0] || me.data.athleteProfile
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
  const totalMeasurements = metrics.reduce((sum, m) => sum + m.statistics.count, 0)
  const improvingMetrics = metrics.filter(m => m.statistics.trend.direction === 'improving')
  const avgImprovementPercent = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.statistics.totalChangePercent || 0), 0) / metrics.length
    : 0

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
              <div className="text-sm text-gray-500">Takip Edilen</div>
              <div className="text-3xl font-bold text-blue-600 mt-1">{metrics.length}</div>
              <div className="text-xs text-gray-400 mt-1">metrik</div>
            </div>
          </div>

          {Object.entries(groupedByCategory).map(([category, categoryMetrics]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800">{category}</h2>

              {categoryMetrics.map((m) => {
                const trend = m.statistics.trend

                return (
                  <div key={m.metricType.id} className="bg-white p-5 rounded-xl border border-gray-200">
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
