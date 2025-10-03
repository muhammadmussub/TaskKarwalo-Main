-- Add phone verification fields to profiles table
ALTER TABLE profiles
ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN phone_verification_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN phone_verification_attempts INTEGER DEFAULT 0;

-- Create index for phone number uniqueness (excluding null values)
CREATE UNIQUE INDEX idx_profiles_phone_unique ON profiles(phone) WHERE phone IS NOT NULL;

-- Add constraint to ensure phone_verified is only true when phone is not null
ALTER TABLE profiles
ADD CONSTRAINT phone_verified_requires_phone
CHECK (phone_verified = FALSE OR phone IS NOT NULL);

-- Create function to check if phone number already exists
CREATE OR REPLACE FUNCTION check_phone_exists(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE phone = phone_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify phone number
CREATE OR REPLACE FUNCTION verify_user_phone(user_id UUID, phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET
    phone = phone_number,
    phone_verified = TRUE,
    phone_verification_sent_at = NOW(),
    updated_at = NOW()
  WHERE user_id = user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;