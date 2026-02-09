'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/contexts/role-context'
import { AccessDenied } from '@/components/access-denied'

interface AthleteOption {
  id: string
  name: string
}

interface SkillData {
  skill_name: string
  category: string
  score: number
}

const SKILL_COLORS: Record<string, string> = {
  technical: '#10B981',
  physical: '#3B82F6',
  behavioral: '#F59E0B',
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Teknik',
  physical: 'Fiziksel',
  behavioral: 'Davranissal',
}

export default function ComparePage() {
  const { activeRole, isLoading: roleLoading } = useRole()

  if (roleLoading) return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

  if (activeRole !== 'coach' && activeRole !== 'club_admin') {
    return <AccessDenied requiredRoles={['coach', 'club_admin']} />
  }

  return <CompareContent />
}

function CompareContent() {
  const { currentOrgId } = useRole()
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [athlete1, setAthlete1] = useState('')
  const [athlete2, setAthlete2] = useState('')
  const [scores1, setScores1] = useState<SkillData[]>([])
  const [scores2, setScores2] = useState<SkillData[]>([])
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAthletes() {
      try {
        let org = currentOrgId
        if (!org) {
          const meRes = await fetch('/api/auth/me')
          const me = await meRes.json()
          org = me.data?.memberships?.[0]?.organization_id
        }
        if (!org) return

        const res = await fetch(`/api/athletes?organizationId=${org}`)
        const data = await res.json()
        if (data.success) {
          setAthletes((data.data || []).map((a: any) => ({
            id: a.id,
            name: a.user_profile?.full_name || a.user_profile?.email || a.id,
          })))
        }
      } catch {
        setError('Sporcular yuklenirken hata olustu. Lutfen sayfayi yenileyin.')
      } finally {
        setLoading(false)
      }
    }
    loadAthletes()
  }, [currentOrgId])

  async function loadScores(athleteId: string): Promise<SkillData[]> {
    const res = await fetch(`/api/skill-scores?athlete_id=${athleteId}&pageSize=100`)
    const data = await res.json()
    if (!data.success) return []

    // Get latest score per skill
    const latest: Record<string, SkillData & { measured_at: string }> = {}
    for (const s of data.data || []) {
      if (!latest[s.skill_name] || new Date(s.measured_at) > new Date(latest[s.skill_name].measured_at)) {
        latest[s.skill_name] = { skill_name: s.skill_name, category: s.category, score: s.score, measured_at: s.measured_at }
      }
    }
    return Object.values(latest)
  }

  async function handleCompare() {
    if (!athlete1 || !athlete2) return
    setComparing(true)
    try {
      const [s1, s2] = await Promise.all([loadScores(athlete1), loadScores(athlete2)])
      setScores1(s1)
      setScores2(s2)
    } catch {
      // handle silently
    } finally {
      setComparing(false)
    }
  }

  // Merge all skills from both athletes
  const allSkills = [...new Set([...scores1.map(s => s.skill_name), ...scores2.map(s => s.skill_name)])]

  const getScore = (scores: SkillData[], skill: string) => scores.find(s => s.skill_name === skill)?.score ?? 0
  const getCategory = (skill: string) => scores1.find(s => s.skill_name === skill)?.category || scores2.find(s => s.skill_name === skill)?.category || 'technical'

  const athlete1Name = athletes.find(a => a.id === athlete1)?.name || 'Sporcu 1'
  const athlete2Name = athletes.find(a => a.id === athlete2)?.name || 'Sporcu 2'

  if (loading) {
    return <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Oyuncu Karsilastirma</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid gap-4 sm:grid-cols-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu 1</label>
            <select
              value={athlete1}
              onChange={e => setAthlete1(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Sporcu secin...</option>
              {athletes.filter(a => a.id !== athlete2).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <span className="text-2xl text-gray-300 font-bold">VS</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sporcu 2</label>
            <select
              value={athlete2}
              onChange={e => setAthlete2(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Sporcu secin...</option>
              {athletes.filter(a => a.id !== athlete1).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={!athlete1 || !athlete2 || comparing}
          className="mt-4 px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {comparing ? 'Yukleniyor...' : 'Karsilastir'}
        </button>
      </div>

      {/* Comparison results */}
      {allSkills.length > 0 && (
        <>
          {/* Bar comparison */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Beceri Karsilastirmasi</h3>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-emerald-500 rounded" /> {athlete1Name}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-500 rounded" /> {athlete2Name}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {allSkills.sort().map(skill => {
                const s1 = getScore(scores1, skill)
                const s2 = getScore(scores2, skill)
                const cat = getCategory(skill)

                return (
                  <div key={skill}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{skill}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        cat === 'technical' ? 'bg-emerald-50 text-emerald-600' :
                        cat === 'physical' ? 'bg-blue-50 text-blue-600' :
                        'bg-yellow-50 text-yellow-600'
                      }`}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-xs w-6 text-right text-emerald-600 font-bold">{s1}</span>
                      <div className="flex-1 flex gap-0.5">
                        <div className="flex-1 h-4 bg-gray-100 rounded-l overflow-hidden flex justify-end">
                          <div
                            className="h-full bg-emerald-500 rounded-l transition-all"
                            style={{ width: `${s1 * 10}%` }}
                          />
                        </div>
                        <div className="flex-1 h-4 bg-gray-100 rounded-r overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-r transition-all"
                            style={{ width: `${s2 * 10}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs w-6 text-blue-600 font-bold">{s2}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard name={athlete1Name} scores={scores1} color="emerald" />
            <SummaryCard name={athlete2Name} scores={scores2} color="blue" />
          </div>
        </>
      )}

      {/* Empty state */}
      {athlete1 && athlete2 && allSkills.length === 0 && !comparing && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500">Bu sporcular icin henuz puanlama verisi yok.</p>
          <p className="text-sm text-gray-400 mt-1">Once sporculari puanlayin, sonra karsilastirin.</p>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ name, scores, color }: { name: string; scores: SkillData[]; color: string }) {
  const technical = scores.filter(s => s.category === 'technical')
  const physical = scores.filter(s => s.category === 'physical')
  const behavioral = scores.filter(s => s.category === 'behavioral')

  const avg = (arr: SkillData[]) => arr.length ? (arr.reduce((s, a) => s + a.score, 0) / arr.length).toFixed(1) : '-'
  const overall = scores.length ? (scores.reduce((s, a) => s + a.score, 0) / scores.length).toFixed(1) : '-'

  const bgColor = color === 'emerald' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
  const textColor = color === 'emerald' ? 'text-emerald-700' : 'text-blue-700'

  return (
    <div className={`rounded-xl border p-5 ${bgColor}`}>
      <h4 className={`font-semibold ${textColor}`}>{name}</h4>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Genel Ortalama</span>
          <span className={`font-bold ${textColor}`}>{overall}/10</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Teknik</span>
          <span className="font-medium">{avg(technical)}/10</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Fiziksel</span>
          <span className="font-medium">{avg(physical)}/10</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Davranissal</span>
          <span className="font-medium">{avg(behavioral)}/10</span>
        </div>
      </div>
    </div>
  )
}
