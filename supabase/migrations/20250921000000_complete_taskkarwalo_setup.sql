-- Complete TaskKarwalo Database Setup
-- This migration creates all necessary tables, policies, and demo data for the TaskKarwalo platform

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'provider', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create provider profiles table with KYC fields
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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
  -- KYC verification fields
  cnic_front_image TEXT,
  cnic_back_image TEXT,
  license_certificate TEXT,
  profile_photo TEXT,
  proof_of_address TEXT,
  -- Location fields
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  location_updated_at TIMESTAMP WITH TIME ZONE,
  -- Additional fields
  shop_photos TEXT[],
  business_certificate TEXT,
  verified_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  proposed_price DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'negotiating', 'accepted', 'rejected', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Location tracking fields
  customer_location_lat DECIMAL(10,8),
  customer_location_lng DECIMAL(11,8),
  customer_location_shared_at TIMESTAMP WITH TIME ZONE,
  location_access_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'price_offer', 'booking_update')),
  content TEXT NOT NULL,
  price_offer DECIMAL(10,2),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking_request', 'message', 'booking_update', 'payment', 'review', 'booking_cancelled', 'new_booking')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commission payments table
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  screenshot_url TEXT,
  booking_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT
);

-- Create realtime stats table
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

-- Create app settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

-- Create RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS Policies for provider_profiles
DROP POLICY IF EXISTS "Anyone can view verified provider profiles" ON public.provider_profiles;
CREATE POLICY "Anyone can view verified provider profiles" ON public.provider_profiles FOR SELECT USING (verified = true AND admin_approved = true);
DROP POLICY IF EXISTS "Providers can update own profile" ON public.provider_profiles;
CREATE POLICY "Providers can update own profile" ON public.provider_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Providers can insert own profile" ON public.provider_profiles;
CREATE POLICY "Providers can insert own profile" ON public.provider_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS Policies for services
DROP POLICY IF EXISTS "Anyone can view approved active services" ON public.services;
CREATE POLICY "Anyone can view approved active services" ON public.services FOR SELECT USING (is_active = true AND admin_approved = true);
DROP POLICY IF EXISTS "Providers can manage own services" ON public.services;
CREATE POLICY "Providers can manage own services" ON public.services FOR ALL USING (auth.uid() = provider_id);

-- Create RLS Policies for bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = provider_id);
DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Create RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages in their bookings" ON public.chat_messages;
CREATE POLICY "Users can view messages in their bookings" ON public.chat_messages
FOR SELECT USING (
  booking_id IN (
    SELECT id FROM public.bookings
    WHERE customer_id = auth.uid() OR provider_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can send messages in their bookings" ON public.chat_messages;
CREATE POLICY "Users can send messages in their bookings" ON public.chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  booking_id IN (
    SELECT id FROM public.bookings
    WHERE customer_id = auth.uid() OR provider_id = auth.uid()
  )
);

-- Create RLS Policies for reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Customers can create reviews for their completed bookings" ON public.reviews;
CREATE POLICY "Customers can create reviews for their completed bookings" ON public.reviews
FOR INSERT WITH CHECK (
  auth.uid() = customer_id AND
  booking_id IN (
    SELECT id FROM public.bookings
    WHERE customer_id = auth.uid() AND status = 'completed'
  )
);

-- Create RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS Policies for commission_payments
DROP POLICY IF EXISTS "Providers can view own commission payments" ON public.commission_payments;
CREATE POLICY "Providers can view own commission payments" ON public.commission_payments FOR SELECT USING (auth.uid() = provider_id);
DROP POLICY IF EXISTS "Providers can insert own commission payments" ON public.commission_payments;
CREATE POLICY "Providers can insert own commission payments" ON public.commission_payments FOR INSERT WITH CHECK (auth.uid() = provider_id);
DROP POLICY IF EXISTS "Admins can manage all commission payments" ON public.commission_payments;
CREATE POLICY "Admins can manage all commission payments" ON public.commission_payments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'admin'
  )
);

-- Create RLS Policies for realtime_stats
DROP POLICY IF EXISTS "Anyone can view realtime stats" ON public.realtime_stats;
CREATE POLICY "Anyone can view realtime stats" ON public.realtime_stats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage realtime stats" ON public.realtime_stats;
CREATE POLICY "Admins can manage realtime stats" ON public.realtime_stats FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'admin'
  )
);

-- Create RLS Policies for app_settings
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Anyone can view app settings" ON public.app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'admin'
  )
);

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS provider_profiles_updated_at ON public.provider_profiles;
CREATE TRIGGER provider_profiles_updated_at BEFORE UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS services_updated_at ON public.services;
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate commission on booking completion
CREATE OR REPLACE FUNCTION public.handle_booking_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'completed' and final_price is set
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.final_price IS NOT NULL THEN
    -- Calculate 10% commission
    NEW.commission_amount = NEW.final_price * 0.10;

    -- Update provider's total earnings and commission
    UPDATE public.provider_profiles
    SET
      total_earnings = total_earnings + (NEW.final_price - NEW.commission_amount),
      total_commission = total_commission + NEW.commission_amount,
      total_jobs = total_jobs + 1
    WHERE user_id = NEW.provider_id;

    -- Update provider's rating (simplified - could be more complex)
    UPDATE public.provider_profiles
    SET rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.reviews
      WHERE provider_id = NEW.provider_id
    )
    WHERE user_id = NEW.provider_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for booking completion
