'use client'

import { useEffect, useState } from 'react'

interface ParentRelation {
  id: string
  organization_id: string
  athlete_user_id: string
  relationship_type: string
  can_view_progress: boolean
  verified: boolean
  athlete: {
    id: string
    full_name: string | null
  } | null
}

interface AthleteProfile {
  id: string
  user_id: string
  position: string | null
  jersey_number: number | null
  current_level: number | null
  total_xp: number | null
  streak_days: number | null
  user_profile: {
    id: string
    full_name: string | null
  } | null
}

interface AthleteStats {
  totalXp: number
  currentLevel: number
  streakDays: number
  completedPrograms: number
  upcomingSessionsCount: number
  recentAchievements: any[]
  weeklyProgress: { day: string; completed: number }[]
}

interface MetricHistory {
  metricType: {
    id: string
    code: string
    name: string
    unit: string | null
    category: string | null
    is_higher_better: boolean | null
  }
  dataPoints: {
    id: string
    value: number
    date: string
    isVerified: boolean
    notes: string | null
  }[]
  statistics: {
    count: number
    latestValue: number
    latestDate: string | null
    firstValue: number
    firstDate: string | null
    totalChange: number
    totalChangePercent: number | null
    trend: {
      direction: string
      recentTrend: string
    }
  }
}

interface AchievementItem {
  id: string
  athlete_id: string
  earned_at: string
  achievement: {
    id: string
    name: string
    description: string | null
    xp_reward: number | null
    category: string | null
  } | null
}

