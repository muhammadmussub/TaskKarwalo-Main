 -- Add the missing started_at column to the bookings table
-- This is required for the handleStartService function to work

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Update the booking completion trigger to include the new column
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