'use client'

import { useEffect, useState } from 'react'

export default function SuperAdminUsers() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        await meRes.json()
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  const sampleUsers = [
    { name: 'Ahmet Yilmaz', email: 'ahmet@ornek.com', role: 'club_admin', org: 'Ornek Spor Kulubu', status: 'Aktif' },
    { name: 'Mehmet Demir', email: 'mehmet@ornek.com', role: 'coach', org: 'Ornek Spor Kulubu', status: 'Aktif' },
    { name: 'Ayse Kaya', email: 'ayse@ornek.com', role: 'athlete', org: 'Ornek Akademi', status: 'Aktif' },
    { name: 'Fatma Celik', email: 'fatma@ornek.com', role: 'parent', org: 'Ornek Akademi', status: 'Aktif' },
    { name: 'Ali Ozturk', email: 'ali@ornek.com', role: 'coach', org: 'Ornek Fitness', status: 'Pasif' },
  ]

  const roleLabels: Record<string, string> = {
    athlete: 'Sporcu',
    coach: 'Antrenor',
    club_admin: 'Kulup Yoneticisi',
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
        <h1 className="text-2xl font-bold text-gray-900">Tum Kullanicilar</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔧</span>
          <p className="text-sm text-amber-700 font-medium">
            Kullanici yonetim paneli yaklasimda gelistirilecektir.
          </p>
        </div>
        <p className="text-sm text-amber-600 mt-1 ml-7">
          Asagida ornek kullanici listesi gosterilmektedir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kullanici', value: '—', icon: '👥', color: 'bg-blue-50' },
          { label: 'Sporcular', value: '—', icon: '🏃', color: 'bg-emerald-50' },
          { label: 'Antrenorler', value: '—', icon: '🏋️', color: 'bg-purple-50' },
          { label: 'Yoneticiler', value: '—', icon: '👔', color: 'bg-amber-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                {stat.icon}
              </span>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Kullanici Listesi (Ornek)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Kullanici</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">E-posta</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Rol</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Organizasyon</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Durum</th>
              </tr>
            </thead>
            <tbody>
              {sampleUsers.map((user, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                        {user.name.charAt(0)}
                      </span>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{user.org}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