DROP TRIGGER IF EXISTS on_booking_completion ON public.bookings;
CREATE TRIGGER on_booking_completion
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_completion();

-- Function to refresh realtime stats
CREATE OR REPLACE FUNCTION public.refresh_realtime_stats()
RETURNS void AS $$
BEGIN
  -- Refresh user count
  INSERT INTO public.realtime_stats (stat_type, stat_name, stat_value, time_period, stat_trend)
  SELECT
    'users',
    'total_users',
    COUNT(*),
    'current',
    NULL
  FROM public.profiles
  ON CONFLICT (stat_type, stat_name, time_period)
  DO UPDATE SET
    stat_value = EXCLUDED.stat_value,
    updated_at = now();

  -- Refresh provider count
  INSERT INTO public.realtime_stats (stat_type, stat_name, stat_value, time_period, stat_trend)
  SELECT
    'providers',
    'total_providers',
    COUNT(*),
    'current',
    NULL
  FROM public.provider_profiles
  ON CONFLICT (stat_type, stat_name, time_period)
  DO UPDATE SET
    stat_value = EXCLUDED.stat_value,
    updated_at = now();

  -- Refresh booking count
  INSERT INTO public.realtime_stats (stat_type, stat_name, stat_value, time_period, stat_trend)
  SELECT
    'bookings',
    'total_bookings',
    COUNT(*),
    'current',
    NULL
  FROM public.bookings
  ON CONFLICT (stat_type, stat_name, time_period)
  DO UPDATE SET
    stat_value = EXCLUDED.stat_value,
    updated_at = now();

  -- Refresh revenue
  INSERT INTO public.realtime_stats (stat_type, stat_name, stat_value, time_period, stat_trend)
  SELECT
    'revenue',
    'total_revenue',
    COALESCE(SUM(final_price), 0),
    'current',
    NULL
  FROM public.bookings
  WHERE status = 'completed' AND final_price IS NOT NULL
  ON CONFLICT (stat_type, stat_name, time_period)
  DO UPDATE SET
    stat_value = EXCLUDED.stat_value,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage buckets (matching the dedicated storage migration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('verification-docs', 'verification-docs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('shop-photos', 'shop-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('provider-documents', 'provider-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('profile-photos', 'profile-photos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for verification-docs bucket (private - admin only)
DROP POLICY IF EXISTS "Admin can view verification documents" ON storage.objects;
CREATE POLICY "Admin can view verification documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'verification-docs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'admin'
  )
);

DROP POLICY IF EXISTS "Providers can upload verification documents" ON storage.objects;
CREATE POLICY "Providers can upload verification documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'verification-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Providers can update their own verification documents" ON storage.objects;
CREATE POLICY "Providers can update their own verification documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'verification-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Providers can delete their own verification documents" ON storage.objects;
CREATE POLICY "Providers can delete their own verification documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'verification-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for shop-photos bucket (public - anyone can view)
DROP POLICY IF EXISTS "Anyone can view shop photos" ON storage.objects;
CREATE POLICY "Anyone can view shop photos" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-photos');

DROP POLICY IF EXISTS "Providers can upload shop photos" ON storage.objects;
CREATE POLICY "Providers can upload shop photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'shop-photos' AND
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Providers can update their own shop photos" ON storage.objects;
CREATE POLICY "Providers can update their own shop photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'shop-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Providers can delete their own shop photos" ON storage.objects;
CREATE POLICY "Providers can delete their own shop photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'shop-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for provider-documents bucket (private - admin and provider)
DROP POLICY IF EXISTS "Providers and admins can view provider documents" ON storage.objects;
CREATE POLICY "Providers and admins can view provider documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'provider-documents' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "Providers can upload provider documents" ON storage.objects;
CREATE POLICY "Providers can upload provider documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'provider-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Providers can update their own provider documents" ON storage.objects;
CREATE POLICY "Providers can update their own provider documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'provider-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Providers can delete their own provider documents" ON storage.objects;
CREATE POLICY "Providers can delete their own provider documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'provider-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for profile-photos bucket (public - anyone can view)
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
CREATE POLICY "Anyone can view profile photos" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
CREATE POLICY "Users can upload profile photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
CREATE POLICY "Users can update their own profile photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
CREATE POLICY "Users can delete their own profile photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_stats;

-- Set replica identity for realtime
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.provider_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.services REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.reviews REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.commission_payments REPLICA IDENTITY FULL;
ALTER TABLE public.realtime_stats REPLICA IDENTITY FULL;

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, setting_description)
VALUES
  ('commission_rate', '0.10', 'Commission rate as decimal (10% = 0.10)'),
  ('max_service_images', '5', 'Maximum number of images per service'),
  ('max_shop_photos', '10', 'Maximum number of shop photos per provider'),
  ('platform_name', 'TaskKarwalo', 'Platform name displayed in UI'),
  ('support_email', 'support@taskkarwalo.com', 'Support email address')
ON CONFLICT (setting_key) DO NOTHING;

-- Refresh initial stats
SELECT refresh_realtime_stats();