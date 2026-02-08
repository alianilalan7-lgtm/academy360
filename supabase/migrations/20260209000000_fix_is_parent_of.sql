-- Fix is_parent_of function: parameter name 'athlete_user_id' conflicts with
-- column name in parent_athlete_relations table, causing "ambiguous column reference" error.
-- Fix: use function-qualified parameter reference (is_parent_of.athlete_user_id)

CREATE OR REPLACE FUNCTION is_parent_of(athlete_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM parent_athlete_relations par
        WHERE par.parent_user_id = auth.uid()
        AND par.athlete_user_id = is_parent_of.athlete_user_id
        AND par.verified = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix coach_manages_athlete for the same pattern
CREATE OR REPLACE FUNCTION coach_manages_athlete(athlete_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        JOIN groups g ON g.id = gm1.group_id
        JOIN memberships m ON m.user_id = auth.uid() AND m.organization_id = g.organization_id
        WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = coach_manages_athlete.athlete_user_id
        AND m.role = 'coach'
        AND m.status = 'active'
        AND gm1.is_active = TRUE
        AND gm2.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
