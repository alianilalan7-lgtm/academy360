'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface GroupMember {
  id: string
  user_id: string
  role: string | null
  is_active: boolean
  joined_at: string | null
  user_profile: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    phone: string | null
  }
  athlete_profile?: {
    id: string
    jersey_number: number | null
    position: string | null
    current_level: number | null
    total_xp: number | null
  }
}

interface Group {
  id: string
  organization_id: string
  name: string
  description: string | null
  age_group: string | null
  max_members: number | null
  is_active: boolean
  created_at: string
  members: GroupMember[]
}

interface AvailableAthlete {
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

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeRole, currentOrgId, isLoading: roleLoading } = useRole()

  const [group, setGroup] = useState<Group | null>(null)
  const [availableAthletes, setAvailableAthletes] = useState<AvailableAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const canView = activeRole === 'club_admin' || activeRole === 'coach'
  const canEdit = activeRole === 'club_admin'
  const id = params.id as string

  useEffect(() => {
    if (!canView || roleLoading || !id) return

    async function load() {
      try {
        const res = await fetch(`/api/groups/${id}`)
        const data = await res.json()

        if (!data.success) {
          setError(data.error || 'Grup bulunamadı')
          return
        }

        setGroup(data.data)
      } catch {
        setError('Veri yüklenirken hata oluştu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, roleLoading, id])

  const loadAvailableAthletes = async () => {
    if (!currentOrgId && !group?.organization_id) return

    try {
      const orgId = currentOrgId || group?.organization_id
      const res = await fetch(`/api/athletes?organizationId=${orgId}&pageSize=100`)
      const data = await res.json()

      if (data.success) {
        // Filter out athletes already in the group
        const memberUserIds = new Set(group?.members.filter(m => m.is_active).map(m => m.user_id) || [])
        const available = (data.data || []).filter((a: AvailableAthlete) => !memberUserIds.has(a.user_id))
        setAvailableAthletes(available)
      }
    } catch {
      console.error('Error loading available athletes')
    }
  }

  const openAddModal = async () => {
    setShowAddModal(true)
    setSelectedAthletes([])
    await loadAvailableAthletes()
  }

  const addMembers = async () => {
    if (!canEdit || selectedAthletes.length === 0) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Add each selected athlete to the group
      const results = await Promise.all(
        selectedAthletes.map(async (userId) => {
          const res = await fetch(`/api/groups/${id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role: 'member' }),
          })
          return res.json()
        })
      )

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        setSuccess(`${successCount} sporcu eklendi${failCount > 0 ? `, ${failCount} hata` : ''}`)
        // Reload group data
        const res = await fetch(`/api/groups/${id}`)
        const data = await res.json()
        if (data.success) setGroup(data.data)
      } else {
        setError('Sporcu eklenemedi')
      }

      setShowAddModal(false)
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async (userId: string) => {
    if (!canEdit) return
    if (!confirm('Bu sporcuyu gruptan çıkarmak istediğinize emin misiniz?')) return

    try {
      const res = await fetch(`/api/groups/${id}/members/${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        setSuccess('Sporcu gruptan çıkarıldı')
        // Update local state
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.map(m =>
            m.user_id === userId ? { ...m, is_active: false } : m
          )
        } : null)
      } else {
        setError(data.error || 'Sporcu çıkarılamadı')
      }
    } catch {
      setError('Bağlantı hatası')
    }
  }

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['club_admin', 'coach']} />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error && !group) {
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

  if (!group) return null

  const activeMembers = group.members.filter(m => m.is_active)

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
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-500">
            {group.age_group || 'Yaş grubu belirtilmemiş'} · {activeMembers.length} sporcu
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          group.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {group.is_active ? 'Aktif' : 'Pasif'}
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
        {/* Group Info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Grup Bilgileri</h2>
          </div>
          <div className="p-5 space-y-4">
            {group.description && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Açıklama</p>
                <p className="text-sm text-gray-700">{group.description}</p>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Yaş Grubu</span>
              <span className="text-gray-900">{group.age_group || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Üye Sayısı</span>
              <span className="text-gray-900">
                {activeMembers.length}
                {group.max_members && ` / ${group.max_members}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Oluşturulma</span>
              <span className="text-gray-900">
                {new Date(group.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Üyeler</h2>
              <p className="text-xs text-gray-500">{activeMembers.length} aktif sporcu</p>
            </div>
            {canEdit && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Sporcu Ekle
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {activeMembers.length === 0 ? (
              <div className="px-5 py-12 text-center text-gray-400">
                Bu grupta henüz sporcu yok
              </div>
            ) : (
              activeMembers.map((member) => (
                <div key={member.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                    {member.athlete_profile?.jersey_number || member.user_profile?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={member.athlete_profile ? `/dashboard/players/${member.athlete_profile.id}` : '#'}
                      className="font-medium text-gray-900 hover:text-emerald-600"
                    >
                      {member.user_profile?.full_name || 'İsimsiz'}
                    </Link>
                    <div className="text-xs text-gray-500 flex gap-2">
                      <span>{member.athlete_profile?.position || 'Pozisyon yok'}</span>
                      {member.athlete_profile?.current_level && (
                        <>
                          <span>·</span>
                          <span>Lvl {member.athlete_profile.current_level}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">
                      {member.joined_at ? new Date(member.joined_at).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => removeMember(member.user_id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Gruptan çıkar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Sporcu Ekle</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto">
              {availableAthletes.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Eklenecek sporcu bulunamadı</p>
              ) : (
                <div className="space-y-2">
                  {availableAthletes.map((athlete) => (
                    <label
                      key={athlete.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedAthletes.includes(athlete.user_id)
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAthletes.includes(athlete.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAthletes(prev => [...prev, athlete.user_id])
                          } else {
                            setSelectedAthletes(prev => prev.filter(id => id !== athlete.user_id))
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {athlete.user_profile?.full_name || 'İsimsiz'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {athlete.position || 'Pozisyon yok'} · #{athlete.jersey_number || '-'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                İptal
              </button>
              <button
                onClick={addMembers}
                disabled={saving || selectedAthletes.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Ekleniyor...' : `${selectedAthletes.length} Sporcu Ekle`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
