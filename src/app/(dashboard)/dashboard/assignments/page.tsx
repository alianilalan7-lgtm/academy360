'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'
import { getAssignmentStatusMeta } from '@/lib/status'
import { PanelEmptyState, PanelInlineAlert, PanelPageSkeleton } from '@/components/ui/panel-states'

interface FeedbackMessage {
  type: '' | 'success' | 'error' | 'info'
  text: string
  actionHref?: string
  actionLabel?: string
}

export default function AssignmentsPage() {
  const { activeRole, currentOrgId, isLoading: roleLoading } = useRole()
  const [athletes, setAthletes] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState<FeedbackMessage>({ type: '', text: '' })

  const [form, setForm] = useState({
    athleteId: '',
    programId: '',
    startDate: '',
    dueDate: '',
    notes: '',
  })

  const canView = activeRole === 'coach'

  useEffect(() => {
    if (!canView || roleLoading) return

    async function load() {
      try {
        setLoadError('')
        let orgId = currentOrgId
        if (!orgId) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          orgId = me.data?.memberships?.[0]?.organization_id
        }
        if (!orgId) return

        const [athletesRes, programsRes, assignmentsRes] = await Promise.all([
          fetch(`/api/athletes?organizationId=${orgId}&pageSize=100`),
          fetch(`/api/programs?organization_id=${orgId}`),
          fetch(`/api/assignments?pageSize=100`),
        ])

        const athletesData = await athletesRes.json()
        const programsData = await programsRes.json()
        const assignmentsData = await assignmentsRes.json()

        if (athletesData.success) setAthletes(athletesData.data || [])
        if (programsData.success) setPrograms(programsData.data || [])
        if (assignmentsData.success) setAssignments(assignmentsData.data || [])
      } catch {
        setLoadError('Atamalar yuklenemedi. Lutfen sayfayi yenileyin.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, currentOrgId, roleLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.athleteId || !form.programId) return

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const body: Record<string, any> = {
        program_id: form.programId,
        athlete_ids: [form.athleteId],
      }
      if (form.startDate) body.start_date = new Date(form.startDate).toISOString()
      if (form.dueDate) body.due_date = new Date(form.dueDate).toISOString()
      if (form.notes) body.notes = form.notes

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success) {
        const assignedAthlete = athletes.find((a: any) => a.id === form.athleteId)
        const athleteName = assignedAthlete?.user_profile?.full_name || 'Sporcu'
        setMessage({
          type: 'success',
          text: `Program basariyla atandi: ${athleteName}`,
          actionHref: `/dashboard/players/${form.athleteId}`,
          actionLabel: 'Sporcu profiline git',
        })
        if (Array.isArray(data.data)) {
          setAssignments(prev => [...data.data, ...prev])
        }
        setForm({ athleteId: '', programId: '', startDate: '', dueDate: '', notes: '' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Hata olustu' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['coach']} />
  }

  if (loading) {
    return <PanelPageSkeleton rows={4} />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Program Atamalari</h1>

      {loadError ? <PanelInlineAlert type="error" message={loadError} /> : null}

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Program Ata</h2>

        {message.text && (
          <div className="mb-4">
            <PanelInlineAlert
              type={message.type === 'error' ? 'error' : message.type === 'success' ? 'success' : 'info'}
              message={message.text}
              actionHref={message.actionHref}
              actionLabel={message.actionLabel}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu</label>
              <select
                value={form.athleteId}
                onChange={e => setForm({ ...form, athleteId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="">Sporcu secin...</option>
                {athletes.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.user_profile?.full_name || a.user_profile?.email || 'Isim yok'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
              <select
                value={form.programId}
                onChange={e => setForm({ ...form, programId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="">Program secin...</option>
                {programs.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.category ? `(${p.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baslangic Tarihi</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Bitis Tarihi (opsiyonel)</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Ataniyor...' : 'Programi Ata'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Mevcut Atamalar {assignments.length > 0 && `(${assignments.length})`}
        </h2>

        {assignments.length === 0 ? (
          <PanelEmptyState
            icon="📌"
            title="Henuz atama yapilmamis"
            description="Ilk program atamasini yukaridaki formdan yapabilirsin."
            actionHref="/dashboard/programs"
            actionLabel="Programlari gor"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {assignments.map((a: any) => {
              const statusMeta = getAssignmentStatusMeta(a.status)
              const athleteName = a.athlete?.user_profile?.full_name || 'Isim yok'
              const programName = a.program?.title || 'Program yok'
              const initial = athleteName.charAt(0).toUpperCase()

              return (
                <div key={a.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{athleteName}</div>
                    <div className="text-sm text-gray-500 truncate">{programName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(a.start_date)} {a.due_date ? `- ${formatDate(a.due_date)}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                    {a.progress_percentage !== undefined && a.progress_percentage !== null && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min(a.progress_percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{a.progress_percentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
