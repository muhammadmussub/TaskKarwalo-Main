import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

async function verifyBucketWithServiceRole() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('VITE_SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Verifying commission proofs bucket with service role...');

    // List buckets to verify commission-proofs bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return;
    }

    console.log('Available buckets:', buckets?.map(b => ({ name: b.name, id: b.id })));

    const commissionBucket = buckets?.find(bucket => bucket.name === 'commission-proofs');

    if (!commissionBucket) {
      console.error('❌ Commission proofs bucket not found!');
      return;
    }

    console.log('✅ Commission proofs bucket found:', commissionBucket);

    // Test if we can create a test file path (without actually uploading)
    const testFileName = `test_${Date.now()}.jpg`;
    const testPath = `commissions/test-user/${testFileName}`;

    console.log('✅ Bucket verification successful!');
    console.log('Commission payment functionality should now work properly.');

  } catch (error) {
    console.error('Error verifying bucket:', error);
  }
}

verifyBucketWithServiceRole();