-- Academy360 Initial Schema Migration
-- Multi-tenant football player development platform

-- ============================================
-- EXTENSIONS (pgcrypto for gen_random_uuid is pre-enabled in Supabase)
-- ============================================

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('athlete', 'coach', 'club_admin', 'parent', 'super_admin');
CREATE TYPE membership_status AS ENUM ('pending', 'active', 'suspended', 'inactive');
CREATE TYPE assignment_status AS ENUM ('assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled', 'refunded');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE completion_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');

-- ============================================
-- ORGANIZATIONS (Multi-tenant root)
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- USER PROFILES (extends auth.users)
-- ============================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    locale VARCHAR(10) DEFAULT 'tr',
    timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    kvkk_consent BOOLEAN DEFAULT FALSE,
    kvkk_consent_date TIMESTAMPTZ,
    notification_preferences JSONB DEFAULT '{"email": true, "push": false, "sms": false}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- MEMBERSHIPS (user <-> organization relationship)
-- ============================================
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    status membership_status DEFAULT 'pending',
    invited_by UUID REFERENCES user_profiles(id),
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id, role)
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(organization_id);
CREATE INDEX idx_memberships_role ON memberships(role);
CREATE INDEX idx_memberships_status ON memberships(status);

-- ============================================
-- ATHLETE PROFILES
-- ============================================
CREATE TABLE athlete_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    birth_date DATE,
    position VARCHAR(50),
    dominant_foot VARCHAR(10),
    jersey_number INTEGER,
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    medical_notes TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    current_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_athlete_profiles_user ON athlete_profiles(user_id);
CREATE INDEX idx_athlete_profiles_org ON athlete_profiles(organization_id);

-- ============================================
-- COACH PROFILES
-- ============================================
CREATE TABLE coach_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    license_number VARCHAR(100),
    license_type VARCHAR(100),
    specialization VARCHAR(255),
    bio TEXT,
    years_experience INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_coach_profiles_user ON coach_profiles(user_id);
CREATE INDEX idx_coach_profiles_org ON coach_profiles(organization_id);

-- ============================================
-- PARENT-ATHLETE RELATIONSHIPS
-- ============================================
CREATE TABLE parent_athlete_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    athlete_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'parent',
    is_primary BOOLEAN DEFAULT FALSE,
    can_view_progress BOOLEAN DEFAULT TRUE,
    can_view_payments BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_user_id, athlete_user_id, organization_id)
);

CREATE INDEX idx_parent_athlete_parent ON parent_athlete_relations(parent_user_id);
CREATE INDEX idx_parent_athlete_athlete ON parent_athlete_relations(athlete_user_id);

-- ============================================
-- GROUPS (teams, age groups, etc.)
-- ============================================
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    age_group VARCHAR(20),
    max_members INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_org ON groups(organization_id);
CREATE INDEX idx_groups_active ON groups(is_active);

-- ============================================
-- GROUP MEMBERS
-- ============================================
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- member, captain, assistant_coach
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_active ON group_members(is_active);

-- ============================================
-- PROGRAMS (training programs from content provider)
-- ============================================
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    external_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_level INTEGER DEFAULT 1,
    estimated_duration_minutes INTEGER,
    thumbnail_url TEXT,
    content_data JSONB DEFAULT '{}',
    tags TEXT[],
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    source VARCHAR(50) DEFAULT 'internal', -- internal, external_api
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_programs_org ON programs(organization_id);
CREATE INDEX idx_programs_category ON programs(category);
CREATE INDEX idx_programs_external ON programs(external_id);
CREATE INDEX idx_programs_active ON programs(is_active);
CREATE INDEX idx_programs_tags ON programs USING GIN(tags);

-- ============================================
-- PROGRAM VERSIONS (for tracking content updates)
-- ============================================
CREATE TABLE program_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_data JSONB NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, version_number)
);

CREATE INDEX idx_program_versions_program ON program_versions(program_id);

