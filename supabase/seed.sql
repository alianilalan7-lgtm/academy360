-- Academy360 Seed Data
-- Gerçekçi Türkçe test verileri
-- Bu dosya: npx supabase db reset (local) veya manuel olarak çalıştırılabilir

-- ============================================================================
-- CLEANUP (Varolan test verilerini temizle)
-- ============================================================================
TRUNCATE TABLE
  training_logs,
  attendance,
  performance_records,
  athlete_achievements,
  athlete_goals,
  assigned_programs,
  program_versions,
  fee_payments,
  notification_recipients,
  notifications,
  sessions,
  group_members,
  groups,
  parent_athlete_relations,
  coach_profiles,
  athlete_profiles,
  memberships,
  fee_plans,
  programs,
  achievements,
  metric_types,
  user_profiles,
  organizations
CASCADE;

-- ============================================================================
-- FIXED UUIDs (Tutarlı referanslar için)
-- ============================================================================

-- Organization
-- org_main: Ana akademi

-- Users (auth.users'a da eklenecek)
-- user_super_admin: Super Admin
-- user_admin: Kulüp Yöneticisi
-- user_coach_1: Baş Antrenör
-- user_coach_2: Yardımcı Antrenör
-- user_athlete_1 - user_athlete_8: Sporcular
-- user_parent_1 - user_parent_4: Veliler

-- ============================================================================
-- 1. ORGANIZATION
-- ============================================================================
INSERT INTO organizations (id, name, slug, subscription_tier, subscription_valid_until, settings) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'Yıldız Futbol Akademisi',
  'yildiz-futbol-akademisi',
  'premium',
  '2027-12-31',
  '{"theme": "emerald", "language": "tr", "maxAthletes": 100}'::jsonb
);

-- ============================================================================
-- 2. USER PROFILES (auth.users ile senkronize olmalı)
-- ============================================================================

-- Super Admin
INSERT INTO user_profiles (id, email, full_name, phone, kvkk_consent, kvkk_consent_date, onboarding_completed, locale, timezone) VALUES
('b0000000-0000-0000-0000-000000000001', 'superadmin@academy360.com', 'Sistem Yöneticisi', '+905551234500', true, NOW(), true, 'tr', 'Europe/Istanbul');

-- Club Admin
INSERT INTO user_profiles (id, email, full_name, phone, kvkk_consent, kvkk_consent_date, onboarding_completed, locale, timezone) VALUES
('b0000000-0000-0000-0000-000000000002', 'admin@yildizakademi.com', 'Ahmet Yılmaz', '+905551234501', true, NOW(), true, 'tr', 'Europe/Istanbul');

-- Coaches
INSERT INTO user_profiles (id, email, full_name, phone, kvkk_consent, kvkk_consent_date, onboarding_completed, locale, timezone) VALUES
('b0000000-0000-0000-0000-000000000003', 'mehmet.demir@yildizakademi.com', 'Mehmet Demir', '+905551234502', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000004', 'ayse.kaya@yildizakademi.com', 'Ayşe Kaya', '+905551234503', true, NOW(), true, 'tr', 'Europe/Istanbul');

-- Athletes
INSERT INTO user_profiles (id, email, full_name, phone, kvkk_consent, kvkk_consent_date, onboarding_completed, locale, timezone) VALUES
('b0000000-0000-0000-0000-000000000010', 'enes.yildirim@email.com', 'Enes Yıldırım', '+905551234510', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000011', 'kerem.ozturk@email.com', 'Kerem Öztürk', '+905551234511', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000012', 'ali.sahin@email.com', 'Ali Şahin', '+905551234512', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000013', 'burak.celik@email.com', 'Burak Çelik', '+905551234513', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000014', 'can.arslan@email.com', 'Can Arslan', '+905551234514', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000015', 'deniz.kara@email.com', 'Deniz Kara', '+905551234515', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000016', 'emre.polat@email.com', 'Emre Polat', '+905551234516', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000017', 'furkan.korkmaz@email.com', 'Furkan Korkmaz', '+905551234517', true, NOW(), true, 'tr', 'Europe/Istanbul');

-- Parents
INSERT INTO user_profiles (id, email, full_name, phone, kvkk_consent, kvkk_consent_date, onboarding_completed, locale, timezone) VALUES
('b0000000-0000-0000-0000-000000000020', 'hakan.yildirim@email.com', 'Hakan Yıldırım', '+905551234520', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000021', 'fatma.ozturk@email.com', 'Fatma Öztürk', '+905551234521', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000022', 'mustafa.sahin@email.com', 'Mustafa Şahin', '+905551234522', true, NOW(), true, 'tr', 'Europe/Istanbul'),
('b0000000-0000-0000-0000-000000000023', 'zeynep.celik@email.com', 'Zeynep Çelik', '+905551234523', true, NOW(), true, 'tr', 'Europe/Istanbul');

-- ============================================================================
-- 3. MEMBERSHIPS
-- ============================================================================

-- Super Admin (platform-wide, no org)
INSERT INTO memberships (id, user_id, organization_id, role, status, joined_at) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'super_admin', 'active', NOW());

-- Club Admin
INSERT INTO memberships (id, user_id, organization_id, role, status, joined_at) VALUES
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'club_admin', 'active', NOW());

