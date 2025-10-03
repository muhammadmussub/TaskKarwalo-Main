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

async function testPaymentMethods() {
  try {
    console.log('Testing payment methods functionality...');

    // Test 1: Check if payment_methods table exists
    console.log('\n1. Testing payment_methods table...');
    const { data: paymentMethodsData, error: paymentMethodsError } = await supabase
      .from('payment_methods')
      .select('*')
      .limit(1);

    if (paymentMethodsError) {
      console.error('❌ payment_methods table error:', paymentMethodsError.message);
    } else {
      console.log('✅ payment_methods table exists');
      console.log('   Found', paymentMethodsData?.length || 0, 'payment methods');
    }

    // Test 2: Check if commission_payments table exists
    console.log('\n2. Testing commission_payments table...');
    const { data: commissionData, error: commissionError } = await supabase
      .from('commission_payments')
      .select('*')
      .limit(1);

    if (commissionError) {
      console.error('❌ commission_payments table error:', commissionError.message);
    } else {
      console.log('✅ commission_payments table exists');
      console.log('   Found', commissionData?.length || 0, 'commission payments');
    }

    // Test 3: Check if commission_payments_view exists
    console.log('\n3. Testing commission_payments_view...');
    const { data: viewData, error: viewError } = await supabase
      .from('commission_payments_view')
      .select('*')
      .limit(1);

    if (viewError) {
      if (viewError.message.includes('does not exist') || viewError.message.includes('not a table')) {
        console.log('⚠️  commission_payments_view does not exist yet');
        console.log('   Please run the create_commission_view.sql script in your Supabase dashboard');
      } else {
        console.error('❌ commission_payments_view error:', viewError.message);
      }
    } else {
      console.log('✅ commission_payments_view exists');
      console.log('   Found', viewData?.length || 0, 'records in view');
    }

    // Test 4: Check current user authentication
    console.log('\n4. Testing user authentication...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('❌ User authentication error:', userError.message);
    } else if (user) {
      console.log('✅ User authenticated:', user.email);

      // Check user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, full_name')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile error:', profileError.message);
      } else {
        console.log('✅ User profile found:', profile.full_name, '(', profile.user_type, ')');
      }
    } else {
      console.log('⚠️  No user authenticated');
    }

    // Test 5: Try to add a payment method (this should fail if not admin)
    console.log('\n5. Testing payment method creation...');
    const { error: insertError } = await supabase
      .from('payment_methods')
      .insert({
        method_name: 'test_method',
        display_name: 'Test Method',
        account_details: 'Test account details'
      });

    if (insertError) {
      console.log('❌ Insert failed (expected if not admin):', insertError.message);
    } else {
      console.log('✅ Insert succeeded (user is admin)');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testPaymentMethods();