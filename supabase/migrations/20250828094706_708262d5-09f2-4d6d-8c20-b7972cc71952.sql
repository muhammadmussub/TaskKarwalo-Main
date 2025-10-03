-- Add location fields to provider_profiles table
ALTER TABLE public.provider_profiles 
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for better location query performance
CREATE INDEX IF NOT EXISTS idx_provider_profiles_location 
ON public.provider_profiles (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;