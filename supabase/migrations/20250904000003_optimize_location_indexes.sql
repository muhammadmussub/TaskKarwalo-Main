-- Optimize indexes for location-based queries

-- Ensure indexes exist for provider profiles location data
CREATE INDEX IF NOT EXISTS idx_provider_profiles_location 
ON public.provider_profiles (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Ensure indexes exist for booking completion locations
CREATE INDEX IF NOT EXISTS idx_bookings_completion_location 
ON public.bookings (completion_location_lat, completion_location_lng) 
WHERE completion_location_lat IS NOT NULL AND completion_location_lng IS NOT NULL;

-- Ensure indexes exist for user last known locations
CREATE INDEX IF NOT EXISTS idx_profiles_last_known_location 
ON public.profiles (last_known_lat, last_known_lng) 
WHERE last_known_lat IS NOT NULL AND last_known_lng IS NOT NULL;

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_completion 
ON public.bookings (provider_id, completion_location_lat, completion_location_lng) 
WHERE completion_location_lat IS NOT NULL AND completion_location_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_completion 
ON public.bookings (customer_id, completion_location_lat, completion_location_lng) 
WHERE completion_location_lat IS NOT NULL AND completion_location_lng IS NOT NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_provider_profiles_location IS 'Index for provider location-based searches';
COMMENT ON INDEX idx_bookings_completion_location IS 'Index for booking completion location searches';
COMMENT ON INDEX idx_profiles_last_known_location IS 'Index for user last known location searches';
COMMENT ON INDEX idx_bookings_provider_completion IS 'Index for provider completion location queries';
COMMENT ON INDEX idx_bookings_customer_completion IS 'Index for customer completion location queries';