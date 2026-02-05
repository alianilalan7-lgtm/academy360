-- Academy360 Row Level Security Policies
-- Multi-tenant isolation with role-based access control

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_athlete_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND organization_id = org_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin of organization
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND organization_id = org_id
        AND role = 'club_admin'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is coach in organization
CREATE OR REPLACE FUNCTION is_org_coach(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND organization_id = org_id
        AND role = 'coach'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is athlete in organization
CREATE OR REPLACE FUNCTION is_org_athlete(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND organization_id = org_id
        AND role = 'athlete'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if coach manages athlete (through groups)
CREATE OR REPLACE FUNCTION coach_manages_athlete(athlete_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        JOIN groups g ON g.id = gm1.group_id
        JOIN memberships m ON m.user_id = auth.uid() AND m.organization_id = g.organization_id
        WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = athlete_user_id
        AND m.role = 'coach'
        AND m.status = 'active'
        AND gm1.is_active = TRUE
        AND gm2.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if parent has relation to athlete
CREATE OR REPLACE FUNCTION is_parent_of(athlete_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM parent_athlete_relations
        WHERE parent_user_id = auth.uid()
        AND athlete_user_id = athlete_user_id
        AND verified = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's organizations
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================
CREATE POLICY "Organizations visible to members"
    ON organizations FOR SELECT
    USING (is_org_member(id));

CREATE POLICY "Organizations editable by admins"
    ON organizations FOR UPDATE
    USING (is_org_admin(id));

-- ============================================
-- USER PROFILES POLICIES
-- ============================================
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same org"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM memberships m1
            JOIN memberships m2 ON m1.organization_id = m2.organization_id
            WHERE m1.user_id = auth.uid()
            AND m2.user_id = user_profiles.id
            AND m1.status = 'active'
            AND m2.status = 'active'
        )
    );

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- ============================================
-- MEMBERSHIPS POLICIES
-- ============================================
CREATE POLICY "Users can view own memberships"
    ON memberships FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all memberships in org"
    ON memberships FOR SELECT
    USING (is_org_admin(organization_id));

CREATE POLICY "Coaches can view memberships in org"
    ON memberships FOR SELECT
    USING (is_org_coach(organization_id));

CREATE POLICY "Admins can manage memberships"
    ON memberships FOR ALL
    USING (is_org_admin(organization_id));

-- ============================================
-- ATHLETE PROFILES POLICIES
-- ============================================
CREATE POLICY "Athletes can view own profile"
    ON athlete_profiles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Coaches can view athletes in org"
    ON athlete_profiles FOR SELECT
    USING (is_org_coach(organization_id) OR is_org_admin(organization_id));

CREATE POLICY "Parents can view children's profiles"
    ON athlete_profiles FOR SELECT
    USING (is_parent_of(user_id));

CREATE POLICY "Athletes can update own profile"
    ON athlete_profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage athlete profiles"
    ON athlete_profiles FOR ALL
    USING (is_org_admin(organization_id));

CREATE POLICY "Coaches can update athlete profiles"
    ON athlete_profiles FOR UPDATE
    USING (is_org_coach(organization_id));

-- ============================================
-- COACH PROFILES POLICIES
-- ============================================
CREATE POLICY "Coaches can view own profile"
    ON coach_profiles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Members can view coaches in org"
    ON coach_profiles FOR SELECT
    USING (is_org_member(organization_id));

CREATE POLICY "Coaches can update own profile"
    ON coach_profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage coach profiles"
    ON coach_profiles FOR ALL
    USING (is_org_admin(organization_id));

-- ============================================
-- PARENT-ATHLETE RELATIONS POLICIES
-- ============================================
CREATE POLICY "Parents can view own relations"
    ON parent_athlete_relations FOR SELECT
    USING (parent_user_id = auth.uid());

CREATE POLICY "Athletes can view own relations"
    ON parent_athlete_relations FOR SELECT
    USING (athlete_user_id = auth.uid());

CREATE POLICY "Admins can manage relations"
    ON parent_athlete_relations FOR ALL
    USING (is_org_admin(organization_id));

-- ============================================
-- GROUPS POLICIES
-- ============================================
CREATE POLICY "Members can view groups in org"
    ON groups FOR SELECT
    USING (is_org_member(organization_id));

CREATE POLICY "Admins can manage groups"
    ON groups FOR ALL
    USING (is_org_admin(organization_id));

CREATE POLICY "Coaches can create groups"
    ON groups FOR INSERT
    WITH CHECK (is_org_coach(organization_id));

CREATE POLICY "Coaches can update groups"
    ON groups FOR UPDATE
    USING (is_org_coach(organization_id));

-- ============================================
-- GROUP MEMBERS POLICIES
-- ============================================
CREATE POLICY "Members can view group members"
    ON group_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = group_members.group_id
            AND is_org_member(g.organization_id)
        )
    );

