'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types'
import { useSidebar } from './sidebar-context'
import { useRole, ROLE_LABELS } from '@/contexts/role-context'

interface NavItem {
  label: string
  href: string
  icon: string
}

// Unified navigation items - all routes start with /dashboard
const navItems: Record<string, NavItem[]> = {
  athlete: [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Haftalik Plan', href: '/dashboard/my-plan', icon: '📆' },
    { label: 'Egzersizler', href: '/dashboard/exercises', icon: '🏋️' },
    { label: 'Programlarim', href: '/dashboard/programs', icon: '📋' },
    { label: 'Gelisimim', href: '/dashboard/progress', icon: '📈' },
    { label: 'Grafikler', href: '/dashboard/analytics', icon: '📊' },
    { label: 'Basarimlar', href: '/dashboard/achievements', icon: '🏆' },
    { label: 'Bildirimler', href: '/dashboard/notifications/inbox', icon: '🔔' },
  ],
  coach: [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Egzersizler', href: '/dashboard/exercises', icon: '🏋️' },
    { label: 'Oyuncular', href: '/dashboard/players', icon: '👥' },
    { label: 'Karsilastir', href: '/dashboard/compare', icon: '⚖️' },
    { label: 'Haftalik Plan', href: '/dashboard/weekly-plan', icon: '📆' },
    { label: 'Olcumler', href: '/dashboard/measurements', icon: '📏' },
    { label: 'Seanslar', href: '/dashboard/sessions', icon: '📅' },
    { label: 'Grafikler', href: '/dashboard/analytics', icon: '📊' },
    { label: 'Program Ata', href: '/dashboard/assignments', icon: '📋' },
    { label: 'Bildirimler', href: '/dashboard/notifications/inbox', icon: '🔔' },
  ],
  club_admin: [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Uyeler', href: '/dashboard/members', icon: '👥' },
    { label: 'Gruplar', href: '/dashboard/groups', icon: '🏷️' },
    { label: 'Odemeler', href: '/dashboard/payments', icon: '💰' },
    { label: 'Bildirimler', href: '/dashboard/notifications', icon: '🔔' },
  ],
  parent: [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Gelisim', href: '/dashboard/progress', icon: '📈' },
    { label: 'Odemeler', href: '/dashboard/payments', icon: '💰' },
    { label: 'Bildirimler', href: '/dashboard/notifications/inbox', icon: '🔔' },
  ],
  super_admin: [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Organizasyonlar', href: '/dashboard/organizations', icon: '🏢' },
    { label: 'Tum Uyeler', href: '/dashboard/users', icon: '👥' },
    { label: 'Sistem Ayarlari', href: '/dashboard/settings', icon: '⚙️' },
  ],
}

interface SidebarProps {
  role: UserRole
  userName?: string
  orgName?: string
}

export function Sidebar({ userName, orgName }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, close } = useSidebar()
  const { activeRole, availableRoles } = useRole()

  // Use activeRole from context, fallback to prop
  const currentRole = activeRole || 'athlete'
  const items = navItems[currentRole] || navItems.athlete

  // Get current org name from available roles
  const currentOrgName = orgName || availableRoles.find(r => r.role === currentRole)?.orgName

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
          flex flex-col transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-emerald-600">Academy360</h1>
            {currentOrgName && <p className="text-sm text-gray-500 mt-1">{currentOrgName}</p>}
          </div>
          <button
            onClick={close}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg lg:hidden"
            aria-label="Menuyu kapat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map(item => {
            // For dashboard home, only match exact path
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName || 'Kullanici'}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[currentRole]}</p>
            </div>
          </div>
          <Link
            href="/api/auth/logout"
            className="mt-3 block w-full text-center py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Cikis Yap
          </Link>
        </div>
      </aside>
    </>
  )
}
