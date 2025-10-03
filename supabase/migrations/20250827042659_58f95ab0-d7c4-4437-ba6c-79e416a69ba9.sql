-- Create storage buckets for provider uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('provider-documents', 'provider-documents', false),
  ('shop-photos', 'shop-photos', true);

-- Storage policies for provider documents (private)
CREATE POLICY "Providers can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Providers can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'provider-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for shop photos (public but user-restricted upload)
CREATE POLICY "Anyone can view shop photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shop-photos');

CREATE POLICY "Providers can upload shop photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'shop-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Providers can update their shop photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'shop-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Providers can delete their shop photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'shop-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add verified_pro column to provider_profiles for the badge feature
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS verified_pro boolean DEFAULT false;

-- Fix RLS policies for provider_profiles to allow providers to insert their own profiles
DROP POLICY IF EXISTS "Providers can insert own profile" ON provider_profiles;
CREATE POLICY "Providers can insert own profile" 
ON provider_profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'provider'
  )
);

-- Allow admins to update provider profiles (for verified_pro badge)
CREATE POLICY "Admins can update provider profiles" 
ON provider_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- Allow admins to view all provider profiles
CREATE POLICY "Admins can view all provider profiles" 
ON provider_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- Create index for faster verified pro queries
CREATE INDEX IF NOT EXISTS idx_provider_profiles_verified_pro ON provider_profiles(verified_pro, rating DESC);

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_provider_profiles_admin_approved ON provider_profiles(admin_approved, application_status);