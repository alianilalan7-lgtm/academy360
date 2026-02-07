'use client'

import { useEffect, useState, use } from 'react'
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

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
}

const DIFFICULTY_COLORS: Record<ExerciseDifficulty, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

interface ProgramDetail {
  id: string
  title: string
  description: string | null
  category: string | null
  difficulty_level: number | null
  estimated_duration_minutes: number | null
  tags: string[] | null
  is_active: boolean
  content_data: any
}

interface AssignmentDetail {
  id: string
  program: ProgramDetail
  status: string
  progress_percentage: number
  start_date: string | null
  due_date: string | null
  notes: string | null
}

type TabType = 'overview' | 'exercises' | 'scores'

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { activeRole } = useRole()
  const isAthlete = activeRole === 'athlete'
  const isCoach = activeRole === 'coach'

  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [completingId, setCompletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // Try to load as assignment first (athlete), then as program (coach)
        if (isAthlete) {
          const assignRes = await fetch(`/api/assignments/${id}`)
          const assignData = await assignRes.json()
          if (assignData.success && assignData.data) {
            setAssignment(assignData.data)
            setProgram(assignData.data.program)
          }
        } else {
          const progRes = await fetch(`/api/programs/${id}`)
          const progData = await progRes.json()
          if (progData.success) setProgram(progData.data)
        }

        // Load exercises
        const exRes = await fetch('/api/exercises?pageSize=100')
        const exData = await exRes.json()
        if (exData.success) setExercises(exData.data || [])
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isAthlete])

  async function handleComplete(exerciseId: string) {
    setCompletingId(exerciseId)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: program?.id, sets_completed: 1 }),
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-40 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-gray-500">Program bulunamadi.</p>
        <Link href="/dashboard/programs" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">
          Programlara don
        </Link>
      </div>
    )
  }

  const completionCount = completedIds.size
  const completionPercent = exercises.length > 0 ? Math.round((completionCount / exercises.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/dashboard/programs" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Programlara don
      </Link>

      {/* Program header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{program.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {program.category && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{program.category}</span>
              )}
              {program.difficulty_level && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                  Seviye {program.difficulty_level}
                </span>
              )}
              {program.estimated_duration_minutes && (
                <span className="text-xs text-gray-400">{program.estimated_duration_minutes} dk</span>
              )}
            </div>
          </div>
          {assignment && (
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                assignment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {assignment.status === 'completed' ? 'Tamamlandi' :
                 assignment.status === 'in_progress' ? 'Devam Ediyor' : 'Atandi'}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar for athletes */}
        {isAthlete && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">Ilerleme</span>
              <span className="font-medium text-emerald-600">{completionPercent}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{completionCount}/{exercises.length} egzersiz tamamlandi</p>
          </div>
        )}

        {program.description && (
          <p className="text-gray-600 mt-4">{program.description}</p>
        )}

        {program.tags?.length ? (
          <div className="flex flex-wrap gap-1 mt-3">
            {program.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-xs">#{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'overview' as TabType, label: 'Genel Bakis' },
          { key: 'exercises' as TabType, label: 'Egzersizler' },
          ...(isCoach ? [{ key: 'scores' as TabType, label: 'Puanlama' }] : []),
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm text-gray-500">Toplam Egzersiz</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{exercises.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-3xl mb-2">🏷️</div>
            <p className="text-sm text-gray-500">Kategoriler</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">5</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-3xl mb-2">⏱️</div>
            <p className="text-sm text-gray-500">Tahmini Sure</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{program.estimated_duration_minutes || '-'} dk</p>
          </div>
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="space-y-6">
          {(['warmup', 'coordination', 'strength_agility', 'ball_work', 'cooldown'] as ExerciseCategory[]).map(cat => {
            const catExercises = exercises.filter(e => e.category === cat)
            if (!catExercises.length) return null

            return (
              <div key={cat} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-3">{CATEGORY_LABELS[cat]}</h3>
                <div className="space-y-2">
                  {catExercises.map(ex => {
                    const isCompleted = completedIds.has(ex.id)
                    const isCompleting = completingId === ex.id

                    return (
                      <div
                        key={ex.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-300 w-6 text-center">#{ex.order_number}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${isCompleted ? 'text-emerald-700 line-through' : 'text-gray-900'}`}>
                            {ex.name}
                          </p>
                          <div className="flex gap-2 mt-0.5 text-xs text-gray-400">
                            <span className={`px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[ex.difficulty]}`}>
                              {DIFFICULTY_LABELS[ex.difficulty]}
                            </span>
                            {ex.repetitions && <span>{ex.repetitions} tekrar</span>}
                            {ex.duration_seconds && <span>{ex.duration_seconds}sn</span>}
                            {ex.sets > 1 && <span>{ex.sets} set</span>}
                          </div>
                        </div>
                        {isAthlete && (
                          isCompleted ? (
                            <span className="text-emerald-500 font-bold text-sm">✓</span>
                          ) : (
                            <button
                              onClick={() => handleComplete(ex.id)}
                              disabled={isCompleting}
                              className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isCompleting ? '...' : 'Yaptim'}
                            </button>
                          )
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

      {activeTab === 'scores' && isCoach && (
        <SkillScoringSection programId={program.id} />
      )}
    </div>
  )
}

function SkillScoringSection({ programId }: { programId: string }) {
  const { currentOrgId } = useRole()
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const technicalSkills = ['Pas', 'Kontrol', 'Sut', 'Dribling', 'Ortala', 'Kafa Vurusu']
  const physicalSkills = ['Hiz', 'Dayaniklilik', 'Kuvvet', 'Ceviklik', 'Sichrama']
  const behavioralSkills = ['Disiplin', 'Takim Calismasi', 'Liderlik', 'Motivasyon']

  const [scores, setScores] = useState<Record<string, number>>({})

  useEffect(() => {
    async function loadAthletes() {
      try {
        let orgId = currentOrgId
        if (!orgId) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          orgId = me.data?.memberships?.[0]?.organization_id
        }
        if (!orgId) return

        const res = await fetch(`/api/athletes?organization_id=${orgId}`)
        const data = await res.json()
        if (data.success) setAthletes(data.data || [])
      } catch {
        // handle silently
      } finally {
        setLoading(false)
      }
    }
    loadAthletes()
  }, [currentOrgId])

  function setScore(skill: string, value: number) {
    setScores(prev => ({ ...prev, [skill]: value }))
  }

  async function handleSubmit() {
    if (!selectedAthlete || Object.keys(scores).length === 0) return

    setSubmitting(true)
    setSuccess(false)

    const scoreEntries = Object.entries(scores).map(([skill_name, score]) => {
      let category: 'technical' | 'physical' | 'behavioral' = 'technical'
      if (physicalSkills.includes(skill_name)) category = 'physical'
      if (behavioralSkills.includes(skill_name)) category = 'behavioral'
      return { category, skill_name, score }
    })

    try {
      const res = await fetch('/api/skill-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete_id: selectedAthlete,
          scores: scoreEntries,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        setScores({})
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      // handle silently
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <h3 className="font-semibold text-gray-900">Sporcu Puanlama</h3>

      {/* Athlete select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu Sec</label>
        <select
          value={selectedAthlete}
          onChange={e => setSelectedAthlete(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Sporcu secin...</option>
          {athletes.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.user_profile?.full_name || a.user_profile?.email || a.id}
            </option>
          ))}
        </select>
      </div>

      {selectedAthlete && (
        <>
          {/* Technical Skills */}
          <SkillGroup title="Teknik Beceriler" skills={technicalSkills} scores={scores} setScore={setScore} />
          {/* Physical Skills */}
          <SkillGroup title="Fiziksel Beceriler" skills={physicalSkills} scores={scores} setScore={setScore} />
          {/* Behavioral Skills */}
          <SkillGroup title="Davranissal" skills={behavioralSkills} scores={scores} setScore={setScore} />

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(scores).length === 0}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Puanlari Kaydet'}
            </button>
            {success && <span className="text-emerald-600 text-sm font-medium">Kaydedildi!</span>}
          </div>
        </>
      )}
    </div>
  )
}

function SkillGroup({ title, skills, scores, setScore }: {
  title: string
  skills: string[]
  scores: Record<string, number>
  setScore: (skill: string, value: number) => void
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
      <div className="space-y-2">
        {skills.map(skill => (
          <div key={skill} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-28">{skill}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setScore(skill, n)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                    scores[skill] === n
                      ? 'bg-emerald-500 text-white'
                      : scores[skill] && n <= scores[skill]
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {scores[skill] && (
              <span className="text-sm font-bold text-emerald-600">{scores[skill]}/10</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
