'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

export default function GroupsPage() {
  const { activeRole, currentOrgId, isLoading: roleLoading } = useRole()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ageGroup: '',
    maxMembers: '',
  })

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

        const res = await fetch(`/api/groups?organizationId=${id}`)
        const data = await res.json()
        if (data.success) setGroups(data.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, currentOrgId, roleLoading])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !orgId) return

    setCreating(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          name: formData.name,
          description: formData.description || null,
          ageGroup: formData.ageGroup || null,
          maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : null,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Grup basariyla olusturuldu!' })
        setFormData({ name: '', description: '', ageGroup: '', maxMembers: '' })
        setShowCreateForm(false)

        const groupsRes = await fetch(`/api/groups?organizationId=${orgId}`)
        const groupsData = await groupsRes.json()
        if (groupsData.success) setGroups(groupsData.data || [])
      } else {
        setMessage({ type: 'error', text: data.error || 'Grup olusturulamadi' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    } finally {
      setCreating(false)
    }
  }

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['club_admin']} />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Grup Yonetimi</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
        >
          {showCreateForm ? 'Kapat' : 'Yeni Grup'}
        </button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Yeni Grup Olustur</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grup Adi</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ornek: U12 Takim A"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yas Grubu</label>
              <input
                type="text"
                value={formData.ageGroup}
                onChange={e => setFormData(prev => ({ ...prev, ageGroup: e.target.value }))}
                placeholder="Ornek: U12, U14, Yetiskin"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Grup aciklamasi"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maksimum Uye</label>
              <input
                type="number"
                value={formData.maxMembers}
                onChange={e => setFormData(prev => ({ ...prev, maxMembers: e.target.value }))}
                placeholder="Ornek: 20"
                min="1"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !formData.name}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Olusturuluyor...' : 'Grup Olustur'}
          </button>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Henuz grup olusturulmamis</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g: any) => (
            <Link
              key={g.id}
              href={`/dashboard/groups/${g.id}`}
              className="bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all block"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{g.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  g.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {g.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </div>

              {g.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{g.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-400">
                {g.age_group && (
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">Yas:</span> {g.age_group}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="text-gray-500">Uye:</span> {g.member_count || 0}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
