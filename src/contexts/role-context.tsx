'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { UserRole, Membership } from '@/lib/types'

const ROLE_COOKIE_NAME = 'academy360_active_role'
const ORG_COOKIE_NAME = 'academy360_active_org_id'

interface RoleInfo {
  role: UserRole
  orgId: string
  orgName: string
}

interface RoleContextType {
  activeRole: UserRole | null
  availableRoles: RoleInfo[]
  currentOrgId: string | null
  isLoading: boolean
  switchRole: (role: UserRole) => void
  switchOrganization: (orgId: string) => void
}

const RoleContext = createContext<RoleContextType>({
  activeRole: null,
  availableRoles: [],
  currentOrgId: null,
  isLoading: true,
  switchRole: () => {},
  switchOrganization: () => {},
})

// Turkish role labels
export const ROLE_LABELS: Record<UserRole, string> = {
  athlete: 'Sporcu',
  coach: 'Antrenor',
  club_admin: 'Kulup Yoneticisi',
  parent: 'Veli',
  super_admin: 'Super Admin',
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

interface RoleProviderProps {
  children: ReactNode
  memberships: Membership[]
  organizations: { id: string; name: string }[]
  defaultRole?: UserRole
}

export function RoleProvider({ children, memberships, organizations, defaultRole }: RoleProviderProps) {
  const [activeRole, setActiveRole] = useState<UserRole | null>(null)
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Build available roles from memberships
  const availableRoles: RoleInfo[] = memberships
    .filter(m => m.status === 'active')
    .map(m => {
      const org = organizations.find(o => o.id === m.organization_id)
      return {
        role: m.role,
        orgId: m.organization_id,
        orgName: org?.name || 'Organizasyon',
      }
    })

  const roleScopedOrgs = availableRoles.filter(r => r.role === activeRole)
  const currentOrgId = activeOrgId && roleScopedOrgs.some(r => r.orgId === activeOrgId)
    ? activeOrgId
    : roleScopedOrgs[0]?.orgId ?? null

  // Initialize active role from cookie or default
  useEffect(() => {
    const savedRole = getCookie(ROLE_COOKIE_NAME) as UserRole | null
    const savedOrgId = getCookie(ORG_COOKIE_NAME)

    // Check if saved role is valid (user still has this role)
    const isValidRole = savedRole && availableRoles.some(r => r.role === savedRole)
    const resolveOrgForRole = (role: UserRole): string | null => {
      const orgCandidates = availableRoles.filter(r => r.role === role)
      if (savedOrgId && orgCandidates.some(c => c.orgId === savedOrgId)) return savedOrgId
      return orgCandidates[0]?.orgId ?? null
    }

    if (isValidRole && savedRole) {
      const resolvedOrgId = resolveOrgForRole(savedRole)
      setActiveRole(savedRole)
      setActiveOrgId(resolvedOrgId)
      if (resolvedOrgId) setCookie(ORG_COOKIE_NAME, resolvedOrgId)
    } else if (defaultRole && availableRoles.some(r => r.role === defaultRole)) {
      const resolvedOrgId = resolveOrgForRole(defaultRole)
      setActiveRole(defaultRole)
      setActiveOrgId(resolvedOrgId)
      setCookie(ROLE_COOKIE_NAME, defaultRole)
      if (resolvedOrgId) setCookie(ORG_COOKIE_NAME, resolvedOrgId)
    } else if (availableRoles.length > 0) {
      // Fallback to first available role-org pair
      const fallback = availableRoles[0]
      setActiveRole(fallback.role)
      setActiveOrgId(fallback.orgId)
      setCookie(ROLE_COOKIE_NAME, fallback.role)
      setCookie(ORG_COOKIE_NAME, fallback.orgId)
    }

    setIsLoading(false)
  }, [availableRoles, defaultRole])

  const switchRole = useCallback((role: UserRole) => {
    const candidates = availableRoles.filter(r => r.role === role)
    if (candidates.length === 0) return

    const nextOrgId = candidates.find(c => c.orgId === activeOrgId)?.orgId ?? candidates[0].orgId
    setActiveRole(role)
    setActiveOrgId(nextOrgId)
    setCookie(ROLE_COOKIE_NAME, role)
    setCookie(ORG_COOKIE_NAME, nextOrgId)
  }, [availableRoles, activeOrgId])

  const switchOrganization = useCallback((orgId: string) => {
    if (!activeRole) return
    const isAllowed = availableRoles.some(r => r.role === activeRole && r.orgId === orgId)
    if (!isAllowed) return

    setActiveOrgId(orgId)
    setCookie(ORG_COOKIE_NAME, orgId)
    setCookie(ROLE_COOKIE_NAME, activeRole)
  }, [activeRole, availableRoles])

  return (
    <RoleContext.Provider value={{ activeRole, availableRoles, currentOrgId, isLoading, switchRole, switchOrganization }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
