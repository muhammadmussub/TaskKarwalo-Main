import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function createDemoData() {
  console.log('Creating demo data for commission analytics...');

  try {
    // First, let's check if we have any existing data
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id')
      .limit(1);

    if (existingBookings && existingBookings.length > 0) {
      console.log('Demo data already exists. Skipping creation.');
      return;
    }

    // Create demo providers
    const providers = [
      { id: 'demo-provider-1', verified: true, admin_approved: true, verified_pro: true, total_jobs: 15, total_earnings: 45000, total_commission: 4500 },
      { id: 'demo-provider-2', verified: true, admin_approved: true, verified_pro: false, total_jobs: 8, total_earnings: 24000, total_commission: 2400 },
      { id: 'demo-provider-3', verified: true, admin_approved: true, verified_pro: true, total_jobs: 22, total_earnings: 66000, total_commission: 6600 },
      { id: 'demo-provider-4', verified: false, admin_approved: true, verified_pro: false, total_jobs: 3, total_earnings: 9000, total_commission: 900 },
    ];

    console.log('Inserting demo providers...');
    const { error: providersError } = await supabase
      .from('provider_profiles')
      .upsert(providers);

    if (providersError) {
      console.error('Error inserting providers:', providersError);
    }

    // Create demo bookings with commission data
    const now = new Date();
    const bookings = [
      {
        id: 'demo-booking-1',
        provider_id: 'demo-provider-1',
        customer_id: 'demo-customer-1',
        service_id: 'demo-service-1',
        status: 'completed',
        final_price: 3000,
        commission_amount: 300,
        created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        completed_at: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-booking-2',
        provider_id: 'demo-provider-1',
        customer_id: 'demo-customer-2',
        service_id: 'demo-service-2',
        status: 'completed',
        final_price: 5000,
        commission_amount: 500,
        created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-booking-3',
        provider_id: 'demo-provider-2',
        customer_id: 'demo-customer-3',
        service_id: 'demo-service-3',
        status: 'completed',
        final_price: 4000,
        commission_amount: 400,
        created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-booking-4',
        provider_id: 'demo-provider-3',
        customer_id: 'demo-customer-4',
        service_id: 'demo-service-4',
        status: 'completed',
        final_price: 8000,
        commission_amount: 800,
        created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-booking-5',
        provider_id: 'demo-provider-3',
        customer_id: 'demo-customer-5',
        service_id: 'demo-service-5',
        status: 'completed',
        final_price: 6000,
        commission_amount: 600,
        created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-booking-6',
        provider_id: 'demo-provider-1',
        customer_id: 'demo-customer-6',
        service_id: 'demo-service-6',
        status: 'completed',
        final_price: 3500,
        commission_amount: 350,
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-booking-7',
        provider_id: 'demo-provider-2',
        customer_id: 'demo-customer-7',
        service_id: 'demo-service-7',
        status: 'completed',
        final_price: 2800,
        commission_amount: 280,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    console.log('Inserting demo bookings...');
    const { error: bookingsError } = await supabase
      .from('bookings')
      .upsert(bookings);

    if (bookingsError) {
      console.error('Error inserting bookings:', bookingsError);
    }

    // Create commission tracking records
    const commissionRecords = [
      {
        id: 'demo-commission-1',
        provider_id: 'demo-provider-1',
        booking_id: 'demo-booking-1',
        commission_amount: 300,
        status: 'cleared',
        created_at: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-commission-2',
        provider_id: 'demo-provider-1',
        booking_id: 'demo-booking-2',
        commission_amount: 500,
        status: 'cleared',
        created_at: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-commission-3',
        provider_id: 'demo-provider-2',
        booking_id: 'demo-booking-3',
        commission_amount: 400,
        status: 'pending',
        created_at: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-commission-4',
        provider_id: 'demo-provider-3',
        booking_id: 'demo-booking-4',
        commission_amount: 800,
        status: 'cleared',
        created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-commission-5',
        provider_id: 'demo-provider-3',
        booking_id: 'demo-booking-5',
        commission_amount: 600,
        status: 'cleared',
        created_at: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-commission-6',
        provider_id: 'demo-provider-1',
        booking_id: 'demo-booking-6',
        commission_amount: 350,
        status: 'pending',
        created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo-commission-7',
        provider_id: 'demo-provider-2',
        booking_id: 'demo-booking-7',
        commission_amount: 280,
        status: 'cleared',
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    console.log('Inserting commission tracking records...');
    const { error: commissionError } = await supabase
      .from('commission_tracking')
      .upsert(commissionRecords);

    if (commissionError) {
      console.error('Error inserting commission tracking:', commissionError);
    }

    console.log('Demo data created successfully!');
    console.log('Summary:');
    console.log('- 4 providers created');
    console.log('- 7 completed bookings created');
    console.log('- 7 commission tracking records created');
    console.log('- Total commission: PKR 3,230');
    console.log('- Pending commission: PKR 750');
    console.log('- Cleared commission: PKR 2,480');

  } catch (error) {
    console.error('Error creating demo data:', error);
  }
}

createDemoData();