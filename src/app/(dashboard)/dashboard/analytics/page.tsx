'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

type TabType = 'attendance' | 'performance' | 'radar' | 'season'

export default function AnalyticsPage() {
  const { activeRole, isLoading: roleLoading } = useRole()

  if (roleLoading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  if (activeRole !== 'coach' && activeRole !== 'club_admin' && activeRole !== 'athlete') {
    return <AccessDenied requiredRoles={['coach', 'club_admin', 'athlete']} />
  }

  return <AnalyticsContent role={activeRole!} />
}

function AnalyticsContent({ role }: { role: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('attendance')
  const isAthlete = role === 'athlete'

  const tabs = [
    { key: 'attendance' as TabType, label: 'Katilim', icon: '📊' },
    { key: 'performance' as TabType, label: 'Performans', icon: '📈' },
    { key: 'radar' as TabType, label: 'Beceri Dagılımı', icon: '🎯' },
    { key: 'season' as TabType, label: 'Sezon Kıyası', icon: '📅' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isAthlete ? 'Gelisim Analizim' : 'Analiz & Grafikler'}
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && <AttendanceChart role={role} />}
      {activeTab === 'performance' && <PerformanceChart role={role} />}
      {activeTab === 'radar' && <RadarChart role={role} />}
      {activeTab === 'season' && <SeasonComparison role={role} />}
    </div>
  )
}

// ============================================
// KATILIM GRAFİĞİ (Attendance Chart)
// ============================================
function AttendanceChart({ role }: { role: string }) {
  const { currentOrgId } = useRole()
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isAthlete = role === 'athlete'

  useEffect(() => {
    async function load() {
      try {
        if (isAthlete) {
          // Athlete: load own attendance
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          const athleteProfile = me.data?.athleteProfiles?.[0]
          if (athleteProfile) {
            setSelectedAthlete(athleteProfile.id)
          }
        } else {
          // Coach: load athletes
          let org = currentOrgId
          if (!org) {
            const meRes = await fetch('/api/auth/me')
            const me = await meRes.json()
            org = me.data?.memberships?.[0]?.organization_id
          }
          if (org) {
            const res = await fetch(`/api/athletes?organization_id=${org}`)
            const data = await res.json()
            if (data.success) setAthletes(data.data || [])
          }
        }

        // Load recent sessions
        const sessRes = await fetch('/api/sessions?pageSize=30&sort_order=desc')
        const sessData = await sessRes.json()
        if (sessData.success) setSessions(sessData.data || [])
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrgId, isAthlete])

  const [attendanceError, setAttendanceError] = useState('')

  // Load attendance for selected athlete
  useEffect(() => {
    if (!selectedAthlete || !sessions.length) return

    async function loadAttendance() {
      setAttendanceError('')
      const records: any[] = []
      let errorCount = 0
      for (const session of sessions.slice(0, 10)) {
        try {
          const res = await fetch(`/api/sessions/${session.id}`)
          const data = await res.json()
          if (data.success && data.data?.attendance) {
            const record = data.data.attendance.find((a: any) => a.athlete_id === selectedAthlete)
            records.push({
              session_id: session.id,
              date: session.scheduled_start,
              title: session.title,
              status: record?.status || 'absent',
            })
          }
        } catch {
          errorCount++
        }
      }
      if (errorCount > 0) {
        setAttendanceError(`${errorCount} seans verisi yuklenemedi.`)
      }
      setAttendance(records.reverse())
    }
    loadAttendance()
  }, [selectedAthlete, sessions])

  if (loading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  const presentCount = attendance.filter(a => a.status === 'present').length
  const lateCount = attendance.filter(a => a.status === 'late').length
  const absentCount = attendance.filter(a => a.status === 'absent').length
  const excusedCount = attendance.filter(a => a.status === 'excused').length
  const total = attendance.length
  const attendanceRate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0

  const STATUS_COLORS: Record<string, string> = {
    present: 'bg-emerald-500',
    late: 'bg-yellow-400',
    absent: 'bg-red-400',
    excused: 'bg-gray-300',
  }

  const STATUS_LABELS: Record<string, string> = {
    present: 'Katildi',
    late: 'Gec Kaldi',
    absent: 'Gelmedi',
    excused: 'Izinli',
  }

  return (
    <div className="space-y-4">
      {/* Athlete selector (coach only) */}
      {!isAthlete && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu</label>
          <select
            value={selectedAthlete}
            onChange={e => setSelectedAthlete(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Sporcu secin...</option>
            {athletes.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.user_profile?.full_name || a.user_profile?.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {attendanceError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          {attendanceError}
        </div>
      )}

      {attendance.length === 0 ? (
        <EmptyChart message="Katilim verisi henuz yok. Seanslar olusturup yoklama alindiginda burada katilim grafigi gorunecek." />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
            <StatCard label="Katilim Orani" value={`%${attendanceRate}`} color="emerald" />
            <StatCard label="Katildi" value={String(presentCount)} color="emerald" />
            <StatCard label="Gec" value={String(lateCount)} color="yellow" />
            <StatCard label="Gelmedi" value={String(absentCount)} color="red" />
            <StatCard label="Izinli" value={String(excusedCount)} color="gray" />
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Son {total} Seans Katilim Durumu</h3>
            <div className="flex items-end gap-1 h-32">
              {attendance.map((a, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t ${STATUS_COLORS[a.status]} transition-all`}
                    style={{ height: a.status === 'present' ? '100%' : a.status === 'late' ? '70%' : a.status === 'excused' ? '40%' : '20%' }}
                    title={`${a.title} - ${STATUS_LABELS[a.status]}`}
                  />
                  <span className="text-[9px] text-gray-400 -rotate-45 origin-left whitespace-nowrap">
                    {new Date(a.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 text-xs">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded ${STATUS_COLORS[key]}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// PERFORMANS GRAFİĞİ (Performance Chart)
// ============================================
function PerformanceChart({ role }: { role: string }) {
  const { currentOrgId } = useRole()
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [records, setRecords] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [selectedMetric, setSelectedMetric] = useState('')
  const [loading, setLoading] = useState(true)
  const isAthlete = role === 'athlete'

  useEffect(() => {
    async function load() {
      try {
        // Load metrics
        const metRes = await fetch('/api/metrics')
        const metData = await metRes.json()
        if (metData.success) {
          const metricsList = Array.isArray(metData.data) ? metData.data : (metData.data?.metrics || [])
          setMetrics(metricsList)
          if (metricsList.length) setSelectedMetric(metricsList[0].id)
        }

        if (isAthlete) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          const ap = me.data?.athleteProfiles?.[0]
          if (ap) setSelectedAthlete(ap.id)
        } else {
          let org = currentOrgId
          if (!org) {
            const meRes = await fetch('/api/auth/me')
            const me = await meRes.json()
            org = me.data?.memberships?.[0]?.organization_id
          }
          if (org) {
            const res = await fetch(`/api/athletes?organization_id=${org}`)
            const data = await res.json()
            if (data.success) setAthletes(data.data || [])
          }
        }
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrgId, isAthlete])

  // Load performance records
  useEffect(() => {
    if (!selectedAthlete || !selectedMetric) return

    async function loadRecords() {
      try {
        const res = await fetch(`/api/performance/${selectedAthlete}/history?metric_type_id=${selectedMetric}`)
        const data = await res.json()
        if (data.success) setRecords(data.data || [])
      } catch {
        setRecords([])
      }
    }
    loadRecords()
  }, [selectedAthlete, selectedMetric])

  if (loading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  const metricInfo = metrics.find((m: any) => m.id === selectedMetric)
  const maxValue = records.length ? Math.max(...records.map((r: any) => r.value)) * 1.1 : 100
  const minValue = records.length ? Math.min(...records.map((r: any) => r.value)) * 0.9 : 0

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        {!isAthlete && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu</label>
            <select
              value={selectedAthlete}
              onChange={e => setSelectedAthlete(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Sporcu secin...</option>
              {athletes.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.user_profile?.full_name || a.user_profile?.email}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metrik</label>
          <select
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {metrics.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
        </div>
      </div>

      {records.length === 0 ? (
        <EmptyChart message="Bu metrik icin henuz olcum verisi yok. Olcumler yapildiginda performans gelisim grafigi burada gorunecek." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-1">
            {metricInfo?.name || 'Performans'} Gelisimi
          </h3>
          <p className="text-xs text-gray-400 mb-4">{records.length} olcum - Birim: {metricInfo?.unit}</p>

          {/* Line chart (CSS) */}
          <div className="relative h-48 border-l border-b border-gray-200">
            {/* Y axis labels */}
            <span className="absolute -left-1 top-0 -translate-x-full text-[10px] text-gray-400">
              {maxValue.toFixed(1)}
            </span>
            <span className="absolute -left-1 bottom-0 -translate-x-full text-[10px] text-gray-400">
              {minValue.toFixed(1)}
            </span>

            {/* Data points + lines */}
            <div className="absolute inset-0 flex items-end">
              {records.map((r: any, i: number) => {
                const heightPct = maxValue !== minValue
                  ? ((r.value - minValue) / (maxValue - minValue)) * 100
                  : 50

                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                    {/* Dot */}
                    <div
                      className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm z-10"
                      style={{ bottom: `${heightPct}%`, transform: 'translateY(50%)' }}
                    />
                    {/* Bar (subtle) */}
                    <div
                      className="w-full max-w-[20px] bg-emerald-100 rounded-t transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-8 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20">
                      {r.value} {metricInfo?.unit}
                      <br />
                      {new Date(r.recorded_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* X axis dates */}
          <div className="flex mt-1">
            {records.map((r: any, i: number) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[9px] text-gray-400">
                  {new Date(r.recorded_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            ))}
          </div>

          {/* Trend */}
          {records.length >= 2 && (
            <TrendIndicator
              first={records[0].value}
              last={records[records.length - 1].value}
              isHigherBetter={metricInfo?.is_higher_better ?? true}
              unit={metricInfo?.unit || ''}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// RADAR CHART (Beceri Dagılımı - Pure SVG)
// ============================================
function RadarChart({ role }: { role: string }) {
  const { currentOrgId } = useRole()
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isAthlete = role === 'athlete'

  useEffect(() => {
    async function load() {
      try {
        if (isAthlete) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          const ap = me.data?.athleteProfiles?.[0]
          if (ap) setSelectedAthlete(ap.id)
        } else {
          let org = currentOrgId
          if (!org) {
            const meRes = await fetch('/api/auth/me')
            const me = await meRes.json()
            org = me.data?.memberships?.[0]?.organization_id
          }
          if (org) {
            const res = await fetch(`/api/athletes?organization_id=${org}`)
            const data = await res.json()
            if (data.success) setAthletes(data.data || [])
          }
        }
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrgId, isAthlete])

  useEffect(() => {
    if (!selectedAthlete) return

    async function loadScores() {
      try {
        const res = await fetch(`/api/skill-scores?athlete_id=${selectedAthlete}&pageSize=100`)
        const data = await res.json()
        if (data.success) {
          // Get latest score per skill
          const latest: Record<string, any> = {}
          for (const s of data.data || []) {
            if (!latest[s.skill_name] || new Date(s.measured_at) > new Date(latest[s.skill_name].measured_at)) {
              latest[s.skill_name] = s
            }
          }
          setScores(Object.values(latest))
        }
      } catch {
        setScores([])
      }
    }
    loadScores()
  }, [selectedAthlete])

  if (loading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  return (
    <div className="space-y-4">
      {!isAthlete && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu</label>
          <select
            value={selectedAthlete}
            onChange={e => setSelectedAthlete(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Sporcu secin...</option>
            {athletes.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.user_profile?.full_name || a.user_profile?.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {scores.length === 0 ? (
        <EmptyChart message="Bu sporcu icin henuz beceri puanlamasi yapilmamis. Antrenor puanlama yaptiktan sonra radar grafigi burada gorunecek." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Beceri Dagilimi</h3>

          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* SVG Radar */}
            <div className="w-full max-w-sm">
              <SVGRadar data={scores} />
            </div>

            {/* Score list */}
            <div className="flex-1 w-full space-y-2">
              {scores.sort((a, b) => b.score - a.score).map(s => {
                const catColor = s.category === 'technical' ? 'emerald' : s.category === 'physical' ? 'blue' : 'yellow'
                return (
                  <div key={s.skill_name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-28 truncate">{s.skill_name}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all bg-${catColor}-500`}
                        style={{ width: `${s.score * 10}%`, backgroundColor: catColor === 'emerald' ? '#10B981' : catColor === 'blue' ? '#3B82F6' : '#F59E0B' }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-10 text-right">{s.score}/10</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category averages */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {(['technical', 'physical', 'behavioral'] as const).map(cat => {
              const catScores = scores.filter(s => s.category === cat)
              const avg = catScores.length ? (catScores.reduce((sum: number, s: any) => sum + s.score, 0) / catScores.length).toFixed(1) : '-'
              const labels = { technical: 'Teknik', physical: 'Fiziksel', behavioral: 'Davranissal' }
              const colors = { technical: 'emerald', physical: 'blue', behavioral: 'yellow' }

              return (
                <div key={cat} className={`p-3 rounded-lg bg-${colors[cat]}-50 border border-${colors[cat]}-100`}
                  style={{ backgroundColor: colors[cat] === 'emerald' ? '#ecfdf5' : colors[cat] === 'blue' ? '#eff6ff' : '#fffbeb' }}>
                  <p className="text-xs text-gray-500">{labels[cat]}</p>
                  <p className="text-lg font-bold text-gray-900">{avg}<span className="text-xs font-normal text-gray-400">/10</span></p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// SEZON KIYASI (Season Comparison)
// ============================================
function SeasonComparison({ role }: { role: string }) {
  const { currentOrgId } = useRole()
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isAthlete = role === 'athlete'

  useEffect(() => {
    async function load() {
      try {
        if (isAthlete) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          const ap = me.data?.athleteProfiles?.[0]
          if (ap) setSelectedAthlete(ap.id)
        } else {
          let org = currentOrgId
          if (!org) {
            const meRes = await fetch('/api/auth/me')
            const me = await meRes.json()
            org = me.data?.memberships?.[0]?.organization_id
          }
          if (org) {
            const res = await fetch(`/api/athletes?organization_id=${org}`)
            const data = await res.json()
            if (data.success) setAthletes(data.data || [])
          }
        }
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrgId, isAthlete])

  useEffect(() => {
    if (!selectedAthlete) return

    async function loadAllScores() {
      try {
        const res = await fetch(`/api/skill-scores?athlete_id=${selectedAthlete}&pageSize=100`)
        const data = await res.json()
        if (data.success) setScores(data.data || [])
      } catch {
        setScores([])
      }
    }
    loadAllScores()
  }, [selectedAthlete])

  if (loading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  // Group scores by month
  const monthlyGroups: Record<string, any[]> = {}
  for (const s of scores) {
    const month = new Date(s.measured_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })
    if (!monthlyGroups[month]) monthlyGroups[month] = []
    monthlyGroups[month].push(s)
  }

  const months = Object.keys(monthlyGroups)

  return (
    <div className="space-y-4">
      {!isAthlete && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu</label>
          <select
            value={selectedAthlete}
            onChange={e => setSelectedAthlete(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Sporcu secin...</option>
            {athletes.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.user_profile?.full_name || a.user_profile?.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {months.length === 0 ? (
        <EmptyChart message="Sezon kiyasi icin farkli zamanlarda puanlama verisi gerekli. Duzeni puanlamalar yapildikca aylik ve sezonluk kiyaslama burada gorunecek." />
      ) : (
        <div className="space-y-4">
          {/* Monthly averages */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Aylik Gelisim Ozeti</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Donem</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Teknik</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Fiziksel</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Davranissal</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Genel</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month, idx) => {
                    const items = monthlyGroups[month]
                    const tech = items.filter((s: any) => s.category === 'technical')
                    const phys = items.filter((s: any) => s.category === 'physical')
                    const behav = items.filter((s: any) => s.category === 'behavioral')
                    const avgFn = (arr: any[]) => arr.length ? (arr.reduce((sum: number, s: any) => sum + s.score, 0) / arr.length).toFixed(1) : '-'
                    const overall = items.length ? (items.reduce((sum: number, s: any) => sum + s.score, 0) / items.length).toFixed(1) : '-'

                    // Compare with previous month
                    const prevMonth = months[idx - 1]
                    const prevItems = prevMonth ? monthlyGroups[prevMonth] : []
                    const prevOverall = prevItems.length ? prevItems.reduce((sum: number, s: any) => sum + s.score, 0) / prevItems.length : null
                    const currentOverall = items.length ? items.reduce((sum: number, s: any) => sum + s.score, 0) / items.length : null
                    const trend = prevOverall && currentOverall ? currentOverall - prevOverall : 0

                    return (
                      <tr key={month} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-700">{month}</td>
                        <td className="py-2.5 px-3 text-center">{avgFn(tech)}</td>
                        <td className="py-2.5 px-3 text-center">{avgFn(phys)}</td>
                        <td className="py-2.5 px-3 text-center">{avgFn(behav)}</td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {overall}
                          {trend !== 0 && (
                            <span className={`ml-1 text-xs ${trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {trend > 0 ? '↑' : '↓'}{Math.abs(trend).toFixed(1)}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar chart per month */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Genel Ortalama Trendi</h3>
            <div className="flex items-end gap-2 h-40">
              {months.map(month => {
                const items = monthlyGroups[month]
                const avg = items.length ? items.reduce((sum: number, s: any) => sum + s.score, 0) / items.length : 0
                const heightPct = (avg / 10) * 100

                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-emerald-600">{avg.toFixed(1)}</span>
                    <div className="w-full max-w-[40px] bg-emerald-500 rounded-t transition-all" style={{ height: `${heightPct}%` }} />
                    <span className="text-[9px] text-gray-400 text-center leading-tight">
                      {month.split(' ')[0].slice(0, 3)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// SHARED COMPONENTS
// ============================================

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="text-5xl mb-4">📊</div>
      <p className="text-gray-500 max-w-md mx-auto">{message}</p>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const bgColors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-100',
    yellow: 'bg-yellow-50 border-yellow-100',
    red: 'bg-red-50 border-red-100',
    gray: 'bg-gray-50 border-gray-100',
    blue: 'bg-blue-50 border-blue-100',
  }

  return (
    <div className={`p-3 rounded-lg border ${bgColors[color] || bgColors.gray}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function TrendIndicator({ first, last, isHigherBetter, unit }: { first: number; last: number; isHigherBetter: boolean; unit: string }) {
  const diff = last - first
  const pctChange = first !== 0 ? ((diff / first) * 100).toFixed(1) : '0'
  const isPositive = isHigherBetter ? diff > 0 : diff < 0

  return (
    <div className={`mt-4 p-3 rounded-lg ${isPositive ? 'bg-emerald-50' : diff === 0 ? 'bg-gray-50' : 'bg-red-50'}`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg ${isPositive ? 'text-emerald-500' : diff === 0 ? 'text-gray-400' : 'text-red-500'}`}>
          {isPositive ? '↑' : diff === 0 ? '→' : '↓'}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-700">
            {first} → {last} {unit} ({diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit})
          </p>
          <p className="text-xs text-gray-500">{pctChange}% degisim (ilk olcumden son olcume)</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SVG RADAR CHART COMPONENT
// ============================================
function SVGRadar({ data }: { data: any[] }) {
  const size = 280
  const center = size / 2
  const radius = 110
  const levels = 5

  if (!data.length) return null

  const angleStep = (2 * Math.PI) / data.length

  function polarToCart(angle: number, r: number) {
    return {
      x: center + r * Math.cos(angle - Math.PI / 2),
      y: center + r * Math.sin(angle - Math.PI / 2),
    }
  }

  // Grid circles
  const gridCircles = Array.from({ length: levels }, (_, i) => {
    const r = (radius / levels) * (i + 1)
    const points = data.map((_, j) => {
      const p = polarToCart(j * angleStep, r)
      return `${p.x},${p.y}`
    }).join(' ')
    return points
  })

  // Data polygon
  const dataPoints = data.map((d, i) => {
    const r = (d.score / 10) * radius
    const p = polarToCart(i * angleStep, r)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
      {/* Grid */}
      {gridCircles.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {data.map((_, i) => {
        const p = polarToCart(i * angleStep, radius)
        return (
          <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />
        )
      })}

      {/* Data polygon */}
      <polygon
        points={dataPoints}
        fill="rgba(16, 185, 129, 0.2)"
        stroke="#10B981"
        strokeWidth="2"
      />

      {/* Data dots */}
      {data.map((d, i) => {
        const r = (d.score / 10) * radius
        const p = polarToCart(i * angleStep, r)
        return (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#10B981" stroke="white" strokeWidth="2" />
        )
      })}

      {/* Labels */}
      {data.map((d, i) => {
        const p = polarToCart(i * angleStep, radius + 20)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] fill-gray-600"
          >
            {d.skill_name}
          </text>
        )
      })}
    </svg>
  )
}