-- ============================================
-- ASSIGNED PROGRAMS
-- ============================================
CREATE TABLE assigned_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES user_profiles(id),
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    status assignment_status DEFAULT 'assigned',
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    progress_percentage INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assigned_programs_athlete ON assigned_programs(athlete_id);
CREATE INDEX idx_assigned_programs_program ON assigned_programs(program_id);
CREATE INDEX idx_assigned_programs_status ON assigned_programs(status);
CREATE INDEX idx_assigned_programs_group ON assigned_programs(group_id);

-- ============================================
-- TRAINING LOGS
-- ============================================
CREATE TABLE training_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    assigned_program_id UUID REFERENCES assigned_programs(id) ON DELETE SET NULL,
    session_id UUID,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER,
    intensity_level INTEGER CHECK (intensity_level BETWEEN 1 AND 10),
    completion_status completion_status DEFAULT 'not_started',
    exercises_completed JSONB DEFAULT '[]',
    notes TEXT,
    coach_feedback TEXT,
    feedback_by UUID REFERENCES user_profiles(id),
    feedback_at TIMESTAMPTZ,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_logs_athlete ON training_logs(athlete_id);
CREATE INDEX idx_training_logs_date ON training_logs(date);
CREATE INDEX idx_training_logs_assigned ON training_logs(assigned_program_id);

-- ============================================
-- METRIC TYPES (configurable metrics)
-- ============================================
CREATE TABLE metric_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    category VARCHAR(100),
    data_type VARCHAR(20) DEFAULT 'number', -- number, time, boolean, text
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    is_higher_better BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_metric_types_org ON metric_types(organization_id);
CREATE INDEX idx_metric_types_category ON metric_types(category);
CREATE INDEX idx_metric_types_code ON metric_types(code);

-- ============================================
-- PERFORMANCE RECORDS (measurements)
-- ============================================
CREATE TABLE performance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    metric_type_id UUID NOT NULL REFERENCES metric_types(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES user_profiles(id),
    value DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    session_id UUID,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_records_athlete ON performance_records(athlete_id);
CREATE INDEX idx_performance_records_metric ON performance_records(metric_type_id);
CREATE INDEX idx_performance_records_date ON performance_records(recorded_at);
CREATE INDEX idx_performance_records_athlete_metric ON performance_records(athlete_id, metric_type_id);

-- ============================================
-- SESSIONS (training sessions, matches)
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    coach_id UUID REFERENCES user_profiles(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    session_type VARCHAR(50) DEFAULT 'training', -- training, match, assessment, other
    location VARCHAR(255),
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_org ON sessions(organization_id);
CREATE INDEX idx_sessions_group ON sessions(group_id);
CREATE INDEX idx_sessions_coach ON sessions(coach_id);
CREATE INDEX idx_sessions_date ON sessions(scheduled_start);
CREATE INDEX idx_sessions_status ON sessions(status);

-- ============================================
-- ATTENDANCE
-- ============================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'present',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    recorded_by UUID REFERENCES user_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, athlete_id)
);

CREATE INDEX idx_attendance_session ON attendance(session_id);
CREATE INDEX idx_attendance_athlete ON attendance(athlete_id);
CREATE INDEX idx_attendance_status ON attendance(status);

-- ============================================
-- FEE PLANS
-- ============================================
CREATE TABLE fee_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, yearly, one_time
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_plans_org ON fee_plans(organization_id);
CREATE INDEX idx_fee_plans_active ON fee_plans(is_active);

-- ============================================
-- FEE PAYMENTS
-- ============================================
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    fee_plan_id UUID REFERENCES fee_plans(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    due_date DATE NOT NULL,
    paid_date DATE,
    status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    notes TEXT,
    recorded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_payments_org ON fee_payments(organization_id);
CREATE INDEX idx_fee_payments_athlete ON fee_payments(athlete_id);
CREATE INDEX idx_fee_payments_status ON fee_payments(status);
CREATE INDEX idx_fee_payments_due ON fee_payments(due_date);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'general',
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    target_roles user_role[],
    target_groups UUID[],
    metadata JSONB DEFAULT '{}',
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);

