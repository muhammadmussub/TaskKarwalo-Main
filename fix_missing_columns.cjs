const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixMissingColumns() {
  console.log('🔧 Fixing missing database columns...');

  try {
    // Add missing columns to provider_profiles table
    console.log('Adding missing columns to provider_profiles table...');

    const { error: providerError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE provider_profiles
        ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS banned_reason TEXT,
        ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS completed_jobs_since_commission INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_commission_paid_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS commission_reminder_active BOOLEAN DEFAULT FALSE;
      `
    });

    if (providerError) {
      console.error('Error adding provider_profiles columns:', providerError);
    } else {
      console.log('✅ provider_profiles columns added successfully');
    }

    // Add missing columns to pro_badge_requests table
    console.log('Adding missing columns to pro_badge_requests table...');

    const { error: badgeError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE pro_badge_requests
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      `
    });

    if (badgeError) {
      console.error('Error adding pro_badge_requests columns:', badgeError);
    } else {
      console.log('✅ pro_badge_requests columns added successfully');
    }

    // Update existing records to have default values
    const { error: updateError } = await supabase.rpc('execute_sql', {
      sql: `
        UPDATE provider_profiles SET banned = FALSE WHERE banned IS NULL;
      `
    });

    if (updateError) {
      console.error('Error updating default values:', updateError);
    } else {
      console.log('✅ Default values updated successfully');
    }

    console.log('🎉 Database schema fixes completed!');
    console.log('The ProviderCommissionOverview component should now work without TypeScript errors.');

  } catch (error) {
    console.error('Error fixing database schema:', error);
    console.log('\n📝 Manual fix required:');
    console.log('Run these SQL commands in your Supabase SQL editor:');
    console.log(`
-- Add missing columns to provider_profiles table
ALTER TABLE provider_profiles
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS banned_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_jobs_since_commission INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_commission_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS commission_reminder_active BOOLEAN DEFAULT FALSE;

-- Add missing columns to pro_badge_requests table
ALTER TABLE pro_badge_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing records to have default values
UPDATE provider_profiles SET banned = FALSE WHERE banned IS NULL;
    `);
  }
}

fixMissingColumns();