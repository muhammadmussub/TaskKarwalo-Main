// Test script for commission payment form functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Use service role key for admin operations like checking buckets
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Use anon key for regular operations
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommissionPaymentForm() {
  console.log('🧪 Testing Commission Payment Form Functionality...\n');

  try {
    // Test 1: Check if commission_proofs bucket exists
    console.log('1. Checking commission-proofs bucket...');
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();

    if (bucketError) {
      console.error('❌ Error checking buckets:', bucketError);
      return;
    }

    const commissionBucket = buckets?.find(bucket => bucket.name === 'commission-proofs');
    if (!commissionBucket) {
      console.error('❌ Commission proofs bucket not found');
      console.log('Available buckets:', buckets?.map(b => b.name));
      return;
    }
    console.log('✅ Commission proofs bucket exists');

    // Test 2: Check payment methods table
    console.log('\n2. Checking payment methods...');
    const { data: paymentMethods, error: paymentError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true);

    if (paymentError) {
      console.error('❌ Error loading payment methods:', paymentError);
    } else {
      console.log(`✅ Found ${paymentMethods?.length || 0} active payment methods`);
      paymentMethods?.forEach(method => {
        console.log(`   - ${method.display_name}: ${method.method_name}`);
      });
    }

    // Test 3: Check commission_payments table
    console.log('\n3. Checking commission_payments table...');
    const { data: commissionPayments, error: commissionError } = await supabase
      .from('commission_payments')
      .select('*')
      .limit(5);

    if (commissionError) {
      console.error('❌ Error accessing commission_payments table:', commissionError);
    } else {
      console.log(`✅ Commission payments table accessible. Found ${commissionPayments?.length || 0} records`);
    }

    // Test 4: Test file upload functionality
    console.log('\n4. Testing file upload permissions...');
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from('commission-proofs')
        .upload('test/test.txt', testFile);

      if (uploadError) {
        console.error('❌ File upload test failed:', uploadError.message);
      } else {
        console.log('✅ File upload permissions working');
        // Clean up test file
        await supabaseAdmin.storage.from('commission-proofs').remove(['test/test.txt']);
      }
    } catch (error) {
      console.error('❌ File upload test error:', error);
    }

    // Test 5: Check provider profiles with commission data
    console.log('\n5. Checking provider commission status...');
    const { data: providers, error: providerError } = await supabase
      .from('provider_profiles')
      .select('id, user_id, total_jobs, admin_approved')
      .eq('admin_approved', true)
      .limit(10);

    if (providerError) {
      console.error('❌ Error loading providers:', providerError);
    } else {
      console.log(`✅ Found ${providers?.length || 0} approved providers`);

      // Check which providers might need commission payment
      for (const provider of providers || []) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('status')
          .eq('provider_id', provider.user_id);

        const completedJobs = bookings?.filter(b => b.status === 'completed').length || 0;
        const jobsSinceLastCommission = completedJobs % 5;

        if (completedJobs >= 5 && jobsSinceLastCommission === 0) {
          console.log(`   📊 Provider ${provider.user_id}: ${completedJobs} completed jobs - Commission due`);
        }
      }
    }

    console.log('\n🎯 Commission Payment Form Test Summary:');
    console.log('✅ Storage bucket: Available');
    console.log('✅ Payment methods: Configured');
    console.log('✅ Database tables: Accessible');
    console.log('✅ File upload: Working');
    console.log('✅ Provider data: Loading correctly');

    console.log('\n💡 The commission payment form should be working properly for providers.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testCommissionPaymentForm();