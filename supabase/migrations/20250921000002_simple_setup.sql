-- Simple TaskKarwalo Setup - Fixed Version
-- This creates a working setup without foreign key constraint issues

-- First, let's disable RLS temporarily to make setup easier
SET session_replication_role = 'replica';

-- Create profiles table without foreign key constraint initially
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'provider', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create provider_profiles table
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  business_address TEXT NOT NULL,
  phone TEXT,
  cnic TEXT,
  description TEXT,
  experience_years INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_jobs INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  total_commission DECIMAL(10,2) DEFAULT 0.00,
  documents_uploaded BOOLEAN DEFAULT false,
  admin_approved BOOLEAN DEFAULT false,
  application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'reupload_requested')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  admin_notes TEXT,
  cnic_front_image TEXT,
  cnic_back_image TEXT,
  license_certificate TEXT,
  profile_photo TEXT,
  proof_of_address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  location_updated_at TIMESTAMP WITH TIME ZONE,
  shop_photos TEXT[],
  business_certificate TEXT,
  verified_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  price_negotiable BOOLEAN DEFAULT true,
  duration_hours INTEGER,
  service_area TEXT[],
  images TEXT[],
  is_active BOOLEAN DEFAULT false,
  admin_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  service_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  proposed_price DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'negotiating', 'accepted', 'rejected', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  customer_location_lat DECIMAL(10,8),
  customer_location_lng DECIMAL(11,8),
  customer_location_shared_at TIMESTAMP WITH TIME ZONE,
  location_access_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create other tables
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'price_offer', 'booking_update')),
  content TEXT NOT NULL,
  price_offer DECIMAL(10,2),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking_request', 'message', 'booking_update', 'payment', 'review', 'booking_cancelled', 'new_booking')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  booking_id UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  screenshot_url TEXT,
  booking_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.realtime_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_type TEXT NOT NULL,
  stat_name TEXT NOT NULL,
  stat_value INTEGER NOT NULL DEFAULT 0,
  stat_trend DECIMAL(5,2),
  time_period TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Re-enable RLS
SET session_replication_role = 'origin';

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create basic policies (less restrictive for demo)
CREATE POLICY "Allow all operations on profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on provider_profiles" ON public.provider_profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on services" ON public.services FOR ALL USING (true);
CREATE POLICY "Allow all operations on bookings" ON public.bookings FOR ALL USING (true);
CREATE POLICY "Allow all operations on chat_messages" ON public.chat_messages FOR ALL USING (true);
CREATE POLICY "Allow all operations on reviews" ON public.reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Allow all operations on commission_payments" ON public.commission_payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on realtime_stats" ON public.realtime_stats FOR ALL USING (true);
CREATE POLICY "Allow all operations on app_settings" ON public.app_settings FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_user_id ON public.provider_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_booking_id ON public.chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('verification-docs', 'verification-docs', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('shop-photos', 'shop-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('provider-documents', 'provider-documents', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload verification documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'verification-docs' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can upload shop photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'shop-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can upload provider documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'provider-documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Public read access for verification docs" ON storage.objects
FOR SELECT USING (bucket_id = 'verification-docs');

CREATE POLICY "Public read access for shop photos" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-photos');

CREATE POLICY "Public read access for provider documents" ON storage.objects
FOR SELECT USING (bucket_id = 'provider-documents');

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, setting_description)
VALUES
  ('commission_rate', '0.10', 'Commission rate as decimal (10% = 0.10)'),
  ('max_service_images', '5', 'Maximum number of images per service'),
  ('max_shop_photos', '10', 'Maximum number of shop photos per provider'),
  ('platform_name', 'TaskKarwalo', 'Platform name displayed in UI'),
  ('support_email', 'support@taskkarwalo.com', 'Support email address')
ON CONFLICT (setting_key) DO NOTHING;

-- Create a simple function to refresh stats
CREATE OR REPLACE FUNCTION public.refresh_realtime_stats()
RETURNS void AS $$
BEGIN
  -- This is a simplified version for demo
  INSERT INTO public.realtime_stats (stat_type, stat_name, stat_value, time_period)
  VALUES
    ('users', 'total_users', 0, 'current'),
    ('providers', 'total_providers', 0, 'current'),
    ('bookings', 'total_bookings', 0, 'current'),
    ('revenue', 'total_revenue', 0, 'current')
  ON CONFLICT (stat_type, stat_name, time_period)
  DO UPDATE SET
    stat_value = EXCLUDED.stat_value,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh initial stats
SELECT refresh_realtime_stats();