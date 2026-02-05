import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (!user.profile?.onboarding_completed) {
    redirect('/auth/select-role')
  }

  return (
    <DashboardShell
      role={user.currentRole || 'athlete'}
      userName={user.profile?.full_name || user.email}
      orgName={undefined}
    >
      {children}
    </DashboardShell>
  )
}
