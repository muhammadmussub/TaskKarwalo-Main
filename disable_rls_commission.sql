-- Temporarily disable RLS on storage.objects for commission-proofs bucket
-- This is for testing purposes only

DO $$
BEGIN
    -- Check if the commission-proofs bucket exists
    IF EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'commission-proofs'
    ) THEN
        RAISE NOTICE 'Commission proofs bucket found, disabling RLS...';

        -- Disable RLS on storage.objects table (this affects all buckets)
        -- Note: This is temporary and should be reverted
        ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

        RAISE NOTICE 'RLS disabled on storage.objects table';
    ELSE
        RAISE NOTICE 'Commission proofs bucket not found';
    END IF;
END $$;