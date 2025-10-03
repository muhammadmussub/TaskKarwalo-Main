// Debug script to test storage access with detailed logging
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔧 Testing storage access with different clients...\n');

async function testStorageAccess() {
  try {
    // Test 1: Service role client (should have full access)
    console.log('1️⃣ Testing with SERVICE ROLE client...');
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: serviceBuckets, error: serviceError } = await serviceClient.storage.listBuckets();
    console.log('Service role buckets:', {
      count: serviceBuckets?.length || 0,
      buckets: serviceBuckets?.map(b => b.name) || [],
      error: serviceError
    });

    // Test 2: Anon client (simulates frontend)
    console.log('\n2️⃣ Testing with ANON client...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: anonBuckets, error: anonError } = await anonClient.storage.listBuckets();
    console.log('Anon client buckets:', {
      count: anonBuckets?.length || 0,
      buckets: anonBuckets?.map(b => b.name) || [],
      error: anonError
    });

    // Test 3: Authenticated anon client
    console.log('\n3️⃣ Testing with AUTHENTICATED anon client...');
    const { data: { user }, error: signInError } = await anonClient.auth.signInWithPassword({
      email: 'mussab5gaming@gmail.com', // Use the actual user email
      password: 'password123' // Use the actual password
    });

    if (signInError) {
      console.log('Sign in error:', signInError);
    } else {
      console.log('Signed in as:', user?.email);

      const { data: authBuckets, error: authError } = await anonClient.storage.listBuckets();
      console.log('Authenticated buckets:', {
        count: authBuckets?.length || 0,
        buckets: authBuckets?.map(b => b.name) || [],
        error: authError
      });
    }

    // Test 4: Check specific bucket permissions
    console.log('\n4️⃣ Testing specific bucket permissions...');
    if (serviceBuckets?.find(b => b.name === 'commission-proofs')) {
      const { data: files, error: filesError } = await serviceClient.storage
        .from('commission-proofs')
        .list();

      console.log('Commission proofs bucket files:', {
        count: files?.length || 0,
        error: filesError
      });
    }

  } catch (error) {
    console.error('❌ Error during storage testing:', error);
  }
}

testStorageAccess();