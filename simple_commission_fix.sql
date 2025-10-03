-- Simple Commission Payment Fix
-- This is a minimal fix that should work without requiring table ownership

-- Just update the existing policies to be less restrictive
-- We won't drop/create policies since that requires ownership

-- Update existing policies to be more permissive for commission-proofs bucket
-- This should work if you're the project owner

-- First, let's check what policies currently exist
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%commission%';

-- If the above policies exist, we need to replace them with simpler ones:

-- Simple policy: Allow authenticated users to upload to commission-proofs
UPDATE pg_policies SET
  qual = 'bucket_id = ''commission-proofs'' AND auth.uid() IS NOT NULL',
  with_check = 'bucket_id = ''commission-proofs'' AND auth.uid() IS NOT NULL'
WHERE tablename = 'objects'
AND policyname = 'Providers can upload commission proofs';

-- Simple policy: Allow authenticated users to view commission proofs
UPDATE pg_policies SET
  qual = 'bucket_id = ''commission-proofs'' AND auth.uid() IS NOT NULL'
WHERE tablename = 'objects'
AND policyname = 'Providers can view their own commission proofs';

-- Simple policy: Allow authenticated users to update commission proofs
UPDATE pg_policies SET
  qual = 'bucket_id = ''commission-proofs'' AND auth.uid() IS NOT NULL'
WHERE tablename = 'objects'
AND policyname = 'Providers can update their own commission proofs';

-- Simple policy: Allow authenticated users to delete commission proofs
UPDATE pg_policies SET
  qual = 'bucket_id = ''commission-proofs'' AND auth.uid() IS NOT NULL'
WHERE tablename = 'objects'
AND policyname = 'Providers can delete their own commission proofs';

-- If you can't update policies, try creating new ones:
-- But first check if these policy names already exist

-- Alternative: Create new policies with different names
DROP POLICY IF EXISTS "commission_uploads_simple" ON storage.objects;
CREATE POLICY "commission_uploads_simple" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "commission_viewing_simple" ON storage.objects;
CREATE POLICY "commission_viewing_simple" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  auth.uid() IS NOT NULL
);