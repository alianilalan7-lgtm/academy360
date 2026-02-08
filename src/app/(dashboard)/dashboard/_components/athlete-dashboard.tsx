'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardData {
  profile: any
  stats: any
  todayPlan: { title: string; type: string; duration: number; notes: string } | null
  groupName: string
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  technical: 'Teknik',
  tactical: 'Taktik',
  physical: 'Fiziksel',
  game_based: 'Oyun Temelli',
  match: 'Mac',
  rest: 'Dinlenme',
}

function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

function getTodayKey(): string {
  const keys = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi']
  return keys[new Date().getDay()]
}

export function AthleteDashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) return

        const athleteProfiles = me.data.athleteProfiles || []
        const athleteProfile = athleteProfiles[0]
        if (!athleteProfile) return

        // Fetch stats and group info in parallel
        const [statsRes, groupsRes] = await Promise.all([
          fetch(`/api/athletes/${athleteProfile.id}/stats`),
          fetch('/api/my-groups'),
        ])
        const stats = await statsRes.json()
        const groupsData = await groupsRes.json()

        let todayPlan = null
        let groupName = ''

        // If athlete has a group, fetch this week's plan
        if (groupsData.success && groupsData.data?.length > 0) {
          const group = groupsData.data[0]
          groupName = group.name || ''
          const weekStart = getMonday(new Date())
          const planRes = await fetch(`/api/weekly-plans?group_id=${group.id}&week_start=${weekStart}`)
          const planData = await planRes.json()
          if (planData.success && planData.data?.length > 0) {
            const plan = planData.data[0]
            const todayKey = getTodayKey()
            todayPlan = plan.plan_data?.[todayKey] || null
          }
        }

        setData({ profile: athleteProfile, stats: stats.data, todayPlan, groupName })
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hoş Geldin! 👋</h1>
        <p className="text-gray-500">Bugünkü antrenman planını kontrol et</p>
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
          <div className="text-3xl font-bold text-orange-500 mt-1">{stats?.streakDays || 0} gün</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Tamamlanan</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">{stats?.completedPrograms || 0}</div>
          <div className="text-xs text-gray-400">program</div>
        </div>
      </div>

      {/* Today's Plan Card */}
      {data?.todayPlan && data.todayPlan.type ? (
        <Link href="/dashboard/my-plan" className="block">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emerald-100 text-sm font-medium">Bugunun Antrenman Plani</div>
                <div className="text-xl font-bold mt-1">
                  {data.todayPlan.type === 'rest' ? '😴 Dinlenme Gunu' : data.todayPlan.title || SESSION_TYPE_LABELS[data.todayPlan.type] || 'Antrenman'}
                </div>
                <div className="flex items-center gap-3 mt-2 text-emerald-100 text-sm">
                  {data.todayPlan.type !== 'rest' && (
                    <>
                      <span>{SESSION_TYPE_LABELS[data.todayPlan.type] || data.todayPlan.type}</span>
                      {data.todayPlan.duration > 0 && <span>| {data.todayPlan.duration} dk</span>}
                    </>
                  )}
                  {data.groupName && <span>| {data.groupName}</span>}
                </div>
              </div>
              <div className="text-4xl opacity-80">
                {data.todayPlan.type === 'rest' ? '😴' : '⚽'}
              </div>
            </div>
            {data.todayPlan.notes && data.todayPlan.type !== 'rest' && (
              <p className="mt-3 text-sm text-emerald-100 bg-white/10 rounded-lg p-2">{data.todayPlan.notes}</p>
            )}
          </div>
        </Link>
      ) : (
        <Link href="/dashboard/my-plan" className="block">
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Bugunun Plani</div>
                <div className="text-gray-700 font-medium mt-1">
                  {data?.groupName ? 'Bugun icin plan henuz yok' : 'Haftalik plani goruntule'}
                </div>
              </div>
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </Link>
      )}

      {/* Weekly Progress */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Haftalık İlerleme</h3>
          <span className="text-sm text-gray-500">Son 7 gün</span>
        </div>
        <div className="flex items-end gap-2 h-32">
          {(stats?.weeklyProgress || [
            { day: 'Pzt', completed: 0 },
            { day: 'Sal', completed: 0 },
            { day: 'Çar', completed: 0 },
            { day: 'Per', completed: 0 },
            { day: 'Cum', completed: 0 },
            { day: 'Cmt', completed: 0 },
            { day: 'Paz', completed: 0 },
          ]).map((d: any, i: number) => {
            const maxCompleted = Math.max(...(stats?.weeklyProgress || [{ completed: 1 }]).map((p: any) => p.completed), 1)
            const heightPercent = d.completed > 0 ? Math.max((d.completed / maxCompleted) * 100, 15) : 8
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-600 mb-1">{d.completed > 0 ? d.completed : ''}</span>
                <div
                  className={`w-full rounded-t transition-all ${d.completed > 0 ? 'bg-emerald-500' : 'bg-gray-200'}`}
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-xs text-gray-500">{d.day}</span>
              </div>
            )
          })}
        </div>
        {(!stats?.weeklyProgress || stats.weeklyProgress.every((d: any) => d.completed === 0)) && (
          <p className="text-center text-sm text-gray-400 mt-4">Bu hafta henüz tamamlanan antrenman yok</p>
        )}
      </div>

      {/* Recent Achievements */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Son Başarımlar</h3>
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
          <p className="text-gray-400 text-sm">Henüz başarım kazanılmadı. Antrenmanlarla başla!</p>
        )}
      </div>
    </div>
  )
}
