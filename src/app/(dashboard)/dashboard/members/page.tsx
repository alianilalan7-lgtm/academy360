'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

export default function MembersPage() {
  const { activeRole, currentOrgId, isLoading: roleLoading } = useRole()
  const [members, setMembers] = useState<any[]>([])
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('athlete')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const canView = activeRole === 'club_admin'

  useEffect(() => {
    if (!canView || roleLoading) return

    async function load() {
      try {
        let id = currentOrgId
        if (!id) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          id = me.data?.memberships?.[0]?.organization_id
        }
        if (!id) return
        setOrgId(id)

        const res = await fetch(`/api/organizations/${id}/members?status=active&pageSize=100`)
        const data = await res.json()

        if (data.success) {
          setAllMembers(data.data || [])
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, currentOrgId, roleLoading])

  useEffect(() => {
    let filtered = [...allMembers]

    if (roleFilter !== 'all') {
      filtered = filtered.filter((m: any) => m.role === roleFilter)
    }

    if (search.trim()) {
      const s = search.toLowerCase()
      filtered = filtered.filter((m: any) =>
        m.user_profile?.full_name?.toLowerCase().includes(s) ||
        m.user_profile?.email?.toLowerCase().includes(s)
      )
    }

    setMembers(filtered)
  }, [allMembers, roleFilter, search])

  async function handleDeactivate(memberId: string) {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, status: 'inactive' }),
      })
      const data = await res.json()
      if (data.success) {
        setAllMembers(prev => prev.filter(m => m.id !== memberId))
        setMessage({ type: 'success', text: 'Uye pasif yapildi' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Hata olustu' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail || !orgId) return

    setInviting(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Davet gonderildi!' })
        setInviteEmail('')
        setInviteRole('athlete')
        setShowInviteForm(false)

        const membersRes = await fetch(`/api/organizations/${orgId}/members?status=active&pageSize=100`)
        const membersData = await membersRes.json()
        if (membersData.success) setAllMembers(membersData.data || [])
      } else {
        setMessage({ type: 'error', text: data.error || 'Davet gonderilemedi' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    } finally {
      setInviting(false)
    }
  }

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['club_admin']} />
  }

  const totalCount = allMembers.length
  const athleteCount = allMembers.filter((m: any) => m.role === 'athlete').length
  const coachCount = allMembers.filter((m: any) => m.role === 'coach').length
  const parentCount = allMembers.filter((m: any) => m.role === 'parent').length

  const roleColors: Record<string, string> = {
    athlete: 'bg-emerald-100 text-emerald-700',
    coach: 'bg-blue-100 text-blue-700',
    club_admin: 'bg-purple-100 text-purple-700',
    parent: 'bg-orange-100 text-orange-700',
  }

  const roleLabels: Record<string, string> = {
    athlete: 'Sporcu',
    coach: 'Antrenor',
    club_admin: 'Yonetici',
    parent: 'Veli',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
  }

  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Pasif',
    pending: 'Bekliyor',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Uye Yonetimi</h1>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
        >
          {showInviteForm ? 'Kapat' : 'Uye Davet Et'}
        </button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {showInviteForm && (
        <form onSubmit={handleInvite} className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Uye Davet Et</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="athlete">Sporcu</option>
                <option value="coach">Antrenor</option>
                <option value="parent">Veli</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={inviting || !inviteEmail}
                className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {inviting ? 'Gonderiliyor...' : 'Davet Gonder'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Toplam Uye</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Sporcular</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{athleteCount}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Antrenorler</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{coachCount}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Veliler</div>
          <div className="text-3xl font-bold text-orange-500 mt-1">{parentCount}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Tumu' },
            { key: 'athlete', label: 'Sporcular' },
            { key: 'coach', label: 'Antrenorler' },
            { key: 'parent', label: 'Veliler' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === f.key ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Isim veya e-posta ile ara..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Uye bulunamadi</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Isim</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">E-posta</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Katilim Tarihi</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Islem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {m.user_profile?.full_name || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {m.user_profile?.email || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[m.role] || 'bg-gray-100'}`}>
                      {roleLabels[m.role] || m.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[m.status] || 'bg-gray-100'}`}>
                      {statusLabels[m.status] || m.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {m.joined_at ? new Date(m.joined_at).toLocaleDateString('tr-TR') : m.created_at ? new Date(m.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {m.status === 'active' && m.role !== 'club_admin' && (
                      <button
                        onClick={() => handleDeactivate(m.id)}
                        className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition-colors font-medium"
                      >
                        Pasif Yap
                      </button>
                    )}
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
