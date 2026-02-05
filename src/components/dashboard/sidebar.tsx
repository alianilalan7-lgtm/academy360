'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types'

interface NavItem {
  label: string
  href: string
  icon: string
}

const navItems: Record<string, NavItem[]> = {
  athlete: [
    { label: 'Dashboard', href: '/athlete', icon: '🏠' },
    { label: 'Programlarim', href: '/athlete/programs', icon: '📋' },
    { label: 'Gelisimim', href: '/athlete/progress', icon: '📈' },
    { label: 'Basarimlar', href: '/athlete/achievements', icon: '🏆' },
  ],
  coach: [
    { label: 'Dashboard', href: '/coach', icon: '🏠' },
    { label: 'Oyuncular', href: '/coach/players', icon: '👥' },
    { label: 'Olcumler', href: '/coach/measurements', icon: '📏' },
    { label: 'Seanslar', href: '/coach/sessions', icon: '📅' },
    { label: 'Program Ata', href: '/coach/assignments', icon: '📋' },
  ],
  club_admin: [
    { label: 'Dashboard', href: '/admin', icon: '🏠' },
    { label: 'Uyeler', href: '/admin/members', icon: '👥' },
    { label: 'Gruplar', href: '/admin/groups', icon: '🏷️' },
    { label: 'Odemeler', href: '/admin/payments', icon: '💰' },
    { label: 'Bildirimler', href: '/admin/notifications', icon: '🔔' },
  ],
  parent: [
    { label: 'Dashboard', href: '/parent', icon: '🏠' },
    { label: 'Gelisim', href: '/parent/progress', icon: '📈' },
    { label: 'Odemeler', href: '/parent/payments', icon: '💰' },
  ],
}

interface SidebarProps {
  role: UserRole
  userName?: string
  orgName?: string
}

export function Sidebar({ role, userName, orgName }: SidebarProps) {
  const pathname = usePathname()
  const items = navItems[role] || navItems.athlete

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-emerald-600">Academy360</h1>
        {orgName && <p className="text-sm text-gray-500 mt-1">{orgName}</p>}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
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

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName || 'Kullanici'}</p>
            <p className="text-xs text-gray-500 capitalize">{role.replace('_', ' ')}</p>
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
  )
}
