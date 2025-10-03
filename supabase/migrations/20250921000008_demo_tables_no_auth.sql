-- Demo Tables Without Auth Dependencies
-- This creates simplified versions of tables for demo purposes only

-- Create demo_profiles table (no auth dependency)
CREATE TABLE IF NOT EXISTS public.demo_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'provider', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create demo_provider_profiles table (no auth dependency)
CREATE TABLE IF NOT EXISTS public.demo_provider_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
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

-- Create demo_services table (no auth dependency)
CREATE TABLE IF NOT EXISTS public.demo_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id TEXT NOT NULL,
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

-- Create demo_bookings table (no auth dependency)
CREATE TABLE IF NOT EXISTS public.demo_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
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

-- Create demo_reviews table (no auth dependency)
CREATE TABLE IF NOT EXISTS public.demo_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create demo_notifications table (no auth dependency)
CREATE TABLE IF NOT EXISTS public.demo_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking_request', 'message', 'booking_update', 'payment', 'review', 'booking_cancelled', 'new_booking')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  booking_id UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create demo_commission_payments table (no auth dependency)
CREATE TABLE IF NOT EXISTS public.demo_commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  screenshot_url TEXT,
  booking_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  rejection_reason TEXT
);

-- Create demo_chat_messages table (no auth dependency)
CREATE TABLE IF NOT EXISTS public.demo_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  sender_id TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'price_offer', 'booking_update')),
  content TEXT NOT NULL,
  price_offer DECIMAL(10,2),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.demo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (allow all operations for demo purposes)
DROP POLICY IF EXISTS "Allow all operations on demo_profiles" ON public.demo_profiles;
CREATE POLICY "Allow all operations on demo_profiles" ON public.demo_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on demo_provider_profiles" ON public.demo_provider_profiles;
CREATE POLICY "Allow all operations on demo_provider_profiles" ON public.demo_provider_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on demo_services" ON public.demo_services;
CREATE POLICY "Allow all operations on demo_services" ON public.demo_services FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on demo_bookings" ON public.demo_bookings;
CREATE POLICY "Allow all operations on demo_bookings" ON public.demo_bookings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on demo_reviews" ON public.demo_reviews;
CREATE POLICY "Allow all operations on demo_reviews" ON public.demo_reviews FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on demo_notifications" ON public.demo_notifications;
CREATE POLICY "Allow all operations on demo_notifications" ON public.demo_notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on demo_commission_payments" ON public.demo_commission_payments;
CREATE POLICY "Allow all operations on demo_commission_payments" ON public.demo_commission_payments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on demo_chat_messages" ON public.demo_chat_messages;
CREATE POLICY "Allow all operations on demo_chat_messages" ON public.demo_chat_messages FOR ALL USING (true);