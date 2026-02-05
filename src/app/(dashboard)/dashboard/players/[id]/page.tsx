'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface Athlete {
  id: string
  user_id: string
  organization_id: string
  birth_date: string | null
  position: string | null
  jersey_number: number | null
  dominant_foot: string | null
  height_cm: number | null
  weight_kg: number | null
  total_xp: number | null
  current_level: number | null
  streak_days: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_notes: string | null
  user_profile: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    phone: string | null
    created_at: string
  }
  group_members: {
    id: string
    group_id: string
    role: string | null
    is_active: boolean
    group: {
      id: string
      name: string
      age_group: string | null
    }
  }[]
}

interface Stats {
  totalXp: number
  currentLevel: number
  streakDays: number
  completedPrograms: number
  upcomingSessionsCount: number
  recentAchievements: {
    id: string
    achievement: {
      name: string
      xp_reward: number
    }
  }[]
  weeklyProgress: { day: string; completed: number }[]
}

interface PerformanceRecord {
  id: string
  recorded_at: string
  value: number
  metric_type: {
    name: string
    unit: string
    code: string
  }
}

export default function PlayerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeRole, isLoading: roleLoading } = useRole()

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [performance, setPerformance] = useState<PerformanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canView = activeRole === 'coach' || activeRole === 'club_admin'
  const id = params.id as string

  useEffect(() => {
    if (!canView || roleLoading || !id) return

    async function load() {
      try {
        const [athleteRes, statsRes, perfRes] = await Promise.all([
          fetch(`/api/athletes/${id}`),
          fetch(`/api/athletes/${id}/stats`),
          fetch(`/api/performance/athlete/${id}/history?limit=10`),
        ])

        const athleteData = await athleteRes.json()
        const statsData = await statsRes.json()
        const perfData = await perfRes.json()

        if (!athleteData.success) {
          setError(athleteData.error || 'Sporcu bulunamadı')
          return
        }

        setAthlete(athleteData.data)
        if (statsData.success) setStats(statsData.data)
        if (perfData.success) setPerformance(perfData.data?.records || [])
      } catch {
        setError('Veri yüklenirken hata oluştu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, roleLoading, id])

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['coach', 'club_admin']} />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !athlete) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.back()} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Geri
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error || 'Sporcu bulunamadı'}</p>
        </div>
      </div>
    )
  }

  const age = athlete.birth_date
    ? Math.floor((Date.now() - new Date(athlete.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const footLabels: Record<string, string> = {
    left: 'Sol',
    right: 'Sağ',
    both: 'Her İkisi',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {athlete.user_profile?.full_name || 'İsimsiz Sporcu'}
          </h1>
          <p className="text-sm text-gray-500">
            {athlete.position || 'Pozisyon belirtilmemiş'} · #{athlete.jersey_number || '-'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
            Seviye {stats?.currentLevel || athlete.current_level || 1}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {stats?.totalXp || athlete.total_xp || 0} XP
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-lg">🔥</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{stats?.streakDays || 0}</p>
          <p className="text-xs text-gray-500">Gün Serisi</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-lg">📋</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats?.completedPrograms || 0}</p>
          <p className="text-xs text-gray-500">Program Tamamlandı</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-lg">📅</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats?.upcomingSessionsCount || 0}</p>
          <p className="text-xs text-gray-500">Gelecek Seans</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center text-lg">🏆</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats?.recentAchievements?.length || 0}</p>
          <p className="text-xs text-gray-500">Başarım</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Profil Bilgileri</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-3xl font-bold text-emerald-700">
                {athlete.user_profile?.full_name?.charAt(0) || '?'}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {athlete.user_profile?.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">E-posta</span>
                  <span className="text-gray-900">{athlete.user_profile.email}</span>
                </div>
              )}
              {athlete.user_profile?.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Telefon</span>
                  <span className="text-gray-900">{athlete.user_profile.phone}</span>
                </div>
              )}
              {age !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Yaş</span>
                  <span className="text-gray-900">{age}</span>
                </div>
              )}
              {athlete.height_cm && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Boy</span>
                  <span className="text-gray-900">{athlete.height_cm} cm</span>
                </div>
              )}
              {athlete.weight_kg && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Kilo</span>
                  <span className="text-gray-900">{athlete.weight_kg} kg</span>
                </div>
              )}
              {athlete.dominant_foot && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Baskın Ayak</span>
                  <span className="text-gray-900">{footLabels[athlete.dominant_foot] || athlete.dominant_foot}</span>
                </div>
              )}
            </div>

            {/* Groups */}
            {athlete.group_members && athlete.group_members.filter(gm => gm.is_active).length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Gruplar</p>
                <div className="flex flex-wrap gap-2">
                  {athlete.group_members.filter(gm => gm.is_active).map((gm) => (
                    <span key={gm.id} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                      {gm.group?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {(athlete.emergency_contact_name || athlete.emergency_contact_phone) && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Acil Durum İletişim</p>
                <p className="text-sm text-gray-900">{athlete.emergency_contact_name}</p>
                <p className="text-sm text-gray-600">{athlete.emergency_contact_phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Haftalık İlerleme</h2>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-2 h-32">
              {(stats?.weeklyProgress || []).map((d, i) => {
                const maxCompleted = Math.max(...(stats?.weeklyProgress || [{ completed: 1 }]).map(p => p.completed), 1)
                const heightPercent = d.completed > 0 ? Math.max((d.completed / maxCompleted) * 100, 15) : 8
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-gray-600">{d.completed > 0 ? d.completed : ''}</span>
                    <div
                      className={`w-full rounded-t transition-all ${d.completed > 0 ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-xs text-gray-500">{d.day}</span>
                  </div>
                )
              })}
            </div>
            {(!stats?.weeklyProgress || stats.weeklyProgress.every(d => d.completed === 0)) && (
              <p className="text-center text-sm text-gray-400 mt-4">Bu hafta aktivite yok</p>
            )}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Son Başarımlar</h2>
            <Link href={`/dashboard/achievements?athleteId=${id}`} className="text-sm text-emerald-600 hover:text-emerald-700">
              Tümü
            </Link>
          </div>
          <div className="p-5">
            {stats?.recentAchievements && stats.recentAchievements.length > 0 ? (
              <div className="space-y-3">
                {stats.recentAchievements.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                    <span className="text-xl">🏆</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{a.achievement?.name}</p>
                      <p className="text-xs text-gray-500">+{a.achievement?.xp_reward} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-8">Henüz başarım yok</p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Records */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Son Ölçümler</h2>
          <Link href={`/dashboard/measurements?athleteId=${id}`} className="text-sm text-emerald-600 hover:text-emerald-700">
            Yeni Ölçüm Ekle
          </Link>
        </div>
        {performance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Metrik</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Değer</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3 text-sm text-gray-900">{record.metric_type?.name}</td>
                    <td className="px-5 py-3 text-sm font-medium text-emerald-600">
                      {record.value} {record.metric_type?.unit}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(record.recorded_at).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-gray-400">
            Henüz ölçüm kaydı yok
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/measurements?athleteId=${id}`}
          className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
        >
          <span className="text-2xl">📏</span>
          <div>
            <p className="font-medium text-gray-900">Ölçüm Ekle</p>
            <p className="text-sm text-gray-500">Yeni performans ölçümü kaydet</p>
          </div>
        </Link>
        <Link
          href={`/dashboard/assignments?athleteId=${id}`}
          className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-medium text-gray-900">Program Ata</p>
            <p className="text-sm text-gray-500">Antrenman programı ata</p>
          </div>
        </Link>
        <Link
          href={`/dashboard/progress?athleteId=${id}`}
          className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-colors"
        >
          <span className="text-2xl">📈</span>
          <div>
            <p className="font-medium text-gray-900">İlerleme Detayı</p>
            <p className="text-sm text-gray-500">Detaylı performans analizi</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
