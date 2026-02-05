'use client'

import { useEffect, useState } from 'react'

export default function SuperAdminOrganizations() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me')
        await meRes.json()
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const sampleOrganizations = [
    {
      name: 'Ornek Spor Kulubu',
      type: 'Spor Kulubu',
      members: 45,
      status: 'Aktif',
      createdAt: '2024-01-15',
    },
    {
      name: 'Ornek Akademi',
      type: 'Akademi',
      members: 120,
      status: 'Aktif',
      createdAt: '2024-03-20',
    },
    {
      name: 'Ornek Fitness',
      type: 'Fitness Merkezi',
      members: 30,
      status: 'Aktif',
      createdAt: '2024-06-10',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organizasyonlar</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔧</span>
          <p className="text-sm text-amber-700 font-medium">
            Organizasyon yonetim paneli yaklasimda gelistirilecektir.
          </p>
        </div>
        <p className="text-sm text-amber-600 mt-1 ml-7">
          Asagida ornek veri yapisi gosterilmektedir.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Organizasyon Listesi (Ornek)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Organizasyon Adi</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Tur</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Uye Sayisi</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Durum</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Olusturma Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {sampleOrganizations.map((org, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">
                        🏢
                      </span>
                      <span className="font-medium text-gray-900">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{org.type}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{org.members}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      {org.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{org.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Veri Yapisi</h3>
        <p className="text-sm text-gray-500 mb-3">
          Her organizasyon asagidaki alanlari icerecektir:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            'Organizasyon Adi',
            'Organizasyon Turu',
            'Uye Sayisi',
            'Aktif/Pasif Durumu',
            'Olusturma Tarihi',
            'Iletisim Bilgileri',
            'Adres',
            'Abonelik Plani',
          ].map((field) => (
            <div key={field} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              {field}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
