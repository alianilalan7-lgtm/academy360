'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface PlatformStats {
  totalOrgs: number
  totalUsers: number
  totalAthletes: number
  totalSessions: number
  activeSubscriptions: number
  newUsersThisMonth: number
}

interface PlatformSettings {
  platformName: string
  defaultLanguage: string
  timezone: string
  sessionDuration: number
  maxFileUploadSize: number
  maintenanceMode: boolean
}

interface RecentUser {
  id: string
  full_name: string | null
  email: string
  created_at: string
}

interface SettingsData {
  stats: PlatformStats
  recentUsers: RecentUser[]
  platformSettings: PlatformSettings
}

export default function SettingsPage() {
  const { activeRole, isLoading: roleLoading } = useRole()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SettingsData | null>(null)
  const [error, setError] = useState('')

  const canView = activeRole === 'super_admin'

  useEffect(() => {
    if (!canView || roleLoading) return

    async function load() {
      try {
        const res = await fetch('/api/admin/settings')
        const result = await res.json()

        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || 'Ayarlar yüklenemedi')
        }
      } catch {
        setError('Bağlantı hatası')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canView, roleLoading])

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
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const settings = data?.platformSettings
  const recentUsers = data?.recentUsers || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h1>
        <p className="text-sm text-gray-500 mt-1">Platform yapılandırması ve istatistikleri</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Platform Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-lg">🏢</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalOrgs || 0}</p>
          <p className="text-xs text-gray-500">Organizasyon</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-lg">👥</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats?.totalUsers || 0}</p>
          <p className="text-xs text-gray-500">Kullanıcı</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-lg">🏃</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats?.totalAthletes || 0}</p>
          <p className="text-xs text-gray-500">Sporcu</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-lg">📅</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats?.totalSessions || 0}</p>
          <p className="text-xs text-gray-500">Seans</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-lg">✅</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats?.activeSubscriptions || 0}</p>
          <p className="text-xs text-gray-500">Aktif Abonelik</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center text-lg">🆕</span>
          </div>
          <p className="text-2xl font-bold text-cyan-600">{stats?.newUsersThisMonth || 0}</p>
          <p className="text-xs text-gray-500">Bu Ay Yeni</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Settings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Platform Ayarları</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Platform Adı</p>
                <p className="text-sm text-gray-500">Platformun görünen adı</p>
              </div>
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                {settings?.platformName || 'Academy360'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Varsayılan Dil</p>
                <p className="text-sm text-gray-500">Yeni kullanıcılar için varsayılan dil</p>
              </div>
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                {settings?.defaultLanguage === 'tr' ? 'Türkçe' : settings?.defaultLanguage}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Saat Dilimi</p>
                <p className="text-sm text-gray-500">Platform saat dilimi</p>
              </div>
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                {settings?.timezone || 'Europe/Istanbul'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Varsayılan Seans Süresi</p>
                <p className="text-sm text-gray-500">Yeni seanslar için varsayılan süre</p>
              </div>
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                {settings?.sessionDuration || 120} dakika
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Bakım Modu</p>
                <p className="text-sm text-gray-500">Platform erişim durumu</p>
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-lg ${
                settings?.maintenanceMode
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {settings?.maintenanceMode ? 'Aktif' : 'Kapalı'}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Son Kayıt Olan Kullanıcılar</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentUsers.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400">
                Henüz kayıtlı kullanıcı yok
              </div>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {user.full_name || 'İsim belirtilmemiş'}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Hızlı İşlemler</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/organizations"
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
          >
            <span className="text-2xl">🏢</span>
            <div>
              <p className="font-medium text-gray-900">Organizasyonlar</p>
              <p className="text-sm text-gray-500">{stats?.totalOrgs || 0} organizasyon</p>
            </div>
          </a>
          <a
            href="/dashboard/users"
            className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
          >
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-medium text-gray-900">Kullanıcılar</p>
              <p className="text-sm text-gray-500">{stats?.totalUsers || 0} kullanıcı</p>
            </div>
          </a>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-60 cursor-not-allowed">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-gray-900">Raporlar</p>
              <p className="text-sm text-gray-500">Yakında</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Geliştirme Aşamasındaki Özellikler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: '📧', name: 'E-posta Şablonları', desc: 'Otomatik e-posta yapılandırması' },
            { icon: '🔔', name: 'Push Bildirimler', desc: 'Mobil bildirim ayarları' },
            { icon: '🔒', name: 'Güvenlik Politikaları', desc: 'Şifre ve oturum kuralları' },
            { icon: '📈', name: 'Gelişmiş Raporlama', desc: 'Detaylı analitik ve raporlar' },
          ].map((feature) => (
            <div key={feature.name} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
              <span className="text-xl">{feature.icon}</span>
              <div>
                <p className="font-medium text-gray-900 text-sm">{feature.name}</p>
                <p className="text-xs text-gray-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
