'use client'

import { useEffect, useState } from 'react'

export default function SuperAdminSettings() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const settingsCategories = [
    {
      title: 'Genel Ayarlar',
      description: 'Platform adi, logosu, varsayilan dil ve bolge ayarlari gibi genel yapilandirma secenekleri.',
      icon: '🔧',
      color: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'E-posta Ayarlari',
      description: 'SMTP yapilandirmasi, e-posta sablonlari ve bildirim e-posta ayarlari.',
      icon: '📧',
      color: 'bg-emerald-50 border-emerald-200',
      iconBg: 'bg-emerald-100',
    },
    {
      title: 'Bildirim Ayarlari',
      description: 'Push bildirim, uygulama ici bildirim ve bildirim tercihleri yapilandirmasi.',
      icon: '🔔',
      color: 'bg-purple-50 border-purple-200',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'Guvenlik Ayarlari',
      description: 'Sifre politikalari, oturum suresi, iki faktorlu dogrulama ve erisim kontrolleri.',
      icon: '🔒',
      color: 'bg-amber-50 border-amber-200',
      iconBg: 'bg-amber-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarlari</h1>
        <p className="text-sm text-gray-500 mt-1">Platform genelindeki yapilandirma ayarlari</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔧</span>
          <p className="text-sm text-amber-700 font-medium">
            Sistem ayarlari modulu gelistirme asamasindadir.
          </p>
        </div>
        <p className="text-sm text-amber-600 mt-1 ml-7">
          Asagidaki ayar kategorileri yaklasimda aktif hale gelecektir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsCategories.map((category) => (
          <div
            key={category.title}
            className={`bg-white p-5 rounded-xl border border-gray-200 relative overflow-hidden`}
          >
            <div className="flex items-start gap-4">
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${category.iconBg}`}>
                {category.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{category.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    Yaklasimda
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{category.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Planlanan Ozellikler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Platform logosu ve marka ayarlari',
            'Varsayilan dil ve bolge secimi',
            'SMTP sunucu yapilandirmasi',
            'E-posta sablon duzenleyicisi',
            'Push bildirim entegrasyonu',
            'Oturum suresi yapilandirmasi',
            'Sifre politikasi belirleme',
            'Iki faktorlu dogrulama yonetimi',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
