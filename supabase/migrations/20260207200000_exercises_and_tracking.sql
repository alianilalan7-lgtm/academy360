-- Phase 2: Exercises, Training Templates, and Athlete Tracking
-- Academy360 - PDF Specification Implementation

-- ============================================
-- NEW ENUMS
-- ============================================
CREATE TYPE exercise_category AS ENUM ('warmup', 'coordination', 'strength_agility', 'ball_work', 'cooldown');
CREATE TYPE exercise_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE age_group AS ENUM ('U9', 'U11', 'U13', 'U15', 'U17', 'U18', 'academy');
CREATE TYPE template_type AS ENUM ('technical', 'tactical', 'physical', 'game_based');
CREATE TYPE season_type AS ENUM ('pre_season', 'in_season', 'post_season');
CREATE TYPE score_category AS ENUM ('technical', 'physical', 'behavioral');

-- ============================================
-- EXERCISES (Egzersiz Kütüphanesi)
-- 5 kategori x 7 egzersiz x 3 zorluk = 105 egzersiz
-- ============================================
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    category exercise_category NOT NULL,
    difficulty exercise_difficulty NOT NULL,
    order_number INTEGER NOT NULL CHECK (order_number BETWEEN 1 AND 7),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    animation_url TEXT,
    thumbnail_url TEXT,
    repetitions INTEGER,
    duration_seconds INTEGER,
    rest_seconds INTEGER,
    sets INTEGER DEFAULT 1,
    equipment TEXT[],
    instructions JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX idx_exercises_org ON exercises(organization_id);
CREATE INDEX idx_exercises_system ON exercises(is_system);
CREATE INDEX idx_exercises_cat_diff ON exercises(category, difficulty, order_number);

CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRAINING TEMPLATES (Hazır Antrenman Şablonları)
-- 7 yaş grubu x 4 tür = 28 şablon seti
-- ============================================
CREATE TABLE training_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    age_group age_group NOT NULL,
    template_type template_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    exercise_ids UUID[] DEFAULT '{}',
    duration_minutes INTEGER,
    intensity_level INTEGER CHECK (intensity_level BETWEEN 1 AND 10),
    notes TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_templates_age ON training_templates(age_group);
CREATE INDEX idx_training_templates_type ON training_templates(template_type);
CREATE INDEX idx_training_templates_org ON training_templates(organization_id);
CREATE INDEX idx_training_templates_system ON training_templates(is_system);

CREATE TRIGGER update_training_templates_updated_at
    BEFORE UPDATE ON training_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EXERCISE COMPLETIONS ("Yaptım" İşaretleme)
-- ============================================
CREATE TABLE exercise_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER,
    sets_completed INTEGER DEFAULT 1,
    reps_completed INTEGER,
    notes TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_exercise_completions_athlete ON exercise_completions(athlete_id);
CREATE INDEX idx_exercise_completions_exercise ON exercise_completions(exercise_id);
CREATE INDEX idx_exercise_completions_date ON exercise_completions(completed_at);
CREATE INDEX idx_exercise_completions_athlete_date ON exercise_completions(athlete_id, completed_at);

-- ============================================
-- SKILL SCORES (Bireysel Puanlama Sistemi)
-- Pas, Kontrol, Şut, Dayanıklılık, Hız, Disiplin vb.
-- ============================================
CREATE TABLE skill_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scorer_id UUID NOT NULL REFERENCES user_profiles(id),
    category score_category NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_scores_athlete ON skill_scores(athlete_id);
CREATE INDEX idx_skill_scores_org ON skill_scores(organization_id);
CREATE INDEX idx_skill_scores_category ON skill_scores(category);
CREATE INDEX idx_skill_scores_athlete_skill ON skill_scores(athlete_id, skill_name);
CREATE INDEX idx_skill_scores_date ON skill_scores(measured_at);

