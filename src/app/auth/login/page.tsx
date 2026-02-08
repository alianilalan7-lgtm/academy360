'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('registered') === 'true') {
      setJustRegistered(true)
    }

    // Store role hint from URL for post-login redirect
    const roleParam = params.get('role')
    if (roleParam && ['athlete', 'coach', 'club_admin'].includes(roleParam)) {
      localStorage.setItem('preferred_role', roleParam)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Client-side validation
    if (!email.trim()) {
      setError('E-posta adresi gereklidir')
      setLoading(false)
      return
    }

    if (!password) {
      setError('Sifre gereklidir')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (data.success) {
        // Check if there's a preferred role to switch to
        const preferredRole = localStorage.getItem('preferred_role')
        if (preferredRole) {
          // Store in cookie for RoleContext to pick up
          document.cookie = `academy360_active_role=${preferredRole}; path=/; max-age=${365 * 24 * 60 * 60}`
          localStorage.removeItem('preferred_role') // Clean up
        }

        // Redirect to unified dashboard
        router.push('/dashboard')
      } else {
        setError(data.error || 'Giris yapilamadi')
      }
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Hosgeldiniz</CardTitle>
        <CardDescription>
          Hesabiniza giris yapin
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {justRegistered && (
            <div
              className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
              role="status"
            >
              Kayit basarili! Simdi giris yapabilirsiniz.
            </div>
          )}

          {error && (
            <div
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
              role="alert"
            >
              {error}
            </div>
          )}

          <Input
            label="E-posta Adresi"
            type="email"
            name="email"
            placeholder="ornek@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            leftIcon={
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            }
          />

          <Input
            label="Sifre"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Sifrenizi girin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            leftIcon={
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            }
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-600">Beni hatirla</span>
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Sifremi unuttum
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" fullWidth loading={loading}>
            Giris Yap
          </Button>

          <p className="text-center text-sm text-gray-600">
            Hesabiniz yok mu?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-emerald-600 hover:text-emerald-700"
            >
              Kayit olun
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
