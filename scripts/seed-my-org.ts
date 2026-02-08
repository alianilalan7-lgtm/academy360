/**
 * Kullanicinin kendi organizasyonu icin test verisi olusturan script
 *
 * Kullanim: npx tsx scripts/seed-my-org.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Target: User's own organization
const USER_ID = '383ed494-46dc-4753-93c1-f9006d4ca91b'
const ORG_ID = '5faa2ac2-d3b2-4278-9c57-61918925f9f8'
const ATHLETE_ID = '2865aada-444b-492e-b4fc-440d3a40eca3'

async function seed() {
  console.log('🌱 Kullanici organizasyonu icin seed basliyor...\n')

  // 1. Grup olustur
  console.log('👥 Grup olusturuluyor...')
  const groupId = '11111111-aaaa-bbbb-cccc-000000000001'
  const { error: groupErr } = await supabase.from('groups').upsert({
    id: groupId,
    organization_id: ORG_ID,
    name: 'U13 Yildirim',
    description: 'Academy360 test grubu',
    age_group: 'U13',
    max_members: 20,
    is_active: true,
  })
  if (groupErr) console.error('  ❌ Grup:', groupErr.message)
  else console.log('  ✅ Grup olusturuldu')

  // 2. Kullaniciyi gruba ekle (hem sporcu hem antrenor olarak)
  console.log('👥 Grup uyeligi olusturuluyor...')
  const { error: gmErr } = await supabase.from('group_members').upsert([
    {
      id: '22222222-aaaa-bbbb-cccc-000000000001',
      group_id: groupId,
      user_id: USER_ID,
      role: 'member',
      is_active: true,
    },
  ])
  if (gmErr) console.error('  ❌ Grup uyeligi:', gmErr.message)
  else console.log('  ✅ Grup uyeligi olusturuldu')

  // 3. Haftalik plan olustur (bu hafta + gelecek hafta)
  console.log('📆 Haftalik planlar olusturuluyor...')

  // Bu haftanin pazartesi gunu
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  const thisWeekStart = monday.toISOString().split('T')[0]

  // Gelecek haftanin pazartesi gunu
  const nextMonday = new Date(monday)
  nextMonday.setDate(nextMonday.getDate() + 7)
  const nextWeekStart = nextMonday.toISOString().split('T')[0]

  const plans = [
    {
      id: '33333333-aaaa-bbbb-cccc-000000000001',
      organization_id: ORG_ID,
      coach_id: USER_ID,
      group_id: groupId,
      week_start: thisWeekStart,
      is_published: true,
      notes: 'Bu hafta teknik ve fiziksel gelistirme uzerine yogunlasiyoruz. Ozellikle top kontrolu ve pas isabeti calisacagiz.',
      plan_data: {
        pazartesi: {
          type: 'technical',
          title: 'Top Kontrolu ve Pas',
          duration: 90,
          notes: 'Ic ve dis ayak pas calismasi. 3lu gruplar halinde.',
        },
        sali: {
          type: 'physical',
          title: 'Hiz ve Ceviklik',
          duration: 75,
          notes: 'Sprint drilleri + merdiven calismasi.',
        },
        carsamba: {
          type: 'rest',
          title: 'Dinlenme',
          duration: 0,
          notes: 'Aktif toparlanma - hafif esneme yapilabilir.',
        },
        persembe: {
          type: 'tactical',
          title: 'Pozisyonal Oyun',
          duration: 90,
          notes: '4-3-3 formasyonu gecisleri. Kanat ataklari.',
        },
        cuma: {
          type: 'game_based',
          title: 'Mac Simulasyonu',
          duration: 80,
          notes: '7v7 mini mac. 15dk periyotlar.',
        },
        cumartesi: {
          type: 'physical',
          title: 'Guc Antrenmani',
          duration: 60,
          notes: 'Core calismasi + bacak gucu. Vucüt agirligiyla.',
        },
        pazar: {
          type: 'rest',
          title: 'Dinlenme',
          duration: 0,
          notes: 'Tam dinlenme gunu.',
        },
      },
    },
    {
      id: '33333333-aaaa-bbbb-cccc-000000000002',
      organization_id: ORG_ID,
      coach_id: USER_ID,
      group_id: groupId,
      week_start: nextWeekStart,
      is_published: true,
      notes: 'Gelecek hafta mac hazirligi. Taktik yogunluk artacak.',
      plan_data: {
        pazartesi: {
          type: 'technical',
          title: 'Sut Teknigi',
          duration: 90,
          notes: 'Ceza sahasi ici sut calismasi. Vole ve yari vole.',
        },
        sali: {
          type: 'tactical',
          title: 'Set Parçalari',
          duration: 85,
          notes: 'Korner, frikik ve taç atisi organizasyonlari.',
        },
        carsamba: {
          type: 'physical',
          title: 'Dayaniklilik',
          duration: 70,
          notes: 'Interval kosu + mesafe.',
        },
        persembe: {
          type: 'game_based',
          title: 'Taktik Mac',
          duration: 90,
          notes: 'Tam saha mac provasi. Pozisyon degisimi calismasi.',
        },
        cuma: {
          type: 'rest',
          title: 'Mac Oncesi Dinlenme',
          duration: 0,
          notes: 'Hafif esneme ve mental hazirlık.',
        },
        cumartesi: {
          type: 'technical',
          title: 'Top Surme ve Dribling',
          duration: 75,
          notes: 'Birebir gecis calismasi. Fint teknikleri.',
        },
        pazar: {
          type: 'rest',
          title: 'Dinlenme',
          duration: 0,
          notes: '',
        },
      },
    },
  ]

  const { error: planErr } = await supabase.from('weekly_plans').upsert(plans as any)
  if (planErr) console.error('  ❌ Haftalik plan:', planErr.message)
  else console.log('  ✅ 2 haftalik plan olusturuldu')

  // 4. Beceri puanlari
  console.log('⭐ Beceri puanlari olusturuluyor...')
  const skillScores = [
    // Technical skills
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'technical', skill_name: 'Top Kontrolu', score: 8, notes: 'Ic ayak kontrolu cok iyi' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'technical', skill_name: 'Pas Isabeti', score: 7, notes: 'Kisa paslarda basarili, uzun paslar gelistirilmeli' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'technical', skill_name: 'Sut Teknigi', score: 9, notes: 'Sol ayak sutu mukemmel' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'technical', skill_name: 'Dribling', score: 8, notes: 'Dar alanda cok etkili' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'technical', skill_name: 'Kafa Vurusu', score: 5, notes: 'Gelistirilmesi gereken alan' },
    // Physical skills
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'physical', skill_name: 'Hiz', score: 8, notes: 'Cikis hizi cok iyi' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'physical', skill_name: 'Dayaniklilik', score: 6, notes: 'Kondisyon arttirilmali' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'physical', skill_name: 'Guc', score: 7, notes: 'Yas grubuna gore iyi' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'physical', skill_name: 'Ceviklik', score: 9, notes: 'En guclu yonu' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'physical', skill_name: 'Esneklik', score: 6, notes: 'Esneme rutini olusturulmali' },
    // Behavioral skills
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'behavioral', skill_name: 'Takim Oyunu', score: 8, notes: 'Arkadaslariyla iyi anlasir' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'behavioral', skill_name: 'Liderlik', score: 7, notes: 'Sahada yonlendirme yapabiliyor' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'behavioral', skill_name: 'Disiplin', score: 9, notes: 'Cok disiplinli ve duzenli' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'behavioral', skill_name: 'Motivasyon', score: 10, notes: 'Cok motive ve istekli' },
    { athlete_id: ATHLETE_ID, organization_id: ORG_ID, scorer_id: USER_ID, category: 'behavioral', skill_name: 'Fair Play', score: 8, notes: 'Rakiplere saygili' },
  ]

  const { error: skillErr } = await supabase.from('skill_scores').insert(skillScores as any)
  if (skillErr) console.error('  ❌ Beceri puanlari:', skillErr.message)
  else console.log('  ✅', skillScores.length, 'beceri puani olusturuldu')

  // 5. Gelisim notlari
  console.log('📝 Gelisim notlari olusturuluyor...')
  const devNotes = [
    {
      athlete_id: ATHLETE_ID,
      organization_id: ORG_ID,
      coach_id: USER_ID,
      note: 'Bu hafta top kontrolunde buyuk gelisim gosterdi. Ozellikle ic ayak kontrolu cok iyi seviyeye geldi. Uzun pas calismasi yapilmali.',
      category: 'teknik',
      is_private: false,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      athlete_id: ATHLETE_ID,
      organization_id: ORG_ID,
      coach_id: USER_ID,
      note: 'Hiz testlerinde yas grubunun en iyileri arasinda. Dayaniklilik icin interval kosu programi olusturuldu.',
      category: 'fiziksel',
      is_private: false,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      athlete_id: ATHLETE_ID,
      organization_id: ORG_ID,
      coach_id: USER_ID,
      note: 'Takim arkadas larina karsi cok pozitif bir tutum sergiliyor. Mac esnasinda yonlendirme yapabiliyor. Kaptan aday.',
      category: 'davranis',
      is_private: false,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      athlete_id: ATHLETE_ID,
      organization_id: ORG_ID,
      coach_id: USER_ID,
      note: 'Profesyonel potansiyeli var. Altyapi secmeleri icin hazirlanmali. Ailesiyle gorusulecek.',
      category: 'genel',
      is_private: true,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      athlete_id: ATHLETE_ID,
      organization_id: ORG_ID,
      coach_id: USER_ID,
      note: 'Sol ayak sutu mukemmel. Sag ayak calismasi yapilmali. Sut antrenmaninda 10/10 isabet yapti.',
      category: 'teknik',
      is_private: false,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  const { error: noteErr } = await supabase.from('development_notes').insert(devNotes as any)
  if (noteErr) console.error('  ❌ Gelisim notlari:', noteErr.message)
  else console.log('  ✅', devNotes.length, 'gelisim notu olusturuldu')

  // 6. Bildirimler
  console.log('🔔 Bildirimler olusturuluyor...')
  const notifications = [
    {
      organization_id: ORG_ID,
      title: 'Haftalik Plan Yayinlandi',
      body: 'Bu haftanin antrenman plani yayinlandi. Haftalik Plan sayfasindan detaylara ulasabilirsiniz.',
      notification_type: 'schedule_change',
      priority: 'normal',
      target_roles: ['athlete', 'parent'],
      created_by: USER_ID,
      sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      organization_id: ORG_ID,
      title: 'Cumartesi Turnuva',
      body: 'Bu cumartesi U13 grubuyla dostluk turnuvasina katilacagiz. Saat 10:00 da sahada olunuz. Forma + krampon + su getirmeyi unutmayin.',
      notification_type: 'announcement',
      priority: 'high',
      target_roles: ['athlete', 'parent', 'coach'],
      created_by: USER_ID,
      sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      organization_id: ORG_ID,
      title: 'Beceri Puanlari Guncellendi',
      body: 'Antrenorunuz beceri puanlarinizi guncelledi. Gelisim sayfanizdan detaylari gorebilirsiniz.',
      notification_type: 'program_update',
      priority: 'low',
      target_roles: ['athlete'],
      created_by: USER_ID,
      sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      organization_id: ORG_ID,
      title: 'Antrenman Saati Degisikligi',
      body: 'Persembe gunku antrenman saat 17:00 yerine 16:30 da baslayacaktir. Lütfen zamaninda gelin.',
      notification_type: 'schedule_change',
      priority: 'high',
      target_roles: ['athlete', 'parent'],
      created_by: USER_ID,
      sent_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ]

  const { error: notifErr } = await supabase.from('notifications').insert(notifications as any)
  if (notifErr) console.error('  ❌ Bildirimler:', notifErr.message)
  else console.log('  ✅', notifications.length, 'bildirim olusturuldu')

  // 7. Antrenman seanslari
  console.log('📅 Seanslar olusturuluyor...')
  const sessionId1 = '44444444-aaaa-bbbb-cccc-000000000001'
  const sessionId2 = '44444444-aaaa-bbbb-cccc-000000000002'
  const sessionId3 = '44444444-aaaa-bbbb-cccc-000000000003'

  const sessions = [
    {
      id: sessionId1,
      organization_id: ORG_ID,
      title: 'U13 Teknik Antrenman',
      description: 'Top kontrolu ve pas calismasi',
      coach_id: USER_ID,
      group_id: groupId,
      scheduled_start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      scheduled_end: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
      location: 'Ana Saha',
      session_type: 'training',
      status: 'completed',
    },
    {
      id: sessionId2,
      organization_id: ORG_ID,
      title: 'U13 Fiziksel Hazirlik',
      description: 'Sprint ve ceviklik drilleri',
      coach_id: USER_ID,
      group_id: groupId,
      scheduled_start: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      scheduled_end: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
      location: 'Ana Saha',
      session_type: 'training',
      status: 'completed',
    },
    {
      id: sessionId3,
      organization_id: ORG_ID,
      title: 'U13 Mac Simulasyonu',
      description: '7v7 mini mac',
      coach_id: USER_ID,
      group_id: groupId,
      scheduled_start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      scheduled_end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 80 * 60 * 1000).toISOString(),
      location: 'Ana Saha',
      session_type: 'training',
      status: 'scheduled',
    },
  ]

  const { error: sessErr } = await supabase.from('sessions').upsert(sessions)
  if (sessErr) console.error('  ❌ Seanslar:', sessErr.message)
  else console.log('  ✅', sessions.length, 'seans olusturuldu')

  // 8. Yoklama
  console.log('📋 Yoklama olusturuluyor...')
  const attendance = [
    { session_id: sessionId1, athlete_id: ATHLETE_ID, status: 'present', recorded_by: USER_ID },
    { session_id: sessionId2, athlete_id: ATHLETE_ID, status: 'present', recorded_by: USER_ID },
  ]

  const { error: attErr } = await supabase.from('attendance').insert(attendance)
  if (attErr) console.error('  ❌ Yoklama:', attErr.message)
  else console.log('  ✅', attendance.length, 'yoklama olusturuldu')

  console.log('\n✨ Seed tamamlandi!')
  console.log('\n📋 Hesabiniz:')
  console.log(`   Email: alianilalan@hotmail.com`)
  console.log(`   Roller: club_admin, coach, athlete`)
  console.log(`   Grup: U13 Yildirim`)
  console.log(`   Bu hafta baslangic: ${thisWeekStart}`)
  console.log(`   Gelecek hafta: ${nextWeekStart}`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Hata:', err)
    process.exit(1)
  })