-- Coaches
INSERT INTO memberships (id, user_id, organization_id, role, status, joined_at) VALUES
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'coach', 'active', NOW()),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'coach', 'active', NOW());

-- Athletes
INSERT INTO memberships (id, user_id, organization_id, role, status, joined_at) VALUES
('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'athlete', 'active', NOW()),
('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'athlete', 'active', NOW()),
('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'athlete', 'active', NOW()),
('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'athlete', 'active', NOW()),
('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'athlete', 'active', NOW()),
('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'athlete', 'active', NOW()),
('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'athlete', 'active', NOW()),
('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', 'athlete', 'active', NOW());

-- Parents
INSERT INTO memberships (id, user_id, organization_id, role, status, joined_at) VALUES
('c0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'parent', 'active', NOW()),
('c0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001', 'parent', 'active', NOW()),
('c0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001', 'parent', 'active', NOW()),
('c0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000001', 'parent', 'active', NOW());

-- ============================================================================
-- 4. COACH PROFILES
-- ============================================================================
INSERT INTO coach_profiles (id, user_id, organization_id, specialization, license_type, license_number, years_experience, bio) VALUES
('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Teknik Direktör', 'UEFA Pro', 'TR-PRO-2024-001', 15, 'Eski milli takım oyuncusu. 15 yıllık antrenörlük deneyimi. Altyapı geliştirme uzmanı.'),
('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Kaleci Antrenörü', 'UEFA B', 'TR-B-2024-042', 8, 'Kaleci antrenörlüğünde uzman. Genç yetenekleri keşfetme konusunda deneyimli.');

-- ============================================================================
-- 5. ATHLETE PROFILES
-- ============================================================================
INSERT INTO athlete_profiles (id, user_id, organization_id, birth_date, position, dominant_foot, height_cm, weight_kg, jersey_number, current_level, total_xp, streak_days, emergency_contact_name, emergency_contact_phone) VALUES
('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', '2012-03-15', 'Forvet', 'Sağ', 152, 42, 10, 5, 2450, 12, 'Hakan Yıldırım', '+905551234520'),
('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', '2012-07-22', 'Orta Saha', 'Sol', 148, 38, 8, 4, 1890, 8, 'Fatma Öztürk', '+905551234521'),
('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', '2011-11-08', 'Defans', 'Sağ', 158, 48, 4, 6, 3200, 15, 'Mustafa Şahin', '+905551234522'),
('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', '2013-02-28', 'Kaleci', 'Sağ', 155, 45, 1, 4, 1750, 5, 'Zeynep Çelik', '+905551234523'),
('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', '2012-09-10', 'Kanat', 'Sol', 150, 40, 7, 5, 2100, 10, 'Ali Arslan', '+905551234524'),
('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', '2014-01-05', 'Orta Saha', 'Sağ', 142, 35, 6, 3, 980, 3, 'Ayşe Kara', '+905551234525'),
('e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', '2013-06-18', 'Defans', 'Sağ', 153, 44, 5, 4, 1650, 7, 'Mehmet Polat', '+905551234526'),
('e0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', '2011-12-25', 'Forvet', 'Sağ', 160, 50, 9, 7, 4100, 20, 'Fatih Korkmaz', '+905551234527');

-- ============================================================================
-- 6. PARENT-ATHLETE RELATIONS
-- ============================================================================
INSERT INTO parent_athlete_relations (id, parent_user_id, athlete_user_id, organization_id, relationship_type, is_primary, can_view_progress, can_view_payments, verified) VALUES
('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Baba', true, true, true, true),
('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Anne', true, true, true, true),
('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Baba', true, true, true, true),
('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'Anne', true, true, true, true);

-- ============================================================================
-- 7. GROUPS (Yaş Grupları)
-- ============================================================================
INSERT INTO groups (id, organization_id, name, description, age_group, max_members, is_active) VALUES
('g0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'U12 Yıldızlar', '2012-2013 doğumlu sporcular', 'U12', 20, true),
('g0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'U14 Şampiyonlar', '2010-2011 doğumlu sporcular', 'U14', 20, true),
('g0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'U10 Minikler', '2014-2015 doğumlu sporcular', 'U10', 15, true);

-- ============================================================================
-- 8. GROUP MEMBERS
-- ============================================================================
INSERT INTO group_members (id, group_id, user_id, role, is_active) VALUES
-- U12 Yıldızlar
('h0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'member', true),
('h0000000-0000-0000-0000-000000000002', 'g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'member', true),
('h0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000013', 'member', true),
('h0000000-0000-0000-0000-000000000004', 'g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000014', 'member', true),
('h0000000-0000-0000-0000-000000000005', 'g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000016', 'member', true),
-- U14 Şampiyonlar
('h0000000-0000-0000-0000-000000000006', 'g0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000012', 'member', true),
('h0000000-0000-0000-0000-000000000007', 'g0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000017', 'member', true),
-- U10 Minikler
('h0000000-0000-0000-0000-000000000008', 'g0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000015', 'member', true),
-- Coaches as group leaders
('h0000000-0000-0000-0000-000000000009', 'g0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'coach', true),
('h0000000-0000-0000-0000-000000000010', 'g0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'coach', true),
('h0000000-0000-0000-0000-000000000011', 'g0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'coach', true);

-- ============================================================================
-- 9. METRIC TYPES (Performans Metrikleri)
-- ============================================================================
INSERT INTO metric_types (id, code, name, description, unit, category, data_type, min_value, max_value, is_higher_better, is_system, is_active, display_order) VALUES
('m0000000-0000-0000-0000-000000000001', 'SPRINT_20M', '20m Sprint', '20 metre sprint süresi', 'saniye', 'Hız', 'decimal', 2.5, 6.0, false, true, true, 1),
('m0000000-0000-0000-0000-000000000002', 'SPRINT_40M', '40m Sprint', '40 metre sprint süresi', 'saniye', 'Hız', 'decimal', 4.5, 10.0, false, true, true, 2),
('m0000000-0000-0000-0000-000000000003', 'AGILITY_T', 'T-Test', 'Çeviklik T testi', 'saniye', 'Çeviklik', 'decimal', 8.0, 20.0, false, true, true, 3),
('m0000000-0000-0000-0000-000000000004', 'VERTICAL_JUMP', 'Dikey Sıçrama', 'Dikey sıçrama yüksekliği', 'cm', 'Güç', 'decimal', 20, 80, true, true, true, 4),
('m0000000-0000-0000-0000-000000000005', 'STANDING_JUMP', 'Durarak Uzun Atlama', 'Durarak uzun atlama mesafesi', 'cm', 'Güç', 'decimal', 100, 300, true, true, true, 5),
('m0000000-0000-0000-0000-000000000006', 'SHUTTLE_RUN', 'Mekik Koşusu', 'Yo-Yo testi seviyesi', 'seviye', 'Dayanıklılık', 'decimal', 1, 23, true, true, true, 6),
('m0000000-0000-0000-0000-000000000007', 'BALL_CONTROL', 'Top Kontrolü', 'Top kontrol becerisi puanı', 'puan', 'Teknik', 'integer', 1, 10, true, true, true, 7),
('m0000000-0000-0000-0000-000000000008', 'PASSING_ACC', 'Pas İsabeti', 'Pas isabetlilik yüzdesi', '%', 'Teknik', 'decimal', 0, 100, true, true, true, 8),
('m0000000-0000-0000-0000-000000000009', 'SHOOTING_ACC', 'Şut İsabeti', 'Şut isabetlilik yüzdesi', '%', 'Teknik', 'decimal', 0, 100, true, true, true, 9),
('m0000000-0000-0000-0000-000000000010', 'FLEXIBILITY', 'Esneklik', 'Otur-uzan testi', 'cm', 'Esneklik', 'decimal', -10, 40, true, true, true, 10);

-- ============================================================================
-- 10. PROGRAMS (Antrenman Programları)
-- ============================================================================
INSERT INTO programs (id, organization_id, title, description, category, difficulty_level, estimated_duration_minutes, tags, is_active, is_public, content_data) VALUES
('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Temel Top Kontrolü', 'Başlangıç seviyesi top kontrol egzersizleri', 'Teknik', 2, 45, ARRAY['teknik', 'top-kontrolü', 'başlangıç'], true, false,
'{"exercises": [{"name": "Ayak İçi Pas", "duration": 10, "sets": 3}, {"name": "Top Sürme", "duration": 15, "sets": 2}, {"name": "Duvar Pası", "duration": 10, "sets": 3}]}'::jsonb),

('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Hız ve Çeviklik', 'Sprint ve çeviklik geliştirme programı', 'Fiziksel', 4, 60, ARRAY['hız', 'çeviklik', 'kondisyon'], true, false,
'{"exercises": [{"name": "20m Sprint", "reps": 6, "rest": 60}, {"name": "Slalom Koşusu", "reps": 4, "rest": 45}, {"name": "Merdiven Drilleri", "duration": 15}]}'::jsonb),

('p0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Şut Teknikleri', 'Şut geliştirme egzersizleri', 'Teknik', 3, 50, ARRAY['şut', 'teknik', 'bitiricilik'], true, false,
'{"exercises": [{"name": "Sabit Toptan Şut", "reps": 20}, {"name": "Hareketli Şut", "reps": 15}, {"name": "Kafa Vuruşu", "reps": 10}]}'::jsonb),

('p0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Defans Pozisyonları', 'Savunma teknikleri ve pozisyonları', 'Taktik', 3, 55, ARRAY['defans', 'taktik', 'pozisyon'], true, false,
'{"exercises": [{"name": "1v1 Savunma", "duration": 15}, {"name": "Kayma Adımı", "sets": 4, "reps": 10}, {"name": "Çapraz Koşu", "duration": 10}]}'::jsonb),

('p0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Kaleci Refleksleri', 'Kaleci refleks ve atlama egzersizleri', 'Kaleci', 4, 45, ARRAY['kaleci', 'refleks', 'atlama'], true, false,
'{"exercises": [{"name": "Yerden Top Kurtarma", "reps": 15}, {"name": "Üst Köşe Atlama", "reps": 12}, {"name": "Penaltı Çalışması", "reps": 10}]}'::jsonb),

('p0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Dayanıklılık Antrenmanı', 'Kondisyon ve dayanıklılık programı', 'Fiziksel', 5, 70, ARRAY['kondisyon', 'dayanıklılık', 'kardiyo'], true, false,
'{"exercises": [{"name": "Tempo Koşusu", "duration": 20}, {"name": "Interval Koşu", "sets": 6, "work": 30, "rest": 30}, {"name": "Mekik", "reps": 50}]}'::jsonb);

-- ============================================================================
-- 11. SESSIONS (Antrenman Seansları - Önümüzdeki 2 hafta)
-- ============================================================================
INSERT INTO sessions (id, organization_id, title, description, coach_id, group_id, scheduled_start, scheduled_end, location, session_type, status) VALUES
-- Bu hafta
('s0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'U12 Teknik Antrenman', 'Top kontrolü ve pas çalışması', 'b0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000001',
  (CURRENT_DATE + INTERVAL '1 day')::timestamp + TIME '16:00', (CURRENT_DATE + INTERVAL '1 day')::timestamp + TIME '17:30', 'Ana Saha', 'training', 'scheduled'),

('s0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'U14 Fiziksel Hazırlık', 'Güç ve dayanıklılık antrenmanı', 'b0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000002',
  (CURRENT_DATE + INTERVAL '1 day')::timestamp + TIME '18:00', (CURRENT_DATE + INTERVAL '1 day')::timestamp + TIME '19:30', 'Ana Saha', 'training', 'scheduled'),

('s0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'U10 Eğlenceli Futbol', 'Oyun tabanlı öğrenme', 'b0000000-0000-0000-0000-000000000004', 'g0000000-0000-0000-0000-000000000003',
  (CURRENT_DATE + INTERVAL '2 days')::timestamp + TIME '15:00', (CURRENT_DATE + INTERVAL '2 days')::timestamp + TIME '16:00', 'Mini Saha', 'training', 'scheduled'),

('s0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'U12 Maç Hazırlığı', 'Taktik çalışma ve set parçaları', 'b0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000001',
  (CURRENT_DATE + INTERVAL '3 days')::timestamp + TIME '16:00', (CURRENT_DATE + INTERVAL '3 days')::timestamp + TIME '17:30', 'Ana Saha', 'training', 'scheduled'),

('s0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'U14 Şut Çalışması', 'Bitiricilik ve şut teknikleri', 'b0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000002',
  (CURRENT_DATE + INTERVAL '4 days')::timestamp + TIME '18:00', (CURRENT_DATE + INTERVAL '4 days')::timestamp + TIME '19:30', 'Ana Saha', 'training', 'scheduled'),

-- Geçmiş seanslar (tamamlanmış)
('s0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'U12 Haftalık Antrenman', 'Genel antrenman', 'b0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000001',
  (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '16:00', (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '17:30', 'Ana Saha', 'training', 'completed'),

('s0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'U14 Kondisyon', 'Kondisyon testi', 'b0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000002',
  (CURRENT_DATE - INTERVAL '2 days')::timestamp + TIME '18:00', (CURRENT_DATE - INTERVAL '2 days')::timestamp + TIME '19:30', 'Ana Saha', 'assessment', 'completed');

-- ============================================================================
-- 12. ATTENDANCE (Yoklama)
-- ============================================================================
INSERT INTO attendance (id, session_id, athlete_id, status, check_in_time, recorded_by, notes) VALUES
-- Geçmiş seans 1 (U12)
('at000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000001', 'present', (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '15:55', 'b0000000-0000-0000-0000-000000000003', NULL),
('at000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000002', 'present', (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '15:58', 'b0000000-0000-0000-0000-000000000003', NULL),
('at000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000004', 'late', (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '16:10', 'b0000000-0000-0000-0000-000000000003', 'Trafik'),
('at000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000005', 'present', (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '15:50', 'b0000000-0000-0000-0000-000000000003', NULL),
('at000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000007', 'excused', NULL, 'b0000000-0000-0000-0000-000000000003', 'Hastalık'),

-- Geçmiş seans 2 (U14)
('at000000-0000-0000-0000-000000000006', 's0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000003', 'present', (CURRENT_DATE - INTERVAL '2 days')::timestamp + TIME '17:55', 'b0000000-0000-0000-0000-000000000003', NULL),
('at000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000008', 'present', (CURRENT_DATE - INTERVAL '2 days')::timestamp + TIME '17:50', 'b0000000-0000-0000-0000-000000000003', NULL);

-- ============================================================================
-- 13. ASSIGNED PROGRAMS (Program Atamaları)
-- ============================================================================
INSERT INTO assigned_programs (id, program_id, athlete_id, assigned_by, status, progress_percentage, start_date, due_date, notes) VALUES
('ap000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'in_progress', 65, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days', 'Haftalık teknik program'),
('ap000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'assigned', 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'Hız geliştirme programı'),
('ap000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'completed', 100, CURRENT_DATE - INTERVAL '21 days', CURRENT_DATE - INTERVAL '7 days', NULL),
('ap000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'in_progress', 40, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days', NULL),
('ap000000-0000-0000-0000-000000000005', 'p0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'in_progress', 80, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '4 days', 'Defans ustası olma yolunda'),
('ap000000-0000-0000-0000-000000000006', 'p0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'in_progress', 55, CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE + INTERVAL '6 days', 'Kaleci geliştirme programı'),
('ap000000-0000-0000-0000-000000000007', 'p0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'in_progress', 90, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '1 day', 'Kondisyon zirvesi');

-- ============================================================================
-- 14. PERFORMANCE RECORDS (Performans Ölçümleri)
-- ============================================================================
INSERT INTO performance_records (id, athlete_id, metric_type_id, value, recorded_by, recorded_at, notes, is_verified) VALUES
-- Enes Yıldırım (Forvet)
('pr000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001', 3.45, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '30 days', 'İlk ölçüm', true),
('pr000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001', 3.32, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '7 days', 'Gelişim var', true),
('pr000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000004', 42, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '7 days', NULL, true),
('pr000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000007', 8, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '5 days', 'Mükemmel kontrol', true),
('pr000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000009', 72, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '3 days', NULL, true),

-- Kerem Öztürk (Orta Saha)
('pr000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000008', 85, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '10 days', 'Çok iyi pas', true),
('pr000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000003', 10.2, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '7 days', NULL, true),
('pr000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000006', 12.5, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '5 days', 'Seviye atladı', true),

-- Ali Şahin (Defans)
('pr000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000001', 3.55, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '14 days', NULL, true),
('pr000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000002', 6.10, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '7 days', NULL, true),
('pr000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000005', 195, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '5 days', 'Yaş ortalamasının üstünde', true),

-- Burak Çelik (Kaleci)
('pr000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000004', 48, 'b0000000-0000-0000-0000-000000000004', CURRENT_DATE - INTERVAL '10 days', 'Kaleci için iyi', true),
('pr000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000010', 28, 'b0000000-0000-0000-0000-000000000004', CURRENT_DATE - INTERVAL '7 days', NULL, true),

-- Furkan Korkmaz (En yetenekli - Forvet U14)
('pr000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000008', 'm0000000-0000-0000-0000-000000000001', 3.05, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '7 days', 'Takımın en hızlısı', true),
('pr000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000008', 'm0000000-0000-0000-0000-000000000002', 5.45, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '7 days', 'Harika!', true),
('pr000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000008', 'm0000000-0000-0000-0000-000000000004', 55, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '5 days', NULL, true),
('pr000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000008', 'm0000000-0000-0000-0000-000000000007', 9, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '3 days', 'Elit seviye', true),
('pr000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000008', 'm0000000-0000-0000-0000-000000000009', 85, 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '2 days', 'Golcü', true);

-- ============================================================================
-- 15. ACHIEVEMENTS (Başarımlar)
-- ============================================================================
INSERT INTO achievements (id, organization_id, code, name, description, category, xp_reward, criteria, is_system, is_active) VALUES
('ac000000-0000-0000-0000-000000000001', NULL, 'FIRST_TRAINING', 'İlk Adım', 'İlk antrenmanını tamamla', 'Başlangıç', 50, '{"type": "training_count", "value": 1}'::jsonb, true, true),
('ac000000-0000-0000-0000-000000000002', NULL, 'STREAK_7', 'Kararlı', '7 gün üst üste antrenman yap', 'Süreklilik', 100, '{"type": "streak_days", "value": 7}'::jsonb, true, true),
('ac000000-0000-0000-0000-000000000003', NULL, 'STREAK_30', 'Azimli', '30 gün üst üste antrenman yap', 'Süreklilik', 300, '{"type": "streak_days", "value": 30}'::jsonb, true, true),
('ac000000-0000-0000-0000-000000000004', NULL, 'SPEED_DEMON', 'Hız Canavarı', '20m sprinti 3.2 saniyenin altında tamamla', 'Performans', 200, '{"type": "metric", "metric": "SPRINT_20M", "value": 3.2, "comparison": "less"}'::jsonb, true, true),
('ac000000-0000-0000-0000-000000000005', NULL, 'PRECISION_PASSER', 'Pas Ustası', 'Pas isabetini %90 üzerine çıkar', 'Teknik', 150, '{"type": "metric", "metric": "PASSING_ACC", "value": 90, "comparison": "greater"}'::jsonb, true, true),
('ac000000-0000-0000-0000-000000000006', NULL, 'LEVEL_5', 'Yükselen Yıldız', 'Seviye 5e ulaş', 'Seviye', 250, '{"type": "level", "value": 5}'::jsonb, true, true),
('ac000000-0000-0000-0000-000000000007', NULL, 'LEVEL_10', 'Gelecek Vaat Eden', 'Seviye 10a ulaş', 'Seviye', 500, '{"type": "level", "value": 10}'::jsonb, true, true),
('ac000000-0000-0000-0000-000000000008', NULL, 'PROGRAM_COMPLETE', 'Program Tamamlayıcı', 'Bir programı tamamen bitir', 'Başarı', 100, '{"type": "program_complete", "value": 1}'::jsonb, true, true),
('ac000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'TEAM_PLAYER', 'Takım Oyuncusu', 'Tüm takım antrenmanlarına katıl (ay)', 'Takım', 200, '{"type": "attendance_perfect", "period": "month"}'::jsonb, false, true),
('ac000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'GOAL_SCORER', 'Golcü', 'Bir ayda 10+ gol at', 'Performans', 300, '{"type": "goals", "value": 10, "period": "month"}'::jsonb, false, true);

-- ============================================================================
-- 16. ATHLETE ACHIEVEMENTS (Kazanılan Başarımlar)
-- ============================================================================
INSERT INTO athlete_achievements (id, athlete_id, achievement_id, earned_at, progress_data) VALUES
-- Enes
('aa000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '60 days', NULL),
('aa000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '30 days', NULL),
('aa000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000006', CURRENT_DATE - INTERVAL '14 days', NULL),

-- Kerem
('aa000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'ac000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '45 days', NULL),
('aa000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', 'ac000000-0000-0000-0000-000000000008', CURRENT_DATE - INTERVAL '7 days', NULL),

-- Ali
('aa000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000003', 'ac000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '90 days', NULL),
('aa000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000003', 'ac000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '60 days', NULL),
('aa000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000003', 'ac000000-0000-0000-0000-000000000006', CURRENT_DATE - INTERVAL '30 days', NULL),
('aa000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000003', 'ac000000-0000-0000-0000-000000000009', CURRENT_DATE - INTERVAL '5 days', NULL),

-- Furkan (en başarılı)
('aa000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000008', 'ac000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '120 days', NULL),
('aa000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000008', 'ac000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '90 days', NULL),
('aa000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000008', 'ac000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '60 days', NULL),
('aa000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000008', 'ac000000-0000-0000-0000-000000000004', CURRENT_DATE - INTERVAL '7 days', NULL),
('aa000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000008', 'ac000000-0000-0000-0000-000000000006', CURRENT_DATE - INTERVAL '45 days', NULL),
('aa000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000008', 'ac000000-0000-0000-0000-000000000007', CURRENT_DATE - INTERVAL '10 days', NULL);

-- ============================================================================
-- 17. ATHLETE GOALS (Hedefler)
-- ============================================================================
INSERT INTO athlete_goals (id, athlete_id, title, description, metric_type_id, target_value, current_value, start_date, target_date, is_active) VALUES
('ag000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '20m Sprint Hedefi', '20m sprinti 3.2 saniyeye indirmek', 'm0000000-0000-0000-0000-000000000001', 3.2, 3.32, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', true),
('ag000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Şut İsabeti', 'Şut isabetini %80e çıkarmak', 'm0000000-0000-0000-0000-000000000009', 80, 72, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '45 days', true),
('ag000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'Pas Ustası', 'Pas isabetini %90a çıkarmak', 'm0000000-0000-0000-0000-000000000008', 90, 85, CURRENT_DATE - INTERVAL '21 days', CURRENT_DATE + INTERVAL '30 days', true),
('ag000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 'Uzun Atlama', 'Durarak uzun atlamayı 210 cme çıkarmak', 'm0000000-0000-0000-0000-000000000005', 210, 195, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', true),
('ag000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000008', 'Dikey Sıçrama', 'Dikey sıçramayı 60 cme çıkarmak', 'm0000000-0000-0000-0000-000000000004', 60, 55, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '45 days', true);

-- ============================================================================
-- 18. FEE PLANS (Ücret Planları)
-- ============================================================================
INSERT INTO fee_plans (id, organization_id, name, description, amount, currency, billing_cycle, is_active) VALUES
('fp000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Standart Üyelik', 'Haftada 3 gün antrenman', 2500, 'TRY', 'monthly', true),
('fp000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Premium Üyelik', 'Haftada 5 gün antrenman + özel dersler', 4500, 'TRY', 'monthly', true),
('fp000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Yıllık Paket', '12 aylık standart üyelik (%15 indirim)', 25500, 'TRY', 'annually', true);

-- ============================================================================
-- 19. FEE PAYMENTS (Ödemeler)
-- ============================================================================
INSERT INTO fee_payments (id, organization_id, athlete_id, fee_plan_id, amount, currency, due_date, paid_date, status, payment_method, recorded_by, notes) VALUES
-- Enes - Düzenli ödemeler
('fpy00000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'fp000000-0000-0000-0000-000000000002', 4500, 'TRY', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '62 days', 'paid', 'bank_transfer', 'b0000000-0000-0000-0000-000000000002', NULL),
('fpy00000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'fp000000-0000-0000-0000-000000000002', 4500, 'TRY', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '28 days', 'paid', 'credit_card', 'b0000000-0000-0000-0000-000000000002', NULL),
('fpy00000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'fp000000-0000-0000-0000-000000000002', 4500, 'TRY', CURRENT_DATE, NULL, 'pending', NULL, NULL, 'Bu ayki ödeme'),

-- Kerem - Standart plan
('fpy00000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'fp000000-0000-0000-0000-000000000001', 2500, 'TRY', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days', 'paid', 'cash', 'b0000000-0000-0000-0000-000000000002', 'Elden ödeme'),
('fpy00000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'fp000000-0000-0000-0000-000000000001', 2500, 'TRY', CURRENT_DATE, NULL, 'pending', NULL, NULL, NULL),

-- Ali - Yıllık paket (ödendi)
('fpy00000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'fp000000-0000-0000-0000-000000000003', 25500, 'TRY', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '92 days', 'paid', 'bank_transfer', 'b0000000-0000-0000-0000-000000000002', 'Yıllık ödeme tamamlandı'),

-- Burak - Gecikmiş ödeme
('fpy00000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'fp000000-0000-0000-0000-000000000001', 2500, 'TRY', CURRENT_DATE - INTERVAL '10 days', NULL, 'overdue', NULL, NULL, 'Veli ile iletişime geçildi'),

-- Furkan - Premium ve düzenli
('fpy00000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'fp000000-0000-0000-0000-000000000002', 4500, 'TRY', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '32 days', 'paid', 'bank_transfer', 'b0000000-0000-0000-0000-000000000002', NULL),
('fpy00000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'fp000000-0000-0000-0000-000000000002', 4500, 'TRY', CURRENT_DATE, CURRENT_DATE - INTERVAL '2 days', 'paid', 'credit_card', 'b0000000-0000-0000-0000-000000000002', 'Erken ödeme');

-- ============================================================================
-- 20. NOTIFICATIONS (Bildirimler)
-- ============================================================================
INSERT INTO notifications (id, organization_id, title, body, notification_type, priority, target_roles, created_by, sent_at) VALUES
('n0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Hafta Sonu Turnuvası', 'Bu hafta sonu U12 ve U14 takımlarımız dostluk turnuvasına katılacak. Tüm velilerin katılımını bekliyoruz.', 'announcement', 'high', ARRAY['athlete', 'parent']::user_role[], 'b0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'),
('n0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Antrenman Saati Değişikliği', 'Yarınki U12 antrenmanı saat 17:00 yerine 16:00da başlayacaktır.', 'schedule_change', 'high', ARRAY['athlete', 'parent', 'coach']::user_role[], 'b0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day'),
('n0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Ödeme Hatırlatması', 'Şubat ayı aidat ödemelerinin son tarihi yaklaşmaktadır. Lütfen ödemelerinizi yapınız.', 'payment_reminder', 'medium', ARRAY['parent']::user_role[], 'b0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days'),
('n0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Yeni Program Eklendi', 'Dayanıklılık Antrenmanı programı tüm sporculara atandı. Detaylar için programlar sayfasını ziyaret edin.', 'program_update', 'low', ARRAY['athlete', 'coach']::user_role[], 'b0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '3 days');

-- ============================================================================
-- 21. NOTIFICATION RECIPIENTS
-- ============================================================================
INSERT INTO notification_recipients (id, notification_id, user_id, status, sent_at, read_at) VALUES
-- Turnuva duyurusu
('nr000000-0000-0000-0000-000000000001', 'n0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'read', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
('nr000000-0000-0000-0000-000000000002', 'n0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000020', 'read', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('nr000000-0000-0000-0000-000000000003', 'n0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'delivered', NOW() - INTERVAL '2 days', NULL),
('nr000000-0000-0000-0000-000000000004', 'n0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000021', 'delivered', NOW() - INTERVAL '2 days', NULL),

-- Saat değişikliği
('nr000000-0000-0000-0000-000000000005', 'n0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', 'read', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('nr000000-0000-0000-0000-000000000006', 'n0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'read', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- Ödeme hatırlatması
('nr000000-0000-0000-0000-000000000007', 'n0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000020', 'read', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
('nr000000-0000-0000-0000-000000000008', 'n0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000023', 'sent', NOW() - INTERVAL '5 days', NULL);

-- ============================================================================
-- 22. TRAINING LOGS (Antrenman Kayıtları)
-- ============================================================================
INSERT INTO training_logs (id, athlete_id, assigned_program_id, session_id, date, duration_minutes, completion_status, intensity_level, xp_earned, notes, coach_feedback, feedback_by, feedback_at) VALUES
-- Enes - son hafta
('tl000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ap000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000010', CURRENT_DATE - INTERVAL '3 days', 90, 'completed', 8, 75, 'Çok iyi bir antrenman geçti', 'Enes bugün harika performans gösterdi. Top kontrolü çok gelişmiş.', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '3 days'),
('tl000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'ap000000-0000-0000-0000-000000000001', NULL, CURRENT_DATE - INTERVAL '5 days', 45, 'completed', 7, 50, 'Bireysel çalışma', NULL, NULL, NULL),

-- Kerem
('tl000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'ap000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000010', CURRENT_DATE - INTERVAL '3 days', 90, 'completed', 7, 70, NULL, 'Pas oyununda gelişim var, şut çalışmalarına devam etmeli.', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '3 days'),

-- Ali
('tl000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 'ap000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000011', CURRENT_DATE - INTERVAL '2 days', 90, 'completed', 9, 85, 'Yoğun kondisyon antrenmanı', 'Defansta liderlik vasıfları gösteriyor. Takım arkadaşlarına yardımcı oluyor.', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '2 days'),

-- Furkan
('tl000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000008', 'ap000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000011', CURRENT_DATE - INTERVAL '2 days', 90, 'completed', 10, 100, 'Mükemmel performans!', 'Furkan her antrenmanında kendini aşıyor. Profesyonel potansiyeli var.', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '2 days'),
('tl000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000008', 'ap000000-0000-0000-0000-000000000007', NULL, CURRENT_DATE - INTERVAL '1 day', 60, 'completed', 8, 65, 'Ekstra bireysel çalışma', NULL, NULL, NULL);

-- ============================================================================
-- DONE! Seed data yüklendi.
-- ============================================================================

-- Özet:
-- 1 Organizasyon: Yıldız Futbol Akademisi
-- 14 Kullanıcı: 1 super admin, 1 club admin, 2 coach, 8 athlete, 4 parent
-- 3 Grup: U10, U12, U14
-- 6 Program: Teknik, Fiziksel, Taktik, Kaleci
-- 7+ Seans: Geçmiş ve gelecek antrenmanlar
-- 10 Metrik: Hız, çeviklik, güç, teknik ölçümleri
-- 18+ Performans kaydı
-- 10 Başarım tanımı, 15+ kazanılmış başarım
-- 5 Hedef
-- 3 Ücret planı, 9 ödeme kaydı
-- 4 Bildirim

SELECT 'Seed data başarıyla yüklendi!' as status;
