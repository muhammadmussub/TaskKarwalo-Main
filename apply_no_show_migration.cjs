const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/20250128000000_create_no_show_tracking.sql'),
  'utf8'
);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('⚠️  Manual Migration Required');
  console.log('=====================================');
  console.log('');
  console.log('Due to Supabase limitations, please run this SQL manually:');
  console.log('');
  console.log('1. Go to: Supabase Dashboard → SQL Editor');
  console.log('2. Copy and paste the SQL from:');
  console.log('   supabase/migrations/20250128000000_create_no_show_tracking.sql');
  console.log('3. Run the migration');
  console.log('');
  console.log('=====================================');
  console.log('');

  // Test if tables exist (will fail until migration is run)
  console.log('Testing database connection...');

  try {
    // Test profiles table has new columns
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('no_show_strikes_count, is_suspended')
      .limit(1);

    if (profilesError && profilesError.message.includes('column')) {
      console.log('❌ Migration not yet applied - new columns not found');
      console.log('✅ Please run the SQL migration first');
    } else if (profilesError) {
      console.log('❌ Database connection error:', profilesError.message);
    } else {
      console.log('✅ Database connection successful');
      console.log('✅ Migration appears to be applied');
    }
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
  }

  console.log('\n📋 Next steps after running migration:');
  console.log('1. The CancellationModal now has a "User did not show up" checkbox');
  console.log('2. Use the UserReliabilityMonitor component in your admin panel');
  console.log('3. Test the complete flow: provider cancels → checks no-show → user gets strike');
}

applyMigration();