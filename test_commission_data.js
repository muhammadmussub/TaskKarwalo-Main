// Test script to check commission data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommissionData() {
  console.log('=== TESTING COMMISSION DATA ===');

  try {
    // Check if there are any completed bookings
    const { data: completedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, final_price, proposed_price, completed_at, provider_id')
      .eq('status', 'completed');

    if (bookingsError) {
      console.error('Error fetching completed bookings:', bookingsError);
    } else {
      console.log('Completed bookings:', completedBookings?.length || 0);
      console.log('Completed bookings data:', completedBookings);

      if (completedBookings && completedBookings.length > 0) {
        // Calculate potential commission
        const totalCommission = completedBookings.reduce((sum, booking) => {
          const price = booking.final_price || booking.proposed_price || 0;
          return sum + (price * 0.05);
        }, 0);

        console.log('Calculated commission from completed bookings:', totalCommission);
      }
    }

    // Check commission payments
    const { data: commissionPayments, error: paymentsError } = await supabase
      .from('commission_payments')
      .select('*');

    if (paymentsError) {
      console.error('Error fetching commission payments:', paymentsError);
    } else {
      console.log('Commission payments:', commissionPayments?.length || 0);
      console.log('Commission payments data:', commissionPayments);
    }

    // Check provider profiles
    const { data: providers, error: providersError } = await supabase
      .from('provider_profiles')
      .select('user_id, business_name, total_commission, total_jobs');

    if (providersError) {
      console.error('Error fetching providers:', providersError);
    } else {
      console.log('Providers:', providers?.length || 0);
      console.log('Providers data:', providers);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testCommissionData();