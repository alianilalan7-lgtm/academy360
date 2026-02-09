'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'
import { Skeleton, CardSkeleton, ChartSkeleton } from '@/components/ui/skeleton'

interface MetricHistory {
  metricType: {
    id: string
    code: string
    name: string
    unit: string | null
    category: string | null
    is_higher_better: boolean | null
  }
  statistics: {
    count: number
    min: number
    max: number
    average: number
    latestValue: number
    latestDate: string | null
    totalChange: number
    totalChangePercent: number | null
    trend: { direction: 'improving' | 'declining' | 'stable' | 'insufficient_data' }
  }
  benchmarks: {
    personalBest: number
    personalBestDate: string | null
  }
}

interface SkillScore {
  skill_name: string
  category: string
  score: number
  measured_at: string
}

interface DevNote {
  id: string
  note: string
  note_text?: string
  category: string | null
  created_at: string
  coach_name?: string
  is_private?: boolean
}

const SCORE_CATEGORIES = [
  { key: 'technical', label: 'Teknik', color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { key: 'physical', label: 'Fiziksel', color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  { key: 'behavioral', label: 'Davranissal', color: '#F59E0B', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
]

const NOTE_CAT_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  general: { label: 'Genel', bg: 'bg-gray-100', text: 'text-gray-600' },
  strength: { label: 'Guclu Yon', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  weakness: { label: 'Gelisim Alani', bg: 'bg-red-50', text: 'text-red-600' },
  goal: { label: 'Hedef', bg: 'bg-blue-50', text: 'text-blue-600' },
  behavior: { label: 'Davranis', bg: 'bg-yellow-50', text: 'text-yellow-600' },
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

export default function ProgressPage() {
  const { activeRole, isLoading: roleLoading } = useRole()

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
  const [metrics, setMetrics] = useState<MetricHistory[]>([])
  const [skillScores, setSkillScores] = useState<SkillScore[]>([])
  const [devNotes, setDevNotes] = useState<DevNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'measurements' | 'skills' | 'notes'>('overview')

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) {
          setError('Oturum bilgisi alinamadi')
          return
        }

        let athleteId: string | null = null

        // Athlete role: directly use athlete profile
        const athleteProfiles = me.data.athleteProfiles || []
        const athleteProfile = athleteProfiles[0] || me.data.athleteProfile
        if (athleteProfile) {
          athleteId = athleteProfile.id
        }

        // Parent role: find child via parentRelations
        if (!athleteId) {
          const parentRelations = me.data.parentRelations || []
          if (parentRelations.length > 0) {
            const orgId = me.data.memberships?.[0]?.organization_id
            if (orgId) {
              const athletesRes = await fetch(`/api/athletes?organizationId=${orgId}&pageSize=100`)
              const athletesData = await athletesRes.json()
              if (athletesData.success && athletesData.data) {
                const athleteUserIds = parentRelations.map((r: any) => r.athlete_user_id)
                const childAthlete = athletesData.data.find((a: any) => athleteUserIds.includes(a.user_id))
                if (childAthlete) athleteId = childAthlete.id
              }
            }
          }
        }

        if (!athleteId) {
          setError('Sporcu profili bulunamadi')
          return
        }

        // Fetch all data in parallel
        const [historyRes, scoresRes, notesRes] = await Promise.all([
          fetch(`/api/performance/athlete/${athleteId}/history`),
          fetch(`/api/skill-scores?athlete_id=${athleteId}&pageSize=200`),
          fetch(`/api/development-notes?athlete_id=${athleteId}&pageSize=50`),
        ])

        const [history, scores, notes] = await Promise.all([
          historyRes.json(),
          scoresRes.json(),
          notesRes.json(),
        ])

        if (history.success) setMetrics(history.data?.metrics || [])
        if (scores.success) setSkillScores(scores.data || [])
        if (notes.success) setDevNotes(notes.data || [])
      } catch {
        setError('Bir hata olustu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])



  // ... (existing imports, keep file structure)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-24" />)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <CardSkeleton key={i} className="h-32" />)}
        </div>

        <ChartSkeleton className="h-[400px]" />
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

  // Skill score processing
  const latestBySkill: Record<string, SkillScore> = {}
  for (const s of skillScores) {
    if (!latestBySkill[s.skill_name] || new Date(s.measured_at) > new Date(latestBySkill[s.skill_name].measured_at)) {
      latestBySkill[s.skill_name] = s
    }
  }
  const latestScores = Object.values(latestBySkill)

  const categoryAvg = SCORE_CATEGORIES.map(cat => {
    const catScores = latestScores.filter(s => s.category === cat.key)
    const avg = catScores.length ? catScores.reduce((sum, s) => sum + s.score, 0) / catScores.length : 0
    return { ...cat, avg: Math.round(avg * 10) / 10, count: catScores.length }
  })

  const overallAvg = latestScores.length
    ? (latestScores.reduce((s, a) => s + a.score, 0) / latestScores.length).toFixed(1)
    : null

  const tabs = [
    { key: 'overview' as const, label: 'Genel Bakis' },
    { key: 'skills' as const, label: `Beceriler (${latestScores.length})` },
    { key: 'measurements' as const, label: `Olcumler (${metrics.length})` },
    { key: 'notes' as const, label: `Notlar (${devNotes.length})` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gelisim Takibi</h1>
        <p className="text-gray-500">Beceriler, olcumler ve antrenor geri bildirimlerini takip et</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">Beceri Puani</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{overallAvg || '-'}<span className="text-sm font-normal text-gray-400">/10</span></div>
              <div className="text-xs text-gray-400 mt-1">{latestScores.length} beceri</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">Olcum</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.length}</div>
              <div className="text-xs text-gray-400 mt-1">metrik</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">Antrenor Notu</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">{devNotes.length}</div>
              <div className="text-xs text-gray-400 mt-1">geri bildirim</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">Gelisen</div>
              <div className="text-2xl font-bold text-orange-500 mt-1">
                {metrics.filter(m => m.statistics.trend.direction === 'improving').length}
              </div>
              <div className="text-xs text-gray-400 mt-1">metrik</div>
            </div>
          </div>

          {/* Radar Chart (if skills available) */}
          {latestScores.length >= 3 && <RadarChart scores={latestScores} />}

          {/* Category averages */}
          {latestScores.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Kategori Ortalamalari</h3>
              <div className="space-y-2">
                {categoryAvg.map(cat => (
                  <div key={cat.key} className={`flex items-center justify-between p-3 rounded-lg ${cat.bg} border ${cat.border}`}>
                    <span className={`text-sm font-medium ${cat.text}`}>{cat.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-white/60 rounded-full overflow-hidden">
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
            </div>
          )}

          {/* Latest notes */}
          {devNotes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Son Antrenor Notlari</h3>
                <button onClick={() => setActiveTab('notes')} className="text-sm text-emerald-600 hover:text-emerald-700">
                  Tumunu Gor
                </button>
              </div>
              <div className="space-y-2">
                {devNotes.slice(0, 3).map(note => {
                  const cat = NOTE_CAT_LABELS[note.category || 'general'] || NOTE_CAT_LABELS.general
                  return (
                    <div key={note.id} className="p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} font-medium`}>{cat.label}</span>
                        <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <p className="text-sm text-gray-700">{note.note || note.note_text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {latestScores.length === 0 && metrics.length === 0 && devNotes.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">📈</div>
              <p className="text-gray-500">Henuz gelisim verisi yok.</p>
              <p className="text-sm text-gray-400 mt-1">Antrenorun veri girdikten sonra burada gorunecek.</p>
            </div>
          )}
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          {latestScores.length > 0 ? (
            <>
              {latestScores.length >= 3 && <RadarChart scores={latestScores} />}

              {/* All skills list */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Tum Beceriler ({latestScores.length})</h3>
                <div className="space-y-2">
                  {latestScores.sort((a, b) => b.score - a.score).map(skill => {
                    const cat = SCORE_CATEGORIES.find(c => c.key === skill.category)
                    return (
                      <div key={skill.skill_name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{skill.skill_name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${cat?.bg} ${cat?.text}`}>
                              {cat?.label || skill.category}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${skill.score * 10}%`,
                                backgroundColor: skill.score >= 7 ? '#10B981' : skill.score >= 5 ? '#3B82F6' : skill.score >= 3 ? '#F59E0B' : '#EF4444',
                              }}
                            />
                          </div>
                        </div>
                        <span className={`text-sm font-bold w-8 text-right ${skill.score >= 7 ? 'text-emerald-600' : skill.score >= 5 ? 'text-blue-600' : 'text-red-500'
                          }`}>
                          {skill.score}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">⭐</div>
              <p className="text-gray-500">Henuz beceri puani girilmemis.</p>
              <p className="text-sm text-gray-400 mt-1">Antrenorun puanlama yaptiktan sonra burada gorunecek.</p>
            </div>
          )}
        </div>
      )}

      {/* Measurements Tab */}
      {activeTab === 'measurements' && (
        <div className="space-y-6">
          {metrics.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="text-sm text-gray-500">Toplam Olcum</div>
                  <div className="text-3xl font-bold text-emerald-600 mt-1">
                    {metrics.reduce((sum, m) => sum + m.statistics.count, 0)}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="text-sm text-gray-500">Ortalama Degisim</div>
                  <div className={`text-3xl font-bold mt-1 ${metrics.reduce((sum, m) => sum + (m.statistics.totalChangePercent || 0), 0) / metrics.length >= 0
                    ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                    {formatChangePercent(metrics.reduce((sum, m) => sum + (m.statistics.totalChangePercent || 0), 0) / metrics.length)}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="text-sm text-gray-500">Gelisen Metrik</div>
                  <div className="text-3xl font-bold text-blue-600 mt-1">
                    {metrics.filter(m => m.statistics.trend.direction === 'improving').length}/{metrics.length}
                  </div>
                </div>
              </div>

              {metrics.map(m => {
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
                          {m.metricType.unit && <span className="text-sm font-normal text-gray-400 ml-1">{m.metricType.unit}</span>}
                        </div>
                        <div className={`text-sm font-medium ${m.statistics.totalChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatChangePercent(m.statistics.totalChangePercent)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                      <div><span className="text-gray-400">En Iyi: </span><span className="font-medium text-gray-700">{m.benchmarks.personalBest}{m.metricType.unit ? ` ${m.metricType.unit}` : ''}</span></div>
                      <div><span className="text-gray-400">Ortalama: </span><span className="font-medium text-gray-700">{m.statistics.average}{m.metricType.unit ? ` ${m.metricType.unit}` : ''}</span></div>
                      <div><span className="text-gray-400">Olcum: </span><span className="font-medium text-gray-700">{m.statistics.count} kez</span></div>
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">📏</div>
              <p className="text-gray-500">Henuz performans olcumu yapilmadi.</p>
              <p className="text-sm text-gray-400 mt-1">Antrenorun olcum yaptiktan sonra burada gorunecek.</p>
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {devNotes.length > 0 ? (
            devNotes.map(note => {
              const cat = NOTE_CAT_LABELS[note.category || 'general'] || NOTE_CAT_LABELS.general
              return (
                <div key={note.id} className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} font-medium`}>{cat.label}</span>
                    <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <p className="text-sm text-gray-700">{note.note || note.note_text}</p>
                  {note.coach_name && <p className="text-xs text-gray-400 mt-2">-- {note.coach_name}</p>}
                </div>
              )
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-500">Henuz antrenor notu yok.</p>
              <p className="text-sm text-gray-400 mt-1">Antrenorun not yazdiktan sonra burada gorunecek.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatChangePercent(value: number | null): string {
  if (value === null || value === undefined) return '-'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function RadarChart({ scores }: { scores: { skill_name: string; category: string; score: number }[] }) {
  const radarSkills = scores.slice(0, 8)
  const radarSize = 220
  const radarCenter = radarSize / 2
  const radarRadius = 85

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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-2">Beceri Radari</h3>
      <div className="flex justify-center">
        <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
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
          {radarSkills.map((_, i) => {
            const angle = (360 / radarSkills.length) * i
            const end = polarToXY(angle, 10)
            return (
              <line key={i} x1={radarCenter} y1={radarCenter} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth={0.5} />
            )
          })}
          <path d={radarPath} fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth={2} />
          {radarPoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill="#10B981" />
              <text x={p.labelPos.x} y={p.labelPos.y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] fill-gray-600">
                {p.skill_name.length > 10 ? p.skill_name.slice(0, 9) + '..' : p.skill_name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
