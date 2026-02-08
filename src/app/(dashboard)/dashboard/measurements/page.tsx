'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface Athlete {
  id: string
  user_id: string
  jersey_number: number | null
  position: string | null
  user_profile: {
    id: string
    full_name: string | null
    email: string
  }
}

interface Metric {
  id: string
  name: string
  code: string
  unit: string
  category: string | null
}

interface PerformanceRecord {
  id: string
  athlete_id: string
  metric_type_id: string
  value: number
  recorded_at: string
  notes: string | null
  recorded_by: string | null
  metric_type: Metric
  athlete?: {
    id: string
    user_profile: {
      full_name: string | null
    }
  }
}

export default function MeasurementsPage() {
  const searchParams = useSearchParams()
  const preselectedAthleteId = searchParams.get('athleteId')

  const { activeRole, currentOrgId, isLoading: roleLoading } = useRole()
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add')
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [history, setHistory] = useState<PerformanceRecord[]>([])

  // Form state
  const [selectedAthlete, setSelectedAthlete] = useState(preselectedAthleteId || '')
  const [selectedMetric, setSelectedMetric] = useState('')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')

  // Filter state
  const [filterAthlete, setFilterAthlete] = useState(preselectedAthleteId || '')
  const [filterMetric, setFilterMetric] = useState('')

  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const canView = activeRole === 'coach'

  // Load initial data
  useEffect(() => {
    if (!canView || roleLoading) return

    async function load() {
      try {
        let orgId = currentOrgId
        if (!orgId) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          orgId = me.data?.memberships?.[0]?.organization_id
        }
        if (!orgId) return

        const [athletesRes, metricsRes] = await Promise.all([
          fetch(`/api/athletes?organizationId=${orgId}&pageSize=100`),
          fetch('/api/metrics?isActive=true'),
        ])

        const athletesData = await athletesRes.json()
        const metricsData = await metricsRes.json()

        if (athletesData.success) setAthletes(athletesData.data || [])
        if (metricsData.success) setMetrics(metricsData.data?.metrics || [])

        // If preselected athlete, load their history
        if (preselectedAthleteId) {
          setActiveTab('history')
          setFilterAthlete(preselectedAthleteId)
        }
      } catch {
        console.error('Error loading data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, currentOrgId, roleLoading, preselectedAthleteId])

  // Load history when filter changes
  useEffect(() => {
    if (!canView || activeTab !== 'history') return
    if (!filterAthlete && !filterMetric) {
      setHistory([])
      return
    }

    async function loadHistory() {
      setHistoryLoading(true)
      try {
        let url = ''
        if (filterAthlete) {
          url = `/api/performance/athlete/${filterAthlete}/history?limit=50`
          if (filterMetric) url += `&metricTypeId=${filterMetric}`
        } else if (filterMetric) {
          // For metric-only filter, we need to fetch differently
          // For now, require athlete selection
          setHistory([])
          return
        }

        const res = await fetch(url)
        const data = await res.json()

        if (data.success) {
          setHistory(data.data?.records || [])
        }
      } catch {
        console.error('Error loading history')
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [canView, activeTab, filterAthlete, filterMetric])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAthlete || !selectedMetric || !value) return

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: selectedAthlete,
          metricTypeId: selectedMetric,
          value: parseFloat(value),
          notes: notes || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Ölçüm başarıyla kaydedildi!' })
        setValue('')
        setNotes('')

        // Reload history if viewing the same athlete
        if (filterAthlete === selectedAthlete && activeTab === 'history') {
          const historyRes = await fetch(`/api/performance/athlete/${selectedAthlete}/history?limit=50`)
          const historyData = await historyRes.json()
          if (historyData.success) setHistory(historyData.data?.records || [])
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Hata oluştu' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Bağlantı hatası' })
    } finally {
      setSubmitting(false)
    }
  }

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['coach']} />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  const selectedMetricInfo = metrics.find(m => m.id === selectedMetric)
  const selectedAthleteInfo = athletes.find(a => a.id === filterAthlete)

  // Group metrics by category
  const metricsByCategory = metrics.reduce((acc, m) => {
    const cat = m.category || 'Diğer'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(m)
    return acc
  }, {} as Record<string, Metric[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ölçümler</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'add'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Ölçüm Ekle
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Geçmiş Ölçümler
        </button>
      </div>

      {/* Add Measurement Form */}
      {activeTab === 'add' && (
        <form onSubmit={handleSubmit} className="max-w-lg bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          {message.text && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu</label>
            <select
              value={selectedAthlete}
              onChange={e => setSelectedAthlete(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            >
              <option value="">Sporcu seçin...</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.user_profile?.full_name || a.user_profile?.email} {a.jersey_number ? `#${a.jersey_number}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metrik</label>
            <select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            >
              <option value="">Metrik seçin...</option>
              {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => (
                <optgroup key={category} label={category}>
                  {categoryMetrics.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Değer {selectedMetricInfo && <span className="text-gray-400">({selectedMetricInfo.unit})</span>}
            </label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Ölçüm değeri"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar (opsiyonel)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Ek notlar..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors"
          >
            {submitting ? 'Kaydediliyor...' : 'Ölçümü Kaydet'}
          </button>
        </form>
      )}

      {/* History View */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu</label>
                <select
                  value={filterAthlete}
                  onChange={e => setFilterAthlete(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sporcu seçin...</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.user_profile?.full_name || a.user_profile?.email} {a.jersey_number ? `#${a.jersey_number}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metrik (opsiyonel)</label>
                <select
                  value={filterMetric}
                  onChange={e => setFilterMetric(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Tüm metrikler</option>
                  {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => (
                    <optgroup key={category} label={category}>
                      {categoryMetrics.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          {!filterAthlete ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Ölçüm geçmişini görmek için bir sporcu seçin
            </div>
          ) : historyLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <div className="h-8 bg-gray-200 rounded w-48 mx-auto animate-pulse" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 mb-4">
                {selectedAthleteInfo?.user_profile?.full_name || 'Bu sporcu'} için ölçüm kaydı bulunamadı
              </p>
              <button
                onClick={() => {
                  setActiveTab('add')
                  setSelectedAthlete(filterAthlete)
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ölçüm Ekle
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedAthleteInfo?.user_profile?.full_name || 'Sporcu'} - Ölçüm Geçmişi
                  </h3>
                  <p className="text-xs text-gray-500">{history.length} kayıt</p>
                </div>
                <Link
                  href={`/dashboard/players/${filterAthlete}`}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  Profili Gör
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Tarih</th>
                      <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Metrik</th>
                      <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Değer</th>
                      <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Notlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {new Date(record.recorded_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm font-medium text-gray-900">{record.metric_type?.name}</span>
                          <span className="text-xs text-gray-400 ml-1">({record.metric_type?.category})</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm font-semibold text-emerald-600">{record.value}</span>
                          <span className="text-xs text-gray-400 ml-1">{record.metric_type?.unit}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
