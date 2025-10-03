// Test script to verify admin dashboard stats loading
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminStats() {
  console.log('Testing admin dashboard stats loading...');

  try {
    // Test the same queries that AdminDashboard uses
    const [userCountResult, providerCountResult, bookingCountResult, revenueDataResult, pendingBookingsResult, confirmedBookingsResult, inProgressBookingsResult, completedBookingsResult, cancelledBookingsResult, clearedCommissionResult, pendingCommissionProvidersResult] = await Promise.all([
      // Get total users count
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),

      // Get total providers count
      supabase
        .from('provider_profiles')
        .select('*', { count: 'exact', head: true }),

      // Get total bookings count
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true }),

      // Get revenue data
      supabase
        .from('bookings')
        .select('final_price')
        .not('final_price', 'is', null)
        .eq('status', 'completed'),

      // Get pending bookings count
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Get confirmed bookings count
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed'),

      // Get in-progress bookings count
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress'),

      // Get completed bookings count
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),

      // Get cancelled bookings count
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled'),

      // Get total cleared commission from approved commission payments
      supabase
        .from('commission_payments')
        .select('amount')
        .eq('status', 'approved'),

      // Get providers with pending commission payments
      supabase
        .from('provider_profiles')
        .select(`
          id,
          user_id,
          total_jobs,
          bookings(
            status
          )
        `)
        .eq('admin_approved', true)
    ]);

    console.log('All queries completed successfully');

    // Calculate total revenue
    const totalRevenue = revenueDataResult.data?.reduce(
      (sum, booking) => sum + (booking.final_price || 0),
      0
    ) || 0;

    // Calculate total cleared commission first
    const totalClearedCommission = clearedCommissionResult.data?.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    ) || 0;

    // Calculate pending commission providers
    let pendingCommissionProviders = 0;
    if (pendingCommissionProvidersResult.data) {
      console.log('Pending commission providers raw data:', pendingCommissionProvidersResult.data);
      pendingCommissionProvidersResult.data.forEach(provider => {
        const completedJobs = provider.bookings?.filter(booking => booking.status === 'completed').length || 0;
        if (completedJobs >= 5) {
          pendingCommissionProviders++;
        }
      });
    }

    console.log('Calculated stats:', {
      totalUsers: userCountResult.count || 0,
      totalProviders: providerCountResult.count || 0,
      totalBookings: bookingCountResult.count || 0,
      totalRevenue,
      pendingBookings: pendingBookingsResult.count || 0,
      confirmedBookings: confirmedBookingsResult.count || 0,
      inProgressBookings: inProgressBookingsResult.count || 0,
      completedBookings: completedBookingsResult.count || 0,
      cancelledBookings: cancelledBookingsResult.count || 0,
      totalClearedCommission,
      pendingCommissionProviders
    });

    console.log('✅ Admin dashboard stats test completed successfully');

  } catch (error) {
    console.error('❌ Error testing admin stats:', error);
  }
}

testAdminStats();