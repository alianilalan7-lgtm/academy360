'use client'

import { useEffect, useState } from 'react'

export default function AthleteAchievements() {
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success || !me.data.athleteProfile) return

        const res = await fetch(`/api/athletes/${me.data.athleteProfile.id}/achievements`)
        const data = await res.json()
        if (data.success) setAchievements(data.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Basarimlar 🏆</h1>

      {achievements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-gray-500">Antrenman yaparak basarim kazan!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((aa: any) => (
            <div key={aa.id} className="bg-white p-4 rounded-xl border border-gray-200 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-3xl mx-auto">
                🏆
              </div>
              <h3 className="font-semibold text-sm mt-3">{aa.achievement?.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{aa.achievement?.description}</p>
              <div className="mt-2 text-xs text-emerald-600 font-medium">+{aa.achievement?.xp_reward} XP</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
