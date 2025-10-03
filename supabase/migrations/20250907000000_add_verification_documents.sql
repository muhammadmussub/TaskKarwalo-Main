-- Add verification document fields to provider_profiles table
ALTER TABLE public.provider_profiles 
ADD COLUMN IF NOT EXISTS cnic_front_image TEXT,
ADD COLUMN IF NOT EXISTS cnic_back_image TEXT,
ADD COLUMN IF NOT EXISTS license_certificate TEXT,
ADD COLUMN IF NOT EXISTS profile_photo TEXT,
ADD COLUMN IF NOT EXISTS proof_of_address TEXT,
ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'reupload_requested')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_provider_profiles_application_status 
ON public.provider_profiles (application_status);

-- Update existing RLS policy to include the new columns
DROP POLICY IF EXISTS "Providers can update own profile" ON public.provider_profiles;
CREATE POLICY "Providers can update own profile" ON public.provider_profiles 
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Providers can insert own profile" ON public.provider_profiles;
CREATE POLICY "Providers can insert own profile" ON public.provider_profiles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN public.provider_profiles.cnic_front_image IS 'URL to the front image of the provider''s CNIC';
COMMENT ON COLUMN public.provider_profiles.cnic_back_image IS 'URL to the back image of the provider''s CNIC';
COMMENT ON COLUMN public.provider_profiles.license_certificate IS 'URL to the provider''s license or certification document';
COMMENT ON COLUMN public.provider_profiles.profile_photo IS 'URL to the provider''s profile photo';
COMMENT ON COLUMN public.provider_profiles.proof_of_address IS 'URL to the provider''s proof of address document';
COMMENT ON COLUMN public.provider_profiles.application_status IS 'Current status of the provider application';
COMMENT ON COLUMN public.provider_profiles.rejection_reason IS 'Reason for rejection if application was rejected';
COMMENT ON COLUMN public.provider_profiles.admin_notes IS 'Notes from admin during review process';