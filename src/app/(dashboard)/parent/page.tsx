'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ParentRelation {
  id: string
  organization_id: string
  athlete_user_id: string
  relationship_type: string
  is_primary: boolean
  can_view_progress: boolean
  can_view_payments: boolean
  verified: boolean
  athlete: {
    id: string
    full_name: string | null
    avatar_url: string | null
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
  last_activity_date: string | null
  user_profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
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

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [parentName, setParentName] = useState('')
  const [relations, setRelations] = useState<ParentRelation[]>([])
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [stats, setStats] = useState<AthleteStats | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) {
          setError('Oturum bilgisi alinamadi')
          return
        }

        setParentName(me.data.profile?.fullName || '')
        const parentRelations: ParentRelation[] = me.data.parentRelations || []
        setRelations(parentRelations)

        const orgId = me.data.memberships?.[0]?.organization_id
        if (!orgId) {
          setError('Organizasyon bulunamadi')
          return
        }

        // Fetch athletes linked to this parent via parent relations
        // The parent relations from /api/auth/me give us athlete_user_ids
        // We need to get their athlete profiles
        if (parentRelations.length > 0) {
          const athleteUserIds = parentRelations.map(r => r.athlete_user_id)

          // Fetch all athletes from org - the list contains user_profile with user_id
          const athletesRes = await fetch(`/api/athletes?organizationId=${orgId}&pageSize=100`)
          const athletesData = await athletesRes.json()

          if (athletesData.success && athletesData.data) {
            // Filter to only athletes linked to this parent
            const linkedAthletes = athletesData.data.filter((a: AthleteProfile) =>
              athleteUserIds.includes(a.user_id)
            )
            setAthletes(linkedAthletes)

            // Fetch stats for the first child
            if (linkedAthletes.length > 0) {
              const statsRes = await fetch(`/api/athletes/${linkedAthletes[0].id}/stats`)
              const statsData = await statsRes.json()
              if (statsData.success) {
                setStats(statsData.data)
              }
            }
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Veli Paneli</h1>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">&#9888;&#65039;</div>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hos Geldiniz{parentName ? `, ${parentName}` : ''}!
        </h1>
        <p className="text-gray-500">Cocugunuzun gelisimini takip edin</p>
      </div>

      {/* Quick Stats */}
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

      {/* Children Summary Cards */}
      {athletes.length > 0 ? (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Cocuklariniz</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {athletes.map((athlete) => {
              const relation = relations.find(r => r.athlete_user_id === athlete.user_id)
              return (
                <div key={athlete.id} className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-lg font-bold text-emerald-600">
                      {(athlete.user_profile?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {athlete.user_profile?.full_name || 'Bilinmeyen Sporcu'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {athlete.position && (
                          <span className="text-xs text-gray-500">Pozisyon: {athlete.position}</span>
                        )}
                        {athlete.jersey_number != null && (
                          <span className="text-xs text-gray-500">Forma: #{athlete.jersey_number}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Seviye</div>
                      <div className="font-bold text-emerald-600">{athlete.current_level || 1}</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">XP</div>
                      <div className="font-bold text-blue-600">{athlete.total_xp || 0}</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Seri</div>
                      <div className="font-bold text-orange-500">{athlete.streak_days || 0}</div>
                    </div>
                  </div>

                  {relation && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        {relation.relationship_type === 'mother' ? 'Anne' :
                         relation.relationship_type === 'father' ? 'Baba' :
                         relation.relationship_type === 'guardian' ? 'Vasi' : 'Veli'}
                      </span>
                      {relation.is_primary && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Birincil Veli
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">&#128100;</div>
          <p className="text-gray-500">Henuz bagli sporcu bulunamadi</p>
          <p className="text-gray-400 text-sm mt-1">Akademi yoneticinizle iletisime gecin</p>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/parent/progress"
          className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <div className="text-2xl mb-2">&#128200;</div>
          <h3 className="font-semibold text-emerald-800">Gelisimi Gor</h3>
          <p className="text-sm text-emerald-600 mt-1">
            Cocugunuzun performans gelisimini ve basarimlarini inceleyin
          </p>
        </Link>

        <Link
          href="/parent/payments"
          className="bg-blue-50 p-6 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <div className="text-2xl mb-2">&#128179;</div>
          <h3 className="font-semibold text-blue-800">Odemeleri Gor</h3>
          <p className="text-sm text-blue-600 mt-1">
            Aidat odemelerinizi ve odeme gecmisinizi goruntuleyin
          </p>
        </Link>
      </div>

      {/* Recent Achievements Preview */}
      {stats && stats.recentAchievements && stats.recentAchievements.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Son Basarimlar</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.recentAchievements.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center text-xl">
                  &#127942;
                </div>
                <div>
                  <div className="font-medium text-sm">{a.achievement?.name}</div>
                  <div className="text-xs text-gray-500">+{a.achievement?.xp_reward} XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