-- ============================================
-- DEVELOPMENT NOTES (Antrenör Gelişim Notları)
-- ============================================
CREATE TABLE development_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES user_profiles(id),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    category VARCHAR(50),
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_development_notes_athlete ON development_notes(athlete_id);
CREATE INDEX idx_development_notes_org ON development_notes(organization_id);
CREATE INDEX idx_development_notes_coach ON development_notes(coach_id);
CREATE INDEX idx_development_notes_session ON development_notes(session_id);

CREATE TRIGGER update_development_notes_updated_at
    BEFORE UPDATE ON development_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- WEEKLY PLANS (Haftalık Antrenman Planı)
-- ============================================
CREATE TABLE weekly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES user_profiles(id),
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    week_start DATE NOT NULL,
    plan_data JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, group_id, week_start)
);

CREATE INDEX idx_weekly_plans_org ON weekly_plans(organization_id);
CREATE INDEX idx_weekly_plans_coach ON weekly_plans(coach_id);
CREATE INDEX idx_weekly_plans_group ON weekly_plans(group_id);
CREATE INDEX idx_weekly_plans_week ON weekly_plans(week_start);

CREATE TRIGGER update_weekly_plans_updated_at
    BEFORE UPDATE ON weekly_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Exercises: everyone can read system/org exercises, coaches/admins can create
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_select" ON exercises
    FOR SELECT USING (
        is_system = TRUE
        OR organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "exercises_insert" ON exercises
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = exercises.organization_id
            AND role IN ('coach', 'club_admin', 'super_admin')
            AND status = 'active'
        )
    );

CREATE POLICY "exercises_update" ON exercises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = exercises.organization_id
            AND role IN ('coach', 'club_admin', 'super_admin')
            AND status = 'active'
        )
    );

-- Training Templates: similar to exercises
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_templates_select" ON training_templates
    FOR SELECT USING (
        is_system = TRUE
        OR organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "training_templates_insert" ON training_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = training_templates.organization_id
            AND role IN ('coach', 'club_admin', 'super_admin')
            AND status = 'active'
        )
    );

CREATE POLICY "training_templates_update" ON training_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = training_templates.organization_id
            AND role IN ('coach', 'club_admin', 'super_admin')
            AND status = 'active'
        )
    );

-- Exercise Completions: athletes can insert their own, coaches can read org
ALTER TABLE exercise_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_completions_select" ON exercise_completions
    FOR SELECT USING (
        athlete_id IN (
            SELECT id FROM athlete_profiles
            WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM memberships m
            JOIN athlete_profiles ap ON ap.organization_id = m.organization_id
            WHERE m.user_id = auth.uid()
            AND m.role IN ('coach', 'club_admin', 'super_admin')
            AND m.status = 'active'
            AND ap.id = exercise_completions.athlete_id
        )
    );

CREATE POLICY "exercise_completions_insert" ON exercise_completions
    FOR INSERT WITH CHECK (
        athlete_id IN (
            SELECT id FROM athlete_profiles
            WHERE user_id = auth.uid()
        )
    );

-- Skill Scores: coaches can insert, athletes can read their own
ALTER TABLE skill_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_scores_select" ON skill_scores
    FOR SELECT USING (
        athlete_id IN (
            SELECT id FROM athlete_profiles WHERE user_id = auth.uid()
        )
        OR scorer_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = skill_scores.organization_id
            AND role IN ('coach', 'club_admin', 'super_admin')
            AND status = 'active'
        )
    );

CREATE POLICY "skill_scores_insert" ON skill_scores
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = skill_scores.organization_id
            AND role IN ('coach', 'club_admin', 'super_admin')
            AND status = 'active'
        )
    );

-- Development Notes
ALTER TABLE development_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "development_notes_select" ON development_notes
    FOR SELECT USING (
        coach_id = auth.uid()
        OR (
            is_private = FALSE AND athlete_id IN (
                SELECT id FROM athlete_profiles WHERE user_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = development_notes.organization_id
            AND role IN ('club_admin', 'super_admin')
            AND status = 'active'
        )
    );

CREATE POLICY "development_notes_insert" ON development_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = development_notes.organization_id
            AND role IN ('coach', 'club_admin', 'super_admin')
            AND status = 'active'
        )
    );

