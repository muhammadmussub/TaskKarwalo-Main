// Apply the provider metrics fix directly to the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('Applying provider metrics fix...');

  try {
    // Drop the existing trigger function
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP FUNCTION IF EXISTS update_completed_jobs_counter();'
    });

    if (dropError) {
      console.log('Function may not exist, continuing...');
    }

    // Create the corrected trigger function
    const fixSQL = `
      CREATE OR REPLACE FUNCTION update_completed_jobs_counter()
      RETURNS TRIGGER AS $$
      BEGIN
        -- If booking status changed to 'completed'
        IF NEW.status = 'completed' AND (OLD.status != 'completed' OR OLD.status IS NULL) THEN
          -- Calculate earnings (final_price or proposed_price)
          DECLARE
            booking_earnings NUMERIC(10,2);
            commission_amount NUMERIC(10,2);
          BEGIN
            booking_earnings := COALESCE(NEW.final_price, NEW.proposed_price);
            commission_amount := booking_earnings * 0.05; -- 5% commission

            -- Update the provider's completed_jobs_since_commission count
            UPDATE public.provider_profiles
            SET
              completed_jobs_since_commission = completed_jobs_since_commission + 1,
              -- If 5 or more completed jobs, activate the commission reminder
              commission_reminder_active = CASE WHEN (completed_jobs_since_commission + 1) >= 5 THEN TRUE ELSE commission_reminder_active END,
              -- Update total_jobs count for the provider
              total_jobs = total_jobs + 1,
              -- Update total_earnings (subtract commission)
              total_earnings = total_earnings + (booking_earnings - commission_amount),
              -- Update total_commission
              total_commission = total_commission + commission_amount
            WHERE user_id = NEW.provider_id;
          END;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: fixSQL
    });

    if (createError) {
      console.error('Error creating function:', createError);
      return;
    }

    // Ensure the trigger exists
    const triggerSQL = `
      DROP TRIGGER IF EXISTS update_jobs_counter_on_completion ON public.bookings;
      CREATE TRIGGER update_jobs_counter_on_completion
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_completed_jobs_counter();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: triggerSQL
    });

    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
      return;
    }

    console.log('✅ Provider metrics fix applied successfully!');
    console.log('Now when bookings are completed, both total_earnings and total_jobs will be updated automatically.');

  } catch (error) {
    console.error('Error applying fix:', error);
  }
}

applyFix();