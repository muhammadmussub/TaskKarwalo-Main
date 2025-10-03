import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

async function debugBucketAccess() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    console.error('VITE_SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  if (!supabaseAnonKey) {
    console.error('VITE_SUPABASE_PUBLISHABLE_KEY environment variable is required');
    process.exit(1);
  }

  console.log('=== DEBUGGING BUCKET ACCESS ===');

  // Test 1: Service role access
  console.log('\n1. Testing service role access...');
  const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const { data: serviceBuckets, error: serviceError } = await serviceSupabase.storage.listBuckets();
    if (serviceError) throw serviceError;

    console.log('✅ Service role can access buckets');
    console.log('Available buckets:', serviceBuckets?.map(b => `${b.name} (${b.public ? 'public' : 'private'})`));

    const commissionBucket = serviceBuckets?.find(b => b.name === 'commission-proofs');
    if (commissionBucket) {
      console.log('✅ Commission proofs bucket exists:', commissionBucket);
    } else {
      console.log('❌ Commission proofs bucket not found');
    }
  } catch (error) {
    console.error('❌ Service role bucket access failed:', error);
  }

  // Test 2: Anonymous access
  console.log('\n2. Testing anonymous access...');
  const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data: anonBuckets, error: anonError } = await anonSupabase.storage.listBuckets();
    if (anonError) throw anonError;

    console.log('✅ Anonymous can access buckets');
    console.log('Available buckets:', anonBuckets?.map(b => `${b.name} (${b.public ? 'public' : 'private'})`));

    const anonCommissionBucket = anonBuckets?.find(b => b.name === 'commission-proofs');
    if (anonCommissionBucket) {
      console.log('✅ Commission proofs bucket accessible to anonymous users');
    } else {
      console.log('❌ Commission proofs bucket not accessible to anonymous users');
      console.log('This might be why the provider dashboard cannot see the bucket');
    }
  } catch (error) {
    console.error('❌ Anonymous bucket access failed:', error);
    console.log('This suggests RLS policies are blocking anonymous access to bucket listing');
  }

  // Test 3: Check storage policies
  console.log('\n3. Checking storage policies...');
  try {
    const { data: policies, error: policiesError } = await serviceSupabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'objects')
      .like('policyname', '%commission%');

    if (policiesError) {
      console.log('Could not check policies (this is normal):', policiesError.message);
    } else {
      console.log('Found commission-related policies:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`- ${policy.policyname}: ${policy.qual}`);
      });
    }
  } catch (error) {
    console.log('Policy check failed (this is normal):', error.message);
  }

  console.log('\n=== DEBUGGING COMPLETE ===');
}

debugBucketAccess();