CREATE POLICY "development_notes_update" ON development_notes
    FOR UPDATE USING (coach_id = auth.uid());

-- Weekly Plans
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_plans_select" ON weekly_plans
    FOR SELECT USING (
        coach_id = auth.uid()
        OR (
            is_published = TRUE AND organization_id IN (
                SELECT organization_id FROM memberships
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
        OR EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = weekly_plans.organization_id
            AND role IN ('club_admin', 'super_admin')
            AND status = 'active'
        )
    );

CREATE POLICY "weekly_plans_insert" ON weekly_plans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = weekly_plans.organization_id
            AND role IN ('coach', 'club_admin', 'super_admin')
            AND status = 'active'
        )
    );

CREATE POLICY "weekly_plans_update" ON weekly_plans
    FOR UPDATE USING (coach_id = auth.uid());

-- ============================================
-- SEED: System Exercise Data (105 exercises)
-- ============================================

-- TOPSUZ ISINMA (Warmup) - 7 exercises x 3 difficulties
INSERT INTO exercises (category, difficulty, order_number, name, description, repetitions, duration_seconds, rest_seconds, sets, is_system) VALUES
-- Easy (1-2)
('warmup', 'easy', 1, 'Hafif Koşu', 'Düz çizgide hafif tempoda koşu', NULL, 120, 30, 1, TRUE),
('warmup', 'easy', 2, 'Diz Çekme Yürüyüşü', 'Yürürken dizleri göğüse çekme', 15, NULL, 15, 2, TRUE),
-- Medium (3-5)
('warmup', 'medium', 3, 'Karioka Koşu', 'Yan adım ile çapraz bacak koşusu', NULL, 60, 20, 3, TRUE),
('warmup', 'medium', 4, 'Bacak Sallama', 'İleri-geri ve yana bacak sallama', 12, NULL, 15, 2, TRUE),
('warmup', 'medium', 5, 'Dinamik Germe', 'Lunge yürüyüşü ile dinamik germe', 10, NULL, 20, 2, TRUE),
-- Hard (6-7)
('warmup', 'hard', 6, 'Yüksek Tempolu Koşu', 'Tempo artırımlı sprint hazırlığı', NULL, 90, 30, 3, TRUE),
('warmup', 'hard', 7, 'Kombinasyon Isınma', 'Koşu + diz çekme + topuk kıçı kombinasyonu', NULL, 120, 30, 2, TRUE),

-- KOORDİNASYON (Coordination) - 7 exercises x 3 difficulties
('coordination', 'easy', 1, 'Merdiven Drili - Temel', 'Koordinasyon merdiveninde ileri koşu', 5, NULL, 20, 3, TRUE),
('coordination', 'easy', 2, 'Slalom Koşu', 'Huniler arasında slalom', 5, NULL, 20, 3, TRUE),
('coordination', 'medium', 3, 'Merdiven Drili - Yan Adım', 'Koordinasyon merdiveninde yana hareket', 5, NULL, 25, 3, TRUE),
('coordination', 'medium', 4, 'Çift Ayak Sıçrama', 'Engeller üzerinden çift ayak sıçrama', 8, NULL, 20, 3, TRUE),
('coordination', 'medium', 5, 'Çapraz Adım Drili', 'Merdivende çapraz adımlarla ilerleme', 5, NULL, 25, 3, TRUE),
('coordination', 'hard', 6, 'Kombine Koordinasyon', 'Merdiven + huni + engel kombinasyonu', 3, NULL, 45, 3, TRUE),
('coordination', 'hard', 7, 'Reaksiyon Koordinasyonu', 'Görsel sinyale göre yön değiştirme', 8, NULL, 30, 3, TRUE),

