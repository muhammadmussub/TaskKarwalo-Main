// Final test script for commission payment functionality
// Run this to verify the commission payment system is working

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testCommissionPaymentSystem() {
  console.log('🧪 Testing Commission Payment System...\n');

  try {
    // 1. Check if commission-proofs bucket exists
    console.log('1. Checking commission-proofs bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    const commissionBucket = buckets.find(bucket => bucket.name === 'commission-proofs');
    if (!commissionBucket) {
      console.error('❌ Commission proofs bucket not found');
      console.log('Available buckets:', buckets.map(b => b.name));
      return;
    }

    console.log('✅ Commission proofs bucket exists:', commissionBucket);

    // 2. Test bucket policies
    console.log('\n2. Testing bucket policies...');
    const { data: files, error: listError } = await supabase.storage
      .from('commission-proofs')
      .list();

    if (listError) {
      console.error('❌ Error accessing bucket:', listError);
      console.log('This might indicate RLS policy issues');
    } else {
      console.log('✅ Bucket access successful');
    }

    // 3. Test file upload (using service role)
    console.log('\n3. Testing file upload...');
    const testFile = new File(['test content'], 'test_commission_proof.jpg', {
      type: 'image/jpeg'
    });

    const fileName = `test_${Date.now()}_commission_proof.jpg`;
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('commission-proofs')
      .upload(fileName, testFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful:', uploadData);

      // Clean up test file
      await supabase.storage.from('commission-proofs').remove([fileName]);
      console.log('🗑️  Test file cleaned up');
    }

    // 4. Check commission_payments table
    console.log('\n4. Checking commission_payments table...');
    const { data: payments, error: paymentsError } = await supabase
      .from('commission_payments')
      .select('*')
      .limit(1);

    if (paymentsError) {
      if (paymentsError.message.includes('does not exist')) {
        console.error('❌ commission_payments table does not exist');
      } else {
        console.error('❌ Error accessing commission_payments table:', paymentsError);
      }
    } else {
      console.log('✅ commission_payments table exists and is accessible');
      console.log(`Found ${payments?.length || 0} payment records`);
    }

    console.log('\n🎉 Commission payment system test completed!');

  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  }
}

// Run the test
testCommissionPaymentSystem();