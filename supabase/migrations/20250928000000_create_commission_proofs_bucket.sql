-- Create commission-proofs storage bucket
-- This bucket will store commission payment screenshots

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('commission-proofs', 'commission-proofs', false, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for commission-proofs bucket
-- Providers can upload their own commission proofs
DROP POLICY IF EXISTS "Providers can upload commission proofs" ON storage.objects;
CREATE POLICY "Providers can upload commission proofs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'commission-proofs' AND
  auth.uid()::text = (storage.foldername(name))[2]  -- User ID is the second folder (commissions/user-id/filename)
);

-- Providers can view their own commission proofs
DROP POLICY IF EXISTS "Providers can view their own commission proofs" ON storage.objects;
CREATE POLICY "Providers can view their own commission proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  auth.uid()::text = (storage.foldername(name))[2]  -- User ID is the second folder (commissions/user-id/filename)
);

-- Providers can update their own commission proofs
DROP POLICY IF EXISTS "Providers can update their own commission proofs" ON storage.objects;
CREATE POLICY "Providers can update their own commission proofs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid()::text = (storage.foldername(name))[2]  -- User ID is the second folder (commissions/user-id/filename)
);

-- Providers can delete their own commission proofs
DROP POLICY IF EXISTS "Providers can delete their own commission proofs" ON storage.objects;
CREATE POLICY "Providers can delete their own commission proofs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid()::text = (storage.foldername(name))[2]  -- User ID is the second folder (commissions/user-id/filename)
);

-- Admins can view all commission proofs
DROP POLICY IF EXISTS "Admins can view all commission proofs" ON storage.objects;
CREATE POLICY "Admins can view all commission proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'admin'
  )
);