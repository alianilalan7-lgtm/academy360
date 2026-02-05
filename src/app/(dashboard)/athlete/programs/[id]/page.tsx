'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Assignment {
  id: string
  status: string
  progress_percentage: number | null
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  program: {
    id: string
    title: string
    description: string | null
    category: string | null
    difficulty_level: string | null
    estimated_duration_minutes: number | null
    thumbnail_url: string | null
    content_data: any
    tags: string[] | null
  } | null
  athlete: {
    id: string
    user_id: string
    organization_id: string
  } | null
  assigned_by_user: {
    id: string
    full_name: string | null
    email: string
  } | null
  group: {
    id: string
    name: string
  } | null
  training_logs: {
    id: string
    date: string
    completion_status: string
    xp_earned: number | null
    duration_minutes: number | null
  }[]
}

interface TrainingLog {
  id: string
  date: string
  completion_status: string
  duration_minutes: number | null
  notes: string | null
  xp_earned: number | null
  created_at: string
}

export default function AthleteProgramDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [logs, setLogs] = useState<TrainingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [athleteId, setAthleteId] = useState<string | null>(null)

  // Training log form state
  const [showLogForm, setShowLogForm] = useState(false)
  const [logDuration, setLogDuration] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [logSubmitting, setLogSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // Get athlete ID first
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) {
          setError('Oturum bilgisi alinamadi')
          return
        }

        const profile = me.data.athleteProfile || me.data.athleteProfiles?.[0]
        if (profile) {
          setAthleteId(profile.id)
        }

        // Fetch assignment details
        const assignRes = await fetch(`/api/assignments/${id}`)
        const assignData = await assignRes.json()

        if (!assignData.success) {
          setError(assignData.error || 'Program bulunamadi')
          return
        }

        setAssignment(assignData.data)

        // Fetch training logs for this assignment
        const logsRes = await fetch(`/api/training-logs?assigned_program_id=${id}`)
        const logsData = await logsRes.json()

        if (logsData.success) {
          setLogs(logsData.data || [])
        }
      } catch {
        setError('Bir hata olustu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleStart() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      const data = await res.json()
      if (data.success) {
        setAssignment(prev => prev ? { ...prev, status: 'in_progress' } : prev)
      }
    } catch {
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!athleteId) return

    setLogSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/training-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete_id: athleteId,
          assigned_program_id: id,
          date: today,
          completion_status: 'completed',
          duration_minutes: logDuration ? parseInt(logDuration) : null,
          notes: logNotes || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setLogs(prev => [data.data, ...prev])
        setLogDuration('')
        setLogNotes('')
        setShowLogForm(false)

        // Refresh assignment to get updated progress
        const assignRes = await fetch(`/api/assignments/${id}`)
        const assignData = await assignRes.json()
        if (assignData.success) {
          setAssignment(assignData.data)
        }
      }
    } catch {
    } finally {
      setLogSubmitting(false)
    }
  }

  const statusColors: Record<string, string> = {
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  const statusLabels: Record<string, string> = {
    assigned: 'Atandi',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandi',
    cancelled: 'Iptal',
  }

  const difficultyLabels: Record<string, string> = {
    beginner: 'Baslangic',
    intermediate: 'Orta',
    advanced: 'Ileri',
    expert: 'Uzman',
  }

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-orange-100 text-orange-700',
    expert: 'bg-red-100 text-red-700',
  }

  const logStatusLabels: Record<string, string> = {
    not_started: 'Baslanmadi',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandi',
    skipped: 'Atlandi',
  }

  const logStatusColors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-500',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-emerald-100 text-emerald-700',
    skipped: 'bg-red-100 text-red-500',
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="h-40 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <Link href="/athlete/programs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Programlara Don
        </Link>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">&#9888;</div>
          <p className="text-gray-500">{error || 'Program bulunamadi'}</p>
        </div>
      </div>
    )
  }

  const program = assignment.program
  const progress = assignment.progress_percentage || 0

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/athlete/programs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Programlara Don
      </Link>

      {/* Program Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{program?.title || 'Program'}</h1>
            {program?.description && (
              <p className="text-gray-500 mt-2">{program.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[assignment.status] || 'bg-gray-100'}`}>
                {statusLabels[assignment.status] || assignment.status}
              </span>
              {program?.category && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {program.category}
                </span>
              )}
              {program?.difficulty_level && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[program.difficulty_level] || 'bg-gray-100 text-gray-600'}`}>
                  {difficultyLabels[program.difficulty_level] || program.difficulty_level}
                </span>
              )}
              {program?.estimated_duration_minutes && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  ~{program.estimated_duration_minutes} dk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Ilerleme</span>
            <span className="font-medium text-gray-900">{progress}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-500">
          {assignment.start_date && (
            <div>
              <span className="text-gray-400">Baslangic: </span>
              <span className="text-gray-700">{formatDate(assignment.start_date)}</span>
            </div>
          )}
          {assignment.due_date && (
            <div>
              <span className="text-gray-400">Hedef Bitis: </span>
              <span className="text-gray-700">{formatDate(assignment.due_date)}</span>
            </div>
          )}
          {assignment.completed_at && (
            <div>
              <span className="text-gray-400">Tamamlanma: </span>
              <span className="text-emerald-600 font-medium">{formatDate(assignment.completed_at)}</span>
            </div>
          )}
          {assignment.assigned_by_user && (
            <div>
              <span className="text-gray-400">Atayan: </span>
              <span className="text-gray-700">{assignment.assigned_by_user.full_name || assignment.assigned_by_user.email}</span>
            </div>
          )}
        </div>

        {/* Start button for 'assigned' status */}
        {assignment.status === 'assigned' && (
          <div className="mt-5">
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {actionLoading ? 'Baslatiliyor...' : 'Baslat'}
            </button>
          </div>
        )}
      </div>

      {/* Training Log Form (for in_progress) */}
      {assignment.status === 'in_progress' && (
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Antrenman Kaydet</h3>
            {!showLogForm && (
              <button
                onClick={() => setShowLogForm(true)}
                className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Antrenman Kaydet
              </button>
            )}
          </div>

          {showLogForm && (
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sure (dakika)
                </label>
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={logDuration}
                  onChange={e => setLogDuration(e.target.value)}
                  placeholder="orn: 45"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notlar
                </label>
                <textarea
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  placeholder="Antrenman hakkinda notlariniz..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={logSubmitting}
                  className="px-5 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {logSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogForm(false)
                    setLogDuration('')
                    setLogNotes('')
                  }}
                  className="px-5 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Iptal
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Training Logs List */}
      <div className="bg-white p-5 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Antrenman Gecmisi</h3>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">&#128221;</div>
            <p className="text-sm">Henuz antrenman kaydi yok.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{formatDate(log.date)}</span>
                    {log.duration_minutes && (
                      <span className="text-xs text-gray-400">{log.duration_minutes} dakika</span>
                    )}
                  </div>
                  {log.notes && (
                    <p className="text-sm text-gray-500 hidden md:block max-w-md truncate">{log.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {log.xp_earned > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">+{log.xp_earned} XP</span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${logStatusColors[log.completion_status] || 'bg-gray-100 text-gray-500'}`}>
                    {logStatusLabels[log.completion_status] || log.completion_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
