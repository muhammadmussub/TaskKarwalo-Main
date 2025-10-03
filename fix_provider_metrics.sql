-- Fix provider metrics update issue
-- This script updates the trigger function to properly update both total_jobs and total_earnings

-- Drop the existing trigger function
DROP FUNCTION IF EXISTS update_completed_jobs_counter();

-- Create the corrected trigger function
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
        total_commission = total_commission + commission_amount,
        -- Update the updated_at timestamp to trigger real-time updates
        updated_at = now()
      WHERE user_id = NEW.provider_id;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS update_jobs_counter_on_completion ON public.bookings;
CREATE TRIGGER update_jobs_counter_on_completion
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_completed_jobs_counter();

-- Also create a function to manually refresh provider stats for testing
CREATE OR REPLACE FUNCTION refresh_provider_stats(provider_user_id UUID)
RETURNS void AS $$
DECLARE
  total_jobs_count INTEGER;
  total_earnings_amount NUMERIC(10,2);
  total_commission_amount NUMERIC(10,2);
BEGIN
  -- Calculate stats from completed bookings
  SELECT
    COUNT(*),
    COALESCE(SUM(final_price), 0) + COALESCE(SUM(proposed_price), 0),
    COALESCE(SUM(final_price), 0) + COALESCE(SUM(proposed_price), 0) * 0.05
  INTO total_jobs_count, total_earnings_amount, total_commission_amount
  FROM bookings
  WHERE provider_id = provider_user_id AND status = 'completed';

  -- Update provider profile with calculated stats
  UPDATE public.provider_profiles
  SET
    total_jobs = total_jobs_count,
    total_earnings = total_earnings_amount - total_commission_amount,
    total_commission = total_commission_amount,
    updated_at = now()
  WHERE user_id = provider_user_id;
END;
$$ LANGUAGE plpgsql;