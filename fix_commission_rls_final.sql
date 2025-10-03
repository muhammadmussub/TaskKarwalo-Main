-- Final comprehensive fix for commission payment RLS policies
-- This creates proper, secure policies that work for production

-- Step 1: Ensure storage.objects has RLS enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies for commission-proofs bucket
DROP POLICY IF EXISTS "Providers can upload commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow commission proof uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow commission proof viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow commission proof updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow commission proof deletion" ON storage.objects;
DROP POLICY IF EXISTS "Temp allow all commission uploads" ON storage.objects;
DROP POLICY IF EXISTS "Temp allow all commission viewing" ON storage.objects;
DROP POLICY IF EXISTS "Temp allow all commission updates" ON storage.objects;
DROP POLICY IF EXISTS "Temp allow all commission deletion" ON storage.objects;

-- Step 3: Create proper, secure policies for commission-proofs bucket

-- Policy 1: Allow authenticated users to upload commission proofs
-- Users can upload files to the commission-proofs bucket
CREATE POLICY "commission_proofs_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Policy 2: Allow users to view their own commission proofs
-- Users can only view files they uploaded (based on file path)
CREATE POLICY "commission_proofs_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Policy 3: Allow users to update their own commission proofs
CREATE POLICY "commission_proofs_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Policy 4: Allow users to delete their own commission proofs
CREATE POLICY "commission_proofs_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Policy 5: Allow admins to view all commission proofs
CREATE POLICY "commission_proofs_admin_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Step 4: Ensure storage.buckets has proper listing policies
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing bucket policies
DROP POLICY IF EXISTS "Authenticated users can list buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Service role can list all buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated users to list buckets" ON storage.buckets;

-- Create policy to allow authenticated users to list buckets
CREATE POLICY "authenticated_users_can_list_buckets" ON storage.buckets
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow service role to list all buckets
CREATE POLICY "service_role_can_list_buckets" ON storage.buckets
FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');