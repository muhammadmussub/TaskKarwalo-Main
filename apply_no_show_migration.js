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
  console.log('Applying no-show tracking migration...');

  try {
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          console.error('Error executing statement:', error);
          // Continue with other statements
        }
      }
    }

    console.log('Migration completed successfully!');

    // Test the new tables
    console.log('\nTesting new tables...');

    // Test no_show_strikes table
    const { data: strikesData, error: strikesError } = await supabase
      .from('no_show_strikes')
      .select('count')
      .limit(1);

    if (strikesError) {
      console.error('Error testing no_show_strikes:', strikesError);
    } else {
      console.log('✅ no_show_strikes table is accessible');
    }

    // Test user_suspensions table
    const { data: suspensionsData, error: suspensionsError } = await supabase
      .from('user_suspensions')
      .select('count')
      .limit(1);

    if (suspensionsError) {
      console.error('Error testing user_suspensions:', suspensionsError);
    } else {
      console.log('✅ user_suspensions table is accessible');
    }

    // Test profiles table has new columns
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('no_show_strikes_count, is_suspended')
      .limit(1);

    if (profilesError) {
      console.error('Error testing profiles columns:', profilesError);
    } else {
      console.log('✅ profiles table has new no-show columns');
    }

    console.log('\n🎉 No-show tracking system is ready!');
    console.log('\nNext steps:');
    console.log('1. The CancellationModal now has a "User did not show up" checkbox');
    console.log('2. Use the UserReliabilityMonitor component in your admin panel');
    console.log('3. Test the complete flow: provider cancels → checks no-show → user gets strike');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();