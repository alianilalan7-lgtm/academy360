'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  subscription_tier: string | null
  subscription_valid_until: string | null
  created_at: string
  stats: {
    totalMembers: number
    athletes: number
    coaches: number
    admins: number
  }
  isActive: boolean
}

export default function OrganizationsPage() {
  const { activeRole, isLoading: roleLoading } = useRole()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')

  const canView = activeRole === 'super_admin'

  useEffect(() => {
    if (!canView || roleLoading) return

    async function load() {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (tierFilter) params.set('tier', tierFilter)

        const res = await fetch(`/api/admin/organizations?${params}`)
        const data = await res.json()

        if (data.success) {
          setOrganizations(data.data || [])
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, roleLoading, search, tierFilter])

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['super_admin']} />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const tierLabels: Record<string, string> = {
    free: 'Ücretsiz',
    basic: 'Temel',
    pro: 'Pro',
    premium: 'Premium',
  }

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    premium: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizasyonlar</h1>
          <p className="text-sm text-gray-500 mt-1">{organizations.length} organizasyon</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Organizasyon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Tüm Paketler</option>
          <option value="free">Ücretsiz</option>
          <option value="basic">Temel</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-2xl font-bold text-gray-900">{organizations.length}</p>
          <p className="text-sm text-gray-500">Toplam Organizasyon</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-2xl font-bold text-emerald-600">
            {organizations.filter(o => o.isActive).length}
          </p>
          <p className="text-sm text-gray-500">Aktif Abonelik</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-2xl font-bold text-gray-900">
            {organizations.reduce((sum, o) => sum + o.stats.totalMembers, 0)}
          </p>
          <p className="text-sm text-gray-500">Toplam Üye</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-2xl font-bold text-gray-900">
            {organizations.reduce((sum, o) => sum + o.stats.athletes, 0)}
          </p>
          <p className="text-sm text-gray-500">Toplam Sporcu</p>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Organizasyon</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Paket</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Üyeler</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Sporcular</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Antrenörler</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Durum</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    Organizasyon bulunamadı
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-lg">
                          🏢
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{org.name}</p>
                          <p className="text-xs text-gray-500">{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierColors[org.subscription_tier || 'free']}`}>
                        {tierLabels[org.subscription_tier || 'free']}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">{org.stats.totalMembers}</td>
                    <td className="px-5 py-4 text-sm text-gray-900">{org.stats.athletes}</td>
                    <td className="px-5 py-4 text-sm text-gray-900">{org.stats.coaches}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        org.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {org.isActive ? 'Aktif' : 'Süresi Dolmuş'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
