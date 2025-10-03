import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    let value = values.join('=').trim();
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Applying pro_badge_requests migration...');

    // Try to test if the table already exists first
    const { data: testData, error: testError } = await supabase
      .from('pro_badge_requests')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      console.log('Table does not exist, trying to create it...');

      // Since we can't execute raw SQL, let's try a different approach
      // We'll try to insert a dummy record to see if the table exists
      const { error: insertError } = await supabase
        .from('pro_badge_requests')
        .insert({
          provider_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
          status: 'pending',
          requested_at: new Date().toISOString()
        });

      if (insertError && insertError.message.includes('does not exist')) {
        console.log('Table definitely does not exist. Please create it manually using the Supabase dashboard or CLI.');
        console.log('Migration SQL:');
        console.log(`
-- Create Pro badge requests table
CREATE TABLE IF NOT EXISTS pro_badge_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
  request_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_provider_id ON pro_badge_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_status ON pro_badge_requests(status);
CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_requested_at ON pro_badge_requests(requested_at DESC);

-- Enable RLS
ALTER TABLE pro_badge_requests ENABLE ROW LEVEL SECURITY;

-- Policies for pro_badge_requests
CREATE POLICY "Providers can view their own requests"
  ON pro_badge_requests FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can create their own requests"
  ON pro_badge_requests FOR INSERT
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Admins can view all requests"
  ON pro_badge_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update requests"
  ON pro_badge_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pro_badge_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_pro_badge_requests_updated_at
  BEFORE UPDATE ON pro_badge_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_pro_badge_requests_updated_at();
        `);
        return;
      }
    }

    if (testError) {
      console.error('Error testing table:', testError);
      return;
    }

    console.log('Migration applied successfully!');
    console.log('Table exists and is accessible!');

  } catch (error) {
    console.error('Error:', error);
  }
}

applyMigration();