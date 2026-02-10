import { createClient } from '@/lib/supabase/server'
import type { UserRole, Membership, UserProfile } from '@/lib/types'
import { cookies } from 'next/headers'

const ROLE_COOKIE_NAME = 'academy360_active_role'
const ORG_COOKIE_NAME = 'academy360_active_org_id'
const USER_ROLES: UserRole[] = ['athlete', 'coach', 'club_admin', 'parent', 'super_admin']

function parseRoleCookie(value: string | undefined): UserRole | null {
  if (!value) return null
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null
}

function resolveCurrentMembership(
  memberships: Membership[],
  preferredRole: UserRole | null,
  preferredOrgId: string | null
): Membership | null {
  if (memberships.length === 0) return null

  if (preferredRole && preferredOrgId) {
    const exact = memberships.find(
      m => m.role === preferredRole && m.organization_id === preferredOrgId
    )
    if (exact) return exact
  }

  if (preferredRole) {
    const sameRole = memberships.find(m => m.role === preferredRole)
    if (sameRole) return sameRole
  }

  if (preferredOrgId) {
    const sameOrg = memberships.find(m => m.organization_id === preferredOrgId)
    if (sameOrg) return sameOrg
  }

  return memberships[0]
}

export interface AuthUser {
  id: string
  email: string
  profile: UserProfile | null
  memberships: Membership[]
  currentOrganizationId: string | null
  currentRole: UserRole | null
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const cookieStore = await cookies()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Fetch user profile with memberships
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })

  const preferredRole = parseRoleCookie(cookieStore.get(ROLE_COOKIE_NAME)?.value)
  const preferredOrgId = cookieStore.get(ORG_COOKIE_NAME)?.value ?? null
  const activeMembership = resolveCurrentMembership(memberships ?? [], preferredRole, preferredOrgId)

  const currentOrgId = activeMembership?.organization_id ?? null
  const currentRole = activeMembership?.role ?? null

  return {
    id: user.id,
    email: user.email!,
    profile: profile ?? null,
    memberships: memberships ?? [],
    currentOrganizationId: currentOrgId,
    currentRole: currentRole,
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()

  if (!user.currentRole || !allowedRoles.includes(user.currentRole)) {
    throw new Error('Forbidden: insufficient permissions')
  }

  return user
}

export async function requireOrgMembership(organizationId: string): Promise<AuthUser> {
  const user = await requireAuth()

  const isMember = user.memberships.some(
    m => m.organization_id === organizationId && m.status === 'active'
  )

  if (!isMember) {
    throw new Error('Forbidden: not a member of this organization')
  }

  return user
}

export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user.memberships.some(m => m.role === role && m.status === 'active')
}

export function isAdmin(user: AuthUser): boolean {
  return hasRole(user, 'club_admin') || hasRole(user, 'super_admin')
}

export function isCoach(user: AuthUser): boolean {
  return hasRole(user, 'coach')
}

export function isAthlete(user: AuthUser): boolean {
  return hasRole(user, 'athlete')
}

export function isParent(user: AuthUser): boolean {
  return hasRole(user, 'parent')
}
