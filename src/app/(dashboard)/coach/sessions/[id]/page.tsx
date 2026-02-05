'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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

const ATTENDANCE_COLORS: Record<string, string> = {
  present: 'bg-emerald-500 text-white',
  absent: 'bg-red-500 text-white',
  late: 'bg-yellow-500 text-white',
  excused: 'bg-blue-500 text-white',
}

const ATTENDANCE_LABELS: Record<string, string> = {
  present: 'Katildi',
  absent: 'Gelmedi',
  late: 'Gec Kaldi',
  excused: 'Izinli',
}

export default function CoachSessionDetail() {
  const params = useParams()
  const id = params.id as string

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [attendanceUpdating, setAttendanceUpdating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${id}?includeAttendance=true`)
        const data = await res.json()

        if (data.success) {
          setSession(data.data)
        } else {
          setError(data.error || 'Seans bulunamadi')
        }
      } catch {
        setError('Baglanti hatasi')
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id])

  async function updateSessionStatus(newStatus: string) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setSession((prev: any) => ({ ...prev, ...data.data }))
      }
    } catch {
    } finally {
      setUpdating(false)
    }
  }

  async function updateAttendance(athleteId: string, status: string) {
    setAttendanceUpdating(athleteId)
    try {
      const res = await fetch(`/api/sessions/${id}/attendance/${athleteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        setSession((prev: any) => ({
          ...prev,
          attendance: prev.attendance.map((a: any) =>
            a.athlete_id === athleteId ? { ...a, status: data.data.status } : a
          ),
        }))
      }
    } catch {
    } finally {
      setAttendanceUpdating(null)
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/coach/sessions" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Seanslara Don
        </Link>
        <div className="text-center py-12 text-red-500">{error}</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="space-y-6">
      <Link href="/coach/sessions" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Seanslara Don
      </Link>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[session.status] || 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[session.status] || session.status}
              </span>
            </div>
            {session.group?.name && (
              <p className="text-sm text-gray-500">Grup: {session.group.name}</p>
            )}
          </div>

          <div className="flex gap-2">
            {session.status === 'scheduled' && (
              <button
                onClick={() => updateSessionStatus('in_progress')}
                disabled={updating}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {updating ? '...' : 'Seansi Baslat'}
              </button>
            )}
            {session.status === 'in_progress' && (
              <button
                onClick={() => updateSessionStatus('completed')}
                disabled={updating}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {updating ? '...' : 'Seansi Bitir'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="font-medium">Baslangic:</span> {formatDate(session.scheduled_start)}
          </div>
          {session.scheduled_end && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="font-medium">Bitis:</span> {formatDate(session.scheduled_end)}
            </div>
          )}
          {session.location && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="font-medium">Konum:</span> {session.location}
            </div>
          )}
          {session.coach?.full_name && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="font-medium">Antrenor:</span> {session.coach.full_name}
            </div>
          )}
        </div>

        {session.description && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Aciklama</h3>
            <p className="text-sm text-gray-600">{session.description}</p>
          </div>
        )}

        {session.notes && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Notlar</h3>
            <p className="text-sm text-gray-600">{session.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Yoklama {session.attendance?.length > 0 && `(${session.attendance.length} sporcu)`}
        </h2>

        {!session.attendance || session.attendance.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Bu seans icin yoklama kaydi bulunamadi
          </div>
        ) : (
          <div className="space-y-3">
            {session.attendance.map((att: any) => {
              const name = att.athlete?.user_profile?.full_name || 'Isim yok'
              const initial = name.charAt(0).toUpperCase()
              const isUpdating = attendanceUpdating === att.athlete_id

              return (
                <div key={att.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{name}</div>
                    <div className="text-xs text-gray-500">
                      {att.athlete?.position || 'Pozisyon yok'} {att.athlete?.jersey_number ? `· #${att.athlete.jersey_number}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['present', 'absent', 'late', 'excused'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => updateAttendance(att.athlete_id, status)}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          att.status === status
                            ? ATTENDANCE_COLORS[status]
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                        } ${isUpdating ? 'opacity-50' : ''}`}
                      >
                        {ATTENDANCE_LABELS[status]}
                      </button>
                    ))}
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
