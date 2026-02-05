'use client'

import { useState } from 'react'
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

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const router = useRouter()

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validateForm(): boolean {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gereklidir'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gereklidir'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Gecerli bir e-posta adresi girin'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon numarasi gereklidir'
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Gecerli bir telefon numarasi girin'
    }

    if (!formData.password) {
      newErrors.password = 'Sifre gereklidir'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Sifre en az 8 karakter olmalidir'
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Sifre en az bir buyuk harf, bir kucuk harf ve bir rakam icermelidir'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Sifre tekrari gereklidir'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Sifreler eslesmedi'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGeneralError('')

    if (!validateForm()) {
      return
    }

    if (!acceptTerms) {
      setGeneralError('Kullanim sartlarini kabul etmelisiniz')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          email: formData.email,
          phone: formData.phone ? `+90${formData.phone.replace(/\s/g, '').replace(/^0/, '')}` : undefined,
          password: formData.password,
          kvkkConsent: acceptTerms,
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Store email for OTP verification
        sessionStorage.setItem('verifyEmail', formData.email)
        router.push('/auth/verify-otp')
      } else {
        setGeneralError(data.error || 'Kayit yapilamadi')
      }
    } catch {
      setGeneralError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Hesap Olusturun</CardTitle>
        <CardDescription>
          Academy360'a katilmak icin bilgilerinizi girin
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {generalError && (
            <div
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
              role="alert"
            >
              {generalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ad"
              type="text"
              name="firstName"
              placeholder="Adiniz"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              error={errors.firstName}
              disabled={loading}
              autoComplete="given-name"
            />

            <Input
              label="Soyad"
              type="text"
              name="lastName"
              placeholder="Soyadiniz"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              error={errors.lastName}
              disabled={loading}
              autoComplete="family-name"
            />
          </div>

          <Input
            label="E-posta Adresi"
            type="email"
            name="email"
            placeholder="ornek@email.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
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
            label="Telefon Numarasi"
            type="tel"
            name="phone"
            placeholder="5XX XXX XX XX"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={errors.phone}
            disabled={loading}
            autoComplete="tel"
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
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            }
          />

          <Input
            label="Sifre"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="En az 8 karakter"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            disabled={loading}
            autoComplete="new-password"
            hint="Sifreniz en az 8 karakter olmalidir"
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

          <Input
            label="Sifre Tekrari"
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Sifrenizi tekrar girin"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            disabled={loading}
            autoComplete="new-password"
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            }
          />

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">
              <Link
                href="/terms"
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Kullanim Sartlari
              </Link>
              'ni ve{' '}
              <Link
                href="/privacy"
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Gizlilik Politikasi
              </Link>
              'ni okudum ve kabul ediyorum.
            </span>
          </label>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" fullWidth loading={loading}>
            Kayit Ol
          </Button>

          <p className="text-center text-sm text-gray-600">
            Zaten hesabiniz var mi?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-emerald-600 hover:text-emerald-700"
            >
              Giris yapin
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
