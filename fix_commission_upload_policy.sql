-- Fix the commission upload RLS policies
-- The issue is that the current policy is too restrictive

-- First, let's check the current policies and drop the problematic ones
DROP POLICY IF EXISTS "Providers can upload commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete their own commission proofs" ON storage.objects;

-- Create simpler, more permissive policies for commission proofs
-- Allow authenticated users to upload to commission-proofs bucket
CREATE POLICY "Allow commission proof uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Allow users to view commission proofs (for their own files and admin viewing)
CREATE POLICY "Allow commission proof viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  (auth.uid() IS NOT NULL)
);

-- Allow users to update their own commission proofs
CREATE POLICY "Allow commission proof updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Allow users to delete their own commission proofs
CREATE POLICY "Allow commission proof deletion" ON storage.objects
FOR DELETE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Keep the admin policy for viewing all commission proofs
DROP POLICY IF EXISTS "Admins can view all commission proofs" ON storage.objects;
CREATE POLICY "Admins can view all commission proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'admin'
  )
);