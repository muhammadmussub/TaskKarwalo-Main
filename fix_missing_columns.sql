-- Fix missing columns for ProviderDashboard functionality
-- This script adds all missing columns that are referenced in the TypeScript interfaces

-- Add missing columns to provider_profiles table
ALTER TABLE provider_profiles
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS banned_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

-- Add missing columns to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add missing columns to pro_badge_requests table
ALTER TABLE pro_badge_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing records to have default values
UPDATE provider_profiles SET banned = FALSE WHERE banned IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN provider_profiles.banned IS 'Whether the provider account is banned';
COMMENT ON COLUMN provider_profiles.banned_reason IS 'Reason for banning the provider account';
COMMENT ON COLUMN provider_profiles.banned_at IS 'Timestamp when the provider was banned';
COMMENT ON COLUMN services.rejection_reason IS 'Reason why the service was rejected by admin';
COMMENT ON COLUMN pro_badge_requests.rejection_reason IS 'Reason why the pro badge request was rejected';