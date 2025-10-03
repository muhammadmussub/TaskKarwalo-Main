-- Fix for pro_badge_requests_1.full_name error
-- This error suggests there's a corrupted view or cached query plan

-- Drop any existing views that might be causing issues
DROP VIEW IF EXISTS pro_badge_requests_1 CASCADE;
DROP VIEW IF EXISTS provider_profiles_with_requests CASCADE;

-- Reset the pro_badge_requests table if needed
-- ALTER TABLE pro_badge_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pro_badge_requests ENABLE ROW LEVEL SECURITY;

-- Make sure the foreign key constraint is correct
ALTER TABLE pro_badge_requests
DROP CONSTRAINT IF EXISTS pro_badge_requests_provider_id_fkey;

ALTER TABLE pro_badge_requests
ADD CONSTRAINT pro_badge_requests_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES provider_profiles(user_id) ON DELETE CASCADE;

-- Refresh the RLS policies
DROP POLICY IF EXISTS "Providers can view their own requests" ON pro_badge_requests;
DROP POLICY IF EXISTS "Providers can create their own requests" ON pro_badge_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON pro_badge_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON pro_badge_requests;

-- Recreate the policies
CREATE POLICY "Providers can view their own requests"
  ON pro_badge_requests FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can create their own requests"
  ON pro_badge_requests FOR INSERT
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Admins can view all requests"
  ON pro_badge_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update requests"
  ON pro_badge_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Also fix provider_profiles table if needed
ALTER TABLE provider_profiles
DROP CONSTRAINT IF EXISTS provider_profiles_user_id_fkey;

ALTER TABLE provider_profiles
ADD CONSTRAINT provider_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;