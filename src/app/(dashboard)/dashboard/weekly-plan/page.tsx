'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface DayPlan {
  title: string
  type: string
  duration: number
  notes: string
}

type WeekDay = 'pazartesi' | 'sali' | 'carsamba' | 'persembe' | 'cuma' | 'cumartesi' | 'pazar'

const DAYS: { key: WeekDay; label: string }[] = [
  { key: 'pazartesi', label: 'Pazartesi' },
  { key: 'sali', label: 'Sali' },
  { key: 'carsamba', label: 'Carsamba' },
  { key: 'persembe', label: 'Persembe' },
  { key: 'cuma', label: 'Cuma' },
  { key: 'cumartesi', label: 'Cumartesi' },
  { key: 'pazar', label: 'Pazar' },
]

const SESSION_TYPES = [
  { value: 'technical', label: 'Teknik' },
  { value: 'tactical', label: 'Taktik' },
  { value: 'physical', label: 'Fiziksel' },
  { value: 'game_based', label: 'Oyun Temelli' },
  { value: 'match', label: 'Mac' },
  { value: 'rest', label: 'Dinlenme' },
]

function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

export default function WeeklyPlanPage() {
  const { activeRole, isLoading: roleLoading, currentOrgId } = useRole()

  if (roleLoading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  if (activeRole !== 'coach' && activeRole !== 'club_admin') {
    return <AccessDenied requiredRoles={['coach', 'club_admin']} />
  }

  return <WeeklyPlanContent orgId={currentOrgId} />
}

function WeeklyPlanContent({ orgId }: { orgId: string | null }) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [planData, setPlanData] = useState<Record<WeekDay, DayPlan>>({} as any)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existingPlan, setExistingPlan] = useState<any>(null)

  // Load groups
  useEffect(() => {
    async function loadGroups() {
      try {
        let org = orgId
        if (!org) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          org = me.data?.memberships?.[0]?.organization_id
        }
        if (!org) return

        const res = await fetch(`/api/groups?organization_id=${org}`)
        const data = await res.json()
        if (data.success) {
          setGroups(data.data || [])
          if (data.data?.length) setSelectedGroup(data.data[0].id)
        }
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    loadGroups()
  }, [orgId])

  // Load existing plan when group/week changes
  useEffect(() => {
    async function loadPlan() {
      if (!selectedGroup || !weekStart) return

      try {
        const res = await fetch(`/api/weekly-plans?group_id=${selectedGroup}&week_start=${weekStart}`)
        const data = await res.json()
        if (data.success && data.data?.length) {
          const plan = data.data[0]
          setExistingPlan(plan)
          setPlanData(plan.plan_data || {})
          setNotes(plan.notes || '')
        } else {
          setExistingPlan(null)
          setPlanData({} as any)
          setNotes('')
        }
      } catch {
        // handle silently
      }
    }
    loadPlan()
  }, [selectedGroup, weekStart])

  function updateDay(day: WeekDay, field: keyof DayPlan, value: string | number) {
    setPlanData(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/weekly-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup || null,
          week_start: weekStart,
          plan_data: planData,
          notes: notes || null,
          is_published: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setExistingPlan(data.data)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // handle silently
    } finally {
      setSaving(false)
    }
  }

  function changeWeek(offset: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + offset * 7)
    setWeekStart(getMonday(d))
  }

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Haftalik Antrenman Plani</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grup</label>
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Grup secin...</option>
            {groups.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => changeWeek(-1)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            ←
          </button>
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hafta</label>
            <input
              type="date"
              value={weekStart}
              onChange={e => setWeekStart(getMonday(new Date(e.target.value)))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button onClick={() => changeWeek(1)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            →
          </button>
        </div>

        {existingPlan && (
          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Mevcut plan yuklendi</span>
        )}
      </div>

      {/* Weekly grid */}
      <div className="grid gap-3 lg:grid-cols-7">
        {DAYS.map(day => {
          const dayData = planData[day.key] || { title: '', type: '', duration: 0, notes: '' }
          const isRest = dayData.type === 'rest'

          return (
            <div key={day.key} className={`bg-white rounded-xl border p-4 space-y-2 ${isRest ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}>
              <h3 className="text-sm font-semibold text-gray-700">{day.label}</h3>

              <select
                value={dayData.type || ''}
                onChange={e => updateDay(day.key, 'type', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Tur sec...</option>
                {SESSION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {!isRest && (
                <>
                  <input
                    type="text"
                    placeholder="Baslik"
                    value={dayData.title || ''}
                    onChange={e => updateDay(day.key, 'title', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    placeholder="Sure (dk)"
                    value={dayData.duration || ''}
                    onChange={e => updateDay(day.key, 'duration', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <textarea
                    placeholder="Notlar..."
                    value={dayData.notes || ''}
                    onChange={e => updateDay(day.key, 'notes', e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </>
              )}

              {isRest && (
                <div className="text-center py-4 text-gray-400 text-xs">Dinlenme gunu</div>
              )}
            </div>
          )
        })}
      </div>

      {/* General notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Genel Notlar</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Bu haftanin genel notlari..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Plani Kaydet'}
        </button>
        {saved && <span className="text-emerald-600 text-sm font-medium">Kaydedildi!</span>}
      </div>
    </div>
  )
}
