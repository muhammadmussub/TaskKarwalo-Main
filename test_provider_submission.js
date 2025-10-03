import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProviderSubmission() {
  console.log('🔍 Testing provider submission flow...\n');

  try {
    // Check all provider profiles
    console.log('📋 Checking all provider profiles...');
    const { data: allProviders, error: allError } = await supabase
      .from('provider_profiles')
      .select('*');

    if (allError) {
      console.error('❌ Error fetching providers:', allError);
      return;
    }

    console.log(`📊 Total providers found: ${allProviders.length}\n`);

    // Categorize providers by status
    const pendingProviders = allProviders.filter(p => !p.admin_approved && !p.rejection_reason);
    const approvedProviders = allProviders.filter(p => p.admin_approved === true);
    const rejectedProviders = allProviders.filter(p => p.rejection_reason !== null);

    console.log('📈 Provider Status Summary:');
    console.log(`   🔄 Pending: ${pendingProviders.length}`);
    console.log(`   ✅ Approved: ${approvedProviders.length}`);
    console.log(`   ❌ Rejected: ${rejectedProviders.length}\n`);

    // Show pending providers in detail
    if (pendingProviders.length > 0) {
      console.log('🔄 PENDING PROVIDERS (should appear in admin panel):');
      pendingProviders.forEach((provider, index) => {
        console.log(`   ${index + 1}. ${provider.business_name || 'No name'}`);
        console.log(`      - ID: ${provider.id}`);
        console.log(`      - User ID: ${provider.user_id}`);
        console.log(`      - Status: ${provider.application_status || 'N/A'}`);
        console.log(`      - Submitted: ${provider.submitted_at || 'N/A'}`);
        console.log(`      - Admin Approved: ${provider.admin_approved}`);
        console.log(`      - Rejection Reason: ${provider.rejection_reason || 'None'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No pending providers found!');
      console.log('   This means either:');
      console.log('   - No providers have submitted applications yet');
      console.log('   - All providers are either approved or rejected');
      console.log('   - There might be an issue with the submission process\n');
    }

    // Show rejected providers
    if (rejectedProviders.length > 0) {
      console.log('❌ REJECTED PROVIDERS:');
      rejectedProviders.forEach((provider, index) => {
        console.log(`   ${index + 1}. ${provider.business_name || 'No name'}`);
        console.log(`      - Rejection Reason: ${provider.rejection_reason || 'N/A'}`);
        console.log(`      - Can resubmit: ${!provider.admin_approved && provider.rejection_reason ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // Test database connection and permissions
    console.log('🔗 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('provider_profiles')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection test failed:', testError);
    } else {
      console.log('✅ Database connection successful');
    }

    console.log('\n📝 RECOMMENDATIONS:');
    console.log('1. If you see pending providers above, they should appear in the admin panel');
    console.log('2. If no pending providers are shown, check the submission form');
    console.log('3. Make sure the rejection_reason is set to null for new submissions');
    console.log('4. Check the browser console for any submission errors');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testProviderSubmission();