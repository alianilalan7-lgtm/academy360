import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DashboardShellWrapper } from './dashboard-shell-wrapper'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (!user.profile?.onboarding_completed) {
    redirect('/auth/select-role')
  }

  // Fetch organizations for the memberships
  const supabase = await createClient()
  const orgIds = user.memberships.map(m => m.organization_id)

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name')
    .in('id', orgIds)

  return (
    <DashboardShellWrapper
      userName={user.profile?.full_name || user.email}
      userAvatar={user.profile?.avatar_url}
      memberships={user.memberships}
      organizations={organizations || []}
      defaultRole={user.currentRole || 'athlete'}
    >
      {children}
    </DashboardShellWrapper>
  )
}
