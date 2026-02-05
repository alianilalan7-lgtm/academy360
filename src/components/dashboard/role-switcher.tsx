'use client'

import { useState, useRef, useEffect } from 'react'
import { useRole, ROLE_LABELS } from '@/contexts/role-context'

export function RoleSwitcher() {
  const { activeRole, availableRoles, isLoading, switchRole } = useRole()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Don't show if user has only one role
  if (availableRoles.length <= 1) {
    return null
  }

  if (isLoading || !activeRole) {
    return (
      <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
    )
  }

  const currentLabel = ROLE_LABELS[activeRole] || activeRole

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="max-w-[120px] truncate">{currentLabel}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          role="listbox"
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Rol Degistir
            </div>
            {availableRoles.map((roleInfo) => {
              const isActive = roleInfo.role === activeRole
              return (
                <button
                  key={`${roleInfo.role}-${roleInfo.orgId}`}
                  onClick={() => {
                    switchRole(roleInfo.role)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{ROLE_LABELS[roleInfo.role]}</div>
                    <div className="text-xs text-gray-500">{roleInfo.orgName}</div>
                  </div>
                  {isActive && (
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
