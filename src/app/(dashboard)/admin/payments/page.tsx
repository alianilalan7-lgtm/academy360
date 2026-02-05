'use client'

import { useEffect, useState } from 'react'

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const url = statusFilter === 'all'
          ? '/api/fees/payments'
          : `/api/fees/payments?status=${statusFilter}`

        const res = await fetch(url)
        const data = await res.json()
        if (data.success) setPayments(data.data || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [statusFilter])

  async function markAsPaid(paymentId: string) {
    try {
      const res = await fetch(`/api/fees/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      const data = await res.json()
      if (data.success) {
        setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid', paid_date: new Date().toISOString().split('T')[0] } : p))
      }
    } catch {}
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    refunded: 'bg-blue-100 text-blue-700',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Bekliyor', paid: 'Odendi', overdue: 'Gecikli', cancelled: 'Iptal', refunded: 'Iade',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Aidat Yonetimi</h1>
      </div>

      <div className="flex gap-2">
        {['all', 'pending', 'paid', 'overdue'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setLoading(true) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'Tumu' : statusLabels[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />)}</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Odeme kaydi bulunamadi</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Sporcu</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tutar</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Son Tarih</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Islem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{p.athlete?.user_profile?.full_name || '-'}</td>
                  <td className="py-3 px-4 text-sm font-medium">{p.amount} {p.currency}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{p.due_date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                      {statusLabels[p.status] || p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {p.status === 'pending' || p.status === 'overdue' ? (
                      <button
                        onClick={() => markAsPaid(p.id)}
                        className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        Odendi Isaretle
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
