'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

export default function AchievementsPage() {
  const { activeRole, isLoading: roleLoading } = useRole()
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const canView = activeRole === 'athlete'

  useEffect(() => {
    if (roleLoading) return
    if (!canView) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        console.log('Auth me response:', me)
        if (!me.success) {
          setLoading(false)
          return
        }

        const athleteProfiles = me.data.athleteProfiles || []
        const athleteProfile = athleteProfiles[0]
        console.log('Athlete profile:', athleteProfile)
        if (!athleteProfile) {
          setLoading(false)
          return
        }

        const res = await fetch(`/api/athletes/${athleteProfile.id}/achievements`)
        const data = await res.json()
        console.log('Achievements response:', data)
        if (data.success) setAchievements(data.data || [])
      } catch (error) {
        console.error('Error loading achievements:', error)
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
    return <AccessDenied requiredRoles={['athlete']} />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Basarimlarim</h1>

      {achievements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-gray-500">Henuz basarim kazanilmadi.</p>
          <p className="text-sm text-gray-400 mt-1">Antrenmanlarini tamamlayarak basarimlar kazan!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((a: any) => (
            <div
              key={a.id}
              className="bg-white p-5 rounded-xl border border-gray-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                  {a.achievement?.icon || '🏆'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{a.achievement?.name || 'Basarim'}</h3>
                  {a.achievement?.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.achievement.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      +{a.achievement?.xp_reward || 0} XP
                    </span>
                    <span className="text-xs text-gray-400">
                      {a.earned_at ? new Date(a.earned_at).toLocaleDateString('tr-TR') : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
