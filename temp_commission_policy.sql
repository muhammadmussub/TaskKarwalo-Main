-- Temporary permissive policy to test commission uploads
-- This will be replaced with proper security later

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies for commission-proofs bucket
DROP POLICY IF EXISTS "Providers can upload commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete their own commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all commission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow commission proof uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow commission proof viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow commission proof updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow commission proof deletion" ON storage.objects;

-- Create a simple permissive policy for testing
-- Allow any authenticated user to upload to commission-proofs bucket
CREATE POLICY "Temp allow all commission uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Allow users to view all commission proofs (for now)
CREATE POLICY "Temp allow all commission viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Allow users to update commission proofs (for now)
CREATE POLICY "Temp allow all commission updates" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

-- Allow users to delete commission proofs (for now)
CREATE POLICY "Temp allow all commission deletion" ON storage.objects
FOR DELETE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);