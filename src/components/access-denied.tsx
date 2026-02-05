'use client'

import Link from 'next/link'
import { useRole, ROLE_LABELS } from '@/contexts/role-context'

interface AccessDeniedProps {
  requiredRoles?: string[]
  message?: string
}

export function AccessDenied({ requiredRoles, message }: AccessDeniedProps) {
  const { activeRole } = useRole()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-2">Erisim Engellendi</h1>

      <p className="text-gray-500 max-w-md mb-6">
        {message || 'Bu sayfaya erisim yetkiniz bulunmamaktadir.'}
      </p>

      {requiredRoles && requiredRoles.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2">Gerekli roller:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {requiredRoles.map((role) => (
              <span
                key={role}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
              >
                {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeRole && (
        <p className="text-sm text-gray-400 mb-6">
          Mevcut rolunuz: <span className="font-medium">{ROLE_LABELS[activeRole]}</span>
        </p>
      )}

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Ana Sayfaya Don
      </Link>
    </div>
  )
}
