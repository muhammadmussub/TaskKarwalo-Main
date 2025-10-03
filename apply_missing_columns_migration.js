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

async function applyMissingColumnsMigration() {
  try {
    console.log('Applying missing columns migration...');

    // Add banned column to provider_profiles table
    console.log('Adding banned column to provider_profiles...');
    const { error: bannedColumnError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE provider_profiles
        ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS banned_reason TEXT,
        ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
      `
    });

    if (bannedColumnError) {
      console.log('Trying direct approach for banned column...');
      // Try direct approach since RPC might not be available
      const { error: directError } = await supabase
        .from('provider_profiles')
        .select('id')
        .limit(1);

      if (directError && directError.message.includes('banned')) {
        console.log('banned column does not exist, but we cannot add it via client. Please run this SQL manually in Supabase dashboard:');
        console.log(`
          ALTER TABLE provider_profiles
          ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS banned_reason TEXT,
          ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
        `);
      }
    }

    // Add rejection_reason column to pro_badge_requests table
    console.log('Adding rejection_reason column to pro_badge_requests...');
    const { error: rejectionColumnError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE pro_badge_requests
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      `
    });

    if (rejectionColumnError) {
      console.log('Trying direct approach for rejection_reason column...');
      // Try direct approach since RPC might not be available
      const { error: directError } = await supabase
        .from('pro_badge_requests')
        .select('id')
        .limit(1);

      if (directError && directError.message.includes('rejection_reason')) {
        console.log('rejection_reason column does not exist, but we cannot add it via client. Please run this SQL manually in Supabase dashboard:');
        console.log(`
          ALTER TABLE pro_badge_requests
          ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        `);
      }
    }

    console.log('Migration completed! Please check the output above for any manual steps required.');

  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('Please run the SQL manually in your Supabase dashboard:');
    console.log(`
      -- Add banned column to provider_profiles table
      ALTER TABLE provider_profiles
      ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS banned_reason TEXT,
      ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

      -- Add rejection_reason column to pro_badge_requests table
      ALTER TABLE pro_badge_requests
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

      -- Update existing records to have default values
      UPDATE provider_profiles SET banned = FALSE WHERE banned IS NULL;
    `);
  }
}

applyMissingColumnsMigration();