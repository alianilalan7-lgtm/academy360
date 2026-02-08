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
  const [skillScores, setSkillScores] = useState<any[]>([])
  const [devNotes, setDevNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canView = activeRole === 'coach' || activeRole === 'club_admin'
  const id = params.id as string

  useEffect(() => {
    if (!canView || roleLoading || !id) return

    async function load() {
      try {
        const [athleteRes, statsRes, perfRes, scoresRes, notesRes] = await Promise.all([
          fetch(`/api/athletes/${id}`),
          fetch(`/api/athletes/${id}/stats`),
          fetch(`/api/performance/athlete/${id}/history?limit=10`),
          fetch(`/api/skill-scores?athlete_id=${id}&pageSize=100`),
          fetch(`/api/development-notes?athlete_id=${id}&pageSize=10`),
        ])

        const athleteData = await athleteRes.json()
        const statsData = await statsRes.json()
        const perfData = await perfRes.json()
        const scoresData = await scoresRes.json()
        const notesData = await notesRes.json()

        if (!athleteData.success) {
          setError(athleteData.error || 'Sporcu bulunamadı')
          return
        }

        setAthlete(athleteData.data)
        if (statsData.success) setStats(statsData.data)
        if (perfData.success) setPerformance(perfData.data?.records || [])
        if (scoresData.success) setSkillScores(scoresData.data || [])
        if (notesData.success) setDevNotes(notesData.data || [])
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

      {/* Skill Scores & Weakness Analysis */}
      <SkillScoresSection scores={skillScores} athleteId={id} />

      {/* Development Notes */}
      <DevNotesSection notes={devNotes} athleteId={id} onNoteAdded={(note: any) => setDevNotes(prev => [note, ...prev])} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Link
          href={`/dashboard/players/${id}/development`}
          className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition-colors"
        >
          <span className="text-2xl">📂</span>
          <div>
            <p className="font-medium text-gray-900">Gelişim Dosyası</p>
            <p className="text-sm text-gray-500">Ay bazlı gelişim arşivi</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

// --- Skill Scores Section ---
const SCORE_CATEGORIES = [
  { key: 'technical', label: 'Teknik', color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { key: 'physical', label: 'Fiziksel', color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  { key: 'behavioral', label: 'Davranışsal', color: '#F59E0B', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
]

function SkillScoresSection({ scores, athleteId }: { scores: any[]; athleteId: string }) {
  // Get latest score per skill
  const latestBySkill: Record<string, { skill_name: string; category: string; score: number; measured_at: string }> = {}
  for (const s of scores) {
    if (!latestBySkill[s.skill_name] || new Date(s.measured_at) > new Date(latestBySkill[s.skill_name].measured_at)) {
      latestBySkill[s.skill_name] = { skill_name: s.skill_name, category: s.category, score: s.score, measured_at: s.measured_at }
    }
  }
  const latestScores = Object.values(latestBySkill)

  // Category averages
  const categoryAvg = SCORE_CATEGORIES.map(cat => {
    const catScores = latestScores.filter(s => s.category === cat.key)
    const avg = catScores.length ? catScores.reduce((sum, s) => sum + s.score, 0) / catScores.length : 0
    return { ...cat, avg: Math.round(avg * 10) / 10, count: catScores.length }
  })

  // Weakness: skills below 5
  const weakSkills = latestScores.filter(s => s.score < 5).sort((a, b) => a.score - b.score)

  // Radar chart data
  const radarSkills = latestScores.slice(0, 8)
  const radarSize = 200
  const radarCenter = radarSize / 2
  const radarRadius = 80

  function polarToXY(angle: number, value: number) {
    const rad = (angle - 90) * (Math.PI / 180)
    const r = (value / 10) * radarRadius
    return { x: radarCenter + r * Math.cos(rad), y: radarCenter + r * Math.sin(rad) }
  }

  const radarPoints = radarSkills.map((s, i) => {
    const angle = (360 / radarSkills.length) * i
    return { ...s, ...polarToXY(angle, s.score), angle, labelPos: polarToXY(angle, 12) }
  })

  const radarPath = radarPoints.length > 2
    ? radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
    : ''

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar + Category Averages */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Beceri Puanları</h2>
          <Link href={`/dashboard/compare`} className="text-sm text-emerald-600 hover:text-emerald-700">
            Karşılaştır
          </Link>
        </div>
        <div className="p-5">
          {latestScores.length > 0 ? (
            <>
              {/* Radar Chart */}
              {radarSkills.length >= 3 && (
                <div className="flex justify-center mb-4">
                  <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
                    {/* Grid circles */}
                    {[2, 4, 6, 8, 10].map(level => (
                      <circle
                        key={level}
                        cx={radarCenter}
                        cy={radarCenter}
                        r={(level / 10) * radarRadius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={level === 10 ? 1.5 : 0.5}
                      />
                    ))}
                    {/* Grid lines */}
                    {radarSkills.map((_, i) => {
                      const angle = (360 / radarSkills.length) * i
                      const end = polarToXY(angle, 10)
                      return (
                        <line
                          key={i}
                          x1={radarCenter}
                          y1={radarCenter}
                          x2={end.x}
                          y2={end.y}
                          stroke="#e5e7eb"
                          strokeWidth={0.5}
                        />
                      )
                    })}
                    {/* Data polygon */}
                    <path d={radarPath} fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth={2} />
                    {/* Data points + labels */}
                    {radarPoints.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={3} fill="#10B981" />
                        <text
                          x={p.labelPos.x}
                          y={p.labelPos.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[8px] fill-gray-600"
                        >
                          {p.skill_name.length > 8 ? p.skill_name.slice(0, 7) + '..' : p.skill_name}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              )}

              {/* Category averages */}
              <div className="space-y-2">
                {categoryAvg.map(cat => (
                  <div key={cat.key} className={`flex items-center justify-between p-3 rounded-lg ${cat.bg} border ${cat.border}`}>
                    <span className={`text-sm font-medium ${cat.text}`}>{cat.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${cat.avg * 10}%`, backgroundColor: cat.color }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${cat.text}`}>
                        {cat.count > 0 ? `${cat.avg}/10` : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm">Henüz beceri puanı girilmemiş</p>
              <p className="text-xs mt-1">Programlar sayfasından sporcu puanlayabilirsiniz</p>
            </div>
          )}
        </div>
      </div>

      {/* Weakness Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Eksik Yön Analizi</h2>
        </div>
        <div className="p-5">
          {latestScores.length > 0 ? (
            <>
              {weakSkills.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-3">
                    5 puanın altındaki beceriler geliştirilmeli:
                  </p>
                  {weakSkills.map(skill => {
                    const cat = SCORE_CATEGORIES.find(c => c.key === skill.category)
                    return (
                      <div key={skill.skill_name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{skill.skill_name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${cat?.bg} ${cat?.text}`}>
                              {cat?.label}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${skill.score * 10}%`,
                                backgroundColor: skill.score < 3 ? '#EF4444' : '#F59E0B',
                              }}
                            />
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${skill.score < 3 ? 'text-red-500' : 'text-yellow-500'}`}>
                          {skill.score}/10
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">💪</div>
                  <p className="text-sm text-emerald-600 font-medium">Tüm beceriler 5 ve üzerinde!</p>
                  <p className="text-xs text-gray-400 mt-1">Sporcu genel olarak iyi seviyede</p>
                </div>
              )}

              {/* All skills bar list */}
              {latestScores.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-3">Tüm Beceriler ({latestScores.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {latestScores.sort((a, b) => b.score - a.score).map(skill => (
                      <div key={skill.skill_name} className="flex items-center gap-2 text-xs">
                        <span className="w-20 truncate text-gray-600">{skill.skill_name}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${skill.score * 10}%`,
                              backgroundColor: skill.score >= 7 ? '#10B981' : skill.score >= 5 ? '#3B82F6' : skill.score >= 3 ? '#F59E0B' : '#EF4444',
                            }}
                          />
                        </div>
                        <span className="w-6 text-right font-medium text-gray-700">{skill.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">Analiz için beceri puanı gerekli</p>
              <p className="text-xs mt-1">Puanlar girildikten sonra eksik yönler burada gösterilecek</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Development Notes Section ---
function DevNotesSection({ notes, athleteId, onNoteAdded }: { notes: any[]; athleteId: string; onNoteAdded: (note: any) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteCategory, setNoteCategory] = useState('general')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/development-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete_id: athleteId,
          note: noteText.trim(),
          category: noteCategory,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onNoteAdded(data.data)
        setNoteText('')
        setShowForm(false)
      }
    } catch {
      // handle silently
    } finally {
      setSaving(false)
    }
  }

  const catLabels: Record<string, { label: string; bg: string; text: string }> = {
    general: { label: 'Genel', bg: 'bg-gray-100', text: 'text-gray-600' },
    strength: { label: 'Güçlü Yön', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    weakness: { label: 'Gelişim Alanı', bg: 'bg-red-50', text: 'text-red-600' },
    goal: { label: 'Hedef', bg: 'bg-blue-50', text: 'text-blue-600' },
    behavior: { label: 'Davranış', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Gelişim Notları</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          {showForm ? 'İptal' : '+ Not Ekle'}
        </button>
      </div>

      {/* Add note form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 border-b border-gray-100 bg-gray-50 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={noteCategory}
              onChange={e => setNoteCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {Object.entries(catLabels).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Not</label>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              placeholder="Sporcu hakkında gelişim notu yazın..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !noteText.trim()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Kaydediliyor...' : 'Notu Kaydet'}
          </button>
        </form>
      )}

      <div className="p-5">
        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note: any) => {
              const cat = catLabels[note.category] || catLabels.general
              return (
                <div key={note.id} className="p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} font-medium`}>
                      {cat.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(note.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{note.note || note.note_text}</p>
                  {note.coach_name && (
                    <p className="text-xs text-gray-400 mt-2">— {note.coach_name}</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-sm">Henüz gelişim notu yok</p>
            <p className="text-xs mt-1">&ldquo;Not Ekle&rdquo; ile ilk notu oluşturun</p>
          </div>
        )}
      </div>
    </div>
  )
}