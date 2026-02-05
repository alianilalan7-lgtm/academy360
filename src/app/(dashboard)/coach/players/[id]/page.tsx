'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function CoachPlayerDetail() {
  const params = useParams()
  const id = params.id as string

  const [athlete, setAthlete] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [history, setHistory] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [athleteRes, statsRes, historyRes] = await Promise.all([
          fetch(`/api/athletes/${id}`),
          fetch(`/api/athletes/${id}/stats`),
          fetch(`/api/performance/athlete/${id}/history?limit=10`),
        ])

        const athleteData = await athleteRes.json()
        const statsData = await statsRes.json()
        const historyData = await historyRes.json()

        if (athleteData.success) {
          setAthlete(athleteData.data)
        } else {
          setError(athleteData.error || 'Sporcu bulunamadi')
        }

        if (statsData.success) setStats(statsData.data)
        if (historyData.success) setHistory(historyData.data)
      } catch {
        setError('Baglanti hatasi')
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id])

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/coach/players" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Oyunculara Don
        </Link>
        <div className="text-center py-12 text-red-500">{error}</div>
      </div>
    )
  }

  if (!athlete) return null

  const fullName = athlete.user_profile?.full_name || 'Isim yok'
  const initial = fullName.charAt(0).toUpperCase()

  return (
    <div className="space-y-6">
      <Link href="/coach/players" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Oyunculara Don
      </Link>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-bold text-emerald-700">
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              {athlete.position && (
                <span>Pozisyon: {athlete.position}</span>
              )}
              {athlete.jersey_number !== null && athlete.jersey_number !== undefined && (
                <span>Forma: #{athlete.jersey_number}</span>
              )}
              {athlete.dominant_foot && (
                <span>Ayak: {athlete.dominant_foot === 'right' ? 'Sag' : athlete.dominant_foot === 'left' ? 'Sol' : 'Her Iki'}</span>
              )}
              {athlete.height_cm && (
                <span>Boy: {athlete.height_cm} cm</span>
              )}
              {athlete.weight_kg && (
                <span>Kilo: {athlete.weight_kg} kg</span>
              )}
            </div>
            {athlete.group_members && athlete.group_members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {athlete.group_members
                  .filter((gm: any) => gm.is_active)
                  .map((gm: any) => (
                    <span key={gm.id} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                      {gm.group?.name || 'Grup'}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-500">Seviye</div>
            <div className="text-3xl font-bold text-emerald-600 mt-1">{stats.currentLevel || 1}</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-500">Toplam XP</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">{stats.totalXp || 0}</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-500">Seri</div>
            <div className="text-3xl font-bold text-orange-600 mt-1">{stats.streakDays || 0}</div>
            <div className="text-xs text-gray-400">gun</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-500">Tamamlanan Program</div>
            <div className="text-3xl font-bold text-purple-600 mt-1">{stats.completedPrograms || 0}</div>
          </div>
        </div>
      )}

      {history && history.metrics && history.metrics.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Son Olcumler</h2>
          <div className="space-y-3">
            {history.metrics.map((metric: any) => (
              <div key={metric.metricType.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">
                    {metric.metricType.name}
                    {metric.metricType.unit && (
                      <span className="text-gray-400 text-sm ml-1">({metric.metricType.unit})</span>
                    )}
                  </h3>
                  {metric.statistics && (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        metric.statistics.trend?.direction === 'improving'
                          ? 'bg-emerald-100 text-emerald-700'
                          : metric.statistics.trend?.direction === 'declining'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {metric.statistics.trend?.direction === 'improving' ? 'Yukselen' :
                         metric.statistics.trend?.direction === 'declining' ? 'Dusen' :
                         metric.statistics.trend?.direction === 'stable' ? 'Sabit' : 'Yetersiz Veri'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {metric.dataPoints.slice(-5).map((dp: any, i: number) => (
                    <div key={dp.id || i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{formatDate(dp.date)}</span>
                      <span className="font-medium text-gray-900">
                        {dp.value} {metric.metricType.unit || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!history || !history.metrics || history.metrics.length === 0) && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Son Olcumler</h2>
          <div className="text-center py-8 text-gray-400">Henuz olcum verisi bulunamadi</div>
        </div>
      )}

      {stats && stats.recentAchievements && stats.recentAchievements.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Son Basarimlar</h2>
          <div className="space-y-3">
            {stats.recentAchievements.map((ra: any) => (
              <div key={ra.id} className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-lg">
                  {ra.achievement?.icon_url ? (
                    <img src={ra.achievement.icon_url} alt="" className="w-6 h-6" />
                  ) : (
                    <span>&#127942;</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{ra.achievement?.name || 'Basarim'}</div>
                  {ra.achievement?.description && (
                    <div className="text-xs text-gray-500">{ra.achievement.description}</div>
                  )}
                </div>
                <div className="text-right">
                  {ra.achievement?.xp_reward && (
                    <div className="text-sm font-medium text-emerald-600">+{ra.achievement.xp_reward} XP</div>
                  )}
                  <div className="text-xs text-gray-400">{formatDate(ra.earned_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && (!stats.recentAchievements || stats.recentAchievements.length === 0) && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Son Basarimlar</h2>
          <div className="text-center py-8 text-gray-400">Henuz basarim kazanilmamis</div>
        </div>
      )}
    </div>
  )
}
