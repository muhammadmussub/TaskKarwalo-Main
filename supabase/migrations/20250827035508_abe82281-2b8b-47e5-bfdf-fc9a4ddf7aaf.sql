-- Add missing columns to provider_profiles table
ALTER TABLE public.provider_profiles 
ADD COLUMN phone TEXT,
ADD COLUMN cnic TEXT,
ADD COLUMN shop_photos TEXT[],
ADD COLUMN business_certificate TEXT,
ADD COLUMN application_status TEXT DEFAULT 'pending',
ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;