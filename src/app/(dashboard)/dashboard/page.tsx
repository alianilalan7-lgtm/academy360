'use client'

import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

// Import role-specific dashboard content components
import { AdminDashboardContent } from './_components/admin-dashboard'
import { CoachDashboardContent } from './_components/coach-dashboard'
import { AthleteDashboardContent } from './_components/athlete-dashboard'
import { ParentDashboardContent } from './_components/parent-dashboard'
import { SuperAdminDashboardContent } from './_components/super-admin-dashboard'

export default function UnifiedDashboardPage() {
  const { activeRole, isLoading } = useRole()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  switch (activeRole) {
    case 'club_admin':
      return <AdminDashboardContent />
    case 'coach':
      return <CoachDashboardContent />
    case 'athlete':
      return <AthleteDashboardContent />
    case 'parent':
      return <ParentDashboardContent />
    case 'super_admin':
      return <SuperAdminDashboardContent />
    default:
      return <AccessDenied message="Gecersiz rol. Lutfen tekrar giris yapin." />
  }
}
