// Test script to verify provider metrics are updating correctly
// Run this in the browser console after completing a booking

const testProviderMetricsUpdate = async () => {
  console.log('Testing provider metrics update...');

  try {
    // Get current provider profile
    const { data: profile, error: profileError } = await supabase
      .from('provider_profiles')
      .select('total_earnings, total_jobs, total_commission')
      .eq('user_id', 'your-provider-id-here') // Replace with actual provider ID
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    console.log('Current metrics:', profile);

    // Complete a test booking (replace with actual booking ID)
    const { error: completeError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', 'your-booking-id-here'); // Replace with actual booking ID

    if (completeError) {
      console.error('Error completing booking:', completeError);
      return;
    }

    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check updated metrics
    const { data: updatedProfile, error: updatedError } = await supabase
      .from('provider_profiles')
      .select('total_earnings, total_jobs, total_commission')
      .eq('user_id', 'your-provider-id-here') // Replace with actual provider ID
      .single();

    if (updatedError) {
      console.error('Error fetching updated profile:', updatedError);
      return;
    }

    console.log('Updated metrics:', updatedProfile);

    // Verify the update worked
    if (updatedProfile.total_jobs > profile.total_jobs) {
      console.log('✅ Total jobs updated correctly');
    } else {
      console.log('❌ Total jobs not updated');
    }

    if (updatedProfile.total_earnings > profile.total_earnings) {
      console.log('✅ Total earnings updated correctly');
    } else {
      console.log('❌ Total earnings not updated');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testProviderMetricsUpdate();