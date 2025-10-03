-- Fix Pro Badge Request Relationships
-- This migration adds the missing foreign key relationships needed for proper joins

-- Add foreign key relationship between provider_profiles and profiles
-- This allows joining provider_profiles.user_id with profiles.user_id
ALTER TABLE public.provider_profiles
ADD CONSTRAINT provider_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key relationship between pro_badge_requests and provider_profiles
-- This allows joining pro_badge_requests.provider_id with provider_profiles.user_id
ALTER TABLE public.pro_badge_requests
ADD CONSTRAINT pro_badge_requests_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES public.provider_profiles(user_id) ON DELETE CASCADE;

-- Add foreign key relationship between pro_badge_requests and profiles
-- This allows joining pro_badge_requests.provider_id with profiles.user_id
ALTER TABLE public.pro_badge_requests
ADD CONSTRAINT pro_badge_requests_user_id_fkey
FOREIGN KEY (provider_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;