'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSidebar } from './sidebar-context'
import { RoleSwitcher } from './role-switcher'
import { useRole } from '@/contexts/role-context'

interface HeaderProps {
  title: string
  userName?: string
}

export function Header({ title, userName }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const { toggle } = useSidebar()
  const { activeRole } = useRole()

  useEffect(() => {
    // Only admins see notification count
    if (activeRole === 'club_admin' || activeRole === 'super_admin') {
      fetch('/api/notifications?pageSize=1')
        .then(r => r.json())
        .then(d => {
          if (d.success) setUnreadCount(d.total || 0)
        })
        .catch(() => {})
    } else {
      setUnreadCount(0)
    }
  }, [activeRole])

  // Only show notification bell for admins
  const showNotifications = activeRole === 'club_admin' || activeRole === 'super_admin'

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={toggle}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg lg:hidden"
          aria-label="Menuyu ac"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Role Switcher */}
        <RoleSwitcher />

        {/* Notifications - only for admins */}
        {showNotifications && (
          <Link
            href="/dashboard/notifications"
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {/* User avatar */}
        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
          {userName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
