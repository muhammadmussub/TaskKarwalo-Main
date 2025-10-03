-- Direct SQL to fix Pro Badge functionality
-- Run this in your Supabase SQL Editor or database admin panel

-- Create the pro_badge_requests table
CREATE TABLE IF NOT EXISTS pro_badge_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
  request_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_provider_id ON pro_badge_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_status ON pro_badge_requests(status);
CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_requested_at ON pro_badge_requests(requested_at DESC);

-- Enable RLS
ALTER TABLE pro_badge_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Providers can view their own requests" ON pro_badge_requests;
DROP POLICY IF EXISTS "Providers can create their own requests" ON pro_badge_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON pro_badge_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON pro_badge_requests;

-- Create policies
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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pro_badge_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_pro_badge_requests_updated_at ON pro_badge_requests;
CREATE TRIGGER update_pro_badge_requests_updated_at
  BEFORE UPDATE ON pro_badge_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_pro_badge_requests_updated_at();