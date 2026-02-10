'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'

export function CoachDashboardContent() {
  const { currentOrgId } = useRole()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) return

        const orgId = currentOrgId || me.data.memberships?.[0]?.organization_id
        if (!orgId) return

        const [athletesRes, sessionsRes, programsRes] = await Promise.all([
          fetch(`/api/athletes?organizationId=${orgId}&pageSize=1`),
          fetch(`/api/sessions?organizationId=${orgId}&status=scheduled`),
          fetch(`/api/assignments?status=in_progress`),
        ])

        const athletes = await athletesRes.json()
        const sessions = await sessionsRes.json()
        const programs = await programsRes.json()

        setStats({
          totalAthletes: athletes.total || 0,
          upcomingSessions: sessions.data?.length || 0,
          activePrograms: programs.data?.length || 0,
        })
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrgId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Antrenor Paneli</h1>
        <p className="text-gray-500">Takimini yonet, performans takip et</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/players" className="bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors">
          <div className="text-sm text-gray-500">Toplam Sporcu</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{stats?.totalAthletes || 0}</div>
          <div className="text-xs text-emerald-500 mt-2">Listeyi gor →</div>
        </Link>

        <Link href="/dashboard/sessions" className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
          <div className="text-sm text-gray-500">Yaklasan Seanslar</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{stats?.upcomingSessions || 0}</div>
          <div className="text-xs text-blue-500 mt-2">Seanslari gor →</div>
        </Link>

        <Link href="/dashboard/assignments" className="bg-white p-5 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors">
          <div className="text-sm text-gray-500">Aktif Programlar</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">{stats?.activePrograms || 0}</div>
          <div className="text-xs text-purple-500 mt-2">Programlari gor →</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/measurements"
          className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <div className="text-2xl mb-2">📏</div>
          <h3 className="font-semibold text-emerald-800">Olcum Ekle</h3>
          <p className="text-sm text-emerald-600 mt-1">Sporculariniz icin performans olcumu kaydedin</p>
        </Link>

        <Link
          href="/dashboard/sessions"
          className="bg-blue-50 p-6 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <div className="text-2xl mb-2">📅</div>
          <h3 className="font-semibold text-blue-800">Yoklama Al</h3>
          <p className="text-sm text-blue-600 mt-1">Seans icin yoklama kaydi olusturun</p>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Sporcu Paneli Baglantisi</h3>
            <p className="text-sm text-gray-500 mt-1">
              Yaptigin atama, puan ve notlar sporcu panelindeki Koc Guncellemeleri bolumune yansir.
            </p>
          </div>
          <span className="text-2xl">🔗</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/assignments" className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
            Program Atama
          </Link>
          <Link href="/dashboard/programs" className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
            Beceri Puani
          </Link>
          <Link href="/dashboard/players" className="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors">
            Gelisim Notu
          </Link>
        </div>
      </div>
    </div>
  )
}
