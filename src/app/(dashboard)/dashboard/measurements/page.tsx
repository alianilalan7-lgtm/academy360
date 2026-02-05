'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

export default function MeasurementsPage() {
  const { activeRole, currentOrgId, isLoading: roleLoading } = useRole()
  const [athletes, setAthletes] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [selectedMetric, setSelectedMetric] = useState('')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const canView = activeRole === 'coach'

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
        if (metricsData.success) setMetrics(metricsData.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, currentOrgId, roleLoading])

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
        setMessage({ type: 'success', text: 'Olcum basariyla kaydedildi!' })
        setValue('')
        setNotes('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Hata olustu' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
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

  if (loading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  const selectedMetricInfo = metrics.find(m => m.id === selectedMetric)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Olcum Ekle</h1>

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
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          >
            <option value="">Sporcu secin...</option>
            {athletes.map((a: any) => (
              <option key={a.id} value={a.id}>{a.user_profile?.full_name || a.user_profile?.email}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metrik</label>
          <select
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          >
            <option value="">Metrik secin...</option>
            {metrics.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deger {selectedMetricInfo && `(${selectedMetricInfo.unit})`}
          </label>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Olcum degeri"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notlar (opsiyonel)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Kaydediliyor...' : 'Olcumu Kaydet'}
        </button>
      </form>
    </div>
  )
}
