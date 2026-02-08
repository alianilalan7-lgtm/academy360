'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import type { Exercise, ExerciseCategory, ExerciseDifficulty } from '@/lib/types'

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Topsuz Isinma',
  coordination: 'Koordinasyon',
  strength_agility: 'Kuvvet/Ceviklik',
  ball_work: 'Toplu Calisma',
  cooldown: 'Soguma/Esneme',
}

const CATEGORY_ICONS: Record<ExerciseCategory, string> = {
  warmup: '🏃',
  coordination: '🎯',
  strength_agility: '💪',
  ball_work: '⚽',
  cooldown: '🧘',
}

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
}

const DIFFICULTY_COLORS: Record<ExerciseDifficulty, string> = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
}

const ALL_CATEGORIES: ExerciseCategory[] = ['warmup', 'coordination', 'strength_agility', 'ball_work', 'cooldown']
const ALL_DIFFICULTIES: ExerciseDifficulty[] = ['easy', 'medium', 'hard']

export default function ExercisesPage() {
  const { activeRole, isLoading: roleLoading } = useRole()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<ExerciseDifficulty | 'all'>('all')
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [todayPlanType, setTodayPlanType] = useState<string | null>(null)
  const [todayPlanTitle, setTodayPlanTitle] = useState<string | null>(null)

  const isAthlete = activeRole === 'athlete'

  // Load today's plan for athletes
  useEffect(() => {
    if (!isAthlete) return
    async function loadTodayPlan() {
      try {
        const groupsRes = await fetch('/api/my-groups')
        const groupsData = await groupsRes.json()
        if (!groupsData.success || !groupsData.data?.length) return

        const groupId = groupsData.data[0].id
        const now = new Date()
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(now)
        monday.setDate(diff)
        const weekStart = monday.toISOString().split('T')[0]

        const planRes = await fetch(`/api/weekly-plans?group_id=${groupId}&week_start=${weekStart}`)
        const planData = await planRes.json()
        if (planData.success && planData.data?.length > 0) {
          const plan = planData.data[0]
          const dayKeys = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi']
          const todayKey = dayKeys[now.getDay()]
          const todayData = plan.plan_data?.[todayKey]
          if (todayData?.type) {
            setTodayPlanType(todayData.type)
            setTodayPlanTitle(todayData.title || null)
          }
        }
      } catch {
        // handle silently
      }
    }
    loadTodayPlan()
  }, [isAthlete])

  useEffect(() => {
    async function load() {
      try {
        let url = '/api/exercises?pageSize=100'
        if (selectedCategory !== 'all') url += `&category=${selectedCategory}`
        if (selectedDifficulty !== 'all') url += `&difficulty=${selectedDifficulty}`

        const res = await fetch(url)
        const data = await res.json()
        if (data.success) setExercises(data.data || [])
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedCategory, selectedDifficulty])

  async function handleComplete(exerciseId: string) {
    setCompletingId(exerciseId)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets_completed: 1 }),
      })
      const data = await res.json()
      if (data.success) {
        setCompletedIds(prev => new Set(prev).add(exerciseId))
      }
    } catch {
      // handle silently
    } finally {
      setCompletingId(null)
    }
  }

  if (roleLoading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  // Group exercises by category
  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const key = ex.category
    if (!acc[key]) acc[key] = []
    acc[key].push(ex)
    return acc
  }, {})

  const completionCount = completedIds.size
  const totalExercises = exercises.length
  const completionPercent = totalExercises > 0 ? Math.round((completionCount / totalExercises) * 100) : 0

  const SESSION_TYPE_LABELS: Record<string, string> = {
    technical: 'Teknik', tactical: 'Taktik', physical: 'Fiziksel',
    game_based: 'Oyun Temelli', match: 'Mac', rest: 'Dinlenme',
  }

  return (
    <div className="space-y-6">
      {/* Today's Plan Banner */}
      {isAthlete && todayPlanType && todayPlanType !== 'rest' && (
        <Link href="/dashboard/my-plan" className="block">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚽</span>
                <div>
                  <div className="text-emerald-100 text-xs font-medium">Bugunun Antrenman Plani</div>
                  <div className="font-bold">
                    {todayPlanTitle || SESSION_TYPE_LABELS[todayPlanType] || 'Antrenman'}
                  </div>
                </div>
              </div>
              <span className="text-emerald-200 text-sm">Plani Gor →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Egzersiz Kutuphanesi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalExercises} egzersiz - 5 kategori, 3 zorluk seviyesi
          </p>
        </div>
        {isAthlete && completionCount > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium text-emerald-700">Bugun: {completionCount} tamamlandi</span>
            <div className="w-24 h-2 bg-emerald-200 rounded-full">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
            <span className="text-xs text-emerald-600">{completionPercent}%</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Category filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedCategory === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tumu
          </button>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedCategory === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSelectedDifficulty('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedDifficulty === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tum Seviyeler
          </button>
          {ALL_DIFFICULTIES.map(diff => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedDifficulty === diff ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {DIFFICULTY_LABELS[diff]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">🏋️</div>
          <p className="text-gray-500">Bu filtrede egzersiz bulunamadi.</p>
        </div>
      ) : (
        /* Exercise groups */
        <div className="space-y-8">
          {(selectedCategory === 'all' ? ALL_CATEGORIES : [selectedCategory]).map(cat => {
            const catExercises = grouped[cat]
            if (!catExercises?.length) return null

            return (
              <div key={cat}>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                  {CATEGORY_LABELS[cat]}
                  <span className="text-sm font-normal text-gray-400">({catExercises.length})</span>
                </h2>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {catExercises.map(ex => {
                    const isCompleted = completedIds.has(ex.id)
                    const isCompleting = completingId === ex.id

                    return (
                      <div
                        key={ex.id}
                        className={`bg-white rounded-xl border p-4 transition-all ${
                          isCompleted ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400">#{ex.order_number}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${DIFFICULTY_COLORS[ex.difficulty]}`}>
                                {DIFFICULTY_LABELS[ex.difficulty]}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mt-1">{ex.name}</h3>
                          </div>
                          {isCompleted && (
                            <span className="text-emerald-500 text-xl flex-shrink-0">✓</span>
                          )}
                        </div>

                        {/* Description */}
                        {ex.description && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{ex.description}</p>
                        )}

                        {/* Stats */}
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                          {ex.sets > 1 && <span>{ex.sets} set</span>}
                          {ex.repetitions && <span>{ex.repetitions} tekrar</span>}
                          {ex.duration_seconds && <span>{ex.duration_seconds}sn</span>}
                          {ex.rest_seconds ? <span>Dinlenme: {ex.rest_seconds}sn</span> : null}
                        </div>

                        {/* Video placeholder */}
                        {ex.video_url && (
                          <div className="mt-3 bg-gray-100 rounded-lg p-3 text-center text-sm text-gray-500">
                            🎬 Video mevcut
                          </div>
                        )}

                        {/* Complete button (athlete only) */}
                        {isAthlete && !isCompleted && (
                          <button
                            onClick={() => handleComplete(ex.id)}
                            disabled={isCompleting}
                            className="mt-3 w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {isCompleting ? 'Kaydediliyor...' : 'Yaptim ✓'}
                          </button>
                        )}

                        {isAthlete && isCompleted && (
                          <div className="mt-3 w-full py-2 text-center text-emerald-600 text-sm font-medium">
                            Tamamlandi ✓
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
