'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'

export function AdminDashboardContent() {
  const { currentOrgId } = useRole()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!currentOrgId) {
        // Get orgId from memberships
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        const orgId = me.data?.memberships?.[0]?.organization_id
        if (!orgId) {
          setLoading(false)
          return
        }
        const res = await fetch(`/api/organizations/${orgId}/dashboard`)
        const data = await res.json()
        if (data.success) setStats(data.data)
      } else {
        const res = await fetch(`/api/organizations/${currentOrgId}/dashboard`)
        const data = await res.json()
        if (data.success) setStats(data.data)
      }
      setLoading(false)
    }
    load()
  }, [currentOrgId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kulup Yonetim Paneli</h1>
        <p className="text-gray-500">Kulubunuzun genel durumu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/dashboard/members" className="bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors">
          <div className="text-sm text-gray-500">Toplam Uye</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{stats?.totalMembers || 0}</div>
        </Link>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Aktif Sporcu</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{stats?.activeAthletes || 0}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Antrenor</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">{stats?.coaches || 0}</div>
        </div>

        <Link href="/dashboard/groups" className="bg-white p-5 rounded-xl border border-gray-200 hover:border-orange-300 transition-colors">
          <div className="text-sm text-gray-500">Gruplar</div>
          <div className="text-3xl font-bold text-orange-500 mt-1">{stats?.groups || 0}</div>
        </Link>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Aylik Gelir</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats?.monthlyRevenue || 0)}
          </div>
        </div>

        <Link href="/dashboard/payments" className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 hover:bg-yellow-100 transition-colors">
          <div className="text-sm text-yellow-700">Bekleyen Odemeler</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{stats?.pendingPayments || 0}</div>
          <div className="text-xs text-yellow-500 mt-1">Detaylari gor →</div>
        </Link>

        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Odeme Durumu</div>
          <div className="flex gap-2 mt-3">
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-emerald-600">{stats?.paymentStats?.paid || 0}</div>
              <div className="text-xs text-gray-400">Odendi</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-yellow-500">{stats?.paymentStats?.pending || 0}</div>
              <div className="text-xs text-gray-400">Bekliyor</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-red-500">{stats?.paymentStats?.overdue || 0}</div>
              <div className="text-xs text-gray-400">Gecikli</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/members" className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors">
          <div className="text-xl mb-2">➕</div>
          <h3 className="font-semibold text-emerald-800">Uye Davet Et</h3>
          <p className="text-sm text-emerald-600">Yeni sporcu veya antrenor ekleyin</p>
        </Link>

        <Link href="/dashboard/payments" className="bg-blue-50 p-5 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors">
          <div className="text-xl mb-2">💰</div>
          <h3 className="font-semibold text-blue-800">Odeme Kaydet</h3>
          <p className="text-sm text-blue-600">Aidat odemelerini yonetin</p>
        </Link>

        <Link href="/dashboard/notifications" className="bg-purple-50 p-5 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors">
          <div className="text-xl mb-2">🔔</div>
          <h3 className="font-semibold text-purple-800">Bildirim Gonder</h3>
          <p className="text-sm text-purple-600">Uyelere duyuru gonderin</p>
        </Link>
      </div>
    </div>
  )
}
