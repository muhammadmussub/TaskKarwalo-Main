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

async function testProBadge() {
  try {
    console.log('Testing pro badge functionality...');

    // Test 1: Check if pro_badge_requests table exists
    console.log('\n1. Testing pro_badge_requests table...');
    const { data: proBadgeData, error: proBadgeError } = await supabase
      .from('pro_badge_requests')
      .select('*')
      .limit(1);

    if (proBadgeError) {
      console.error('❌ pro_badge_requests table error:', proBadgeError.message);
    } else {
      console.log('✅ pro_badge_requests table exists');
      console.log('   Found', proBadgeData?.length || 0, 'pro badge requests');
    }

    // Test 2: Try to insert a test pro badge request
    console.log('\n2. Testing pro badge request insertion...');
    const { error: insertError } = await supabase
      .from('pro_badge_requests')
      .insert({
        provider_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        status: 'pending',
        requested_at: new Date().toISOString()
      });

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
    } else {
      console.log('✅ Insert succeeded');
    }

    // Test 3: Check if provider_profiles table has verified_pro column
    console.log('\n3. Testing provider_profiles verified_pro column...');
    const { data: providerData, error: providerError } = await supabase
      .from('provider_profiles')
      .select('verified_pro')
      .limit(1);

    if (providerError) {
      console.error('❌ provider_profiles error:', providerError.message);
    } else {
      console.log('✅ provider_profiles table accessible');
      console.log('   verified_pro column exists');
    }

    // Test 4: Try to update provider verified_pro status
    console.log('\n4. Testing provider verified_pro update...');
    const { error: updateError } = await supabase
      .from('provider_profiles')
      .update({ verified_pro: true })
      .eq('user_id', '00000000-0000-0000-0000-000000000000');

    if (updateError) {
      console.log('❌ Update failed (expected for dummy user):', updateError.message);
    } else {
      console.log('✅ Update succeeded');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testProBadge();