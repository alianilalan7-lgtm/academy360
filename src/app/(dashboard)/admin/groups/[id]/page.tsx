'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function GroupDetail() {
  const params = useParams()
  const groupId = params.id as string

  const [group, setGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    ageGroup: '',
    maxMembers: '',
  })

  // Add member
  const [showAddMember, setShowAddMember] = useState(false)
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [addingMember, setAddingMember] = useState(false)
  const [loadingAthletes, setLoadingAthletes] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        const id = me.data?.memberships?.[0]?.organization_id
        if (id) setOrgId(id)

        const res = await fetch(`/api/groups/${groupId}`)
        const data = await res.json()
        if (data.success && data.data) {
          setGroup(data.data)
          setEditForm({
            name: data.data.name || '',
            description: data.data.description || '',
            ageGroup: data.data.age_group || '',
            maxMembers: data.data.max_members?.toString() || '',
          })
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [groupId])

  async function loadAthletes() {
    if (!orgId) return
    setLoadingAthletes(true)
    try {
      const res = await fetch(`/api/athletes?organizationId=${orgId}&pageSize=100`)
      const data = await res.json()
      if (data.success) {
        // Filter out users already in the group
        const currentMemberIds = new Set(
          (group?.members || [])
            .filter((m: any) => m.is_active)
            .map((m: any) => m.user_id)
        )
        const available = (data.data || []).filter((a: any) => !currentMemberIds.has(a.user_id))
        setAthletes(available)
      }
    } catch {
    } finally {
      setLoadingAthletes(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          ageGroup: editForm.ageGroup || null,
          maxMembers: editForm.maxMembers ? parseInt(editForm.maxMembers) : null,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Grup bilgileri guncellendi!' })
        setGroup((prev: any) => ({
          ...prev,
          name: editForm.name,
          description: editForm.description || null,
          age_group: editForm.ageGroup || null,
          max_members: editForm.maxMembers ? parseInt(editForm.maxMembers) : null,
        }))
        setEditing(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'Guncelleme hatasi' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) return

    setAddingMember(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: [selectedUserId],
          role: memberRole,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: `Uye eklendi! (${data.data.added} yeni)` })
        setSelectedUserId('')
        setMemberRole('member')
        setShowAddMember(false)

        // Reload group data
        const groupRes = await fetch(`/api/groups/${groupId}`)
        const groupData = await groupRes.json()
        if (groupData.success) setGroup(groupData.data)
      } else {
        setMessage({ type: 'error', text: data.error || 'Uye eklenemedi' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    } finally {
      setAddingMember(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        setGroup((prev: any) => ({
          ...prev,
          members: prev.members.map((m: any) =>
            m.user_id === userId ? { ...m, is_active: false } : m
          ),
        }))
        setMessage({ type: 'success', text: 'Uye gruptan cikarildi' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Uye cikarilamadi' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <Link href="/admin/groups" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
          ← Gruplara Don
        </Link>
        <div className="text-center py-12 text-gray-400">Grup bulunamadi</div>
      </div>
    )
  }

  const activeMembers = (group.members || []).filter((m: any) => m.is_active)

  const memberRoleLabels: Record<string, string> = {
    member: 'Uye',
    captain: 'Kaptan',
    assistant_coach: 'Yardimci Antrenor',
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/groups" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
        ← Gruplara Don
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        <button
          onClick={() => setEditing(!editing)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            editing ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {editing ? 'Iptal' : 'Duzenle'}
        </button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* Group Info or Edit Form */}
      {editing ? (
        <form onSubmit={handleEdit} className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Grup Bilgilerini Duzenle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grup Adi</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yas Grubu</label>
              <input
                type="text"
                value={editForm.ageGroup}
                onChange={e => setEditForm(prev => ({ ...prev, ageGroup: e.target.value }))}
                placeholder="Ornek: U12"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
              <input
                type="text"
                value={editForm.description}
                onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maksimum Uye</label>
              <input
                type="number"
                value={editForm.maxMembers}
                onChange={e => setEditForm(prev => ({ ...prev, maxMembers: e.target.value }))}
                min="1"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !editForm.name}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      ) : (
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Grup Adi</div>
              <div className="font-medium text-gray-900 mt-0.5">{group.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Aciklama</div>
              <div className="font-medium text-gray-900 mt-0.5">{group.description || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Yas Grubu</div>
              <div className="font-medium text-gray-900 mt-0.5">{group.age_group || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Maksimum Uye</div>
              <div className="font-medium text-gray-900 mt-0.5">{group.max_members || 'Sinir yok'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Olusturulma Tarihi</div>
              <div className="font-medium text-gray-900 mt-0.5">
                {group.created_at ? new Date(group.created_at).toLocaleDateString('tr-TR') : '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Durum</div>
              <div className="mt-0.5">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  group.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {group.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Aktif Uye Sayisi</div>
              <div className="font-medium text-gray-900 mt-0.5">{activeMembers.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Members Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Uyeler ({activeMembers.length})</h2>
        <button
          onClick={() => {
            setShowAddMember(!showAddMember)
            if (!showAddMember) loadAthletes()
          }}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
        >
          {showAddMember ? 'Kapat' : 'Uye Ekle'}
        </button>
      </div>

      {showAddMember && (
        <form onSubmit={handleAddMember} className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Gruba Uye Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu Sec</label>
              {loadingAthletes ? (
                <div className="h-11 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Sporcu seciniz...</option>
                  {athletes.map((a: any) => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.user_profile?.full_name || a.user_profile?.email || a.user_id}
                    </option>
                  ))}
                </select>
              )}
              {!loadingAthletes && athletes.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Eklenebilecek sporcu bulunamadi</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gruptaki Rolu</label>
              <select
                value={memberRole}
                onChange={e => setMemberRole(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="member">Uye</option>
                <option value="assistant_coach">Yardimci Antrenor</option>
                <option value="captain">Kaptan</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addingMember || !selectedUserId}
                className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {addingMember ? 'Ekleniyor...' : 'Uye Ekle'}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeMembers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Bu grupta henuz uye yok</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Isim</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Gruptaki Rol</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Katilim Tarihi</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Islem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeMembers.map((m: any) => (
                <tr key={m.id || m.user_id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {m.user_profile?.full_name || m.user_profile?.email || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      m.role === 'captain' ? 'bg-yellow-100 text-yellow-700' :
                      m.role === 'assistant_coach' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {memberRoleLabels[m.role] || m.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {m.joined_at ? new Date(m.joined_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {m.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition-colors font-medium"
                    >
                      Cikar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
