'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRole } from '@/contexts/role-context'
import { ExerciseCard, VideoModal } from '@/components/athlete'
import type { Exercise, ExerciseCategory, ExerciseDifficulty } from '@/lib/types'

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Topsuz Isınma',
  coordination: 'Koordinasyon',
  strength_agility: 'Kuvvet/Çeviklik',
  ball_work: 'Toplu Çalışma',
  cooldown: 'Soğuma/Esneme',
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

const ALL_CATEGORIES: ExerciseCategory[] = ['warmup', 'coordination', 'strength_agility', 'ball_work', 'cooldown']
const ALL_DIFFICULTIES: ExerciseDifficulty[] = ['easy', 'medium', 'hard']

const SESSION_TYPE_LABELS: Record<string, string> = {
  technical: 'Teknik', tactical: 'Taktik', physical: 'Fiziksel',
  game_based: 'Oyun Temelli', match: 'Maç', rest: 'Dinlenme',
}

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

  // Video modal state
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  })

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

  // Load today's completed exercises on mount
  useEffect(() => {
    if (!isAthlete) return
    async function loadCompletions() {
      try {
        const res = await fetch('/api/exercises/my-completions')
        const data = await res.json()
        if (data.success && data.data) {
          setCompletedIds(new Set(data.data))
        }
      } catch {
        // handle silently
      }
    }
    loadCompletions()
  }, [isAthlete])

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

  function handleVideoClick(url: string, title: string) {
    setVideoModal({ isOpen: true, url, title })
  }

  function closeVideoModal() {
    setVideoModal({ isOpen: false, url: '', title: '' })
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

  return (
    <div className="space-y-6">
      {/* Video Modal */}
      <VideoModal
        isOpen={videoModal.isOpen}
        onClose={closeVideoModal}
        videoUrl={videoModal.url}
        title={videoModal.title}
      />

      {/* Today's Plan Banner */}
      {isAthlete && todayPlanType && todayPlanType !== 'rest' && (
        <Link href="/dashboard/my-plan" className="block">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚽</span>
                <div>
                  <div className="text-emerald-100 text-xs font-medium">Bugünün Antrenman Planı</div>
                  <div className="font-bold">
                    {todayPlanTitle || SESSION_TYPE_LABELS[todayPlanType] || 'Antrenman'}
                  </div>
                </div>
              </div>
              <span className="text-emerald-200 text-sm">Planı Gör →</span>
            </div>
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Egzersiz Kütüphanesi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalExercises} egzersiz - 5 kategori, 3 zorluk seviyesi
          </p>
        </div>
        {isAthlete && completionCount > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
            <span className="text-sm font-medium text-emerald-700">Bugün: {completionCount} tamamlandı</span>
            <div className="w-24 h-2 bg-emerald-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
            <span className="text-xs text-emerald-600 font-medium">{completionPercent}%</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Category filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${selectedCategory === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Tümü
          </button>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${selectedCategory === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedDifficulty === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Tüm Seviyeler
          </button>
          {ALL_DIFFICULTIES.map(diff => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedDifficulty === diff ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {DIFFICULTY_LABELS[diff]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-gray-200 rounded-xl animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">🏋️</div>
          <p className="text-gray-500">Bu filtrede egzersiz bulunamadı.</p>
        </div>
      ) : (
        /* Exercise groups */
        <div className="space-y-8">
          {(selectedCategory === 'all' ? ALL_CATEGORIES : [selectedCategory]).map(cat => {
            const catExercises = grouped[cat]
            if (!catExercises?.length) return null

            return (
              <div key={cat}>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                  {CATEGORY_LABELS[cat]}
                  <span className="text-sm font-normal text-gray-400">({catExercises.length})</span>
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catExercises.map(ex => (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      isCompleted={completedIds.has(ex.id)}
                      isCompleting={completingId === ex.id}
                      onComplete={handleComplete}
                      onVideoClick={handleVideoClick}
                      showCompleteButton={isAthlete}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
