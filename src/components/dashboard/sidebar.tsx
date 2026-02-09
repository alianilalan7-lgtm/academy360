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
  userAvatar?: string | null
  orgName?: string
}

export function Sidebar({ userName, userAvatar, orgName }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, isCollapsed, close, toggleCollapse } = useSidebar()
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 
          ${isCollapsed ? 'w-20' : 'w-64'}
          flex flex-col transform transition-all duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          
          /* Glass morphism effect */
          bg-white/80 backdrop-blur-xl
          border-r border-white/20
          shadow-[0_8px_32px_rgba(0,0,0,0.1)]
        `}
      >
        {/* Header */}
        <div className={`p-4 border-b border-gray-200/50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Academy360
              </h1>
              {currentOrgName && <p className="text-sm text-gray-500 mt-1">{currentOrgName}</p>}
            </div>
          )}

          {/* Collapse toggle button - desktop */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
            aria-label={isCollapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {/* Close button - mobile */}
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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
                title={isCollapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
                  }
                `}
              >
                <span className={`${isCollapsed ? 'text-xl' : 'text-lg'}`}>{item.icon}</span>
                {!isCollapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200/50 bg-white/40">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName || 'Kullanici'}</p>
                <p className="text-xs text-gray-500">{ROLE_LABELS[currentRole]}</p>
              </div>
            )}
          </div>
          <Link
            href="/api/auth/logout"
            className={`
              mt-3 flex items-center justify-center gap-2 py-2 text-sm text-red-600 
              hover:bg-red-50 rounded-lg transition-colors
              ${isCollapsed ? 'px-2' : 'w-full'}
            `}
            title={isCollapsed ? 'Çıkış Yap' : undefined}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && 'Cikis Yap'}
          </Link>
        </div>
      </aside>
    </>
  )
}
