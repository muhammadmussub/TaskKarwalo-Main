-- Fix bucket listing permissions for authenticated users
-- This allows users to list available storage buckets

-- Enable RLS on storage.buckets if not already enabled
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can list buckets" ON storage.buckets;

-- Create policy to allow authenticated users to list buckets
CREATE POLICY "Authenticated users can list buckets" ON storage.buckets
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Also allow service role to list all buckets (for admin operations)
DROP POLICY IF EXISTS "Service role can list all buckets" ON storage.buckets;
CREATE POLICY "Service role can list all buckets" ON storage.buckets
FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');