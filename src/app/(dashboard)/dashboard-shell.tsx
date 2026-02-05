'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import type { UserRole } from '@/lib/types'

interface DashboardShellProps {
  children: React.ReactNode
  role: UserRole
  userName?: string
  orgName?: string
}

export function DashboardShell({ children, role, userName, orgName }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={role} userName={userName} orgName={orgName} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Academy360" userName={userName} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
