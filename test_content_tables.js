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

async function testTables() {
  console.log('Testing content management tables...\n');

  const tables = [
    'content_sections',
    'contact_information',
    'faqs',
    'policies'
  ];

  for (const tableName of tables) {
    try {
      console.log(`Testing ${tableName}...`);

      // Try to select from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`❌ Error accessing ${tableName}:`, error.message);
      } else {
        console.log(`✅ ${tableName} is accessible`);
        console.log(`   Data count: ${data ? data.length : 0} records`);
      }
    } catch (err) {
      console.error(`❌ Exception testing ${tableName}:`, err.message);
    }
    console.log('');
  }

  // Test inserting a record to see if we have write access
  console.log('Testing write access...');
  try {
    const { data, error } = await supabase
      .from('content_sections')
      .insert({
        section_key: 'test_section',
        title: 'Test Section',
        content: 'This is a test',
        content_type: 'text'
      })
      .select();

    if (error) {
      console.error('❌ Write access error:', error.message);
    } else {
      console.log('✅ Write access successful');
      console.log('   Inserted record:', data);

      // Clean up the test record
      await supabase
        .from('content_sections')
        .delete()
        .eq('section_key', 'test_section');
      console.log('   Test record cleaned up');
    }
  } catch (err) {
    console.error('❌ Exception testing write access:', err.message);
  }
}

testTables();