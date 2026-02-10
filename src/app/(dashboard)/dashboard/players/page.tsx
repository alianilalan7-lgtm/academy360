'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'
import { PanelEmptyState, PanelInlineAlert, PanelPageSkeleton } from '@/components/ui/panel-states'

interface FeedbackMessage {
  type: '' | 'success' | 'error' | 'info'
  text: string
  actionHref?: string
  actionLabel?: string
}

interface AthleteListItem {
  id: string
  user_profile?: {
    full_name?: string | null
  } | null
  position?: string | null
  jersey_number?: number | null
  current_level?: number | null
  total_xp?: number | null
}

interface MeResponse {
  data?: {
    memberships?: Array<{
      organization_id?: string | null
    }>
  }
}

interface AthletesResponse {
  success: boolean
  data?: AthleteListItem[]
  error?: string
}

interface RegisterAthleteResponse {
  success: boolean
  data?: AthleteListItem
  error?: string
}

export default function PlayersPage() {
  const { activeRole, currentOrgId, isLoading: roleLoading } = useRole()
  const [players, setPlayers] = useState<AthleteListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState<FeedbackMessage>({ type: '', text: '' })
  const [showAddModal, setShowAddModal] = useState(false)

  const canView = activeRole === 'coach' || activeRole === 'club_admin'

  const loadPlayers = useCallback(async () => {
    try {
      setLoadError('')
      let orgId = currentOrgId
      if (!orgId) {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json() as MeResponse
        orgId = me.data?.memberships?.[0]?.organization_id
      }
      if (!orgId) {
        setLoadError('Organizasyon bilgisi bulunamadi.')
        return
      }

      const res = await fetch(`/api/athletes?organizationId=${orgId}&pageSize=50`)
      const data = await res.json() as AthletesResponse
      if (data.success) {
        setPlayers(data.data || [])
      } else {
        setLoadError(data.error || 'Sporcular yuklenemedi.')
      }
    } catch {
      setLoadError('Sporcular yuklenemedi. Lutfen sayfayi yenileyin.')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => {
    if (!canView || roleLoading) return
    loadPlayers()
  }, [canView, loadPlayers, roleLoading])

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  if (!canView) {
    return <AccessDenied requiredRoles={['coach', 'club_admin']} />
  }

  const filtered = players.filter(p =>
    !search || p.user_profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <PanelPageSkeleton rows={4} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Oyuncular</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Oyuncu Ekle
        </button>
      </div>

      {message.text ? (
        <PanelInlineAlert
          type={message.type === 'error' ? 'error' : message.type === 'success' ? 'success' : 'info'}
          message={message.text}
          actionHref={message.actionHref}
          actionLabel={message.actionLabel}
        />
      ) : null}

      {loadError ? <PanelInlineAlert type="error" message={loadError} /> : null}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-700">
          Bu listeden sececegin sporcuya eklenen notlar, puanlar ve atamalar sporcu panelindeki
          <span className="font-semibold"> Koc Guncellemeleri</span> bolumune yansir.
        </p>
      </div>

      <input
        type="text"
        placeholder="Oyuncu ara..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />

      {filtered.length === 0 ? (
        players.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-gray-500 mb-4">Henuz sporcu yok</div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Ilk Oyuncuyu Ekle
            </button>
          </div>
        ) : (
          <PanelEmptyState
            icon="🔎"
            title="Aramaya uygun sporcu bulunamadi"
            description="Arama metnini degistirip tekrar deneyebilirsin."
          />
        )
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/players/${p.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700">
                {p.user_profile?.full_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{p.user_profile?.full_name || 'Isim yok'}</div>
                <div className="text-sm text-gray-500">{p.position || 'Pozisyon belirtilmemis'} · #{p.jersey_number || '-'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-emerald-600">Lvl {p.current_level || 1}</div>
                <div className="text-xs text-gray-400">{p.total_xp || 0} XP</div>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddPlayerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(createdAthlete) => {
            const athleteName = createdAthlete?.user_profile?.full_name || 'Sporcu'
            const athleteId = createdAthlete?.id
            setMessage({
              type: 'success',
              text: `${athleteName} basariyla eklendi.`,
              actionHref: athleteId ? `/dashboard/players/${athleteId}` : undefined,
              actionLabel: athleteId ? 'Sporcu profiline git' : undefined,
            })
            setShowAddModal(false)
            setLoading(true)
            loadPlayers()
          }}
        />
      )}
    </div>
  )
}

function AddPlayerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (createdAthlete: AthleteListItem) => void }) {
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [dominantFoot, setDominantFoot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/athletes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          position: position || null,
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
          birthDate: birthDate || null,
          dominantFoot: dominantFoot || null,
        }),
      })

      const data = await res.json() as RegisterAthleteResponse

      if (data.success && data.data) {
        onSuccess(data.data)
      } else {
        setError(data.error || 'Bir hata olustu')
      }
    } catch {
      setError('Baglanti hatasi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Yeni Oyuncu Ekle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Oyuncu adi"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pozisyon</label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
              >
                <option value="">Seciniz</option>
                <option value="Kaleci">Kaleci</option>
                <option value="Defans">Defans</option>
                <option value="Orta Saha">Orta Saha</option>
                <option value="Forvet">Forvet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma No</label>
              <input
                type="number"
                value={jerseyNumber}
                onChange={e => setJerseyNumber(e.target.value)}
                placeholder="10"
                min="0"
                max="999"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dogum Tarihi</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baskın Ayak</label>
              <select
                value={dominantFoot}
                onChange={e => setDominantFoot(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
              >
                <option value="">Seciniz</option>
                <option value="right">Sag</option>
                <option value="left">Sol</option>
                <option value="both">Her Ikisi</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Iptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors"
            >
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
