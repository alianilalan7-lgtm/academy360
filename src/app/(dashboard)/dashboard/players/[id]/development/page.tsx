'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface MonthData {
  month: string
  label: string
  skillScores: { skill_name: string; category: string; score: number; measured_at: string }[]
  notes: { id: string; note_text: string; category: string; created_at: string; coach_name?: string }[]
  measurements: { id: string; value: number; recorded_at: string; metric_type: { name: string; unit: string } }[]
  attendance: { total: number; present: number; absent: number; late: number }
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Teknik',
  physical: 'Fiziksel',
  behavioral: 'Davranışsal',
}

const NOTE_CAT_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  general: { label: 'Genel', bg: 'bg-gray-100', text: 'text-gray-600' },
  strength: { label: 'Güçlü Yön', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  weakness: { label: 'Gelişim Alanı', bg: 'bg-red-50', text: 'text-red-600' },
  goal: { label: 'Hedef', bg: 'bg-blue-50', text: 'text-blue-600' },
  behavior: { label: 'Davranış', bg: 'bg-yellow-50', text: 'text-yellow-600' },
}

export default function DevelopmentFilePage() {
  const params = useParams()
  const router = useRouter()
  const { activeRole, isLoading: roleLoading } = useRole()

  if (roleLoading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  if (activeRole !== 'coach' && activeRole !== 'club_admin') {
    return <AccessDenied requiredRoles={['coach', 'club_admin']} />
  }

  return <DevelopmentContent id={params.id as string} onBack={() => router.back()} />
}

function DevelopmentContent({ id, onBack }: { id: string; onBack: () => void }) {
  const [athleteName, setAthleteName] = useState('')
  const [monthsData, setMonthsData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [athleteRes, scoresRes, notesRes, perfRes] = await Promise.all([
          fetch(`/api/athletes/${id}`),
          fetch(`/api/skill-scores?athlete_id=${id}&pageSize=500`),
          fetch(`/api/development-notes?athlete_id=${id}&pageSize=500`),
          fetch(`/api/performance/athlete/${id}/history?limit=500`),
        ])

        const athleteData = await athleteRes.json()
        const scoresData = await scoresRes.json()
        const notesData = await notesRes.json()
        const perfData = await perfRes.json()

        if (athleteData.success) {
          setAthleteName(athleteData.data?.user_profile?.full_name || 'Sporcu')
        }

        const scores = scoresData.success ? scoresData.data || [] : []
        const notes = notesData.success ? notesData.data || [] : []
        const measurements = perfData.success ? perfData.data?.records || [] : []

        // Group by month
        const monthMap: Record<string, MonthData> = {}

        for (const s of scores) {
          const d = new Date(s.measured_at)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!monthMap[key]) {
            monthMap[key] = { month: key, label: formatMonth(key), skillScores: [], notes: [], measurements: [], attendance: { total: 0, present: 0, absent: 0, late: 0 } }
          }
          monthMap[key].skillScores.push({ skill_name: s.skill_name, category: s.category, score: s.score, measured_at: s.measured_at })
        }

        for (const n of notes) {
          const d = new Date(n.created_at)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!monthMap[key]) {
            monthMap[key] = { month: key, label: formatMonth(key), skillScores: [], notes: [], measurements: [], attendance: { total: 0, present: 0, absent: 0, late: 0 } }
          }
          monthMap[key].notes.push({ id: n.id, note_text: n.note_text, category: n.category || 'general', created_at: n.created_at, coach_name: n.coach_name })
        }

        for (const m of measurements) {
          const d = new Date(m.recorded_at)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!monthMap[key]) {
            monthMap[key] = { month: key, label: formatMonth(key), skillScores: [], notes: [], measurements: [], attendance: { total: 0, present: 0, absent: 0, late: 0 } }
          }
          monthMap[key].measurements.push({ id: m.id, value: m.value, recorded_at: m.recorded_at, metric_type: m.metric_type })
        }

        const sorted = Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month))
        setMonthsData(sorted)

        // Auto-expand most recent month
        if (sorted.length > 0) setExpandedMonth(sorted[0].month)
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  function formatMonth(key: string): string {
    const [year, month] = key.split('-')
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
    return `${months[parseInt(month) - 1]} ${year}`
  }

  const years = [...new Set(monthsData.map(m => parseInt(m.month.split('-')[0])))].sort((a, b) => b - a)
  const filteredMonths = monthsData.filter(m => m.month.startsWith(String(selectedYear)))

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gelişim Dosyası</h1>
          <p className="text-sm text-gray-500">{athleteName}</p>
        </div>
      </div>

      {/* Year filter */}
      {years.length > 0 && (
        <div className="flex gap-2">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedYear === year
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Monthly accordion */}
      {filteredMonths.length > 0 ? (
        <div className="space-y-3">
          {filteredMonths.map(monthData => {
            const isExpanded = expandedMonth === monthData.month
            const totalItems = monthData.skillScores.length + monthData.notes.length + monthData.measurements.length

            // Calculate avg score for the month
            const avgScore = monthData.skillScores.length
              ? (monthData.skillScores.reduce((s, sc) => s + sc.score, 0) / monthData.skillScores.length).toFixed(1)
              : null

            return (
              <div key={monthData.month} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Month header */}
                <button
                  onClick={() => setExpandedMonth(isExpanded ? null : monthData.month)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📅</span>
                    <span className="font-semibold text-gray-900">{monthData.label}</span>
                    <span className="text-xs text-gray-400">{totalItems} kayıt</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {avgScore && (
                      <span className="text-sm text-emerald-600 font-medium">Ort: {avgScore}/10</span>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-5">
                    {/* Skill scores for the month */}
                    {monthData.skillScores.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span>⭐</span> Beceri Puanları ({monthData.skillScores.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {monthData.skillScores.map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700 font-medium">{s.skill_name}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  s.category === 'technical' ? 'bg-emerald-50 text-emerald-600' :
                                  s.category === 'physical' ? 'bg-blue-50 text-blue-600' :
                                  'bg-yellow-50 text-yellow-600'
                                }`}>
                                  {CATEGORY_LABELS[s.category] || s.category}
                                </span>
                              </div>
                              <span className={`font-bold ${
                                s.score >= 7 ? 'text-emerald-600' : s.score >= 5 ? 'text-blue-600' : 'text-red-500'
                              }`}>
                                {s.score}/10
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Measurements for the month */}
                    {monthData.measurements.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span>📏</span> Ölçümler ({monthData.measurements.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {monthData.measurements.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                              <span className="text-gray-700">{m.metric_type?.name}</span>
                              <span className="font-medium text-emerald-600">
                                {m.value} {m.metric_type?.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes for the month */}
                    {monthData.notes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span>📝</span> Gelişim Notları ({monthData.notes.length})
                        </h4>
                        <div className="space-y-2">
                          {monthData.notes.map(n => {
                            const cat = NOTE_CAT_LABELS[n.category] || NOTE_CAT_LABELS.general
                            return (
                              <div key={n.id} className="p-3 border border-gray-100 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} font-medium`}>
                                    {cat.label}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(n.created_at).toLocaleDateString('tr-TR')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">{n.note_text}</p>
                                {n.coach_name && (
                                  <p className="text-xs text-gray-400 mt-1">— {n.coach_name}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-500">{selectedYear} yılında kayıt bulunamadı</p>
          <p className="text-sm text-gray-400 mt-1">Puanlama ve ölçüm verileri girildikçe burada görünecek</p>
        </div>
      )}
    </div>
  )
}