CREATE POLICY "Admins can manage group members"
    ON group_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = group_members.group_id
            AND is_org_admin(g.organization_id)
        )
    );

CREATE POLICY "Coaches can manage group members"
    ON group_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = group_members.group_id
            AND is_org_coach(g.organization_id)
        )
    );

-- ============================================
-- PROGRAMS POLICIES
-- ============================================
CREATE POLICY "Public programs visible to all authenticated"
    ON programs FOR SELECT
    USING (is_public = TRUE AND auth.uid() IS NOT NULL);

CREATE POLICY "Org programs visible to members"
    ON programs FOR SELECT
    USING (organization_id IS NULL OR is_org_member(organization_id));

CREATE POLICY "Admins can manage programs"
    ON programs FOR ALL
    USING (organization_id IS NULL OR is_org_admin(organization_id));

CREATE POLICY "Coaches can create programs"
    ON programs FOR INSERT
    WITH CHECK (organization_id IS NULL OR is_org_coach(organization_id));

CREATE POLICY "Coaches can update programs"
    ON programs FOR UPDATE
    USING (organization_id IS NULL OR is_org_coach(organization_id));

-- ============================================
-- PROGRAM VERSIONS POLICIES
-- ============================================
CREATE POLICY "Program versions follow program access"
    ON program_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM programs p
            WHERE p.id = program_versions.program_id
            AND (p.is_public = TRUE OR p.organization_id IS NULL OR is_org_member(p.organization_id))
        )
    );

-- ============================================
-- ASSIGNED PROGRAMS POLICIES
-- ============================================
CREATE POLICY "Athletes can view own assignments"
    ON assigned_programs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = assigned_programs.athlete_id
            AND ap.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can view/manage assignments in org"
    ON assigned_programs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = assigned_programs.athlete_id
            AND (is_org_coach(ap.organization_id) OR is_org_admin(ap.organization_id))
        )
    );

CREATE POLICY "Parents can view children's assignments"
    ON assigned_programs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = assigned_programs.athlete_id
            AND is_parent_of(ap.user_id)
        )
    );

-- ============================================
-- TRAINING LOGS POLICIES
-- ============================================
CREATE POLICY "Athletes can manage own training logs"
    ON training_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = training_logs.athlete_id
            AND ap.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can view/update training logs"
    ON training_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = training_logs.athlete_id
            AND (is_org_coach(ap.organization_id) OR is_org_admin(ap.organization_id))
        )
    );

CREATE POLICY "Coaches can add feedback"
    ON training_logs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = training_logs.athlete_id
            AND (is_org_coach(ap.organization_id) OR is_org_admin(ap.organization_id))
        )
    );

CREATE POLICY "Parents can view children's training logs"
    ON training_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = training_logs.athlete_id
            AND is_parent_of(ap.user_id)
        )
    );

-- ============================================
-- METRIC TYPES POLICIES
-- ============================================
CREATE POLICY "System metrics visible to all authenticated"
    ON metric_types FOR SELECT
    USING (is_system = TRUE AND auth.uid() IS NOT NULL);

CREATE POLICY "Org metrics visible to members"
    ON metric_types FOR SELECT
    USING (organization_id IS NULL OR is_org_member(organization_id));

CREATE POLICY "Admins can manage org metrics"
    ON metric_types FOR ALL
    USING (organization_id IS NOT NULL AND is_org_admin(organization_id));

-- ============================================
-- PERFORMANCE RECORDS POLICIES
-- ============================================
CREATE POLICY "Athletes can view own records"
    ON performance_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = performance_records.athlete_id
            AND ap.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can manage performance records"
    ON performance_records FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = performance_records.athlete_id
            AND (is_org_coach(ap.organization_id) OR is_org_admin(ap.organization_id))
        )
    );

CREATE POLICY "Parents can view children's records"
    ON performance_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = performance_records.athlete_id
            AND is_parent_of(ap.user_id)
        )
    );

-- ============================================
-- SESSIONS POLICIES
-- ============================================
CREATE POLICY "Members can view sessions in org"
    ON sessions FOR SELECT
    USING (is_org_member(organization_id));

CREATE POLICY "Coaches can manage sessions"
    ON sessions FOR ALL
    USING (is_org_coach(organization_id) OR is_org_admin(organization_id));

