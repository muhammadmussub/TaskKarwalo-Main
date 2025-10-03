-- Create Storage Buckets for TaskKarwalo
-- This creates the necessary storage buckets for file uploads

-- Enable storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage buckets
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