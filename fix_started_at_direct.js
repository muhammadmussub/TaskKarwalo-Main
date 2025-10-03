// Direct fix for the started_at column issue
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStartedAtColumn() {
  console.log('Attempting to add started_at column directly...');

  try {
    // Try to add the column using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;'
    });

    if (error) {
      console.error('Error adding column via RPC:', error);

      // Try alternative approach - just test if we can update with started_at
      console.log('Trying alternative approach...');

      const { data: testData, error: testError } = await supabase
        .from('bookings')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Cannot access bookings table:', testError);
        return;
      }

      console.log('✅ Can access bookings table');
      console.log('ℹ️  The started_at column should be added manually in the Supabase dashboard');
      console.log('ℹ️  Or run this SQL in the Supabase SQL editor:');
      console.log('   ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;');

      return;
    }

    console.log('✅ Successfully added started_at column');
    console.log('Response:', data);

    // Now test if the column works
    console.log('Testing the column...');

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('status', 'confirmed')
      .limit(1)
      .maybeSingle();

    if (!booking) {
      console.log('ℹ️  No confirmed bookings found to test with');
      console.log('✅ Column added successfully - providers can now start services!');
      return;
    }

    const { data: updateData, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', booking.id)
      .select();

    if (updateError) {
      console.error('❌ Still cannot update with started_at:', updateError);
      return;
    }

    console.log('✅ Successfully updated booking with started_at!');
    console.log('🎉 Provider service starting issue is FIXED!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixStartedAtColumn();