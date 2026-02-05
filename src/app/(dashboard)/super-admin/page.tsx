'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        setUserName(me.data?.full_name || 'Super Admin')
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
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Toplam Organizasyon', value: '—', icon: '🏢', color: 'bg-blue-50 text-blue-600' },
    { label: 'Toplam Uye', value: '—', icon: '👥', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Toplam Sporcu', value: '—', icon: '🏃', color: 'bg-purple-50 text-purple-600' },
    { label: 'Aktif Seanslar', value: '—', icon: '📅', color: 'bg-amber-50 text-amber-600' },
  ]

  const quickActions = [
    {
      title: 'Organizasyon Yonet',
      description: 'Platformdaki tum organizasyonlari goruntule ve yonet',
      href: '/super-admin/organizations',
      icon: '🏢',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      title: 'Uyeleri Gor',
      description: 'Tum platform kullanicilarini listele ve yonet',
      href: '/super-admin/users',
      icon: '👥',
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    },
    {
      title: 'Sistem Ayarlari',
      description: 'Platform genelindeki ayarlari yapilandir',
      href: '/super-admin/settings',
      icon: '⚙️',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Hosgeldiniz, {userName}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <p className="text-sm text-amber-700 font-medium">
            Platform istatistikleri yaklasimda
          </p>
        </div>
        <p className="text-sm text-amber-600 mt-1 ml-7">
          Platform genelindeki istatistikler icin API entegrasyonu gelistirme asamasindadir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-5 rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                {stat.icon}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hizli Erisim</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`p-5 rounded-xl border transition-all block ${action.color}`}
            >
              <span className="text-2xl">{action.icon}</span>
              <h3 className="font-semibold text-gray-900 mt-3">{action.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
