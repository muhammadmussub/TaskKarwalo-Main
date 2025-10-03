-- Add location fields to profiles table for storing user's last known location
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_known_lat FLOAT,
ADD COLUMN IF NOT EXISTS last_known_lng FLOAT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_known_location 
ON public.profiles (last_known_lat, last_known_lng) 
WHERE last_known_lat IS NOT NULL AND last_known_lng IS NOT NULL;

-- Add a comment to document the purpose of these fields
COMMENT ON COLUMN public.profiles.last_known_lat IS 'Last known latitude of the user for location-based services';
COMMENT ON COLUMN public.profiles.last_known_lng IS 'Last known longitude of the user for location-based services';