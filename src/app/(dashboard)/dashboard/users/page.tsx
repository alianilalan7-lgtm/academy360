'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface User {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  createdAt: string
  role: string | null
  organization: string | null
  status: 'active' | 'inactive'
}

interface RoleStats {
  total: number
  athletes: number
  coaches: number
  admins: number
  parents: number
  superAdmins: number
}

export default function UsersPage() {
  const { activeRole, isLoading: roleLoading } = useRole()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<RoleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const canView = activeRole === 'super_admin'

  useEffect(() => {
    if (!canView || roleLoading) return

    async function load() {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (roleFilter) params.set('role', roleFilter)

        const res = await fetch(`/api/admin/users?${params}`)
        const data = await res.json()

        if (data.success) {
          setUsers(data.data || [])
          setStats(data.stats || null)
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, roleLoading, search, roleFilter])

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
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  const roleLabels: Record<string, string> = {
    athlete: 'Sporcu',
    coach: 'Antrenör',
    club_admin: 'Kulüp Yöneticisi',
    parent: 'Veli',
    super_admin: 'Super Admin',
  }

  const roleBadgeColors: Record<string, string> = {
    athlete: 'bg-blue-100 text-blue-700',
    coach: 'bg-purple-100 text-purple-700',
    club_admin: 'bg-emerald-100 text-emerald-700',
    parent: 'bg-amber-100 text-amber-700',
    super_admin: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tüm Kullanıcılar</h1>
          <p className="text-sm text-gray-500 mt-1">{stats?.total || 0} kullanıcı</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg">👥</span>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats?.total || 0}</p>
              <p className="text-xs text-gray-500">Toplam</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg">🏃</span>
            <div>
              <p className="text-xl font-bold text-blue-600">{stats?.athletes || 0}</p>
              <p className="text-xs text-gray-500">Sporcu</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-lg">🏋️</span>
            <div>
              <p className="text-xl font-bold text-purple-600">{stats?.coaches || 0}</p>
              <p className="text-xs text-gray-500">Antrenör</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-lg">👔</span>
            <div>
              <p className="text-xl font-bold text-emerald-600">{stats?.admins || 0}</p>
              <p className="text-xs text-gray-500">Yönetici</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-lg">👨‍👧</span>
            <div>
              <p className="text-xl font-bold text-amber-600">{stats?.parents || 0}</p>
              <p className="text-xs text-gray-500">Veli</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="İsim veya e-posta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Tüm Roller</option>
          <option value="athlete">Sporcu</option>
          <option value="coach">Antrenör</option>
          <option value="club_admin">Kulüp Yöneticisi</option>
          <option value="parent">Veli</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Kullanıcı</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">E-posta</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Rol</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Organizasyon</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Durum</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                          {(user.fullName || user.email).charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-gray-900">
                          {user.fullName || 'İsim belirtilmemiş'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-5 py-4">
                      {user.role ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                          {roleLabels[user.role] || user.role}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Rol yok</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {user.organization || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
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
