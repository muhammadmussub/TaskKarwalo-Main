-- TEMPORARY SOLUTION: Disable RLS for commission-proofs bucket
-- This is a quick fix to get commission payments working
-- You can re-enable RLS later with proper policies

-- Disable RLS on storage.objects table (temporary)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Instead, just create a very permissive policy for commission-proofs
-- This allows authenticated users to do anything with commission-proofs bucket

-- First, drop the restrictive existing policies
DROP POLICY IF EXISTS "Providers can upload commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all commission proofs" ON storage.objects;

-- Create a simple permissive policy for commission-proofs bucket
-- This allows any authenticated user to upload/view commission proofs
CREATE POLICY "temp_commission_access" ON storage.objects
FOR ALL USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Also ensure bucket listing works
DROP POLICY IF EXISTS "authenticated_users_can_list_buckets" ON storage.buckets;
CREATE POLICY "temp_bucket_listing" ON storage.buckets
FOR SELECT USING (auth.uid() IS NOT NULL);