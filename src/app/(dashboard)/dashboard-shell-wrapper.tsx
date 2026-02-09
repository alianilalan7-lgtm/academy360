'use client'

import { SidebarProvider } from '@/components/dashboard/sidebar-context'
import { RoleProvider } from '@/contexts/role-context'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { useRole } from '@/contexts/role-context'
import type { UserRole, Membership } from '@/lib/types'

interface DashboardShellWrapperProps {
  children: React.ReactNode
  userName?: string
  userAvatar?: string | null
  memberships: Membership[]
  organizations: { id: string; name: string }[]
  defaultRole: UserRole
}

function DashboardContent({ children, userName, userAvatar }: { children: React.ReactNode; userName?: string; userAvatar?: string | null }) {
  const { activeRole, isLoading } = useRole()

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={activeRole || 'athlete'} userName={userName} userAvatar={userAvatar} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Academy360" userName={userName} userAvatar={userAvatar} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export function DashboardShellWrapper({
  children,
  userName,
  userAvatar,
  memberships,
  organizations,
  defaultRole,
}: DashboardShellWrapperProps) {
  return (
    <RoleProvider
      memberships={memberships}
      organizations={organizations}
      defaultRole={defaultRole}
    >
      <SidebarProvider>
        <DashboardContent userName={userName} userAvatar={userAvatar}>
          {children}
        </DashboardContent>
      </SidebarProvider>
    </RoleProvider>
  )
}
