import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Academy360 - Giris',
  description: 'Academy360 sporcu yonetim platformuna giris yapin',
}

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-200 opacity-40 blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Academy360</h1>
          <p className="mt-1 text-sm text-gray-500">Sporcu Yonetim Platformu</p>
        </div>

        {/* Auth Card Container */}
        <div className="w-full max-w-md">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Academy360. Tum haklar saklidir.</p>
        </div>
      </div>
    </div>
  )
}
