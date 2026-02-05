'use client'

import { useEffect, useState } from 'react'

export default function AdminNotifications() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [orgId, setOrgId] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.success) setOrgId(d.data.memberships?.[0]?.organization_id || '')
      })
      .catch(() => {})
  }, [])

  const roles = [
    { id: 'athlete', label: 'Sporcular' },
    { id: 'coach', label: 'Antrenorler' },
    { id: 'parent', label: 'Veliler' },
  ]

  function toggleRole(role: string) {
    setTargetRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !body || !orgId) return

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          title,
          body,
          type: 'general',
          priority,
          targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: `Bildirim gonderildi! (${data.data.recipientCount} alici)` })
        setTitle('')
        setBody('')
        setTargetRoles([])
      } else {
        setMessage({ type: 'error', text: data.error || 'Hata olustu' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Baglanti hatasi' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Bildirim Gonder</h1>

      <form onSubmit={handleSubmit} className="max-w-lg bg-white p-6 rounded-xl border border-gray-200 space-y-4">
        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Baslik</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Bildirim basligi"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            placeholder="Bildirim icerigi..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Oncelik</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="low">Dusuk</option>
            <option value="normal">Normal</option>
            <option value="high">Yuksek</option>
            <option value="urgent">Acil</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Roller</label>
          <div className="flex gap-2">
            {roles.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  targetRoles.includes(role.id) ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
          {targetRoles.length === 0 && <p className="text-xs text-gray-400 mt-1">Sec bos birakilirsa tum uyeler</p>}
        </div>

        <button
          type="submit"
          disabled={submitting || !title || !body}
          className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Gonderiliyor...' : 'Bildirimi Gonder'}
        </button>
      </form>
    </div>
  )
}
