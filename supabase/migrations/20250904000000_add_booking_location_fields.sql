-- Add location fields to bookings table for service completion tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS completion_location_lat FLOAT,
ADD COLUMN IF NOT EXISTS completion_location_lng FLOAT,
ADD COLUMN IF NOT EXISTS location_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add last known location fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_known_lat FLOAT,
ADD COLUMN IF NOT EXISTS last_known_lng FLOAT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_completion_location 
ON public.bookings (completion_location_lat, completion_location_lng) 
WHERE completion_location_lat IS NOT NULL AND completion_location_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_last_known_location 
ON public.profiles (last_known_lat, last_known_lng) 
WHERE last_known_lat IS NOT NULL AND last_known_lng IS NOT NULL;