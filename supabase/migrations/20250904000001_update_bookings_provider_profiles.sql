-- Add a view or function to easily get provider profiles with bookings
-- This will help with the location tracking feature

-- Create a view that joins bookings with provider profiles for easier querying
CREATE OR REPLACE VIEW public.bookings_with_provider AS
SELECT 
  b.*,
  p.business_name as provider_business_name,
  p.business_address as provider_business_address,
  p.latitude as provider_latitude,
  p.longitude as provider_longitude
FROM public.bookings b
JOIN public.provider_profiles p ON b.provider_id = p.user_id;

-- Add a comment to document the view
COMMENT ON VIEW public.bookings_with_provider IS 
'View that joins bookings with provider profiles for easier location tracking and display';