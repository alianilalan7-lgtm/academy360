'use client'

import { useEffect, useState } from 'react'

interface Payment {
  id: string
  athlete_id: string
  fee_plan_id: string | null
  amount: number
  currency: string
  due_date: string
  status: string
  payment_method: string | null
  paid_date: string | null
  notes: string | null
  athlete?: {
    id: string
    user_id: string
    user_profile?: {
      id: string
      full_name: string | null
      email: string
    }
  }
  fee_plan?: {
    id: string
    name: string
    billing_cycle: string | null
  }
}

export default function ParentPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        const me = await meRes.json()
        if (!me.success) {
          setError('Oturum bilgisi alinamadi')
          return
        }

        const orgId = me.data.memberships?.[0]?.organization_id
        if (!orgId) {
          setError('Organizasyon bulunamadi')
          return
        }

        let url = `/api/fees/payments?organization_id=${orgId}`
        if (statusFilter !== 'all') {
          url += `&status=${statusFilter}`
        }

        const res = await fetch(url)
        const data = await res.json()
        if (data.success) {
          setPayments(data.data || [])
        }
      } catch {
        setError('Odeme verileri yuklenirken bir hata olustu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [statusFilter])

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    refunded: 'bg-blue-100 text-blue-700',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Bekliyor',
    paid: 'Odendi',
    overdue: 'Gecikli',
    cancelled: 'Iptal',
    refunded: 'Iade',
  }

  // Calculate summary from all payments (not filtered)
  const allPayments = payments
  const totalDue = allPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalPaid = allPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)
  const totalPending = allPayments
    .filter(p => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0)

  const currency = payments.length > 0 ? payments[0].currency : 'TRY'

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Odemeler</h1>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">&#9888;&#65039;</div>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Odemeler</h1>
        <p className="text-gray-500">Aidat odeme gecmisinizi goruntuleyin</p>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-500">Toplam Borc</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {totalDue.toLocaleString('tr-TR')} {currency}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-500">Odenmis</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {totalPaid.toLocaleString('tr-TR')} {currency}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="text-sm text-gray-500">Bekleyen</div>
            <div className="text-2xl font-bold text-orange-500 mt-1">
              {totalPending.toLocaleString('tr-TR')} {currency}
            </div>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'paid', 'overdue'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setLoading(true) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'Tumu' : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Odeme kaydi bulunamadi</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Sporcu</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tutar</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Son Tarih</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Odeme Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      {p.athlete?.user_profile?.full_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {p.fee_plan?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {p.amount.toLocaleString('tr-TR')} {p.currency}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {p.due_date ? new Date(p.due_date).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {p.paid_date ? new Date(p.paid_date).toLocaleDateString('tr-TR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm text-gray-900">
                    {p.athlete?.user_profile?.full_name || '-'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                    {statusLabels[p.status] || p.status}
                  </span>
                </div>

                {p.fee_plan?.name && (
                  <div className="text-xs text-gray-400 mb-2">{p.fee_plan.name}</div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {p.amount.toLocaleString('tr-TR')} {p.currency}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Son Tarih: {p.due_date ? new Date(p.due_date).toLocaleDateString('tr-TR') : '-'}
                    </div>
                  </div>

                  {p.paid_date && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Odeme Tarihi</div>
                      <div className="text-sm text-emerald-600 font-medium">
                        {new Date(p.paid_date).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  )}
                </div>

                {p.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                    {p.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
