import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function testCommissionSetup() {
  console.log('Testing commission system setup...');

  try {
    // Test 1: Check if provider_profiles table has commission columns
    console.log('\n1. Testing provider_profiles table structure...');
    const { data: providerData, error: providerError } = await supabase
      .from('provider_profiles')
      .select('user_id, business_name, completed_jobs_since_commission, total_commission')
      .limit(1);

    if (providerError) {
      console.error('❌ Provider profiles table error:', providerError.message);
    } else {
      console.log('✅ Provider profiles table accessible');
      console.log('Sample data:', providerData);
    }

    // Test 2: Check if commission_payments table exists
    console.log('\n2. Testing commission_payments table...');
    const { data: commissionData, error: commissionError } = await supabase
      .from('commission_payments')
      .select('*')
      .limit(3);

    if (commissionError) {
      console.error('❌ Commission payments table error:', commissionError.message);
    } else {
      console.log('✅ Commission payments table accessible');
      console.log('Found', commissionData?.length || 0, 'commission payments');
      console.log('Sample data:', commissionData);
    }

    // Test 3: Test the specific queries used in the admin panel
    console.log('\n3. Testing admin panel queries...');

    // Test provider overview query
    const { data: providers, error: providersError } = await supabase
      .from('provider_profiles')
      .select(`
        user_id,
        business_name,
        business_type,
        total_jobs,
        total_earnings,
        total_commission,
        completed_jobs_since_commission,
        commission_reminder_active,
        profiles (
          full_name,
          email
        )
      `)
      .limit(5);

    if (providersError) {
      console.error('❌ Provider overview query error:', providersError.message);
    } else {
      console.log('✅ Provider overview query works');
      console.log('Found', providers?.length || 0, 'providers');
    }

    // Test commission payments query
    const { data: payments, error: paymentsError } = await supabase
      .from('commission_payments')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (paymentsError) {
      console.error('❌ Commission payments query error:', paymentsError.message);
    } else {
      console.log('✅ Commission payments query works');
      console.log('Found', payments?.length || 0, 'payments');
    }

    console.log('\n✅ Commission system setup test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCommissionSetup();