'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { StatsCard, StreakIndicator, QuickAction, AchievementBadge } from '@/components/athlete'
import { ProfileSettingsDialog } from '@/components/profile/profile-settings-dialog'

interface DashboardData {
  profile: any
  stats: any
  todayPlan: { title: string; type: string; duration: number; notes: string } | null
  groupName: string
  user: any
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  technical: 'Teknik',
  tactical: 'Taktik',
  physical: 'Fiziksel',
  game_based: 'Oyun Temelli',
  match: 'Maç',
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

// Calculate level progress (XP needed per level increases)
function calculateLevelProgress(totalXp: number): { level: number; progress: number; xpToNext: number } {
  const xpPerLevel = 100 // Base XP per level
  const level = Math.floor(totalXp / xpPerLevel) + 1
  const xpInCurrentLevel = totalXp % xpPerLevel
  const progress = Math.round((xpInCurrentLevel / xpPerLevel) * 100)
  const xpToNext = xpPerLevel - xpInCurrentLevel
  return { level, progress, xpToNext }
}

export function AthleteDashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setError('')
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) {
          setError(me.error || 'Kullanici bilgisi yuklenemedi')
          return
        }

        const athleteProfiles = me.data.athleteProfiles || []
        const athleteProfile = athleteProfiles[0]
        if (!athleteProfile) {
          setError('Sporcu profili bulunamadi')
          return
        }

        // Fetch stats and group info in parallel
        const [statsRes, groupsRes] = await Promise.all([
          fetch(`/api/athletes/${athleteProfile.id}/stats`),
          fetch('/api/my-groups'),
        ])
        const stats = await statsRes.json()
        const groupsData = await groupsRes.json()
        if (!stats.success) {
          setError(stats.error || 'Istatistikler yuklenemedi')
          return
        }

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

        setData({ profile: athleteProfile, stats: stats.data, todayPlan, groupName, user: me.data.user })
      } catch {
        setError('Veriler yuklenemedi')
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Sporcu Paneli</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">
        Sporcu panel verisi bulunamadi.
      </div>
    )
  }

  const stats = data?.stats
  const { level, progress, xpToNext } = calculateLevelProgress(stats?.totalXp || 0)

  return (
    <div className="space-y-6">
      <ProfileSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={data?.user}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Hoş Geldin! 👋</h1>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Profil Ayarları"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <p className="text-gray-500">Bugünkü antrenman planını kontrol et</p>
        </div>
        <StreakIndicator days={stats?.streakDays || 0} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction
          label="Antrenman Başlat"
          icon="⚽"
          href="/dashboard/my-plan"
          color="emerald"
          description="Bugünün planı"
        />
        <QuickAction
          label="Egzersiz Yap"
          icon="🏋️"
          href="/dashboard/exercises"
          color="blue"
          description="Kütüphaneye git"
        />
        <QuickAction
          label="İlerleme Gör"
          icon="📈"
          href="/dashboard/progress"
          color="purple"
          description="Gelişimini takip et"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Seviye"
          value={level}
          icon="⭐"
          color="emerald"
          progress={progress}
          subtitle={`${xpToNext} XP kaldı`}
        />
        <StatsCard
          title="Toplam XP"
          value={stats?.totalXp || 0}
          icon="💎"
          color="blue"
        />
        <StatsCard
          title="Seri"
          value={`${stats?.streakDays || 0} gün`}
          icon="🔥"
          color="orange"
        />
        <StatsCard
          title="Tamamlanan"
          value={stats?.completedPrograms || 0}
          subtitle="program"
          icon="🏆"
          color="purple"
        />
      </div>

      {/* Today's Plan Card */}
      {data?.todayPlan && data.todayPlan.type ? (
        <Link href="/dashboard/my-plan" className="block">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emerald-100 text-sm font-medium">Bugünün Antrenman Planı</div>
                <div className="text-xl font-bold mt-1">
                  {data.todayPlan.type === 'rest' ? '😴 Dinlenme Günü' : data.todayPlan.title || SESSION_TYPE_LABELS[data.todayPlan.type] || 'Antrenman'}
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
              <div className="text-5xl opacity-80">
                {data.todayPlan.type === 'rest' ? '😴' : '⚽'}
              </div>
            </div>
            {data.todayPlan.notes && data.todayPlan.type !== 'rest' && (
              <p className="mt-3 text-sm text-emerald-100 bg-white/10 rounded-lg p-3">{data.todayPlan.notes}</p>
            )}
          </div>
        </Link>
      ) : (
        <Link href="/dashboard/my-plan" className="block">
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Bugünün Planı</div>
                <div className="text-gray-700 font-medium mt-1">
                  {data?.groupName ? 'Bugün için plan henüz yok' : 'Haftalık planı görüntüle'}
                </div>
              </div>
              <span className="text-3xl">📋</span>
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
            const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-600 mb-1">{d.completed > 0 ? d.completed : ''}</span>
                <div
                  className={`w-full rounded-t transition-all ${d.completed > 0 ? 'bg-emerald-500' : isToday ? 'bg-emerald-200' : 'bg-gray-200'
                    }`}
                  style={{ height: `${heightPercent}%` }}
                />
                <span className={`text-xs ${isToday ? 'text-emerald-600 font-bold' : 'text-gray-500'}`}>{d.day}</span>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Son Başarımlar</h3>
          <Link href="/dashboard/achievements" className="text-sm text-emerald-600 hover:underline">
            Tümünü gör →
          </Link>
        </div>
        {stats?.recentAchievements?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.recentAchievements.slice(0, 4).map((a: any) => (
              <AchievementBadge
                key={a.id}
                name={a.achievement?.name || 'Başarım'}
                icon="🏆"
                xpReward={a.achievement?.xp_reward}
                earnedAt={a.earned_at}
                size="md"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-gray-400 text-sm">Henüz başarım kazanılmadı.</p>
            <p className="text-gray-500 text-sm mt-1">Antrenmanlarla başla ve ödüller kazan!</p>
          </div>
        )}
      </div>
    </div>
  )
}
