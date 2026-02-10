'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'
import { PanelEmptyState, PanelInlineAlert, PanelPageSkeleton } from '@/components/ui/panel-states'
import { getAssignmentStatusMeta } from '@/lib/status'
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
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setError('')
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) {
          setError(me.error || 'Kullanici bilgisi yuklenemedi')
          return
        }

        const athleteProfiles = me.data.athleteProfiles || []
        const athleteProfile = athleteProfiles[0]
        if (!athleteProfile) {
          setError('Sporcu profili bulunamadi')
          return
        }

        const res = await fetch(`/api/assignments?athlete_id=${athleteProfile.id}`)
        const data = await res.json()
        if (data.success) {
          setPrograms(data.data || [])
        } else {
          setError(data.error || 'Programlar yuklenemedi')
        }
      } catch {
        setError('Programlar yuklenemedi')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ...

  if (loading) {
    return <PanelPageSkeleton rows={3} />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Programlarim</h1>

      {error ? (
        <PanelInlineAlert type="error" message={error} />
      ) : programs.length === 0 ? (
        <PanelEmptyState
          icon="📋"
          title="Henuz atanmis program yok"
          description="Kocun sana yeni program atadiginda burada listelenecek."
          actionHref="/dashboard/my-plan"
          actionLabel="Bugunun planina git"
        />
      ) : (
        <div className="space-y-3">
          {programs.map((ap: any) => {
            const assignmentStatus = getAssignmentStatusMeta(ap.status)
            return (
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
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${assignmentStatus.className}`}>
                  {assignmentStatus.label}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${ap.progress_percentage || 0}%` }} />
                </div>
                <span className="text-sm text-gray-500">{ap.progress_percentage || 0}%</span>
              </div>
              </Link>
            )
          })}
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
    return <PanelPageSkeleton rows={3} />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Programlar</h1>

      {programs.length === 0 ? (
        <PanelEmptyState
          icon="📋"
          title="Henuz program olusturulmamis"
          description="Yeni bir program olusturup sporculara atayabilirsin."
          actionHref="/dashboard/assignments"
          actionLabel="Atama ekranina git"
        />
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
