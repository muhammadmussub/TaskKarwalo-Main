// Test script to debug commission payment issues
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugCommissionPayment() {
  console.log('🔍 Debugging commission payment system...\n');

  try {
    // 1. Check if bucket exists
    console.log('1. Checking commission-proofs bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error checking buckets:', bucketsError);
      return;
    }

    const commissionBucket = buckets.find(b => b.name === 'commission-proofs');
    if (!commissionBucket) {
      console.error('❌ commission-proofs bucket not found');
      console.log('Available buckets:', buckets.map(b => b.name));
      return;
    }

    console.log('✅ commission-proofs bucket exists:', commissionBucket);

    // 2. Check bucket policies
    console.log('\n2. Checking bucket policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('storage_policies')
      .select('*')
      .eq('bucket_id', commissionBucket.id);

    if (policiesError) {
      console.log('⚠️  Could not check policies (this is normal):', policiesError.message);
    } else {
      console.log('✅ Storage policies:', policies);
    }

    // 3. Check commission_payments table
    console.log('\n3. Checking commission_payments table...');
    const { data: tableExists, error: tableError } = await supabase
      .from('commission_payments')
      .select('count')
      .limit(1);

    if (tableError) {
      if (tableError.message.includes('does not exist')) {
        console.error('❌ commission_payments table does not exist');
        return;
      } else {
        console.error('❌ Error checking commission_payments table:', tableError);
        return;
      }
    }

    console.log('✅ commission_payments table exists');

    // 4. Test upload as anonymous user (should fail)
    console.log('\n4. Testing upload permissions...');
    try {
      // Create a simple buffer as test content
      const testBuffer = Buffer.from('test content');

      const { error: uploadError } = await supabase.storage
        .from('commission-proofs')
        .upload('test/test.txt', testBuffer, {
          contentType: 'text/plain'
        });

      if (uploadError) {
        console.log('✅ Upload correctly failed for anonymous user:', uploadError.message);
      } else {
        console.error('⚠️  Upload succeeded for anonymous user (this might be a security issue)');
      }
    } catch (error) {
      console.log('✅ Upload correctly failed for anonymous user (exception):', error.message);
    }

    // 5. Check RLS policies on commission_payments table
    console.log('\n5. Checking RLS policies on commission_payments table...');
    const { data: rlsPolicies, error: rlsError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'commission_payments');

    if (rlsError) {
      console.log('⚠️  Could not check RLS policies:', rlsError.message);
    } else {
      console.log('✅ RLS policies found:', rlsPolicies?.length || 0);
      rlsPolicies?.forEach((policy, index) => {
        console.log(`   Policy ${index + 1}:`, {
          name: policy.policyname,
          command: policy.cmd,
          roles: policy.roles,
          qual: policy.qual
        });
      });
    }

    console.log('\n✅ Commission payment system debug completed successfully');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugCommissionPayment();