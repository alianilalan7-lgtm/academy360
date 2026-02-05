'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { SidebarProvider } from '@/components/dashboard/sidebar-context'
import type { UserRole } from '@/lib/types'

interface DashboardShellProps {
  children: React.ReactNode
  role: UserRole
  userName?: string
  orgName?: string
}

export function DashboardShell({ children, role, userName, orgName }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar role={role} userName={userName} orgName={orgName} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header title="Academy360" userName={userName} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