export default function ParentProgress() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
  const [stats, setStats] = useState<AthleteStats | null>(null)
  const [metrics, setMetrics] = useState<MetricHistory[]>([])
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) {
          setError('Oturum bilgisi alinamadi')
          return
        }

        const parentRelations: ParentRelation[] = me.data.parentRelations || []
        const orgId = me.data.memberships?.[0]?.organization_id
        if (!orgId) {
          setError('Organizasyon bulunamadi')
          return
        }

        // Filter relations with progress viewing permission
        const viewableRelations = parentRelations.filter(r => r.can_view_progress && r.verified)
        if (viewableRelations.length === 0) {
          setAthletes([])
          return
        }

        const athleteUserIds = viewableRelations.map(r => r.athlete_user_id)

        // Fetch athletes from the org
        const athletesRes = await fetch(`/api/athletes?organizationId=${orgId}&pageSize=100`)
        const athletesData = await athletesRes.json()

        if (athletesData.success && athletesData.data) {
          const linkedAthletes = athletesData.data.filter((a: AthleteProfile) =>
            athleteUserIds.includes(a.user_id)
          )
          setAthletes(linkedAthletes)

          // Auto-select the first child
          if (linkedAthletes.length > 0) {
            setSelectedAthleteId(linkedAthletes[0].id)
          }
        }
      } catch {
        setError('Veriler yuklenirken bir hata olustu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load details when selected athlete changes
  useEffect(() => {
    if (!selectedAthleteId) return

    async function loadDetails() {
      setLoadingDetails(true)
      try {
        const [statsRes, historyRes, achievementsRes] = await Promise.all([
          fetch(`/api/athletes/${selectedAthleteId}/stats`),
          fetch(`/api/performance/athlete/${selectedAthleteId}/history`),
          fetch(`/api/athletes/${selectedAthleteId}/achievements`),
        ])

        const statsData = await statsRes.json()
        if (statsData.success) setStats(statsData.data)

        const historyData = await historyRes.json()
        if (historyData.success) setMetrics(historyData.data?.metrics || [])

        const achievementsData = await achievementsRes.json()
        if (achievementsData.success) setAchievements(achievementsData.data || [])
      } catch {
        // Silently handle individual fetch errors
      } finally {
        setLoadingDetails(false)
      }
    }
    loadDetails()
  }, [selectedAthleteId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Gelisim Takibi</h1>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">&#9888;&#65039;</div>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (athletes.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Gelisim Takibi</h1>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">&#128200;</div>
          <p className="text-gray-500">Gelisim verileri goruntuleme yetkiniz bulunamadi</p>
          <p className="text-gray-400 text-sm mt-1">Akademi yoneticinizle iletisime gecin</p>
        </div>
      </div>
    )
  }

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gelisim Takibi</h1>
        <p className="text-gray-500">Cocugunuzun performans gelisimini takip edin</p>
      </div>

      {/* Child Selector Tabs */}
      {athletes.length > 1 && (
        <div className="flex gap-2">
          {athletes.map(athlete => (
            <button
              key={athlete.id}
              onClick={() => setSelectedAthleteId(athlete.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAthleteId === athlete.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {athlete.user_profile?.full_name || 'Sporcu'}
            </button>
          ))}
        </div>
      )}

      {loadingDetails ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-500">Seviye</div>
                <div className="text-3xl font-bold text-emerald-600 mt-1">{stats.currentLevel}</div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(((stats.totalXp % 1000) / 1000) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-500">Toplam XP</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">{stats.totalXp}</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-500">Seri</div>
                <div className="text-3xl font-bold text-orange-500 mt-1">{stats.streakDays} gun</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-500">Tamamlanan Program</div>
                <div className="text-3xl font-bold text-purple-600 mt-1">{stats.completedPrograms}</div>
              </div>
            </div>
          )}

          {/* Weekly Progress */}
          {stats && (
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Haftalik Ilerleme</h3>
              <div className="flex items-end gap-2 h-32">
                {(stats.weeklyProgress || [
                  { day: 'Pzt', completed: 0 },
                  { day: 'Sal', completed: 0 },
                  { day: 'Car', completed: 0 },
                  { day: 'Per', completed: 0 },
                  { day: 'Cum', completed: 0 },
                  { day: 'Cmt', completed: 0 },
                  { day: 'Paz', completed: 0 },
                ]).map((d: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-emerald-200 rounded-t"
                      style={{ height: `${Math.max(d.completed * 25, 4)}%` }}
                    >
                      <div className="w-full h-full bg-emerald-500 rounded-t" />
                    </div>
                    <span className="text-xs text-gray-500">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance History */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Performans Gecmisi</h3>
            {metrics.length > 0 ? (
              <div className="space-y-3">
                {metrics.map((metric) => {
                  const latest = metric.dataPoints[metric.dataPoints.length - 1]
                  const previous = metric.dataPoints.length > 1
                    ? metric.dataPoints[metric.dataPoints.length - 2]
                    : null
                  const isImproving = metric.statistics.trend.direction === 'improving'
                  const isDeclining = metric.statistics.trend.direction === 'declining'
                  const change = previous
                    ? latest.value - previous.value
                    : 0

                  return (
                    <div
                      key={metric.metricType.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">
                          {metric.metricType.name}
                        </div>
                        {metric.metricType.category && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {metric.metricType.category}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            {latest?.value}{metric.metricType.unit ? ` ${metric.metricType.unit}` : ''}
                          </div>
                          {latest?.date && (
                            <div className="text-xs text-gray-400">
                              {new Date(latest.date).toLocaleDateString('tr-TR')}
                            </div>
                          )}
                        </div>

                        <div className="w-8 text-center">
                          {isImproving && (
                            <span className="text-emerald-500 text-lg" title="Gelisiyor">&#8593;</span>
                          )}
                          {isDeclining && (
                            <span className="text-red-500 text-lg" title="Geriliyor">&#8595;</span>
                          )}
                          {!isImproving && !isDeclining && (
                            <span className="text-gray-400 text-lg" title="Sabit">&#8594;</span>
                          )}
                        </div>

                        {previous && change !== 0 && (
                          <div className={`text-xs font-medium ${
                            (metric.metricType.is_higher_better ? change > 0 : change < 0)
                              ? 'text-emerald-600'
                              : 'text-red-500'
                          }`}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Henuz performans olcumu yapilmamis
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Kazanilan Basarimlar</h3>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {achievements.map((aa) => (
                  <div key={aa.id} className="bg-yellow-50 p-4 rounded-xl text-center">
                    <div className="w-14 h-14 bg-yellow-200 rounded-full flex items-center justify-center text-2xl mx-auto">
                      &#127942;
                    </div>
                    <h4 className="font-semibold text-sm mt-3">{aa.achievement?.name}</h4>
                    {aa.achievement?.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {aa.achievement.description}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-emerald-600 font-medium">
                      +{aa.achievement?.xp_reward || 0} XP
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {new Date(aa.earned_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Henuz basarim kazanilmadi
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
