/**
 * Seed SQL dosyasını Supabase'e çalıştıran script
 *
 * Kullanım:
 * npx tsx scripts/run-seed-sql.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function runSeedSQL() {
  console.log('🌱 Seed SQL dosyası çalıştırılıyor...\n')

  // SQL dosyasını oku
  const seedPath = resolve(process.cwd(), 'supabase/seed.sql')
  const sql = readFileSync(seedPath, 'utf-8')

  // SQL'i parçalara ayır (her INSERT ayrı çalışsın)
  // Yorumları ve boş satırları temizle, sonra statements'ları ayır
  const statements = sql
    .split(/;[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && s !== 'CASCADE')

  let success = 0
  let errors = 0

  for (const statement of statements) {
    // Sadece TRUNCATE, INSERT, SELECT içeren statement'ları çalıştır
    if (
      !statement.toUpperCase().startsWith('TRUNCATE') &&
      !statement.toUpperCase().startsWith('INSERT') &&
      !statement.toUpperCase().startsWith('SELECT')
    ) {
      continue
    }

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })

      if (error) {
        // RPC fonksiyonu yoksa direkt query dene - bu Supabase'de çalışmaz ama
        // hata mesajı için logla
        console.error(`❌ Hata: ${error.message}`)
        console.error(`   Statement: ${statement.substring(0, 80)}...`)
        errors++
      } else {
        success++
      }
    } catch (err) {
      console.error(`❌ Exception: ${err}`)
      errors++
    }
  }

  console.log(`\n📊 Sonuç: ${success} başarılı, ${errors} hata`)
}

// Alternatif: Supabase REST API ile her tabloyu ayrı ayrı seed et
async function seedWithRestAPI() {
  console.log('🌱 REST API ile seed başlatılıyor...\n')

  const orgId = 'a0000000-0000-0000-0000-000000000001'

  // 1. Organization
  console.log('📁 Organization oluşturuluyor...')
  const { error: orgError } = await supabase.from('organizations').upsert({
    id: orgId,
    name: 'Yıldız Futbol Akademisi',
    slug: 'yildiz-futbol-akademisi',
    subscription_tier: 'premium',
    subscription_valid_until: '2027-12-31',
    settings: { theme: 'emerald', language: 'tr', maxAthletes: 100 },
  })
  if (orgError) console.error('  ❌', orgError.message)
  else console.log('  ✅ Organization oluşturuldu')

  // 2. User Profiles
  console.log('👤 User profiles oluşturuluyor...')
  const userProfiles = [
    { id: 'b0000000-0000-0000-0000-000000000001', email: 'superadmin@academy360.com', full_name: 'Sistem Yöneticisi', phone: '+905551234500' },
    { id: 'b0000000-0000-0000-0000-000000000002', email: 'admin@yildizakademi.com', full_name: 'Ahmet Yılmaz', phone: '+905551234501' },
    { id: 'b0000000-0000-0000-0000-000000000003', email: 'mehmet.demir@yildizakademi.com', full_name: 'Mehmet Demir', phone: '+905551234502' },
    { id: 'b0000000-0000-0000-0000-000000000004', email: 'ayse.kaya@yildizakademi.com', full_name: 'Ayşe Kaya', phone: '+905551234503' },
    { id: 'b0000000-0000-0000-0000-000000000010', email: 'enes.yildirim@email.com', full_name: 'Enes Yıldırım', phone: '+905551234510' },
    { id: 'b0000000-0000-0000-0000-000000000011', email: 'kerem.ozturk@email.com', full_name: 'Kerem Öztürk', phone: '+905551234511' },
    { id: 'b0000000-0000-0000-0000-000000000012', email: 'ali.sahin@email.com', full_name: 'Ali Şahin', phone: '+905551234512' },
    { id: 'b0000000-0000-0000-0000-000000000013', email: 'burak.celik@email.com', full_name: 'Burak Çelik', phone: '+905551234513' },
    { id: 'b0000000-0000-0000-0000-000000000014', email: 'can.arslan@email.com', full_name: 'Can Arslan', phone: '+905551234514' },
    { id: 'b0000000-0000-0000-0000-000000000015', email: 'deniz.kara@email.com', full_name: 'Deniz Kara', phone: '+905551234515' },
    { id: 'b0000000-0000-0000-0000-000000000016', email: 'emre.polat@email.com', full_name: 'Emre Polat', phone: '+905551234516' },
    { id: 'b0000000-0000-0000-0000-000000000017', email: 'furkan.korkmaz@email.com', full_name: 'Furkan Korkmaz', phone: '+905551234517' },
    { id: 'b0000000-0000-0000-0000-000000000020', email: 'hakan.yildirim@email.com', full_name: 'Hakan Yıldırım', phone: '+905551234520' },
    { id: 'b0000000-0000-0000-0000-000000000021', email: 'fatma.ozturk@email.com', full_name: 'Fatma Öztürk', phone: '+905551234521' },
    { id: 'b0000000-0000-0000-0000-000000000022', email: 'mustafa.sahin@email.com', full_name: 'Mustafa Şahin', phone: '+905551234522' },
    { id: 'b0000000-0000-0000-0000-000000000023', email: 'zeynep.celik@email.com', full_name: 'Zeynep Çelik', phone: '+905551234523' },
  ].map((u) => ({ ...u, kvkk_consent: true, kvkk_consent_date: new Date().toISOString(), onboarding_completed: true, locale: 'tr', timezone: 'Europe/Istanbul' }))

  const { error: profileError } = await supabase.from('user_profiles').upsert(userProfiles)
  if (profileError) console.error('  ❌', profileError.message)
  else console.log('  ✅', userProfiles.length, 'user profile oluşturuldu')

  // 3. Memberships
  console.log('🎫 Memberships oluşturuluyor...')
  const memberships = [
    { id: 'c0000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000001', organization_id: orgId, role: 'super_admin', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000002', user_id: 'b0000000-0000-0000-0000-000000000002', organization_id: orgId, role: 'club_admin', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000003', user_id: 'b0000000-0000-0000-0000-000000000003', organization_id: orgId, role: 'coach', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000004', user_id: 'b0000000-0000-0000-0000-000000000004', organization_id: orgId, role: 'coach', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000010', user_id: 'b0000000-0000-0000-0000-000000000010', organization_id: orgId, role: 'athlete', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000011', user_id: 'b0000000-0000-0000-0000-000000000011', organization_id: orgId, role: 'athlete', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000012', user_id: 'b0000000-0000-0000-0000-000000000012', organization_id: orgId, role: 'athlete', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000013', user_id: 'b0000000-0000-0000-0000-000000000013', organization_id: orgId, role: 'athlete', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000014', user_id: 'b0000000-0000-0000-0000-000000000014', organization_id: orgId, role: 'athlete', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000015', user_id: 'b0000000-0000-0000-0000-000000000015', organization_id: orgId, role: 'athlete', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000016', user_id: 'b0000000-0000-0000-0000-000000000016', organization_id: orgId, role: 'athlete', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000017', user_id: 'b0000000-0000-0000-0000-000000000017', organization_id: orgId, role: 'athlete', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000020', user_id: 'b0000000-0000-0000-0000-000000000020', organization_id: orgId, role: 'parent', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000021', user_id: 'b0000000-0000-0000-0000-000000000021', organization_id: orgId, role: 'parent', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000022', user_id: 'b0000000-0000-0000-0000-000000000022', organization_id: orgId, role: 'parent', status: 'active' },
    { id: 'c0000000-0000-0000-0000-000000000023', user_id: 'b0000000-0000-0000-0000-000000000023', organization_id: orgId, role: 'parent', status: 'active' },
  ]
  const { error: memError } = await supabase.from('memberships').upsert(memberships)
  if (memError) console.error('  ❌', memError.message)
  else console.log('  ✅', memberships.length, 'membership oluşturuldu')

  // 4. Coach Profiles
  console.log('🏋️ Coach profiles oluşturuluyor...')
  const coachProfiles = [
    { id: 'd0000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000003', organization_id: orgId, specialization: 'Teknik Direktör', license_type: 'UEFA Pro', license_number: 'TR-PRO-2024-001', years_experience: 15, bio: 'Eski milli takım oyuncusu. 15 yıllık antrenörlük deneyimi.' },
    { id: 'd0000000-0000-0000-0000-000000000002', user_id: 'b0000000-0000-0000-0000-000000000004', organization_id: orgId, specialization: 'Kaleci Antrenörü', license_type: 'UEFA B', license_number: 'TR-B-2024-042', years_experience: 8, bio: 'Kaleci antrenörlüğünde uzman.' },
  ]
  const { error: coachError } = await supabase.from('coach_profiles').upsert(coachProfiles)
  if (coachError) console.error('  ❌', coachError.message)
  else console.log('  ✅', coachProfiles.length, 'coach profile oluşturuldu')

  // 5. Athlete Profiles
  console.log('⚽ Athlete profiles oluşturuluyor...')
  const athleteProfiles = [
    { id: 'e0000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000010', organization_id: orgId, birth_date: '2012-03-15', position: 'Forvet', dominant_foot: 'Sağ', height_cm: 152, weight_kg: 42, jersey_number: 10, current_level: 5, total_xp: 2450, streak_days: 12 },
    { id: 'e0000000-0000-0000-0000-000000000002', user_id: 'b0000000-0000-0000-0000-000000000011', organization_id: orgId, birth_date: '2012-07-22', position: 'Orta Saha', dominant_foot: 'Sol', height_cm: 148, weight_kg: 38, jersey_number: 8, current_level: 4, total_xp: 1890, streak_days: 8 },
    { id: 'e0000000-0000-0000-0000-000000000003', user_id: 'b0000000-0000-0000-0000-000000000012', organization_id: orgId, birth_date: '2011-11-08', position: 'Defans', dominant_foot: 'Sağ', height_cm: 158, weight_kg: 48, jersey_number: 4, current_level: 6, total_xp: 3200, streak_days: 15 },
    { id: 'e0000000-0000-0000-0000-000000000004', user_id: 'b0000000-0000-0000-0000-000000000013', organization_id: orgId, birth_date: '2013-02-28', position: 'Kaleci', dominant_foot: 'Sağ', height_cm: 155, weight_kg: 45, jersey_number: 1, current_level: 4, total_xp: 1750, streak_days: 5 },
    { id: 'e0000000-0000-0000-0000-000000000005', user_id: 'b0000000-0000-0000-0000-000000000014', organization_id: orgId, birth_date: '2012-09-10', position: 'Kanat', dominant_foot: 'Sol', height_cm: 150, weight_kg: 40, jersey_number: 7, current_level: 5, total_xp: 2100, streak_days: 10 },
    { id: 'e0000000-0000-0000-0000-000000000006', user_id: 'b0000000-0000-0000-0000-000000000015', organization_id: orgId, birth_date: '2014-01-05', position: 'Orta Saha', dominant_foot: 'Sağ', height_cm: 142, weight_kg: 35, jersey_number: 6, current_level: 3, total_xp: 980, streak_days: 3 },
    { id: 'e0000000-0000-0000-0000-000000000007', user_id: 'b0000000-0000-0000-0000-000000000016', organization_id: orgId, birth_date: '2013-06-18', position: 'Defans', dominant_foot: 'Sağ', height_cm: 153, weight_kg: 44, jersey_number: 5, current_level: 4, total_xp: 1650, streak_days: 7 },
    { id: 'e0000000-0000-0000-0000-000000000008', user_id: 'b0000000-0000-0000-0000-000000000017', organization_id: orgId, birth_date: '2011-12-25', position: 'Forvet', dominant_foot: 'Sağ', height_cm: 160, weight_kg: 50, jersey_number: 9, current_level: 7, total_xp: 4100, streak_days: 20 },
  ]
  const { error: athleteError } = await supabase.from('athlete_profiles').upsert(athleteProfiles)
  if (athleteError) console.error('  ❌', athleteError.message)
  else console.log('  ✅', athleteProfiles.length, 'athlete profile oluşturuldu')

  // 6. Groups
  console.log('👥 Groups oluşturuluyor...')
  const groups = [
    { id: '10000000-0000-0000-0000-000000000001', organization_id: orgId, name: 'U12 Yıldızlar', description: '2012-2013 doğumlu sporcular', age_group: 'U12', max_members: 20, is_active: true },
    { id: '10000000-0000-0000-0000-000000000002', organization_id: orgId, name: 'U14 Şampiyonlar', description: '2010-2011 doğumlu sporcular', age_group: 'U14', max_members: 20, is_active: true },
    { id: '10000000-0000-0000-0000-000000000003', organization_id: orgId, name: 'U10 Minikler', description: '2014-2015 doğumlu sporcular', age_group: 'U10', max_members: 15, is_active: true },
  ]
  const { error: groupError } = await supabase.from('groups').upsert(groups)
  if (groupError) console.error('  ❌', groupError.message)
  else console.log('  ✅', groups.length, 'group oluşturuldu')

  // 7. Group Members
  console.log('👥 Group members oluşturuluyor...')
  const groupMembers = [
    { id: '20000000-0000-0000-0000-000000000001', group_id: '10000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000010', role: 'member', is_active: true },
    { id: '20000000-0000-0000-0000-000000000002', group_id: '10000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000011', role: 'member', is_active: true },
    { id: '20000000-0000-0000-0000-000000000003', group_id: '10000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000013', role: 'member', is_active: true },
    { id: '20000000-0000-0000-0000-000000000004', group_id: '10000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000014', role: 'member', is_active: true },
    { id: '20000000-0000-0000-0000-000000000005', group_id: '10000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000016', role: 'member', is_active: true },
    { id: '20000000-0000-0000-0000-000000000006', group_id: '10000000-0000-0000-0000-000000000002', user_id: 'b0000000-0000-0000-0000-000000000012', role: 'member', is_active: true },
    { id: '20000000-0000-0000-0000-000000000007', group_id: '10000000-0000-0000-0000-000000000002', user_id: 'b0000000-0000-0000-0000-000000000017', role: 'member', is_active: true },
    { id: '20000000-0000-0000-0000-000000000008', group_id: '10000000-0000-0000-0000-000000000003', user_id: 'b0000000-0000-0000-0000-000000000015', role: 'member', is_active: true },
    { id: '20000000-0000-0000-0000-000000000009', group_id: '10000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000003', role: 'coach', is_active: true },
    { id: '20000000-0000-0000-0000-000000000010', group_id: '10000000-0000-0000-0000-000000000002', user_id: 'b0000000-0000-0000-0000-000000000003', role: 'coach', is_active: true },
    { id: '20000000-0000-0000-0000-000000000011', group_id: '10000000-0000-0000-0000-000000000003', user_id: 'b0000000-0000-0000-0000-000000000004', role: 'coach', is_active: true },
  ]
  const { error: gmError } = await supabase.from('group_members').upsert(groupMembers)
  if (gmError) console.error('  ❌', gmError.message)
  else console.log('  ✅', groupMembers.length, 'group member oluşturuldu')

  // 8. Metric Types
  console.log('📊 Metric types oluşturuluyor...')
  const metricTypes = [
    { id: '30000000-0000-0000-0000-000000000001', code: 'SPRINT_20M', name: '20m Sprint', description: '20 metre sprint süresi', unit: 'saniye', category: 'Hız', data_type: 'decimal', min_value: 2.5, max_value: 6.0, is_higher_better: false, is_system: true, is_active: true, display_order: 1 },
    { id: '30000000-0000-0000-0000-000000000002', code: 'SPRINT_40M', name: '40m Sprint', description: '40 metre sprint süresi', unit: 'saniye', category: 'Hız', data_type: 'decimal', min_value: 4.5, max_value: 10.0, is_higher_better: false, is_system: true, is_active: true, display_order: 2 },
    { id: '30000000-0000-0000-0000-000000000003', code: 'AGILITY_T', name: 'T-Test', description: 'Çeviklik T testi', unit: 'saniye', category: 'Çeviklik', data_type: 'decimal', min_value: 8.0, max_value: 20.0, is_higher_better: false, is_system: true, is_active: true, display_order: 3 },
    { id: '30000000-0000-0000-0000-000000000004', code: 'VERTICAL_JUMP', name: 'Dikey Sıçrama', description: 'Dikey sıçrama yüksekliği', unit: 'cm', category: 'Güç', data_type: 'decimal', min_value: 20, max_value: 80, is_higher_better: true, is_system: true, is_active: true, display_order: 4 },
    { id: '30000000-0000-0000-0000-000000000005', code: 'STANDING_JUMP', name: 'Durarak Uzun Atlama', description: 'Durarak uzun atlama mesafesi', unit: 'cm', category: 'Güç', data_type: 'decimal', min_value: 100, max_value: 300, is_higher_better: true, is_system: true, is_active: true, display_order: 5 },
    { id: '30000000-0000-0000-0000-000000000006', code: 'SHUTTLE_RUN', name: 'Mekik Koşusu', description: 'Yo-Yo testi seviyesi', unit: 'seviye', category: 'Dayanıklılık', data_type: 'decimal', min_value: 1, max_value: 23, is_higher_better: true, is_system: true, is_active: true, display_order: 6 },
    { id: '30000000-0000-0000-0000-000000000007', code: 'BALL_CONTROL', name: 'Top Kontrolü', description: 'Top kontrol becerisi puanı', unit: 'puan', category: 'Teknik', data_type: 'integer', min_value: 1, max_value: 10, is_higher_better: true, is_system: true, is_active: true, display_order: 7 },
    { id: '30000000-0000-0000-0000-000000000008', code: 'PASSING_ACC', name: 'Pas İsabeti', description: 'Pas isabetlilik yüzdesi', unit: '%', category: 'Teknik', data_type: 'decimal', min_value: 0, max_value: 100, is_higher_better: true, is_system: true, is_active: true, display_order: 8 },
    { id: '30000000-0000-0000-0000-000000000009', code: 'SHOOTING_ACC', name: 'Şut İsabeti', description: 'Şut isabetlilik yüzdesi', unit: '%', category: 'Teknik', data_type: 'decimal', min_value: 0, max_value: 100, is_higher_better: true, is_system: true, is_active: true, display_order: 9 },
    { id: '30000000-0000-0000-0000-000000000010', code: 'FLEXIBILITY', name: 'Esneklik', description: 'Otur-uzan testi', unit: 'cm', category: 'Esneklik', data_type: 'decimal', min_value: -10, max_value: 40, is_higher_better: true, is_system: true, is_active: true, display_order: 10 },
  ]
  const { error: metricError } = await supabase.from('metric_types').upsert(metricTypes)
  if (metricError) console.error('  ❌', metricError.message)
  else console.log('  ✅', metricTypes.length, 'metric type oluşturuldu')

  // 9. Programs
  console.log('📚 Programs oluşturuluyor...')
  const programs = [
    { id: '40000000-0000-0000-0000-000000000001', organization_id: orgId, title: 'Temel Top Kontrolü', description: 'Başlangıç seviyesi top kontrol egzersizleri', category: 'Teknik', difficulty_level: 2, estimated_duration_minutes: 45, tags: ['teknik', 'top-kontrolü', 'başlangıç'], is_active: true, is_public: false },
    { id: '40000000-0000-0000-0000-000000000002', organization_id: orgId, title: 'Hız ve Çeviklik', description: 'Sprint ve çeviklik geliştirme programı', category: 'Fiziksel', difficulty_level: 4, estimated_duration_minutes: 60, tags: ['hız', 'çeviklik', 'kondisyon'], is_active: true, is_public: false },
    { id: '40000000-0000-0000-0000-000000000003', organization_id: orgId, title: 'Şut Teknikleri', description: 'Şut geliştirme egzersizleri', category: 'Teknik', difficulty_level: 3, estimated_duration_minutes: 50, tags: ['şut', 'teknik', 'bitiricilik'], is_active: true, is_public: false },
    { id: '40000000-0000-0000-0000-000000000004', organization_id: orgId, title: 'Defans Pozisyonları', description: 'Savunma teknikleri ve pozisyonları', category: 'Taktik', difficulty_level: 3, estimated_duration_minutes: 55, tags: ['defans', 'taktik', 'pozisyon'], is_active: true, is_public: false },
    { id: '40000000-0000-0000-0000-000000000005', organization_id: orgId, title: 'Kaleci Refleksleri', description: 'Kaleci refleks ve atlama egzersizleri', category: 'Kaleci', difficulty_level: 4, estimated_duration_minutes: 45, tags: ['kaleci', 'refleks', 'atlama'], is_active: true, is_public: false },
    { id: '40000000-0000-0000-0000-000000000006', organization_id: orgId, title: 'Dayanıklılık Antrenmanı', description: 'Kondisyon ve dayanıklılık programı', category: 'Fiziksel', difficulty_level: 5, estimated_duration_minutes: 70, tags: ['kondisyon', 'dayanıklılık', 'kardiyo'], is_active: true, is_public: false },
  ]
  const { error: progError } = await supabase.from('programs').upsert(programs)
  if (progError) console.error('  ❌', progError.message)
  else console.log('  ✅', programs.length, 'program oluşturuldu')

  // 10. Fee Plans
  console.log('💰 Fee plans oluşturuluyor...')
  const feePlans = [
    { id: '50000000-0000-0000-0000-000000000001', organization_id: orgId, name: 'Standart Üyelik', description: 'Haftada 3 gün antrenman', amount: 2500, currency: 'TRY', billing_cycle: 'monthly', is_active: true },
    { id: '50000000-0000-0000-0000-000000000002', organization_id: orgId, name: 'Premium Üyelik', description: 'Haftada 5 gün antrenman + özel dersler', amount: 4500, currency: 'TRY', billing_cycle: 'monthly', is_active: true },
    { id: '50000000-0000-0000-0000-000000000003', organization_id: orgId, name: 'Yıllık Paket', description: '12 aylık standart üyelik (%15 indirim)', amount: 25500, currency: 'TRY', billing_cycle: 'annually', is_active: true },
  ]
  const { error: feeError } = await supabase.from('fee_plans').upsert(feePlans)
  if (feeError) console.error('  ❌', feeError.message)
  else console.log('  ✅', feePlans.length, 'fee plan oluşturuldu')

  // 11. Parent-Athlete Relations
  console.log('👨‍👧 Parent-athlete relations oluşturuluyor...')
  const parentRelations = [
    { id: 'f0000000-0000-0000-0000-000000000001', parent_user_id: 'b0000000-0000-0000-0000-000000000020', athlete_user_id: 'b0000000-0000-0000-0000-000000000010', organization_id: orgId, relationship_type: 'Baba', is_primary: true, can_view_progress: true, can_view_payments: true, verified: true },
    { id: 'f0000000-0000-0000-0000-000000000002', parent_user_id: 'b0000000-0000-0000-0000-000000000021', athlete_user_id: 'b0000000-0000-0000-0000-000000000011', organization_id: orgId, relationship_type: 'Anne', is_primary: true, can_view_progress: true, can_view_payments: true, verified: true },
    { id: 'f0000000-0000-0000-0000-000000000003', parent_user_id: 'b0000000-0000-0000-0000-000000000022', athlete_user_id: 'b0000000-0000-0000-0000-000000000012', organization_id: orgId, relationship_type: 'Baba', is_primary: true, can_view_progress: true, can_view_payments: true, verified: true },
    { id: 'f0000000-0000-0000-0000-000000000004', parent_user_id: 'b0000000-0000-0000-0000-000000000023', athlete_user_id: 'b0000000-0000-0000-0000-000000000013', organization_id: orgId, relationship_type: 'Anne', is_primary: true, can_view_progress: true, can_view_payments: true, verified: true },
  ]
  const { error: parError } = await supabase.from('parent_athlete_relations').upsert(parentRelations)
  if (parError) console.error('  ❌', parError.message)
  else console.log('  ✅', parentRelations.length, 'parent-athlete relation oluşturuldu')

  // 12. Sessions
  console.log('📅 Sessions oluşturuluyor...')
  const now = new Date()
  const sessions = [
    { id: '60000000-0000-0000-0000-000000000001', organization_id: orgId, title: 'U12 Teknik Antrenman', description: 'Top kontrolü ve pas çalışması', coach_id: 'b0000000-0000-0000-0000-000000000003', group_id: '10000000-0000-0000-0000-000000000001', scheduled_start: new Date(now.getTime() + 24*60*60*1000).toISOString(), scheduled_end: new Date(now.getTime() + 24*60*60*1000 + 90*60*1000).toISOString(), location: 'Ana Saha', session_type: 'training', status: 'scheduled' },
    { id: '60000000-0000-0000-0000-000000000002', organization_id: orgId, title: 'U14 Fiziksel Hazırlık', description: 'Güç ve dayanıklılık antrenmanı', coach_id: 'b0000000-0000-0000-0000-000000000003', group_id: '10000000-0000-0000-0000-000000000002', scheduled_start: new Date(now.getTime() + 48*60*60*1000).toISOString(), scheduled_end: new Date(now.getTime() + 48*60*60*1000 + 90*60*1000).toISOString(), location: 'Ana Saha', session_type: 'training', status: 'scheduled' },
    { id: '60000000-0000-0000-0000-000000000003', organization_id: orgId, title: 'U10 Eğlenceli Futbol', description: 'Oyun tabanlı öğrenme', coach_id: 'b0000000-0000-0000-0000-000000000004', group_id: '10000000-0000-0000-0000-000000000003', scheduled_start: new Date(now.getTime() + 72*60*60*1000).toISOString(), scheduled_end: new Date(now.getTime() + 72*60*60*1000 + 60*60*1000).toISOString(), location: 'Mini Saha', session_type: 'training', status: 'scheduled' },
    { id: '60000000-0000-0000-0000-000000000010', organization_id: orgId, title: 'U12 Haftalık Antrenman', description: 'Genel antrenman', coach_id: 'b0000000-0000-0000-0000-000000000003', group_id: '10000000-0000-0000-0000-000000000001', scheduled_start: new Date(now.getTime() - 72*60*60*1000).toISOString(), scheduled_end: new Date(now.getTime() - 72*60*60*1000 + 90*60*1000).toISOString(), location: 'Ana Saha', session_type: 'training', status: 'completed' },
    { id: '60000000-0000-0000-0000-000000000011', organization_id: orgId, title: 'U14 Kondisyon', description: 'Kondisyon testi', coach_id: 'b0000000-0000-0000-0000-000000000003', group_id: '10000000-0000-0000-0000-000000000002', scheduled_start: new Date(now.getTime() - 48*60*60*1000).toISOString(), scheduled_end: new Date(now.getTime() - 48*60*60*1000 + 90*60*1000).toISOString(), location: 'Ana Saha', session_type: 'assessment', status: 'completed' },
  ]
  const { error: sessionError } = await supabase.from('sessions').upsert(sessions)
  if (sessionError) console.error('  ❌', sessionError.message)
  else console.log('  ✅', sessions.length, 'session oluşturuldu')

  // 13. Attendance
  console.log('📋 Attendance oluşturuluyor...')
  const attendance = [
    { id: '70000000-0000-0000-0000-000000000001', session_id: '60000000-0000-0000-0000-000000000010', athlete_id: 'e0000000-0000-0000-0000-000000000001', status: 'present', recorded_by: 'b0000000-0000-0000-0000-000000000003' },
    { id: '70000000-0000-0000-0000-000000000002', session_id: '60000000-0000-0000-0000-000000000010', athlete_id: 'e0000000-0000-0000-0000-000000000002', status: 'present', recorded_by: 'b0000000-0000-0000-0000-000000000003' },
    { id: '70000000-0000-0000-0000-000000000003', session_id: '60000000-0000-0000-0000-000000000010', athlete_id: 'e0000000-0000-0000-0000-000000000004', status: 'late', recorded_by: 'b0000000-0000-0000-0000-000000000003', notes: 'Trafik' },
    { id: '70000000-0000-0000-0000-000000000004', session_id: '60000000-0000-0000-0000-000000000010', athlete_id: 'e0000000-0000-0000-0000-000000000005', status: 'present', recorded_by: 'b0000000-0000-0000-0000-000000000003' },
    { id: '70000000-0000-0000-0000-000000000005', session_id: '60000000-0000-0000-0000-000000000010', athlete_id: 'e0000000-0000-0000-0000-000000000007', status: 'excused', recorded_by: 'b0000000-0000-0000-0000-000000000003', notes: 'Hastalık' },
    { id: '70000000-0000-0000-0000-000000000006', session_id: '60000000-0000-0000-0000-000000000011', athlete_id: 'e0000000-0000-0000-0000-000000000003', status: 'present', recorded_by: 'b0000000-0000-0000-0000-000000000003' },
    { id: '70000000-0000-0000-0000-000000000007', session_id: '60000000-0000-0000-0000-000000000011', athlete_id: 'e0000000-0000-0000-0000-000000000008', status: 'present', recorded_by: 'b0000000-0000-0000-0000-000000000003' },
  ]
  const { error: attError } = await supabase.from('attendance').upsert(attendance)
  if (attError) console.error('  ❌', attError.message)
  else console.log('  ✅', attendance.length, 'attendance oluşturuldu')

  // 14. Assigned Programs
  console.log('📌 Assigned programs oluşturuluyor...')
  const assignments = [
    { id: '80000000-0000-0000-0000-000000000001', program_id: '40000000-0000-0000-0000-000000000001', athlete_id: 'e0000000-0000-0000-0000-000000000001', assigned_by: 'b0000000-0000-0000-0000-000000000003', status: 'in_progress', progress_percentage: 65, start_date: new Date(now.getTime() - 7*24*60*60*1000).toISOString(), due_date: new Date(now.getTime() + 7*24*60*60*1000).toISOString(), notes: 'Haftalık teknik program' },
    { id: '80000000-0000-0000-0000-000000000002', program_id: '40000000-0000-0000-0000-000000000002', athlete_id: 'e0000000-0000-0000-0000-000000000001', assigned_by: 'b0000000-0000-0000-0000-000000000003', status: 'assigned', progress_percentage: 0, start_date: new Date().toISOString(), due_date: new Date(now.getTime() + 14*24*60*60*1000).toISOString(), notes: 'Hız geliştirme programı' },
    { id: '80000000-0000-0000-0000-000000000003', program_id: '40000000-0000-0000-0000-000000000001', athlete_id: 'e0000000-0000-0000-0000-000000000002', assigned_by: 'b0000000-0000-0000-0000-000000000003', status: 'completed', progress_percentage: 100, start_date: new Date(now.getTime() - 21*24*60*60*1000).toISOString() },
    { id: '80000000-0000-0000-0000-000000000004', program_id: '40000000-0000-0000-0000-000000000003', athlete_id: 'e0000000-0000-0000-0000-000000000002', assigned_by: 'b0000000-0000-0000-0000-000000000003', status: 'in_progress', progress_percentage: 40, start_date: new Date(now.getTime() - 5*24*60*60*1000).toISOString(), due_date: new Date(now.getTime() + 9*24*60*60*1000).toISOString() },
    { id: '80000000-0000-0000-0000-000000000005', program_id: '40000000-0000-0000-0000-000000000004', athlete_id: 'e0000000-0000-0000-0000-000000000003', assigned_by: 'b0000000-0000-0000-0000-000000000003', status: 'in_progress', progress_percentage: 80, start_date: new Date(now.getTime() - 10*24*60*60*1000).toISOString(), due_date: new Date(now.getTime() + 4*24*60*60*1000).toISOString(), notes: 'Defans ustası olma yolunda' },
    { id: '80000000-0000-0000-0000-000000000006', program_id: '40000000-0000-0000-0000-000000000005', athlete_id: 'e0000000-0000-0000-0000-000000000004', assigned_by: 'b0000000-0000-0000-0000-000000000004', status: 'in_progress', progress_percentage: 55, start_date: new Date(now.getTime() - 8*24*60*60*1000).toISOString(), due_date: new Date(now.getTime() + 6*24*60*60*1000).toISOString(), notes: 'Kaleci geliştirme programı' },
    { id: '80000000-0000-0000-0000-000000000007', program_id: '40000000-0000-0000-0000-000000000006', athlete_id: 'e0000000-0000-0000-0000-000000000008', assigned_by: 'b0000000-0000-0000-0000-000000000003', status: 'in_progress', progress_percentage: 90, start_date: new Date(now.getTime() - 14*24*60*60*1000).toISOString(), due_date: new Date(now.getTime() + 1*24*60*60*1000).toISOString(), notes: 'Kondisyon zirvesi' },
  ]
  const { error: assignError } = await supabase.from('assigned_programs').upsert(assignments)
  if (assignError) console.error('  ❌', assignError.message)
  else console.log('  ✅', assignments.length, 'assignment oluşturuldu')

  // 15. Fee Payments
  console.log('💳 Fee payments oluşturuluyor...')
  const payments = [
    { id: '90000000-0000-0000-0000-000000000001', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000001', fee_plan_id: '50000000-0000-0000-0000-000000000002', amount: 4500, currency: 'TRY', due_date: new Date(now.getTime() - 60*24*60*60*1000).toISOString().split('T')[0], paid_date: new Date(now.getTime() - 62*24*60*60*1000).toISOString().split('T')[0], status: 'paid', payment_method: 'bank_transfer', recorded_by: 'b0000000-0000-0000-0000-000000000002' },
    { id: '90000000-0000-0000-0000-000000000002', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000001', fee_plan_id: '50000000-0000-0000-0000-000000000002', amount: 4500, currency: 'TRY', due_date: new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0], paid_date: new Date(now.getTime() - 28*24*60*60*1000).toISOString().split('T')[0], status: 'paid', payment_method: 'credit_card', recorded_by: 'b0000000-0000-0000-0000-000000000002' },
    { id: '90000000-0000-0000-0000-000000000003', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000001', fee_plan_id: '50000000-0000-0000-0000-000000000002', amount: 4500, currency: 'TRY', due_date: new Date().toISOString().split('T')[0], status: 'pending', notes: 'Bu ayki ödeme' },
    { id: '90000000-0000-0000-0000-000000000004', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000002', fee_plan_id: '50000000-0000-0000-0000-000000000001', amount: 2500, currency: 'TRY', due_date: new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0], paid_date: new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0], status: 'paid', payment_method: 'cash', recorded_by: 'b0000000-0000-0000-0000-000000000002', notes: 'Elden ödeme' },
    { id: '90000000-0000-0000-0000-000000000005', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000002', fee_plan_id: '50000000-0000-0000-0000-000000000001', amount: 2500, currency: 'TRY', due_date: new Date().toISOString().split('T')[0], status: 'pending' },
    { id: '90000000-0000-0000-0000-000000000006', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000003', fee_plan_id: '50000000-0000-0000-0000-000000000003', amount: 25500, currency: 'TRY', due_date: new Date(now.getTime() - 90*24*60*60*1000).toISOString().split('T')[0], paid_date: new Date(now.getTime() - 92*24*60*60*1000).toISOString().split('T')[0], status: 'paid', payment_method: 'bank_transfer', recorded_by: 'b0000000-0000-0000-0000-000000000002', notes: 'Yıllık ödeme tamamlandı' },
    { id: '90000000-0000-0000-0000-000000000007', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000004', fee_plan_id: '50000000-0000-0000-0000-000000000001', amount: 2500, currency: 'TRY', due_date: new Date(now.getTime() - 10*24*60*60*1000).toISOString().split('T')[0], status: 'overdue', notes: 'Veli ile iletişime geçildi' },
    { id: '90000000-0000-0000-0000-000000000008', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000008', fee_plan_id: '50000000-0000-0000-0000-000000000002', amount: 4500, currency: 'TRY', due_date: new Date(now.getTime() - 30*24*60*60*1000).toISOString().split('T')[0], paid_date: new Date(now.getTime() - 32*24*60*60*1000).toISOString().split('T')[0], status: 'paid', payment_method: 'bank_transfer', recorded_by: 'b0000000-0000-0000-0000-000000000002' },
    { id: '90000000-0000-0000-0000-000000000009', organization_id: orgId, athlete_id: 'e0000000-0000-0000-0000-000000000008', fee_plan_id: '50000000-0000-0000-0000-000000000002', amount: 4500, currency: 'TRY', due_date: new Date().toISOString().split('T')[0], paid_date: new Date(now.getTime() - 2*24*60*60*1000).toISOString().split('T')[0], status: 'paid', payment_method: 'credit_card', recorded_by: 'b0000000-0000-0000-0000-000000000002', notes: 'Erken ödeme' },
  ]
  const { error: payError } = await supabase.from('fee_payments').upsert(payments)
  if (payError) console.error('  ❌', payError.message)
  else console.log('  ✅', payments.length, 'payment oluşturuldu')

  // 16. Notifications
  console.log('🔔 Notifications oluşturuluyor...')
  const notifications = [
    { id: 'a0000000-0000-0000-0000-000000000010', organization_id: orgId, title: 'Hafta Sonu Turnuvası', body: 'Bu hafta sonu U12 ve U14 takımlarımız dostluk turnuvasına katılacak. Tüm velilerin katılımını bekliyoruz.', notification_type: 'announcement', priority: 'high', target_roles: ['athlete', 'parent'], created_by: 'b0000000-0000-0000-0000-000000000002', sent_at: new Date(now.getTime() - 2*24*60*60*1000).toISOString() },
    { id: 'a0000000-0000-0000-0000-000000000011', organization_id: orgId, title: 'Antrenman Saati Değişikliği', body: 'Yarınki U12 antrenmanı saat 17:00 yerine 16:00da başlayacaktır.', notification_type: 'schedule_change', priority: 'high', target_roles: ['athlete', 'parent', 'coach'], created_by: 'b0000000-0000-0000-0000-000000000002', sent_at: new Date(now.getTime() - 1*24*60*60*1000).toISOString() },
    { id: 'a0000000-0000-0000-0000-000000000012', organization_id: orgId, title: 'Ödeme Hatırlatması', body: 'Şubat ayı aidat ödemelerinin son tarihi yaklaşmaktadır. Lütfen ödemelerinizi yapınız.', notification_type: 'payment_reminder', priority: 'medium', target_roles: ['parent'], created_by: 'b0000000-0000-0000-0000-000000000002', sent_at: new Date(now.getTime() - 5*24*60*60*1000).toISOString() },
    { id: 'a0000000-0000-0000-0000-000000000013', organization_id: orgId, title: 'Yeni Program Eklendi', body: 'Dayanıklılık Antrenmanı programı tüm sporculara atandı. Detaylar için programlar sayfasını ziyaret edin.', notification_type: 'program_update', priority: 'low', target_roles: ['athlete', 'coach'], created_by: 'b0000000-0000-0000-0000-000000000003', sent_at: new Date(now.getTime() - 3*24*60*60*1000).toISOString() },
  ]
  const { error: notifError } = await supabase.from('notifications').upsert(notifications)
  if (notifError) console.error('  ❌', notifError.message)
  else console.log('  ✅', notifications.length, 'notification oluşturuldu')

  console.log('\n✨ Seed tamamlandı!')
  console.log('\n📋 Test Hesapları (Şifre: Test1234!):')
  console.log('   Super Admin: superadmin@academy360.com')
  console.log('   Kulüp Admin: admin@yildizakademi.com')
  console.log('   Antrenör:    mehmet.demir@yildizakademi.com')
  console.log('   Sporcu:      enes.yildirim@email.com')
  console.log('   Veli:        hakan.yildirim@email.com')
}

// Run REST API seeding (daha güvenilir)
seedWithRestAPI()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Hata:', err)
    process.exit(1)
  })
