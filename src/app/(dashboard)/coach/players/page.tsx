'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CoachPlayers() {
  const [players, setPlayers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        const orgId = me.data?.memberships?.[0]?.organization_id
        if (!orgId) return

        const res = await fetch(`/api/athletes?organizationId=${orgId}&pageSize=50`)
        const data = await res.json()
        if (data.success) setPlayers(data.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = players.filter(p =>
    !search || p.user_profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Oyuncular</h1>
      </div>

      <input
        type="text"
        placeholder="Oyuncu ara..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Sporcu bulunamadi</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map((p: any) => (
            <Link
              key={p.id}
              href={`/coach/players/${p.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                {p.user_profile?.full_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{p.user_profile?.full_name || 'Isim yok'}</div>
                <div className="text-sm text-gray-500">{p.position || 'Pozisyon belirtilmemis'} · #{p.jersey_number || '-'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-emerald-600">Lvl {p.current_level || 1}</div>
                <div className="text-xs text-gray-400">{p.total_xp || 0} XP</div>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