-- KUVVET/ÇEVİKLİK (Strength/Agility) - 7 exercises x 3 difficulties
('strength_agility', 'easy', 1, 'Squat', 'Vücut ağırlığı ile squat', 12, NULL, 30, 3, TRUE),
('strength_agility', 'easy', 2, 'Plank', 'Düz kol veya dirsek plank', NULL, 30, 20, 3, TRUE),
('strength_agility', 'medium', 3, 'Lunge Yürüyüşü', 'Alternatif bacak ile lunge', 10, NULL, 30, 3, TRUE),
('strength_agility', 'medium', 4, 'Şınav', 'Standart şınav hareketi', 10, NULL, 30, 3, TRUE),
('strength_agility', 'medium', 5, 'Lateral Sıçrama', 'Yana tek ayak sıçrama', 8, NULL, 25, 3, TRUE),
('strength_agility', 'hard', 6, 'Burpee', 'Tam burpee hareketi', 8, NULL, 40, 3, TRUE),
('strength_agility', 'hard', 7, 'Box Jump', 'Kutu üzerine çift ayak sıçrama', 8, NULL, 35, 3, TRUE),

-- TOPLU ÇALIŞMA (Ball Work) - 7 exercises x 3 difficulties
('ball_work', 'easy', 1, 'Top Sektirme', 'Ayak üstü ile top sektirme', 20, NULL, 15, 3, TRUE),
('ball_work', 'easy', 2, 'Kısa Pas', 'Çiftler halinde kısa pas çalışması', NULL, 120, 30, 2, TRUE),
('ball_work', 'medium', 3, 'Top Sürme - Slalom', 'Huniler arasında top sürme', 5, NULL, 30, 3, TRUE),
('ball_work', 'medium', 4, 'Uzun Pas', 'Orta-uzun mesafe pas çalışması', 10, NULL, 20, 3, TRUE),
('ball_work', 'medium', 5, 'Kontrol ve Dönüş', 'Havadan gelen topu kontrol edip dönme', 8, NULL, 20, 3, TRUE),
('ball_work', 'hard', 6, 'Şut Çalışması', 'Ceza sahası dışından isabetli şut', 10, NULL, 30, 3, TRUE),
('ball_work', 'hard', 7, 'Kombine Top Çalışması', 'Sürme + pas + şut kombinasyonu', 5, NULL, 45, 3, TRUE),

-- SOĞUMA/ESNEME (Cooldown) - 7 exercises x 3 difficulties
('cooldown', 'easy', 1, 'Yavaş Koşu', 'Tempo düşürme koşusu', NULL, 180, 0, 1, TRUE),
('cooldown', 'easy', 2, 'Hamstring Germe', 'Oturarak hamstring esnetme', NULL, 30, 10, 2, TRUE),
('cooldown', 'medium', 3, 'Quadriceps Germe', 'Ayakta quadriceps esnetme', NULL, 30, 10, 2, TRUE),
('cooldown', 'medium', 4, 'Kalça Açma', 'Kelebek germe ve kalça açma hareketi', NULL, 30, 10, 2, TRUE),
('cooldown', 'medium', 5, 'Sırt Germe', 'Uzanarak sırt ve bel esnetme', NULL, 30, 10, 2, TRUE),
('cooldown', 'hard', 6, 'Yoga Pozisyonları', 'Aşağı bakan köpek, çocuk pozu vb.', NULL, 45, 15, 2, TRUE),
('cooldown', 'hard', 7, 'Foam Roller', 'Foam roller ile kas gevşetme', NULL, 60, 15, 2, TRUE);

