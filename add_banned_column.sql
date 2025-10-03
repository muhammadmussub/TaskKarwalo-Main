-- Add banned column to provider_profiles table
ALTER TABLE provider_profiles
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS banned_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

-- Add rejection_reason column to pro_badge_requests table
ALTER TABLE pro_badge_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing records to have default values
UPDATE provider_profiles SET banned = FALSE WHERE banned IS NULL;