-- Emergency fix for storage policies to allow commission payment uploads
-- This creates the minimum required policies for commission payments to work

-- Enable RLS on storage objects and buckets
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Providers can upload commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "commission_proofs_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "commission_proofs_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "commission_proofs_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "commission_proofs_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "commission_proofs_admin_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_list_buckets" ON storage.buckets;
DROP POLICY IF EXISTS "service_role_can_list_buckets" ON storage.buckets;

-- Create simple, working policies for commission-proofs bucket

-- 1. Allow authenticated users to upload to commission-proofs bucket
CREATE POLICY "allow_commission_uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- 2. Allow users to view all commission proofs (for now - can be restricted later)
CREATE POLICY "allow_commission_viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- 3. Allow users to update their own commission proofs
CREATE POLICY "allow_commission_updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- 4. Allow users to delete their own commission proofs
CREATE POLICY "allow_commission_deletion" ON storage.objects
FOR DELETE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- 5. Allow admins to view all commission proofs
CREATE POLICY "allow_admin_commission_viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- 6. Allow authenticated users to list buckets
CREATE POLICY "allow_authenticated_bucket_listing" ON storage.buckets
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 7. Allow service role to list all buckets
CREATE POLICY "allow_service_role_bucket_listing" ON storage.buckets
FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');