'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  OTPInput,
} from '@/components/ui'

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // Get email from session storage
    const storedEmail = sessionStorage.getItem('verifyEmail')
    if (storedEmail) {
      setEmail(storedEmail)
    } else {
      // Redirect to register if no email found
      router.push('/auth/register')
    }
  }, [router])

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (otp.length !== 6) {
      setError('Lutfen 6 haneli kodu girin')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })

      const data = await res.json()

      if (data.success) {
        // Clear stored email
        sessionStorage.removeItem('verifyEmail')
        // Redirect to role selection
        router.push('/auth/select-role')
      } else {
        setError(data.error || 'Dogrulama basarisiz')
      }
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOTP() {
    setError('')
    setResendLoading(true)

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (data.success) {
        setCountdown(60) // Start 60 second countdown
        setOtp('') // Clear the OTP input
      } else {
        setError(data.error || 'Kod gonderilemedi')
      }
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setResendLoading(false)
    }
  }

  // Mask email for display
  function maskEmail(email: string): string {
    const [name, domain] = email.split('@')
    if (!domain) return email
    const maskedName = name.slice(0, 2) + '***' + name.slice(-1)
    return `${maskedName}@${domain}`
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>E-posta Dogrulama</CardTitle>
        <CardDescription>
          {email ? (
            <>
              <span className="font-medium text-gray-900">{maskEmail(email)}</span>
              <br />
              adresine gonderilen 6 haneli kodu girin
            </>
          ) : (
            'E-posta adresinize gonderilen kodu girin'
          )}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleVerify}>
        <CardContent className="space-y-6">
          {error && (
            <div
              className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600"
              role="alert"
            >
              {error}
            </div>
          )}

          <OTPInput
            value={otp}
            onChange={setOtp}
            error={undefined}
            disabled={loading}
          />

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-500">
                Yeni kod{' '}
                <span className="font-medium text-emerald-600">{countdown}</span>{' '}
                saniye sonra gonderilebilir
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendLoading}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:text-gray-400"
              >
                {resendLoading ? 'Gonderiliyor...' : 'Kodu tekrar gonder'}
              </button>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={otp.length !== 6}
          >
            Dogrula
          </Button>

          <p className="text-center text-sm text-gray-600">
            Yanlis e-posta mi?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-emerald-600 hover:text-emerald-700"
            >
              Geri don
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