-- ============================================
-- NOTIFICATION RECIPIENTS
-- ============================================
CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    status notification_status DEFAULT 'pending',
    channel VARCHAR(20) DEFAULT 'email', -- email, push, sms
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(notification_id, user_id, channel)
);

CREATE INDEX idx_notification_recipients_notification ON notification_recipients(notification_id);
CREATE INDEX idx_notification_recipients_user ON notification_recipients(user_id);
CREATE INDEX idx_notification_recipients_status ON notification_recipients(status);

-- ============================================
-- ACHIEVEMENTS
-- ============================================
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    category VARCHAR(50),
    xp_reward INTEGER DEFAULT 0,
    criteria JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_achievements_org ON achievements(organization_id);
CREATE INDEX idx_achievements_code ON achievements(code);
CREATE INDEX idx_achievements_category ON achievements(category);

-- ============================================
-- ATHLETE ACHIEVEMENTS
-- ============================================
CREATE TABLE athlete_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}',
    UNIQUE(athlete_id, achievement_id)
);

CREATE INDEX idx_athlete_achievements_athlete ON athlete_achievements(athlete_id);
CREATE INDEX idx_athlete_achievements_achievement ON athlete_achievements(achievement_id);

-- ============================================
-- ATHLETE GOALS
-- ============================================
CREATE TABLE athlete_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    metric_type_id UUID REFERENCES metric_types(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2) DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_athlete_goals_athlete ON athlete_goals(athlete_id);
CREATE INDEX idx_athlete_goals_active ON athlete_goals(is_active);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- CONTENT SYNC LOGS
-- ============================================
CREATE TABLE content_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_content_sync_logs_org ON content_sync_logs(organization_id);
CREATE INDEX idx_content_sync_logs_status ON content_sync_logs(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for all relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_athlete_profiles_updated_at BEFORE UPDATE ON athlete_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coach_profiles_updated_at BEFORE UPDATE ON coach_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assigned_programs_updated_at BEFORE UPDATE ON assigned_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_logs_updated_at BEFORE UPDATE ON training_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_plans_updated_at BEFORE UPDATE ON fee_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_payments_updated_at BEFORE UPDATE ON fee_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_athlete_goals_updated_at BEFORE UPDATE ON athlete_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED DATA: System Metric Types
-- ============================================
INSERT INTO metric_types (code, name, description, unit, category, data_type, is_higher_better, is_system, display_order) VALUES
('sprint_10m', '10m Sprint', '10 metre sprint süresi', 'saniye', 'Hız', 'number', FALSE, TRUE, 1),
('sprint_20m', '20m Sprint', '20 metre sprint süresi', 'saniye', 'Hız', 'number', FALSE, TRUE, 2),
('sprint_30m', '30m Sprint', '30 metre sprint süresi', 'saniye', 'Hız', 'number', FALSE, TRUE, 3),
('agility_t_test', 'T-Test', 'T-Test çeviklik süresi', 'saniye', 'Çeviklik', 'number', FALSE, TRUE, 4),
('agility_illinois', 'Illinois Test', 'Illinois çeviklik testi', 'saniye', 'Çeviklik', 'number', FALSE, TRUE, 5),
('vertical_jump', 'Dikey Sıçrama', 'Dikey sıçrama yüksekliği', 'cm', 'Patlayıcılık', 'number', TRUE, TRUE, 6),
('standing_long_jump', 'Uzun Atlama', 'Durarak uzun atlama mesafesi', 'cm', 'Patlayıcılık', 'number', TRUE, TRUE, 7),
('yo_yo_ir1', 'Yo-Yo IR1', 'Yo-Yo aralıklı toparlanma testi seviye 1', 'metre', 'Dayanıklılık', 'number', TRUE, TRUE, 8),
('beep_test', 'Beep Test', 'Mekik koşusu testi seviyesi', 'seviye', 'Dayanıklılık', 'number', TRUE, TRUE, 9),
('ball_control_30s', '30sn Top Kontrolü', '30 saniyede top sektirme sayısı', 'adet', 'Teknik', 'number', TRUE, TRUE, 10),
('passing_accuracy', 'Pas Doğruluğu', '10 pasta isabet oranı', 'adet', 'Teknik', 'number', TRUE, TRUE, 11),
('shooting_accuracy', 'Şut Doğruluğu', '10 şutta isabet oranı', 'adet', 'Teknik', 'number', TRUE, TRUE, 12),
('height', 'Boy', 'Sporcu boyu', 'cm', 'Fiziksel', 'number', TRUE, TRUE, 13),
('weight', 'Kilo', 'Sporcu kilosu', 'kg', 'Fiziksel', 'number', FALSE, TRUE, 14),
('body_fat', 'Vücut Yağ Oranı', 'Vücut yağ yüzdesi', '%', 'Fiziksel', 'number', FALSE, TRUE, 15);

-- ============================================
-- SEED DATA: System Achievements
-- ============================================
INSERT INTO achievements (code, name, description, category, xp_reward, criteria, is_system) VALUES
('first_training', 'İlk Antrenman', 'İlk antrenmanını tamamladın!', 'Başlangıç', 50, '{"type": "training_count", "value": 1}', TRUE),
('week_warrior', 'Hafta Savaşçısı', 'Bir haftada 5 antrenman tamamladın!', 'Tutarlılık', 100, '{"type": "weekly_training", "value": 5}', TRUE),
('streak_7', '7 Gün Serisi', '7 gün üst üste antrenman yaptın!', 'Tutarlılık', 150, '{"type": "streak", "value": 7}', TRUE),
('streak_30', '30 Gün Serisi', '30 gün üst üste antrenman yaptın!', 'Tutarlılık', 500, '{"type": "streak", "value": 30}', TRUE),
('speed_demon', 'Hız Canavarı', 'Sprint testinde %10 gelişim gösterdin!', 'Gelişim', 200, '{"type": "metric_improvement", "metric": "sprint", "value": 10}', TRUE),
('endurance_king', 'Dayanıklılık Kralı', 'Dayanıklılık testinde %10 gelişim gösterdin!', 'Gelişim', 200, '{"type": "metric_improvement", "metric": "endurance", "value": 10}', TRUE),
('perfect_attendance', 'Tam Katılım', 'Bir ay boyunca tüm antrenmanlara katıldın!', 'Katılım', 300, '{"type": "monthly_attendance", "value": 100}', TRUE),
('goal_setter', 'Hedef Belirleyici', 'İlk hedefini belirledin!', 'Hedefler', 25, '{"type": "goal_count", "value": 1}', TRUE),
('goal_crusher', 'Hedef Kırıcı', 'İlk hedefini tamamladın!', 'Hedefler', 100, '{"type": "goal_completed", "value": 1}', TRUE),
('program_master', 'Program Ustası', '10 programı tamamladın!', 'Programlar', 250, '{"type": "program_completed", "value": 10}', TRUE),
('level_5', 'Seviye 5', 'Seviye 5''e ulaştın!', 'Seviye', 100, '{"type": "level", "value": 5}', TRUE),
('level_10', 'Seviye 10', 'Seviye 10''a ulaştın!', 'Seviye', 250, '{"type": "level", "value": 10}', TRUE),
('xp_1000', '1000 XP', '1000 XP kazandın!', 'XP', 50, '{"type": "total_xp", "value": 1000}', TRUE),
('xp_5000', '5000 XP', '5000 XP kazandın!', 'XP', 150, '{"type": "total_xp", "value": 5000}', TRUE),
('xp_10000', '10000 XP', '10000 XP kazandın!', 'XP', 300, '{"type": "total_xp", "value": 10000}', TRUE);