-- ============================================
-- ATTENDANCE POLICIES
-- ============================================
CREATE POLICY "Athletes can view own attendance"
    ON attendance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = attendance.athlete_id
            AND ap.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can manage attendance"
    ON attendance FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = attendance.session_id
            AND (is_org_coach(s.organization_id) OR is_org_admin(s.organization_id))
        )
    );

CREATE POLICY "Parents can view children's attendance"
    ON attendance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = attendance.athlete_id
            AND is_parent_of(ap.user_id)
        )
    );

-- ============================================
-- FEE PLANS POLICIES
-- ============================================
CREATE POLICY "Members can view fee plans"
    ON fee_plans FOR SELECT
    USING (is_org_member(organization_id));

CREATE POLICY "Admins can manage fee plans"
    ON fee_plans FOR ALL
    USING (is_org_admin(organization_id));

-- ============================================
-- FEE PAYMENTS POLICIES
-- ============================================
CREATE POLICY "Athletes can view own payments"
    ON fee_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = fee_payments.athlete_id
            AND ap.user_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view children's payments"
    ON fee_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = fee_payments.athlete_id
            AND is_parent_of(ap.user_id)
        )
    );

CREATE POLICY "Admins can manage payments"
    ON fee_payments FOR ALL
    USING (is_org_admin(organization_id));

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
CREATE POLICY "Users can view notifications in org"
    ON notifications FOR SELECT
    USING (is_org_member(organization_id));

CREATE POLICY "Admins can manage notifications"
    ON notifications FOR ALL
    USING (is_org_admin(organization_id));

CREATE POLICY "Coaches can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (is_org_coach(organization_id));

-- ============================================
-- NOTIFICATION RECIPIENTS POLICIES
-- ============================================
CREATE POLICY "Users can view own notifications"
    ON notification_recipients FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification status"
    ON notification_recipients FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all recipients"
    ON notification_recipients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.id = notification_recipients.notification_id
            AND is_org_admin(n.organization_id)
        )
    );

-- ============================================
-- ACHIEVEMENTS POLICIES
-- ============================================
CREATE POLICY "System achievements visible to all"
    ON achievements FOR SELECT
    USING (is_system = TRUE AND auth.uid() IS NOT NULL);

CREATE POLICY "Org achievements visible to members"
    ON achievements FOR SELECT
    USING (organization_id IS NULL OR is_org_member(organization_id));

CREATE POLICY "Admins can manage achievements"
    ON achievements FOR ALL
    USING (organization_id IS NOT NULL AND is_org_admin(organization_id));

-- ============================================
-- ATHLETE ACHIEVEMENTS POLICIES
-- ============================================
CREATE POLICY "Athletes can view own achievements"
    ON athlete_achievements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = athlete_achievements.athlete_id
            AND ap.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can view athlete achievements"
    ON athlete_achievements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = athlete_achievements.athlete_id
            AND (is_org_coach(ap.organization_id) OR is_org_admin(ap.organization_id))
        )
    );

CREATE POLICY "Parents can view children's achievements"
    ON athlete_achievements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = athlete_achievements.athlete_id
            AND is_parent_of(ap.user_id)
        )
    );

-- Service role can insert achievements (from triggers/functions)
CREATE POLICY "Service can manage achievements"
    ON athlete_achievements FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- ATHLETE GOALS POLICIES
-- ============================================
CREATE POLICY "Athletes can manage own goals"
    ON athlete_goals FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = athlete_goals.athlete_id
            AND ap.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can view/create athlete goals"
    ON athlete_goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = athlete_goals.athlete_id
            AND (is_org_coach(ap.organization_id) OR is_org_admin(ap.organization_id))
        )
    );

CREATE POLICY "Coaches can insert athlete goals"
    ON athlete_goals FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = athlete_goals.athlete_id
            AND (is_org_coach(ap.organization_id) OR is_org_admin(ap.organization_id))
        )
    );

CREATE POLICY "Parents can view children's goals"
    ON athlete_goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM athlete_profiles ap
            WHERE ap.id = athlete_goals.athlete_id
            AND is_parent_of(ap.user_id)
        )
    );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (is_org_admin(organization_id));

-- Service role can insert audit logs
CREATE POLICY "Service can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- CONTENT SYNC LOGS POLICIES
-- ============================================
CREATE POLICY "Admins can view sync logs"
    ON content_sync_logs FOR SELECT
    USING (organization_id IS NULL OR is_org_admin(organization_id));

-- Service role can manage sync logs
CREATE POLICY "Service can manage sync logs"
    ON content_sync_logs FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');
