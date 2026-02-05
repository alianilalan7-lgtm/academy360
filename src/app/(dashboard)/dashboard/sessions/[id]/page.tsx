'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface Session {
  id: string
  organization_id: string
  group_id: string | null
  coach_id: string | null
  title: string
  description: string | null
  session_type: string | null
  status: string
  scheduled_start: string
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  location: string | null
  notes: string | null
  group: {
    id: string
    name: string
    age_group: string | null
  } | null
  coach: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface AttendanceRecord {
  id: string
  athlete_id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  check_in_time: string | null
  notes: string | null
  athlete: {
    id: string
    user_id: string
    jersey_number: number | null
    position: string | null
    user_profile: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
  }
}

interface GroupMember {
  id: string
  user_id: string
  athlete_profile: {
    id: string
    jersey_number: number | null
    position: string | null
  } | null
  user_profile: {
    id: string
    full_name: string | null
  }
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeRole, isLoading: roleLoading } = useRole()

  const [session, setSession] = useState<Session | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Attendance form state
  const [attendanceForm, setAttendanceForm] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({})

  const canView = activeRole === 'coach' || activeRole === 'club_admin'
  const canEdit = activeRole === 'coach' || activeRole === 'club_admin'
  const id = params.id as string

  useEffect(() => {
    if (!canView || roleLoading || !id) return

    async function load() {
      try {
        // Fetch session with attendance
        const sessionRes = await fetch(`/api/sessions/${id}?includeAttendance=true`)
        const sessionData = await sessionRes.json()

        if (!sessionData.success) {
          setError(sessionData.error || 'Seans bulunamadı')
          return
        }

        setSession(sessionData.data)
        setAttendance(sessionData.data.attendance || [])

        // Initialize attendance form from existing records
        const initialForm: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {}
        ;(sessionData.data.attendance || []).forEach((a: AttendanceRecord) => {
          initialForm[a.athlete.id] = a.status
        })

        // If session has a group, fetch group members
        if (sessionData.data.group_id) {
          const membersRes = await fetch(`/api/groups/${sessionData.data.group_id}/members`)
          const membersData = await membersRes.json()

          if (membersData.success) {
            setGroupMembers(membersData.data || [])

            // Add missing members to attendance form with default 'absent'
            ;(membersData.data || []).forEach((m: GroupMember) => {
              if (m.athlete_profile && !initialForm[m.athlete_profile.id]) {
                initialForm[m.athlete_profile.id] = 'absent'
              }
            })
          }
        }

        setAttendanceForm(initialForm)
      } catch {
        setError('Veri yüklenirken hata oluştu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, roleLoading, id])

  const handleAttendanceChange = (athleteId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendanceForm(prev => ({ ...prev, [athleteId]: status }))
  }

  const saveAttendance = async () => {
    if (!canEdit) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const attendees = Object.entries(attendanceForm).map(([athleteId, status]) => ({
        athleteId,
        status,
      }))

      const res = await fetch(`/api/sessions/${id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendees }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(`Yoklama kaydedildi: ${data.data.created} yeni, ${data.data.updated} güncellendi`)
        setAttendance(data.data.records || [])
      } else {
        setError(data.error || 'Yoklama kaydedilemedi')
      }
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setSaving(false)
    }
  }

  const updateSessionStatus = async (newStatus: string) => {
    if (!canEdit) return

    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()

      if (data.success) {
        setSession(data.data)
        setSuccess(`Seans durumu güncellendi: ${statusLabels[newStatus] || newStatus}`)
      } else {
        setError(data.error || 'Durum güncellenemedi')
      }
    } catch {
      setError('Bağlantı hatası')
    }
  }

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

  if (error && !session) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.back()} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Geri
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  const statusLabels: Record<string, string> = {
    scheduled: 'Planlandı',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi',
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const typeLabels: Record<string, string> = {
    training: 'Antrenman',
    match: 'Maç',
    assessment: 'Değerlendirme',
    other: 'Diğer',
  }

  const attendanceStatusLabels: Record<string, string> = {
    present: 'Katıldı',
    absent: 'Katılmadı',
    late: 'Geç Geldi',
    excused: 'İzinli',
  }

  const attendanceStatusColors: Record<string, string> = {
    present: 'bg-emerald-500',
    absent: 'bg-red-500',
    late: 'bg-yellow-500',
    excused: 'bg-blue-500',
  }

  // Combine attendance records with group members for display
  const allAthletes = groupMembers.map(m => {
    const existingAttendance = attendance.find(a => a.athlete.id === m.athlete_profile?.id)
    return {
      athleteId: m.athlete_profile?.id || '',
      name: m.user_profile?.full_name || 'İsimsiz',
      jerseyNumber: m.athlete_profile?.jersey_number,
      position: m.athlete_profile?.position,
      status: attendanceForm[m.athlete_profile?.id || ''] || 'absent',
      hasRecord: !!existingAttendance,
    }
  }).filter(a => a.athleteId)

  // Stats
  const attendanceStats = {
    total: allAthletes.length,
    present: allAthletes.filter(a => a.status === 'present').length,
    absent: allAthletes.filter(a => a.status === 'absent').length,
    late: allAthletes.filter(a => a.status === 'late').length,
    excused: allAthletes.filter(a => a.status === 'excused').length,
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
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          <p className="text-sm text-gray-500">
            {session.group?.name || 'Grup belirtilmemiş'} · {typeLabels[session.session_type || 'training']}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[session.status]}`}>
          {statusLabels[session.status]}
        </span>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-600">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Seans Bilgileri</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tarih</span>
              <span className="text-gray-900">
                {new Date(session.scheduled_start).toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Saat</span>
              <span className="text-gray-900">
                {new Date(session.scheduled_start).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                {session.scheduled_end && ` - ${new Date(session.scheduled_end).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            </div>
            {session.location && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Konum</span>
                <span className="text-gray-900">{session.location}</span>
              </div>
            )}
            {session.coach && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Antrenör</span>
                <span className="text-gray-900">{session.coach.full_name}</span>
              </div>
            )}
            {session.description && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Açıklama</p>
                <p className="text-sm text-gray-700">{session.description}</p>
              </div>
            )}

            {/* Status Actions */}
            {canEdit && session.status !== 'cancelled' && (
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <p className="text-xs text-gray-500 mb-2">Durum Değiştir</p>
                <div className="flex flex-wrap gap-2">
                  {session.status === 'scheduled' && (
                    <button
                      onClick={() => updateSessionStatus('in_progress')}
                      className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Başlat
                    </button>
                  )}
                  {(session.status === 'scheduled' || session.status === 'in_progress') && (
                    <button
                      onClick={() => updateSessionStatus('completed')}
                      className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Tamamla
                    </button>
                  )}
                  {session.status !== 'completed' && (
                    <button
                      onClick={() => updateSessionStatus('cancelled')}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      İptal Et
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Yoklama</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {attendanceStats.present}/{attendanceStats.total} katılım
              </p>
            </div>
            {canEdit && allAthletes.length > 0 && (
              <button
                onClick={saveAttendance}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Kaydediliyor...' : 'Yoklamayı Kaydet'}
              </button>
            )}
          </div>

          {/* Attendance Stats */}
          {allAthletes.length > 0 && (
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600">{attendanceStats.present} Katıldı</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">{attendanceStats.absent} Katılmadı</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-gray-600">{attendanceStats.late} Geç</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">{attendanceStats.excused} İzinli</span>
              </div>
            </div>
          )}

          {/* Attendance List */}
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {allAthletes.length === 0 ? (
              <div className="px-5 py-12 text-center text-gray-400">
                {session.group_id ? 'Bu grupta sporcu yok' : 'Seans için grup seçilmemiş'}
              </div>
            ) : (
              allAthletes.map((athlete) => (
                <div key={athlete.athleteId} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                    {athlete.jerseyNumber || athlete.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{athlete.name}</p>
                    <p className="text-xs text-gray-500">{athlete.position || 'Pozisyon yok'}</p>
                  </div>
                  {canEdit ? (
                    <div className="flex gap-1">
                      {(['present', 'absent', 'late', 'excused'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleAttendanceChange(athlete.athleteId, status)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                            athlete.status === status
                              ? `${attendanceStatusColors[status]} text-white`
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title={attendanceStatusLabels[status]}
                        >
                          {status === 'present' && '✓'}
                          {status === 'absent' && '✗'}
                          {status === 'late' && 'G'}
                          {status === 'excused' && 'İ'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      athlete.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                      athlete.status === 'absent' ? 'bg-red-100 text-red-700' :
                      athlete.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {attendanceStatusLabels[athlete.status]}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {session.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Notlar</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}
    </div>
  )
}
