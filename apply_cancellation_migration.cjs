// Script to apply cancellation-related migrations
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applyCancellationMigrations() {
  console.log('Applying cancellation migrations...');

  try {
    // Add cancellation_reason column
    const { error: reasonError } = await supabase
      .from('bookings')
      .select('cancellation_reason')
      .limit(1);

    if (reasonError && reasonError.message.includes('column') && reasonError.message.includes('does not exist')) {
      console.log('cancellation_reason column does not exist, adding it...');

      // Use raw SQL approach since we don't have exec_sql function
      const { error: addReasonError } = await supabase.rpc('add_cancellation_reason_column');
      if (addReasonError) {
        console.log('RPC function not available, columns may need to be added manually');
        console.log('Please run the SQL commands from add_cancellation_reason.sql manually in Supabase SQL editor');
      } else {
        console.log('✅ cancellation_reason column added successfully');
      }
    } else {
      console.log('✅ cancellation_reason column already exists');
    }

    // Add cancelled_by and cancelled_at columns
    const { error: columnsError } = await supabase
      .from('bookings')
      .select('cancelled_by, cancelled_at')
      .limit(1);

    if (columnsError && (columnsError.message.includes('cancelled_by') || columnsError.message.includes('cancelled_at'))) {
      console.log('cancelled_by/cancelled_at columns do not exist, adding them...');

      // Use raw SQL approach since we don't have exec_sql function
      const { error: addColumnsError } = await supabase.rpc('add_cancelled_columns');
      if (addColumnsError) {
        console.log('RPC function not available, columns may need to be added manually');
        console.log('Please run the SQL commands from add_cancelled_by_and_at_columns.sql manually in Supabase SQL editor');
      } else {
        console.log('✅ cancelled_by and cancelled_at columns added successfully');
      }
    } else {
      console.log('✅ cancelled_by and cancelled_at columns already exist');
    }

    console.log('Migration completed!');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

applyCancellationMigrations();