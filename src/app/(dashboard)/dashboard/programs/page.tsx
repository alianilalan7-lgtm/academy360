'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'
import { ProgramCardSkeleton } from '@/components/ui/skeleton'
export default function ProgramsPage() {
  const { activeRole, isLoading: roleLoading } = useRole()

  // Athlete sees their assigned programs, Coach sees all programs
  const canView = activeRole === 'athlete' || activeRole === 'coach'
  const isAthlete = activeRole === 'athlete'

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['athlete', 'coach']} />
  }

  if (isAthlete) {
    return <AthleteProgramsContent />
  }

  return <CoachProgramsContent />
}

function AthleteProgramsContent() {
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) return

        const athleteProfiles = me.data.athleteProfiles || []
        const athleteProfile = athleteProfiles[0]
        if (!athleteProfile) return

        const res = await fetch(`/api/assignments?athlete_id=${athleteProfile.id}`)
        const data = await res.json()
        if (data.success) setPrograms(data.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusColors: Record<string, string> = {
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  const statusLabels: Record<string, string> = {
    assigned: 'Atandi',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandi',
    cancelled: 'Iptal',
  }



  // ...

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <ProgramCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Programlarim</h1>

      {programs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500">Henuz atanmis program yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((ap: any) => (
            <Link
              key={ap.id}
              href={`/dashboard/programs/${ap.id}`}
              className="block bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{ap.program?.title || 'Program'}</h3>
                  <p className="text-sm text-gray-500 mt-1">{ap.program?.category}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ap.status] || 'bg-gray-100'}`}>
                  {statusLabels[ap.status] || ap.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${ap.progress_percentage || 0}%` }} />
                </div>
                <span className="text-sm text-gray-500">{ap.progress_percentage || 0}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function CoachProgramsContent() {
  const { currentOrgId } = useRole()
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        let orgId = currentOrgId
        if (!orgId) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          orgId = me.data?.memberships?.[0]?.organization_id
        }
        if (!orgId) return

        const res = await fetch(`/api/programs?organization_id=${orgId}`)
        const data = await res.json()
        if (data.success) setPrograms(data.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrgId])

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Programlar</h1>

      {programs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500">Henuz program olusturulmamis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((p: any) => (
            <Link
              key={p.id}
              href={`/dashboard/programs/${p.id}`}
              className="block bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{p.category || 'Genel'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  {p.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              {p.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
