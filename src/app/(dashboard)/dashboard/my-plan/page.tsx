'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton'
interface DayPlan {
  title: string
  type: string
  duration: number
  notes: string
}

type WeekDay = 'pazartesi' | 'sali' | 'carsamba' | 'persembe' | 'cuma' | 'cumartesi' | 'pazar'

const DAYS: { key: WeekDay; label: string; jsDay: number }[] = [
  { key: 'pazartesi', label: 'Pazartesi', jsDay: 1 },
  { key: 'sali', label: 'Sali', jsDay: 2 },
  { key: 'carsamba', label: 'Carsamba', jsDay: 3 },
  { key: 'persembe', label: 'Persembe', jsDay: 4 },
  { key: 'cuma', label: 'Cuma', jsDay: 5 },
  { key: 'cumartesi', label: 'Cumartesi', jsDay: 6 },
  { key: 'pazar', label: 'Pazar', jsDay: 0 },
]

const SESSION_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  technical: { label: 'Teknik', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  tactical: { label: 'Taktik', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  physical: { label: 'Fiziksel', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  game_based: { label: 'Oyun Temelli', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  match: { label: 'Mac', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  rest: { label: 'Dinlenme', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
}

function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

function getTodayDayKey(): WeekDay {
  const jsDay = new Date().getDay()
  const found = DAYS.find(d => d.jsDay === jsDay)
  return found?.key || 'pazartesi'
}

export default function MyPlanPage() {
  const { activeRole, isLoading: roleLoading } = useRole()

  if (roleLoading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  if (activeRole !== 'athlete' && activeRole !== 'parent') {
    return <AccessDenied requiredRoles={['athlete', 'parent']} />
  }

  return <MyPlanContent />
}

function MyPlanContent() {
  const [loading, setLoading] = useState(true)
  const [groupName, setGroupName] = useState('')
  const [planData, setPlanData] = useState<Record<string, DayPlan> | null>(null)
  const [planNotes, setPlanNotes] = useState('')
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [groupId, setGroupId] = useState<string | null>(null)
  const [noGroup, setNoGroup] = useState(false)

  const todayKey = getTodayDayKey()

  // Load athlete's group
  useEffect(() => {
    async function loadGroup() {
      try {
        const res = await fetch('/api/my-groups')
        const data = await res.json()
        if (data.success && data.data?.length > 0) {
          setGroupId(data.data[0].id)
          setGroupName(data.data[0].name || '')
        } else {
          setNoGroup(true)
          setLoading(false)
        }
      } catch {
        setNoGroup(true)
        setLoading(false)
      }
    }
    loadGroup()
  }, [])

  // Load plan when group or week changes
  useEffect(() => {
    if (!groupId) return

    async function loadPlan() {
      setLoading(true)
      try {
        const res = await fetch(`/api/weekly-plans?group_id=${groupId}&week_start=${weekStart}`)
        const data = await res.json()
        if (data.success && data.data?.length > 0) {
          const plan = data.data[0]
          setPlanData(plan.plan_data || null)
          setPlanNotes(plan.notes || '')
        } else {
          setPlanData(null)
          setPlanNotes('')
        }
      } catch {
        setPlanData(null)
      } finally {
        setLoading(false)
      }
    }
    loadPlan()
  }, [groupId, weekStart])

  function changeWeek(offset: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + offset * 7)
    setWeekStart(getMonday(d))
  }

  const isCurrentWeek = weekStart === getMonday(new Date())

  if (noGroup) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Haftalik Antrenman Planim</h1>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500">Henuz bir gruba atanmamissin.</p>
          <p className="text-sm text-gray-400 mt-1">Antrenorun seni bir gruba ekledikten sonra plan burada gorunecek.</p>
        </div>
      </div>
    )
  }



  // ...

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-3 mb-6">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-6 w-32 my-auto" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        {[1, 2, 3].map(i => <CardSkeleton key={i} className="h-32" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Haftalik Antrenman Planim</h1>
        {groupName && <p className="text-sm text-gray-500">{groupName}</p>}
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => changeWeek(-1)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-sm font-medium text-gray-700">
          {new Date(weekStart).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
          {' - '}
          {new Date(new Date(weekStart).getTime() + 6 * 86400000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <button
          onClick={() => changeWeek(1)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {!isCurrentWeek && (
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium ml-2"
          >
            Bu Hafta
          </button>
        )}
      </div>

      {/* Plan content */}
      {planData ? (
        <div className="space-y-3">
          {DAYS.map(day => {
            const dayData = (planData as Record<string, DayPlan>)[day.key]
            const isToday = isCurrentWeek && day.key === todayKey
            const isRest = dayData?.type === 'rest'
            const typeInfo = SESSION_TYPE_LABELS[dayData?.type] || null
            const hasPlan = dayData && dayData.type

            return (
              <div
                key={day.key}
                className={`rounded-xl border p-4 transition-all ${isToday
                  ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                  : 'border-gray-200 bg-white'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-semibold ${isToday ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {day.label}
                    </div>
                    {isToday && (
                      <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">
                        Bugun
                      </span>
                    )}
                  </div>
                  {typeInfo && (
                    <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  )}
                </div>

                {hasPlan && !isRest ? (
                  <div className="mt-3 space-y-2">
                    {dayData.title && (
                      <p className={`font-medium ${isToday ? 'text-emerald-800' : 'text-gray-900'}`}>
                        {dayData.title}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {dayData.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {dayData.duration} dk
                        </span>
                      )}
                    </div>
                    {dayData.notes && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mt-2">{dayData.notes}</p>
                    )}
                  </div>
                ) : isRest ? (
                  <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                    <span>😴</span> Dinlenme gunu
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-gray-400">Plan girilmemis</div>
                )}
              </div>
            )
          })}

          {/* Coach notes */}
          {planNotes && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-blue-700 mb-1">Antrenor Notu</h4>
              <p className="text-sm text-blue-600">{planNotes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500">Bu hafta icin plan henuz yayinlanmadi.</p>
          <p className="text-sm text-gray-400 mt-1">Antrenorun plan hazirladiktan sonra burada gorunecek.</p>
        </div>
      )}
    </div>
  )
}
