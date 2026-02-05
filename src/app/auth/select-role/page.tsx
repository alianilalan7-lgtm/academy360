'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const roles = [
  {
    id: 'athlete',
    title: 'Sporcu',
    description: 'Antrenmanlarını takip et, gelişimini izle',
    icon: '⚽',
    color: 'bg-emerald-500',
  },
  {
    id: 'coach',
    title: 'Antrenor',
    description: 'Sporcularini yonet, olcum ekle',
    icon: '📋',
    color: 'bg-blue-500',
  },
  {
    id: 'parent',
    title: 'Veli',
    description: 'Cocugunuzun gelisimini takip edin',
    icon: '👨‍👩‍👦',
    color: 'bg-purple-500',
  },
]

export default function SelectRolePage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [step, setStep] = useState<'role' | 'org'>('role')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit() {
    if (!selectedRole) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/select-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          organizationName: orgName || undefined,
          organizationSlug: orgSlug || undefined,
          inviteCode: inviteCode || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        if (selectedRole === 'athlete') router.push('/athlete')
        else if (selectedRole === 'coach') router.push('/coach')
        else router.push('/parent')
      } else {
        setError(data.error || 'Bir hata olustu')
      }
    } catch {
      setError('Baglanti hatasi')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'org') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kulubunuzu Secin</h1>
          <p className="text-gray-500 mb-6">Mevcut bir kulube katilabilir veya yeni olusturabilirsiniz.</p>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Davet Kodu (varsa)</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="XXXX-XXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400">veya</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kulup Slug (mevcut kulup)</label>
              <input
                type="text"
                value={orgSlug}
                onChange={e => setOrgSlug(e.target.value)}
                placeholder="kulup-adi"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {selectedRole === 'coach' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-gray-400">veya yeni olustur</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Kulup Adi</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="Academy360 Spor Kulubu"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep('role')}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Geri
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (!inviteCode && !orgSlug && !orgName)}
              className="flex-1 py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              {loading ? 'Yukleniyor...' : 'Devam Et'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Rolunuzu Secin</h1>
        <p className="text-gray-500 mb-6">Academy360&apos;da nasil bir rol almak istiyorsunuz?</p>

        <div className="space-y-3">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selectedRole === role.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full ${role.color} flex items-center justify-center text-2xl`}>
                {role.icon}
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">{role.title}</div>
                <div className="text-sm text-gray-500">{role.description}</div>
              </div>
              {selectedRole === role.id && (
                <div className="ml-auto w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep('org')}
          disabled={!selectedRole}
          className="w-full mt-6 py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Devam Et
        </button>
      </div>
    </div>
  )
}
