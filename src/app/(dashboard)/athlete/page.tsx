'use client'

import { useEffect, useState } from 'react'

interface DashboardData {
  profile: any
  stats: any
}

export default function AthleteDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) return

        const athleteProfile = me.data.athleteProfile
        if (!athleteProfile) return

        const statsRes = await fetch(`/api/athletes/${athleteProfile.id}/stats`)
        const stats = await statsRes.json()

        setData({ profile: athleteProfile, stats: stats.data })
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const profile = data?.profile

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hos Geldin! 👋</h1>
        <p className="text-gray-500">Bugunku antrenman planini kontrol et</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Seviye</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{stats?.currentLevel || 1}</div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Toplam XP</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{stats?.totalXp || 0}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Seri</div>
          <div className="text-3xl font-bold text-orange-500 mt-1">{stats?.streakDays || 0} gun</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Tamamlanan</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">{stats?.completedPrograms || 0}</div>
          <div className="text-xs text-gray-400">program</div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Haftalik Ilerleme</h3>
        <div className="flex items-end gap-2 h-32">
          {(stats?.weeklyProgress || [
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

      {/* Recent Achievements */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Son Basarimlar</h3>
        {stats?.recentAchievements?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.recentAchievements.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center text-xl">🏆</div>
                <div>
                  <div className="font-medium text-sm">{a.achievement?.name}</div>
                  <div className="text-xs text-gray-500">+{a.achievement?.xp_reward} XP</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Henuz basarim kazanilmadi. Antrenmanlarla basla!</p>
        )}
      </div>
    </div>
  )
}
