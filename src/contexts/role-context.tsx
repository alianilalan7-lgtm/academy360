'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { UserRole, Membership } from '@/lib/types'

const ROLE_COOKIE_NAME = 'academy360_active_role'

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
}

const RoleContext = createContext<RoleContextType>({
  activeRole: null,
  availableRoles: [],
  currentOrgId: null,
  isLoading: true,
  switchRole: () => {},
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
  return match ? match[2] : null
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

interface RoleProviderProps {
  children: ReactNode
  memberships: Membership[]
  organizations: { id: string; name: string }[]
  defaultRole?: UserRole
}

export function RoleProvider({ children, memberships, organizations, defaultRole }: RoleProviderProps) {
  const [activeRole, setActiveRole] = useState<UserRole | null>(null)
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

  // Get current organization ID based on active role
  const currentOrgId = availableRoles.find(r => r.role === activeRole)?.orgId ?? null

  // Initialize active role from cookie or default
  useEffect(() => {
    const savedRole = getCookie(ROLE_COOKIE_NAME) as UserRole | null

    // Check if saved role is valid (user still has this role)
    const isValidRole = savedRole && availableRoles.some(r => r.role === savedRole)

    if (isValidRole) {
      setActiveRole(savedRole)
    } else if (defaultRole && availableRoles.some(r => r.role === defaultRole)) {
      setActiveRole(defaultRole)
      setCookie(ROLE_COOKIE_NAME, defaultRole)
    } else if (availableRoles.length > 0) {
      // Fallback to first available role
      setActiveRole(availableRoles[0].role)
      setCookie(ROLE_COOKIE_NAME, availableRoles[0].role)
    }

    setIsLoading(false)
  }, [availableRoles, defaultRole])

  const switchRole = useCallback((role: UserRole) => {
    // Only allow switching to roles user actually has
    if (availableRoles.some(r => r.role === role)) {
      setActiveRole(role)
      setCookie(ROLE_COOKIE_NAME, role)
    }
  }, [availableRoles])

  return (
    <RoleContext.Provider value={{ activeRole, availableRoles, currentOrgId, isLoading, switchRole }}>
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
