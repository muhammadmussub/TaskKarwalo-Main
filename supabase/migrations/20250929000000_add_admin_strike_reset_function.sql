-- Function to reset user strikes and cancel suspension (admin only)
CREATE OR REPLACE FUNCTION admin_reset_user_strikes(
  target_user_id UUID,
  admin_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Reset all active strikes for the user
  UPDATE user_strikes
  SET
    expires_at = NOW() - INTERVAL '1 day', -- Set to past date to expire them
    admin_notes = COALESCE(admin_notes, '', '') || ' | Strikes reset by admin: ' || COALESCE(admin_user_id::TEXT, 'system') || ' at ' || NOW()::TEXT,
    reviewed_by = admin_user_id,
    reviewed_at = NOW()
  WHERE user_id = target_user_id
    AND expires_at > NOW()
    AND is_no_show = TRUE;

  GET DIAGNOSTICS reset_count = ROW_COUNT;

  -- Cancel all active suspensions for the user
  UPDATE user_suspensions
  SET
    is_active = FALSE,
    lifted_at = NOW(),
    lifted_by = admin_user_id,
    lift_reason = 'Strikes reset by admin - suspension cancelled'
  WHERE user_id = target_user_id
    AND is_active = TRUE
    AND suspension_end > NOW();

  -- Log the admin action (optional - you can create an admin_actions table if needed)
  -- For now, we'll just return success

  RETURN reset_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin check should be in RLS policy)
-- This function uses SECURITY DEFINER so it runs with the privileges of the function creator
-- The actual admin check should be implemented in the RLS policy or application logic