-- ============================================
-- SEED: System Training Templates
-- ============================================
INSERT INTO training_templates (age_group, template_type, name, description, duration_minutes, intensity_level, is_system) VALUES
-- U9
('U9', 'technical', 'U9 Teknik Antrenman', 'U9 yaş grubu için temel teknik çalışma', 60, 4, TRUE),
('U9', 'tactical', 'U9 Taktik Antrenman', 'U9 yaş grubu için basit taktik kavramlar', 60, 3, TRUE),
('U9', 'physical', 'U9 Fiziksel Antrenman', 'U9 yaş grubu için koordinasyon ağırlıklı fiziksel çalışma', 45, 4, TRUE),
('U9', 'game_based', 'U9 Oyun Temelli Antrenman', 'U9 yaş grubu için eğlenceli oyunlarla öğrenme', 60, 5, TRUE),
-- U11
('U11', 'technical', 'U11 Teknik Antrenman', 'U11 yaş grubu için teknik gelişim çalışması', 75, 5, TRUE),
('U11', 'tactical', 'U11 Taktik Antrenman', 'U11 yaş grubu için temel taktik anlayış', 70, 4, TRUE),
('U11', 'physical', 'U11 Fiziksel Antrenman', 'U11 yaş grubu için çeviklik ve koordinasyon', 60, 5, TRUE),
('U11', 'game_based', 'U11 Oyun Temelli Antrenman', 'U11 yaş grubu için küçük alan oyunları', 75, 6, TRUE),
-- U13
('U13', 'technical', 'U13 Teknik Antrenman', 'U13 yaş grubu için ileri teknik çalışma', 80, 6, TRUE),
('U13', 'tactical', 'U13 Taktik Antrenman', 'U13 yaş grubu için pozisyonel taktik', 80, 5, TRUE),
('U13', 'physical', 'U13 Fiziksel Antrenman', 'U13 yaş grubu için güç ve dayanıklılık temelleri', 70, 6, TRUE),
('U13', 'game_based', 'U13 Oyun Temelli Antrenman', 'U13 yaş grubu için maç senaryoları', 80, 6, TRUE),
-- U15
('U15', 'technical', 'U15 Teknik Antrenman', 'U15 yaş grubu için bireysel teknik ustalık', 90, 7, TRUE),
('U15', 'tactical', 'U15 Taktik Antrenman', 'U15 yaş grubu için takım taktiği', 90, 6, TRUE),
('U15', 'physical', 'U15 Fiziksel Antrenman', 'U15 yaş grubu için kuvvet ve hız çalışması', 75, 7, TRUE),
('U15', 'game_based', 'U15 Oyun Temelli Antrenman', 'U15 yaş grubu için maç benzeri çalışma', 90, 7, TRUE),
-- U17
('U17', 'technical', 'U17 Teknik Antrenman', 'U17 yaş grubu için profesyonel teknik çalışma', 90, 8, TRUE),
('U17', 'tactical', 'U17 Taktik Antrenman', 'U17 yaş grubu için ileri taktik çalışma', 90, 7, TRUE),
('U17', 'physical', 'U17 Fiziksel Antrenman', 'U17 yaş grubu için atletik performans', 80, 8, TRUE),
('U17', 'game_based', 'U17 Oyun Temelli Antrenman', 'U17 yaş grubu için maç simülasyonu', 90, 8, TRUE),
-- U18
('U18', 'technical', 'U18 Teknik Antrenman', 'U18 yaş grubu için elit teknik çalışma', 90, 8, TRUE),
('U18', 'tactical', 'U18 Taktik Antrenman', 'U18 yaş grubu için profesyonel taktik anlayış', 90, 8, TRUE),
('U18', 'physical', 'U18 Fiziksel Antrenman', 'U18 yaş grubu için yüksek performans fiziksel çalışma', 85, 9, TRUE),
('U18', 'game_based', 'U18 Oyun Temelli Antrenman', 'U18 yaş grubu için gerçek maç senaryoları', 90, 8, TRUE),
-- Academy (Alt Yapı)
('academy', 'technical', 'Alt Yapı Teknik Antrenman', 'Akademi seviyesi teknik çalışma', 90, 9, TRUE),
('academy', 'tactical', 'Alt Yapı Taktik Antrenman', 'Akademi seviyesi taktik çalışma', 90, 8, TRUE),
('academy', 'physical', 'Alt Yapı Fiziksel Antrenman', 'Akademi seviyesi fiziksel performans', 85, 9, TRUE),
('academy', 'game_based', 'Alt Yapı Oyun Temelli Antrenman', 'Akademi seviyesi maç çalışması', 90, 9, TRUE);
