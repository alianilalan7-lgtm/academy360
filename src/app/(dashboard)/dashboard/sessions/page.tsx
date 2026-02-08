'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planlanmis',
  in_progress: 'Devam Eden',
  completed: 'Tamamlandi',
  cancelled: 'Iptal Edildi',
}

export default function SessionsPage() {
  const { activeRole, isLoading: roleLoading } = useRole()

  // Coach can manage sessions, Athlete can view
  const canView = activeRole === 'coach' || activeRole === 'athlete'
  const isCoach = activeRole === 'coach'

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['coach', 'athlete']} />
  }

  if (isCoach) {
    return <CoachSessionsContent />
  }

  return <AthleteSessionsContent />
}

function CoachSessionsContent() {
  const { currentOrgId } = useRole()
  const [sessions, setSessions] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [orgId, setOrgId] = useState('')

  const [form, setForm] = useState({
    title: '',
    scheduledStart: '',
    scheduledEnd: '',
    location: '',
    groupId: '',
    description: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      try {
        let oid = currentOrgId
        if (!oid) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          oid = me.data?.memberships?.[0]?.organization_id
        }
        if (!oid) return
        setOrgId(oid)

        const [sessionsRes, groupsRes] = await Promise.all([
          fetch(`/api/sessions?organizationId=${oid}&pageSize=100&sortOrder=desc`),
          fetch(`/api/groups?organization_id=${oid}`),
        ])

        const sessionsData = await sessionsRes.json()
        const groupsData = await groupsRes.json()

        if (sessionsData.success) setSessions(sessionsData.data || [])
        if (groupsData.success) setGroups(groupsData.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrgId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.scheduledStart || !orgId) return

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const body: Record<string, any> = {
        organizationId: orgId,
        title: form.title,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        sessionType: 'training',
      }
      if (form.scheduledEnd) body.scheduledEnd = new Date(form.scheduledEnd).toISOString()
      if (form.location) body.location = form.location
      if (form.groupId) body.groupId = form.groupId
      if (form.description) body.description = form.description
      if (form.notes) body.notes = form.notes

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Seans basariyla olusturuldu!' })
        setSessions(prev => [data.data, ...prev])
        setForm({ title: '', scheduledStart: '', scheduledEnd: '', location: '', groupId: '', description: '', notes: '' })
        setShowForm(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'Hata olustu' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = filter === 'all'
    ? sessions
    : sessions.filter(s => s.status === filter)

  function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const FILTER_OPTIONS = [
    { key: 'all', label: 'Tumu' },
    { key: 'scheduled', label: 'Planlanmis' },
    { key: 'in_progress', label: 'Devam Eden' },
    { key: 'completed', label: 'Tamamlandi' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Seanslar</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
        >
          {showForm ? 'Kapat' : '+ Yeni Seans'}
        </button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Yeni Seans Olustur</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Baslik</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Seans basligi"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baslangic Zamani</label>
              <input
                type="datetime-local"
                value={form.scheduledStart}
                onChange={e => setForm({ ...form, scheduledStart: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitis Zamani</label>
              <input
                type="datetime-local"
                value={form.scheduledEnd}
                onChange={e => setForm({ ...form, scheduledEnd: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Seans yeri"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grup</label>
              <select
                value={form.groupId}
                onChange={e => setForm({ ...form, groupId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Grup secin (opsiyonel)</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Olusturuluyor...' : 'Seans Olustur'}
          </button>
        </form>
      )}

      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === opt.key
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Seans bulunamadi</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s: any) => (
            <Link
              key={s.id}
              href={`/dashboard/sessions/${s.id}`}
              className="block bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{s.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      📅 {formatDate(s.scheduled_start)}
                    </span>
                    {s.location && (
                      <span className="flex items-center gap-1">
                        📍 {s.location}
                      </span>
                    )}
                    {s.group?.name && (
                      <span className="flex items-center gap-1">
                        👥 {s.group.name}
                      </span>
                    )}
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-300 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function AthleteSessionsContent() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) return

        const orgId = me.data?.memberships?.[0]?.organization_id
        if (!orgId) return

        const res = await fetch(`/api/sessions?organizationId=${orgId}&status=scheduled&pageSize=20`)
        const data = await res.json()
        if (data.success) setSessions(data.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Yaklasan Seanslarim</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-gray-500">Yaklasan seans bulunamadi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any) => (
            <div
              key={s.id}
              className="bg-white p-5 rounded-xl border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                    <span>📅 {formatDate(s.scheduled_start)}</span>
                    {s.location && <span>📍 {s.location}</span>}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100'}`}>
                  {STATUS_LABELS[s.status] || s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
