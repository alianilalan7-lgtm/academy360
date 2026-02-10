-- Multi-tenant read/write scaling indexes
-- Target: keep p95 response stable as club and user count grows.

CREATE INDEX IF NOT EXISTS idx_memberships_user_status_org_role
  ON memberships(user_id, status, organization_id, role);

CREATE INDEX IF NOT EXISTS idx_memberships_org_status_role_user
  ON memberships(organization_id, status, role, user_id);

CREATE INDEX IF NOT EXISTS idx_group_members_user_active_group
  ON group_members(user_id, is_active, group_id);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_org_group_week
  ON weekly_plans(organization_id, group_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_org_published_week
  ON weekly_plans(organization_id, week_start DESC)
  WHERE is_published = TRUE;
