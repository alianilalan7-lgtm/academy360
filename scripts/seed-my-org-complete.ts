/**
 * Comprehensive seed script for user's Academy360 organization.
 * Seeds all missing tables with realistic data.
 *
 * Usage: npx tsx scripts/seed-my-org-complete.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Constants
const USER_ID = '383ed494-46dc-4753-93c1-f9006d4ca91b'
const ORG_ID = '5faa2ac2-d3b2-4278-9c57-61918925f9f8'
const ATHLETE_ID = '2865aada-444b-492e-b4fc-440d3a40eca3'
const GROUP_ID = '11111111-aaaa-bbbb-cccc-000000000001'

// Helper: days ago as ISO string
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

// Helper: days from now as date string (YYYY-MM-DD)
function dateOffset(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

// Results tracker
const results: { table: string; count: number; status: string }[] = []

async function seedMetricTypes() {
  console.log('\n1. METRIC TYPES (system-wide)')
  console.log('   Checking if metric_types already exist...')

  const { data: existing, error: checkErr } = await supabase
    .from('metric_types')
    .select('id, code')
    .eq('is_system', true)
    .limit(5)

  if (checkErr) {
    console.error('   Error checking metric_types:', checkErr.message)
    results.push({ table: 'metric_types', count: 0, status: 'ERROR: ' + checkErr.message })
    return {}
  }

  if (existing && existing.length > 0) {
    console.log(`   Already have ${existing.length}+ system metric_types. Skipping insert.`)
    // Fetch all to return the map
    const { data: allMetrics } = await supabase
      .from('metric_types')
      .select('id, code')
      .eq('is_system', true)

    const metricMap: Record<string, string> = {}
    allMetrics?.forEach((m: any) => { metricMap[m.code] = m.id })
    results.push({ table: 'metric_types', count: allMetrics?.length || 0, status: 'SKIPPED (already exist)' })
    return metricMap
  }

  // Insert 10 custom metric types as requested
  const metrics = [
    { code: 'sprint_20m_custom', name: 'Sprint 20m', description: '20 metre sprint suresi', unit: 'saniye', category: 'Hiz', data_type: 'number', is_higher_better: false, is_system: true, display_order: 20 },
    { code: 'sprint_40m', name: 'Sprint 40m', description: '40 metre sprint suresi', unit: 'saniye', category: 'Hiz', data_type: 'number', is_higher_better: false, is_system: true, display_order: 21 },
    { code: 'agility_test', name: 'Ceviklik Testi', description: 'Ceviklik parkuru suresi', unit: 'saniye', category: 'Ceviklik', data_type: 'number', is_higher_better: false, is_system: true, display_order: 22 },
    { code: 'vertical_jump_custom', name: 'Dikey Sicrama', description: 'Dikey sicrama yuksekligi', unit: 'cm', category: 'Patlayicilik', data_type: 'number', is_higher_better: true, is_system: true, display_order: 23 },
    { code: 'standing_long_jump_custom', name: 'Durarak Uzun Atlama', description: 'Durarak uzun atlama mesafesi', unit: 'cm', category: 'Patlayicilik', data_type: 'number', is_higher_better: true, is_system: true, display_order: 24 },
    { code: 'passing_pct', name: 'Pas Isabeti', description: 'Pas isabet orani', unit: '%', category: 'Teknik', data_type: 'number', min_value: 0, max_value: 100, is_higher_better: true, is_system: true, display_order: 25 },
    { code: 'shooting_pct', name: 'Sut Isabeti', description: 'Sut isabet orani', unit: '%', category: 'Teknik', data_type: 'number', min_value: 0, max_value: 100, is_higher_better: true, is_system: true, display_order: 26 },
    { code: 'ball_control_score', name: 'Top Kontrolu', description: 'Top kontrol puani (1-10)', unit: 'puan', category: 'Teknik', data_type: 'number', min_value: 1, max_value: 10, is_higher_better: true, is_system: true, display_order: 27 },
    { code: 'endurance_yoyo', name: 'Dayaniklilik (Yo-Yo)', description: 'Yo-Yo testi seviyesi', unit: 'seviye', category: 'Dayaniklilik', data_type: 'number', is_higher_better: true, is_system: true, display_order: 28 },
    { code: 'flexibility', name: 'Esneklik', description: 'Otur-uzan esneklik testi', unit: 'cm', category: 'Esneklik', data_type: 'number', min_value: -10, max_value: 50, is_higher_better: true, is_system: true, display_order: 29 },
  ]

  const { error } = await supabase.from('metric_types').insert(metrics)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'metric_types', count: 0, status: 'ERROR: ' + error.message })
    return {}
  }

  console.log(`   Inserted ${metrics.length} metric types`)
  results.push({ table: 'metric_types', count: metrics.length, status: 'INSERTED' })

  // Fetch all to return the map
  const { data: allMetrics } = await supabase
    .from('metric_types')
    .select('id, code')
    .eq('is_system', true)

  const metricMap: Record<string, string> = {}
  allMetrics?.forEach((m: any) => { metricMap[m.code] = m.id })
  return metricMap
}

async function seedPerformanceRecords(metricMap: Record<string, string>) {
  console.log('\n2. PERFORMANCE RECORDS')

  // We need metric IDs. Let's get them from the DB
  const { data: allMetrics } = await supabase
    .from('metric_types')
    .select('id, code')
    .eq('is_system', true)

  if (!allMetrics || allMetrics.length === 0) {
    console.error('   No metric types found! Skipping performance records.')
    results.push({ table: 'performance_records', count: 0, status: 'SKIPPED (no metric_types)' })
    return
  }

  const mMap: Record<string, string> = {}
  allMetrics.forEach((m: any) => { mMap[m.code] = m.id })

  // Build records using available metric codes
  type PerfRecord = {
    athlete_id: string
    metric_type_id: string
    recorded_by: string
    value: number
    recorded_at: string
    notes: string
    is_verified: boolean
  }

  const records: PerfRecord[] = []

  // Sprint tests
  const sprintCode = mMap['sprint_20m'] ? 'sprint_20m' : mMap['sprint_20m_custom'] ? 'sprint_20m_custom' : null
  if (sprintCode && mMap[sprintCode]) {
    records.push(
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[sprintCode], recorded_by: USER_ID, value: 3.45, recorded_at: daysAgo(30), notes: 'Ilk olcum - sezon basi', is_verified: true },
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[sprintCode], recorded_by: USER_ID, value: 3.32, recorded_at: daysAgo(15), notes: 'Ikinci olcum - gelisim var', is_verified: true },
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[sprintCode], recorded_by: USER_ID, value: 3.18, recorded_at: daysAgo(2), notes: 'Son olcum - harika gelisim', is_verified: true },
    )
  }

  // Agility test
  const agilityCode = mMap['agility_t_test'] ? 'agility_t_test' : mMap['agility_test'] ? 'agility_test' : null
  if (agilityCode && mMap[agilityCode]) {
    records.push(
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[agilityCode], recorded_by: USER_ID, value: 11.2, recorded_at: daysAgo(28), notes: 'T-Test baslangic', is_verified: true },
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[agilityCode], recorded_by: USER_ID, value: 10.5, recorded_at: daysAgo(5), notes: 'Ceviklik artti', is_verified: true },
    )
  }

  // Vertical jump
  const vjCode = mMap['vertical_jump'] ? 'vertical_jump' : mMap['vertical_jump_custom'] ? 'vertical_jump_custom' : null
  if (vjCode && mMap[vjCode]) {
    records.push(
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[vjCode], recorded_by: USER_ID, value: 38, recorded_at: daysAgo(25), notes: 'Dikey sicrama - iyi seviye', is_verified: true },
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[vjCode], recorded_by: USER_ID, value: 41, recorded_at: daysAgo(3), notes: 'Gelisim devam ediyor', is_verified: true },
    )
  }

  // Standing long jump
  const sljCode = mMap['standing_long_jump'] ? 'standing_long_jump' : mMap['standing_long_jump_custom'] ? 'standing_long_jump_custom' : null
  if (sljCode && mMap[sljCode]) {
    records.push(
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[sljCode], recorded_by: USER_ID, value: 175, recorded_at: daysAgo(20), notes: 'Uzun atlama olcumu', is_verified: true },
    )
  }

  // Passing accuracy
  const passCode = mMap['passing_accuracy'] ? 'passing_accuracy' : mMap['passing_pct'] ? 'passing_pct' : null
  if (passCode && mMap[passCode]) {
    records.push(
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[passCode], recorded_by: USER_ID, value: 7, recorded_at: daysAgo(18), notes: '10 pasan 7si isabet', is_verified: true },
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[passCode], recorded_by: USER_ID, value: 8, recorded_at: daysAgo(4), notes: 'Pas isabeti yukseldi', is_verified: true },
    )
  }

  // Shooting accuracy
  const shootCode = mMap['shooting_accuracy'] ? 'shooting_accuracy' : mMap['shooting_pct'] ? 'shooting_pct' : null
  if (shootCode && mMap[shootCode]) {
    records.push(
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[shootCode], recorded_by: USER_ID, value: 6, recorded_at: daysAgo(22), notes: 'Sut isabeti calismasi', is_verified: true },
    )
  }

  // Yo-Yo / Endurance
  const endCode = mMap['yo_yo_ir1'] ? 'yo_yo_ir1' : mMap['endurance_yoyo'] ? 'endurance_yoyo' : null
  if (endCode && mMap[endCode]) {
    records.push(
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[endCode], recorded_by: USER_ID, value: 640, recorded_at: daysAgo(26), notes: 'Yo-Yo IR1 testi', is_verified: true },
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[endCode], recorded_by: USER_ID, value: 720, recorded_at: daysAgo(6), notes: 'Dayaniklilik gelisti', is_verified: true },
    )
  }

  // Ball control
  const ballCode = mMap['ball_control_30s'] ? 'ball_control_30s' : mMap['ball_control_score'] ? 'ball_control_score' : null
  if (ballCode && mMap[ballCode]) {
    records.push(
      { athlete_id: ATHLETE_ID, metric_type_id: mMap[ballCode], recorded_by: USER_ID, value: 42, recorded_at: daysAgo(14), notes: '30sn top sektirme', is_verified: true },
    )
  }

  if (records.length === 0) {
    console.error('   No valid metric IDs found to create records')
    results.push({ table: 'performance_records', count: 0, status: 'SKIPPED (no matching metrics)' })
    return
  }

  const { error } = await supabase.from('performance_records').insert(records)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'performance_records', count: 0, status: 'ERROR: ' + error.message })
    return
  }

  console.log(`   Inserted ${records.length} performance records`)
  results.push({ table: 'performance_records', count: records.length, status: 'INSERTED' })
}

async function seedAssignedPrograms(): Promise<string[]> {
  console.log('\n3. ASSIGNED PROGRAMS')

  // Get existing programs for this org
  const { data: programs } = await supabase
    .from('programs')
    .select('id, title')
    .eq('organization_id', ORG_ID)
    .eq('is_active', true)
    .limit(6)

  if (!programs || programs.length === 0) {
    console.error('   No programs found for this org! Skipping.')
    results.push({ table: 'assigned_programs', count: 0, status: 'SKIPPED (no programs)' })
    return []
  }

  console.log(`   Found ${programs.length} programs for org`)

  const assignmentIds = [
    '55555555-aaaa-bbbb-cccc-000000000001',
    '55555555-aaaa-bbbb-cccc-000000000002',
    '55555555-aaaa-bbbb-cccc-000000000003',
  ]

  const now = Date.now()
  const assignments = [
    {
      id: assignmentIds[0],
      program_id: programs[0].id,
      athlete_id: ATHLETE_ID,
      assigned_by: USER_ID,
      group_id: GROUP_ID,
      status: 'completed',
      start_date: dateOffset(-30),
      due_date: dateOffset(-5),
      completed_at: daysAgo(7),
      progress_percentage: 100,
      notes: 'Baslangic programi basariyla tamamlandi. Top kontrolunde belirgin gelisim.',
    },
    {
      id: assignmentIds[1],
      program_id: programs.length > 1 ? programs[1].id : programs[0].id,
      athlete_id: ATHLETE_ID,
      assigned_by: USER_ID,
      group_id: GROUP_ID,
      status: 'in_progress',
      start_date: dateOffset(-14),
      due_date: dateOffset(14),
      progress_percentage: 65,
      notes: 'Hiz ve ceviklik programi devam ediyor. Sprint zamanlari iyilesiyor.',
    },
    {
      id: assignmentIds[2],
      program_id: programs.length > 2 ? programs[2].id : programs[0].id,
      athlete_id: ATHLETE_ID,
      assigned_by: USER_ID,
      group_id: GROUP_ID,
      status: 'assigned',
      start_date: dateOffset(1),
      due_date: dateOffset(28),
      progress_percentage: 0,
      notes: 'Gelecek hafta baslayacak sut teknikleri programi.',
    },
  ]

  const { error } = await supabase.from('assigned_programs').upsert(assignments as any)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'assigned_programs', count: 0, status: 'ERROR: ' + error.message })
    return []
  }

  console.log(`   Upserted ${assignments.length} assigned programs`)
  results.push({ table: 'assigned_programs', count: assignments.length, status: 'UPSERTED' })
  return assignmentIds
}

async function seedTrainingLogs(assignmentIds: string[]) {
  console.log('\n4. TRAINING LOGS')

  if (assignmentIds.length === 0) {
    console.error('   No assignment IDs available. Skipping.')
    results.push({ table: 'training_logs', count: 0, status: 'SKIPPED (no assignments)' })
    return
  }

  const logs = [
    {
      athlete_id: ATHLETE_ID,
      assigned_program_id: assignmentIds[0],
      date: dateOffset(-28),
      duration_minutes: 45,
      intensity_level: 6,
      completion_status: 'completed',
      exercises_completed: JSON.stringify([
        { name: 'Top Sektirme', sets: 3, reps: 20 },
        { name: 'Kisa Pas', duration: 120 },
      ]),
      notes: 'Ilk antrenman. Motivasyon cok yuksek.',
      coach_feedback: 'Guzel baslangiç. Top kontrolunde dogal yetenek var.',
      feedback_by: USER_ID,
      feedback_at: daysAgo(27),
      xp_earned: 50,
    },
    {
      athlete_id: ATHLETE_ID,
      assigned_program_id: assignmentIds[0],
      date: dateOffset(-21),
      duration_minutes: 50,
      intensity_level: 7,
      completion_status: 'completed',
      exercises_completed: JSON.stringify([
        { name: 'Top Surme - Slalom', sets: 3, reps: 5 },
        { name: 'Kontrol ve Donus', sets: 3, reps: 8 },
      ]),
      notes: 'Top surme hizi artti.',
      coach_feedback: 'Slalom surmede cok iyi ilerleme. Zayif ayagi da calistirmaliyiz.',
      feedback_by: USER_ID,
      feedback_at: daysAgo(20),
      xp_earned: 65,
    },
    {
      athlete_id: ATHLETE_ID,
      assigned_program_id: assignmentIds[0],
      date: dateOffset(-14),
      duration_minutes: 55,
      intensity_level: 8,
      completion_status: 'completed',
      exercises_completed: JSON.stringify([
        { name: 'Uzun Pas', sets: 3, reps: 10 },
        { name: 'Kombine Top Calismasi', sets: 3, reps: 5 },
      ]),
      notes: 'Programin son antrenmani. Tum hedefler karsilandi.',
      coach_feedback: 'Programi basariyla tamamladi. Uzun pas dogrulugu %70e cikti.',
      feedback_by: USER_ID,
      feedback_at: daysAgo(13),
      xp_earned: 80,
    },
    {
      athlete_id: ATHLETE_ID,
      assigned_program_id: assignmentIds[1],
      date: dateOffset(-10),
      duration_minutes: 60,
      intensity_level: 8,
      completion_status: 'completed',
      exercises_completed: JSON.stringify([
        { name: 'Sprint 20m', sets: 5, reps: 1 },
        { name: 'Merdiven Drili', sets: 3, reps: 5 },
        { name: 'Lateral Sicrama', sets: 3, reps: 8 },
      ]),
      notes: 'Sprint zamanlari olculdu. 3.32sn.',
      coach_feedback: 'Cikis hizi mukemmel. Yari mesafe hizlanmasi gelistirilmeli.',
      feedback_by: USER_ID,
      feedback_at: daysAgo(9),
      xp_earned: 75,
    },
    {
      athlete_id: ATHLETE_ID,
      assigned_program_id: assignmentIds[1],
      date: dateOffset(-5),
      duration_minutes: 65,
      intensity_level: 9,
      completion_status: 'completed',
      exercises_completed: JSON.stringify([
        { name: 'Karioka Kosu', sets: 3, duration: 60 },
        { name: 'Reaksiyon Koordinasyonu', sets: 3, reps: 8 },
        { name: 'Box Jump', sets: 3, reps: 8 },
      ]),
      notes: 'Ceviklik testinde 10.5sn. Onemli gelisim.',
      coach_feedback: 'Yon degistirme hizi artti. Bu tempo devam etmeli.',
      feedback_by: USER_ID,
      feedback_at: daysAgo(4),
      xp_earned: 85,
    },
    {
      athlete_id: ATHLETE_ID,
      assigned_program_id: assignmentIds[1],
      date: dateOffset(-2),
      duration_minutes: 55,
      intensity_level: 7,
      completion_status: 'in_progress',
      exercises_completed: JSON.stringify([
        { name: 'Sprint drilleri', sets: 4, reps: 1 },
        { name: 'Ceviklik parkuru', sets: 2, reps: 3 },
      ]),
      notes: 'Hafif kas yorgunlugu nedeniyle erken bitirildi.',
      coach_feedback: 'Dinlenme gunu verilmeli. Kas yorgunlugu dikkat edilmeli.',
      feedback_by: USER_ID,
      feedback_at: daysAgo(1),
      xp_earned: 40,
    },
  ]

  const { error } = await supabase.from('training_logs').insert(logs as any)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'training_logs', count: 0, status: 'ERROR: ' + error.message })
    return
  }

  console.log(`   Inserted ${logs.length} training logs`)
  results.push({ table: 'training_logs', count: logs.length, status: 'INSERTED' })
}

async function seedFeePlans(): Promise<string[]> {
  console.log('\n5. FEE PLANS')

  const planIds = [
    '66666666-aaaa-bbbb-cccc-000000000001',
    '66666666-aaaa-bbbb-cccc-000000000002',
    '66666666-aaaa-bbbb-cccc-000000000003',
  ]

  const plans = [
    {
      id: planIds[0],
      organization_id: ORG_ID,
      name: 'Aylik Standart',
      description: 'Haftada 3 gun antrenman. Temel program dahil.',
      amount: 500,
      currency: 'TRY',
      billing_cycle: 'monthly',
      is_active: true,
    },
    {
      id: planIds[1],
      organization_id: ORG_ID,
      name: 'Aylik Premium',
      description: 'Haftada 5 gun antrenman + bireysel calisma + mac analizi.',
      amount: 800,
      currency: 'TRY',
      billing_cycle: 'monthly',
      is_active: true,
    },
    {
      id: planIds[2],
      organization_id: ORG_ID,
      name: 'Yillik Paket',
      description: '12 aylik premium uyelik. %15 indirimli. Forma + krampon hediye.',
      amount: 5000,
      currency: 'TRY',
      billing_cycle: 'yearly',
      is_active: true,
    },
  ]

  const { error } = await supabase.from('fee_plans').upsert(plans)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'fee_plans', count: 0, status: 'ERROR: ' + error.message })
    return []
  }

  console.log(`   Upserted ${plans.length} fee plans`)
  results.push({ table: 'fee_plans', count: plans.length, status: 'UPSERTED' })
  return planIds
}

async function seedFeePayments(planIds: string[]) {
  console.log('\n6. FEE PAYMENTS')

  if (planIds.length === 0) {
    console.error('   No plan IDs available. Skipping.')
    results.push({ table: 'fee_payments', count: 0, status: 'SKIPPED (no plans)' })
    return
  }

  const payments = [
    {
      id: '77777777-aaaa-bbbb-cccc-000000000001',
      organization_id: ORG_ID,
      athlete_id: ATHLETE_ID,
      fee_plan_id: planIds[1], // Premium
      amount: 800,
      currency: 'TRY',
      due_date: dateOffset(-60),
      paid_date: dateOffset(-58),
      status: 'paid',
      payment_method: 'havale',
      notes: 'Kasim ayi aidati. Banka havalesi ile odendi.',
      recorded_by: USER_ID,
    },
    {
      id: '77777777-aaaa-bbbb-cccc-000000000002',
      organization_id: ORG_ID,
      athlete_id: ATHLETE_ID,
      fee_plan_id: planIds[1], // Premium
      amount: 800,
      currency: 'TRY',
      due_date: dateOffset(-30),
      paid_date: dateOffset(-28),
      status: 'paid',
      payment_method: 'nakit',
      notes: 'Aralik ayi aidati. Elden nakit odendi.',
      recorded_by: USER_ID,
    },
    {
      id: '77777777-aaaa-bbbb-cccc-000000000003',
      organization_id: ORG_ID,
      athlete_id: ATHLETE_ID,
      fee_plan_id: planIds[1], // Premium
      amount: 800,
      currency: 'TRY',
      due_date: dateOffset(-5),
      paid_date: dateOffset(-3),
      status: 'paid',
      payment_method: 'havale',
      notes: 'Ocak ayi aidati.',
      recorded_by: USER_ID,
    },
    {
      id: '77777777-aaaa-bbbb-cccc-000000000004',
      organization_id: ORG_ID,
      athlete_id: ATHLETE_ID,
      fee_plan_id: planIds[1], // Premium
      amount: 800,
      currency: 'TRY',
      due_date: dateOffset(25),
      status: 'pending',
      notes: 'Subat ayi aidati. Henuz odenmedi.',
      recorded_by: USER_ID,
    },
    {
      id: '77777777-aaaa-bbbb-cccc-000000000005',
      organization_id: ORG_ID,
      athlete_id: ATHLETE_ID,
      fee_plan_id: planIds[1], // Premium
      amount: 800,
      currency: 'TRY',
      due_date: dateOffset(-35),
      status: 'overdue',
      notes: 'Geciken odeme - veli ile gorusulecek.',
      recorded_by: USER_ID,
    },
  ]

  const { error } = await supabase.from('fee_payments').upsert(payments as any)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'fee_payments', count: 0, status: 'ERROR: ' + error.message })
    return
  }

  console.log(`   Upserted ${payments.length} fee payments`)
  results.push({ table: 'fee_payments', count: payments.length, status: 'UPSERTED' })
}

async function seedAchievementsAndAthleteAchievements() {
  console.log('\n7. ATHLETE ACHIEVEMENTS')

  // First get system achievements
  const { data: sysAchievements } = await supabase
    .from('achievements')
    .select('id, code, name, xp_reward')
    .eq('is_system', true)

  if (!sysAchievements || sysAchievements.length === 0) {
    console.error('   No system achievements found. Skipping.')
    results.push({ table: 'athlete_achievements', count: 0, status: 'SKIPPED (no achievements)' })
    return
  }

  console.log(`   Found ${sysAchievements.length} system achievements`)

  // Map by code for easy access
  const achMap: Record<string, { id: string; xp_reward: number }> = {}
  sysAchievements.forEach((a: any) => { achMap[a.code] = { id: a.id, xp_reward: a.xp_reward } })

  // Pick 5 achievements for the athlete
  const targetCodes = ['first_training', 'week_warrior', 'streak_7', 'perfect_attendance', 'goal_setter']
  const athleteAchievements: any[] = []

  targetCodes.forEach((code, idx) => {
    if (achMap[code]) {
      athleteAchievements.push({
        athlete_id: ATHLETE_ID,
        achievement_id: achMap[code].id,
        earned_at: daysAgo(30 - idx * 5),
        progress_data: { completed: true, xp_earned: achMap[code].xp_reward },
      })
    }
  })

  if (athleteAchievements.length === 0) {
    console.error('   No matching achievement codes found')
    results.push({ table: 'athlete_achievements', count: 0, status: 'SKIPPED (no matching codes)' })
    return
  }

  // Use upsert with onConflict for athlete_id + achievement_id unique constraint
  const { error } = await supabase.from('athlete_achievements').upsert(athleteAchievements, {
    onConflict: 'athlete_id,achievement_id',
  })
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'athlete_achievements', count: 0, status: 'ERROR: ' + error.message })
    return
  }

  console.log(`   Upserted ${athleteAchievements.length} athlete achievements`)
  results.push({ table: 'athlete_achievements', count: athleteAchievements.length, status: 'UPSERTED' })
}

async function seedAthleteGoals() {
  console.log('\n8. ATHLETE GOALS')

  // Get metric type IDs for goals
  const { data: metrics } = await supabase
    .from('metric_types')
    .select('id, code')
    .eq('is_system', true)

  const mMap: Record<string, string> = {}
  metrics?.forEach((m: any) => { mMap[m.code] = m.id })

  const sprintMetricId = mMap['sprint_20m'] || mMap['sprint_20m_custom'] || null
  const passMetricId = mMap['passing_accuracy'] || mMap['passing_pct'] || null

  const goals = [
    {
      id: '88888888-aaaa-bbbb-cccc-000000000001',
      athlete_id: ATHLETE_ID,
      metric_type_id: sprintMetricId,
      title: 'Sprint 20m Hedefi',
      description: '20m sprint suresini 3.10 saniyenin altina dusurmek',
      target_value: 3.10,
      current_value: 3.18,
      start_date: dateOffset(-30),
      target_date: dateOffset(60),
      is_active: true,
    },
    {
      id: '88888888-aaaa-bbbb-cccc-000000000002',
      athlete_id: ATHLETE_ID,
      metric_type_id: passMetricId,
      title: 'Pas Isabeti Hedefi',
      description: 'Pas isabet oranini %85 seviyesine cikarmak',
      target_value: 85,
      current_value: 70,
      start_date: dateOffset(-20),
      target_date: dateOffset(45),
      is_active: true,
    },
    {
      id: '88888888-aaaa-bbbb-cccc-000000000003',
      athlete_id: ATHLETE_ID,
      title: 'Katilim Orani',
      description: 'Aylik antrenmanlara %95 katilim orani saglamak',
      target_value: 95,
      current_value: 88,
      start_date: dateOffset(-15),
      target_date: dateOffset(30),
      is_active: true,
    },
  ]

  const { error } = await supabase.from('athlete_goals').upsert(goals as any)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'athlete_goals', count: 0, status: 'ERROR: ' + error.message })
    return
  }

  console.log(`   Upserted ${goals.length} athlete goals`)
  results.push({ table: 'athlete_goals', count: goals.length, status: 'UPSERTED' })
}

async function seedExercises() {
  console.log('\n9. EXERCISES')
  console.log('   Checking if exercises already exist...')

  const { data: existing, count } = await supabase
    .from('exercises')
    .select('id', { count: 'exact' })
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`   Exercises table already has data (${count || 'some'} rows). Skipping.`)
    results.push({ table: 'exercises', count: count || 0, status: 'SKIPPED (already exist)' })
    return
  }

  // The migration should have already inserted 35 system exercises.
  // If somehow the table is empty, insert 20 across 5 categories.
  console.log('   Exercises table is empty. Inserting 20 exercises...')

  const exercises = [
    // Teknik (ball_work)
    { category: 'ball_work', difficulty: 'easy', order_number: 1, name: 'Ic Ayak Pas', description: 'Ciftler halinde ic ayak ile kisa pas calismasi', repetitions: 20, rest_seconds: 15, sets: 3, is_system: true },
    { category: 'ball_work', difficulty: 'easy', order_number: 2, name: 'Top Hakimiyeti', description: 'Ayak ustu ile top sektirme ve kontrol', repetitions: 30, rest_seconds: 20, sets: 3, is_system: true },
    { category: 'ball_work', difficulty: 'medium', order_number: 3, name: 'Slalom Surme', description: 'Huniler arasinda top surme', repetitions: 5, rest_seconds: 30, sets: 3, is_system: true },
    { category: 'ball_work', difficulty: 'hard', order_number: 6, name: 'Kale Sutu', description: 'Ceza sahasi disindan isabetli sut calismasi', repetitions: 10, rest_seconds: 30, sets: 3, is_system: true },
    // Fiziksel (strength_agility)
    { category: 'strength_agility', difficulty: 'easy', order_number: 1, name: 'Vucut Agirlik Squat', description: 'Temel squat hareketi', repetitions: 15, rest_seconds: 30, sets: 3, is_system: true },
    { category: 'strength_agility', difficulty: 'easy', order_number: 2, name: 'Plank Calismasi', description: 'Core guclenme icin plank', duration_seconds: 30, rest_seconds: 20, sets: 3, is_system: true },
    { category: 'strength_agility', difficulty: 'medium', order_number: 3, name: 'Lunge Yuruyusu', description: 'Alternatif bacak ile lunge', repetitions: 10, rest_seconds: 30, sets: 3, is_system: true },
    { category: 'strength_agility', difficulty: 'hard', order_number: 6, name: 'Burpee Serisi', description: 'Tam burpee hareketi', repetitions: 10, rest_seconds: 40, sets: 3, is_system: true },
    // Taktik (coordination)
    { category: 'coordination', difficulty: 'easy', order_number: 1, name: 'Merdiven Drili Temel', description: 'Koordinasyon merdiveninde ileri kosu', repetitions: 5, rest_seconds: 20, sets: 3, is_system: true },
    { category: 'coordination', difficulty: 'medium', order_number: 3, name: 'Yan Adim Drili', description: 'Koordinasyon merdiveninde yana hareket', repetitions: 5, rest_seconds: 25, sets: 3, is_system: true },
    { category: 'coordination', difficulty: 'medium', order_number: 4, name: 'Capraz Adim', description: 'Merdivende capraz adimlarla ilerleme', repetitions: 5, rest_seconds: 25, sets: 3, is_system: true },
    { category: 'coordination', difficulty: 'hard', order_number: 6, name: 'Kombine Parkur', description: 'Merdiven + huni + engel kombinasyonu', repetitions: 3, rest_seconds: 45, sets: 3, is_system: true },
    // Mental (warmup used as proxy)
    { category: 'warmup', difficulty: 'easy', order_number: 1, name: 'Hafif Kosu Isinma', description: 'Duz cizgide hafif tempoda kosu', duration_seconds: 120, rest_seconds: 30, sets: 1, is_system: true },
    { category: 'warmup', difficulty: 'easy', order_number: 2, name: 'Diz Cekme', description: 'Yururken dizleri goguse cekme', repetitions: 15, rest_seconds: 15, sets: 2, is_system: true },
    { category: 'warmup', difficulty: 'medium', order_number: 3, name: 'Dinamik Germe', description: 'Lunge yuruyusu ile dinamik germe', repetitions: 10, rest_seconds: 20, sets: 2, is_system: true },
    { category: 'warmup', difficulty: 'hard', order_number: 7, name: 'Kombinasyon Isinma', description: 'Kosu + diz cekme + topuk kici kombinasyonu', duration_seconds: 120, rest_seconds: 30, sets: 2, is_system: true },
    // Kaleci (cooldown used as proxy)
    { category: 'cooldown', difficulty: 'easy', order_number: 1, name: 'Yavas Kosu Soguma', description: 'Tempo dusurme kosusu', duration_seconds: 180, rest_seconds: 0, sets: 1, is_system: true },
    { category: 'cooldown', difficulty: 'easy', order_number: 2, name: 'Hamstring Germe', description: 'Oturarak hamstring esnetme', duration_seconds: 30, rest_seconds: 10, sets: 2, is_system: true },
    { category: 'cooldown', difficulty: 'medium', order_number: 4, name: 'Kalca Acma', description: 'Kelebek germe ve kalca acma hareketi', duration_seconds: 30, rest_seconds: 10, sets: 2, is_system: true },
    { category: 'cooldown', difficulty: 'hard', order_number: 6, name: 'Yoga Pozisyonlari', description: 'Asagi bakan kopek, cocuk pozu vb.', duration_seconds: 45, rest_seconds: 15, sets: 2, is_system: true },
  ]

  const { error } = await (supabase as any).from('exercises').insert(exercises)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'exercises', count: 0, status: 'ERROR: ' + error.message })
    return
  }

  console.log(`   Inserted ${exercises.length} exercises`)
  results.push({ table: 'exercises', count: exercises.length, status: 'INSERTED' })
}

async function seedTrainingTemplates() {
  console.log('\n10. TRAINING TEMPLATES')
  console.log('   Checking for existing templates for this org...')

  // Check for org-specific templates
  const { data: existing } = await (supabase as any)
    .from('training_templates')
    .select('id')
    .eq('organization_id', ORG_ID)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('   Org-specific templates already exist. Skipping.')
    results.push({ table: 'training_templates', count: 0, status: 'SKIPPED (already exist for org)' })
    return
  }

  const templates = [
    {
      id: '99999999-aaaa-bbbb-cccc-000000000001',
      organization_id: ORG_ID,
      age_group: 'U13',
      template_type: 'technical',
      name: 'U13 Teknik Gelistirme',
      description: 'Top kontrolu, pas ve sut tekniklerini gelistirme oturumu. Ic ayak - dis ayak calismasi.',
      duration_minutes: 80,
      intensity_level: 6,
      notes: 'Ozellikle zayif ayak calismasi yapilmali',
      created_by: USER_ID,
      is_system: false,
      is_active: true,
    },
    {
      id: '99999999-aaaa-bbbb-cccc-000000000002',
      organization_id: ORG_ID,
      age_group: 'U13',
      template_type: 'physical',
      name: 'U13 Fiziksel Hazirlik',
      description: 'Hiz, ceviklik ve kuvvet gelistirme. Sprint drilleri + core calismasi.',
      duration_minutes: 70,
      intensity_level: 7,
      notes: 'Isinma ve soguma surelerine dikkat',
      created_by: USER_ID,
      is_system: false,
      is_active: true,
    },
    {
      id: '99999999-aaaa-bbbb-cccc-000000000003',
      organization_id: ORG_ID,
      age_group: 'U13',
      template_type: 'tactical',
      name: 'U13 Taktik Calisma',
      description: 'Pozisyonel oyun, formasyon gecisleri, kanat ataklari calismasi.',
      duration_minutes: 85,
      intensity_level: 5,
      notes: '4-3-3 ve 4-2-3-1 gecisleri',
      created_by: USER_ID,
      is_system: false,
      is_active: true,
    },
    {
      id: '99999999-aaaa-bbbb-cccc-000000000004',
      organization_id: ORG_ID,
      age_group: 'U13',
      template_type: 'game_based',
      name: 'U13 Karma Antrenman',
      description: 'Teknik + taktik + mini mac kombinasyonu. 7v7 oyunlarla tamamlama.',
      duration_minutes: 90,
      intensity_level: 7,
      notes: 'Mini maclar 15dk periyotlar halinde',
      created_by: USER_ID,
      is_system: false,
      is_active: true,
    },
  ]

  const { error } = await (supabase as any).from('training_templates').upsert(templates)
  if (error) {
    console.error('   Error:', error.message)
    results.push({ table: 'training_templates', count: 0, status: 'ERROR: ' + error.message })
    return
  }

  console.log(`   Upserted ${templates.length} training templates`)
  results.push({ table: 'training_templates', count: templates.length, status: 'UPSERTED' })
}

async function main() {
  console.log('==============================================')
  console.log('  Academy360 - Complete Organization Seed')
  console.log('==============================================')
  console.log(`  User ID:    ${USER_ID}`)
  console.log(`  Org ID:     ${ORG_ID}`)
  console.log(`  Athlete ID: ${ATHLETE_ID}`)
  console.log(`  Group ID:   ${GROUP_ID}`)
  console.log('==============================================')

  // 1. Metric Types (system-wide check first)
  const metricMap = await seedMetricTypes()

  // 2. Performance Records
  await seedPerformanceRecords(metricMap)

  // 3. Assigned Programs
  const assignmentIds = await seedAssignedPrograms()

  // 4. Training Logs
  await seedTrainingLogs(assignmentIds)

  // 5. Fee Plans
  const planIds = await seedFeePlans()

  // 6. Fee Payments
  await seedFeePayments(planIds)

  // 7. Athlete Achievements
  await seedAchievementsAndAthleteAchievements()

  // 8. Athlete Goals
  await seedAthleteGoals()

  // 9. Exercises (check if already exist)
  await seedExercises()

  // 10. Training Templates (org-specific)
  await seedTrainingTemplates()

  // Summary
  console.log('\n==============================================')
  console.log('  SEED SUMMARY')
  console.log('==============================================')
  console.log('')
  console.log('  Table                    | Count | Status')
  console.log('  -------------------------|-------|------------------')
  for (const r of results) {
    const table = r.table.padEnd(25)
    const count = String(r.count).padStart(5)
    console.log(`  ${table}| ${count} | ${r.status}`)
  }
  console.log('')
  console.log('==============================================')

  const totalInserted = results.reduce((acc, r) => acc + (r.status.includes('ERROR') || r.status.includes('SKIPPED') ? 0 : r.count), 0)
  console.log(`  Total records seeded: ${totalInserted}`)
  console.log('==============================================')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
