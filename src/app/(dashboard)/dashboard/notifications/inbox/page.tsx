'use client'

import { useEffect, useState } from 'react'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  priority: string
  is_read: boolean
  created_at: string
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Dusuk' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Normal' },
  high: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'Yuksek' },
  urgent: { bg: 'bg-red-50', text: 'text-red-600', label: 'Acil' },
}

export default function NotificationInboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications?pageSize=50')
        const data = await res.json()
        if (data.success) {
          setNotifications(data.data || [])
        }
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {
      // handle silently
    }
  }

  function handleClick(notification: Notification) {
    if (expandedId === notification.id) {
      setExpandedId(null)
    } else {
      setExpandedId(notification.id)
      if (!notification.is_read) {
        markAsRead(notification.id)
      }
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} okunmamis bildirim</p>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-gray-500">Henuz bildirim yok.</p>
          <p className="text-sm text-gray-400 mt-1">Yeni bildirimler geldikce burada gorunecek.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => {
            const priority = PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.normal
            const isExpanded = expandedId === notification.id

            return (
              <div
                key={notification.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all cursor-pointer ${
                  notification.is_read ? 'border-gray-200' : 'border-emerald-300 bg-emerald-50/30'
                }`}
                onClick={() => handleClick(notification)}
              >
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                        )}
                        <h3 className={`text-sm font-semibold truncate ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                      </div>
                      {!isExpanded && (
                        <p className="text-sm text-gray-500 truncate mt-1">{notification.body}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {notification.priority !== 'normal' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.bg} ${priority.text}`}>
                          {priority.label}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{notification.body}</p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                        <span>{new Date(notification.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={`px-2 py-0.5 rounded ${priority.bg} ${priority.text}`}>{priority.label}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
