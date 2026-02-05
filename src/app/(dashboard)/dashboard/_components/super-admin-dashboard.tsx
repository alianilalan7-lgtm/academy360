'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PlatformStats {
  totalOrganizations: number
  totalUsers: number
  totalAthletes: number
  totalCoaches: number
  activeSessions: number
  monthlyRevenue: number
  pendingPayments: number
  newMembersThisMonth: number
  recentOrganizations: {
    id: string
    name: string
    tier: string
    memberCount: number
  }[]
}

export function SuperAdminDashboardContent() {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [meRes, statsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/admin/stats'),
        ])

        const me = await meRes.json()
        setUserName(me.data?.profile?.fullName || 'Super Admin')

        const statsData = await statsRes.json()
        if (statsData.success) {
          setStats(statsData.data)
        } else {
          setError(statsData.error || 'İstatistikler yüklenemedi')
        }
      } catch {
        setError('Bağlantı hatası')
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
      </div>
    )
  }

  const statCards = [
    { label: 'Toplam Organizasyon', value: stats?.totalOrganizations ?? 0, icon: '🏢', color: 'bg-blue-50 text-blue-600' },
    { label: 'Toplam Kullanıcı', value: stats?.totalUsers ?? 0, icon: '👥', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Toplam Sporcu', value: stats?.totalAthletes ?? 0, icon: '🏃', color: 'bg-purple-50 text-purple-600' },
    { label: 'Aktif Seanslar', value: stats?.activeSessions ?? 0, icon: '📅', color: 'bg-amber-50 text-amber-600' },
  ]

  const secondaryStats = [
    { label: 'Toplam Antrenör', value: stats?.totalCoaches ?? 0, icon: '🏋️' },
    { label: 'Bu Ay Gelir', value: `₺${(stats?.monthlyRevenue ?? 0).toLocaleString('tr-TR')}`, icon: '💰' },
    { label: 'Bekleyen Ödeme', value: stats?.pendingPayments ?? 0, icon: '⏳' },
    { label: 'Bu Ay Yeni Üye', value: stats?.newMembersThisMonth ?? 0, icon: '🆕' },
  ]

  const quickActions = [
    {
      title: 'Organizasyon Yönet',
      description: 'Platformdaki tüm organizasyonları görüntüle ve yönet',
      href: '/dashboard/organizations',
      icon: '🏢',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      title: 'Üyeleri Gör',
      description: 'Tüm platform kullanıcılarını listele ve yönet',
      href: '/dashboard/users',
      icon: '👥',
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    },
    {
      title: 'Sistem Ayarları',
      description: 'Platform genelindeki ayarları yapılandır',
      href: '/dashboard/settings',
      icon: '⚙️',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Hoşgeldiniz, {userName}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
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

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-4 rounded-xl border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{stat.icon}</span>
              <div>
                <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Organizations */}
      {stats?.recentOrganizations && stats.recentOrganizations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Son Eklenen Organizasyonlar</h2>
            <Link href="/dashboard/organizations" className="text-sm text-emerald-600 hover:text-emerald-700">
              Tümünü Gör →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentOrganizations.map((org) => (
              <div key={org.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">
                    🏢
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500">{org.memberCount} üye</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  org.tier === 'premium' ? 'bg-amber-100 text-amber-700' :
                  org.tier === 'pro' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {org.tier || 'free'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hızlı Erişim</h2>
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
