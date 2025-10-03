-- Fix foreign key relationships for proper joins

-- First, ensure we have proper foreign key constraints
-- Note: We'll reference auth.users directly since that's the standard approach

-- Drop existing foreign keys if they exist (ignore errors if they don't exist)
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_provider_id_fkey;
ALTER TABLE public.provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_provider_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_customer_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_provider_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_booking_id_fkey;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_booking_id_fkey;

-- Add proper foreign key constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.provider_profiles 
ADD CONSTRAINT provider_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.services
ADD CONSTRAINT services_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_service_id_fkey
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;