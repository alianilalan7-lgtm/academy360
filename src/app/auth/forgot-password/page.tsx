'use client'

import { useState } from 'react'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email.trim()) {
      setError('E-posta adresi gereklidir')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Bir hata olustu. Lutfen tekrar deneyin.')
      }
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-6 w-6 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle>E-posta Gonderildi!</CardTitle>
          <CardDescription>
            Gelen kutunuzu kontrol edin. Sifre sifirlama baglantisi e-posta
            adresinize gonderildi.
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col gap-4">
          <Link href="/auth/login" className="w-full">
            <Button variant="outline" fullWidth>
              Giris sayfasina don
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Sifremi Unuttum</CardTitle>
        <CardDescription>
          E-posta adresinizi girin, size sifre sifirlama baglantisi gonderelim
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            }
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" fullWidth loading={loading}>
            Sifirlama Baglantisi Gonder
          </Button>

          <p className="text-center text-sm text-gray-600">
            <Link
              href="/auth/login"
              className="font-medium text-emerald-600 hover:text-emerald-700"
            >
              Giris sayfasina don
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
