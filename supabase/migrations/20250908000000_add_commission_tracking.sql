-- Add commission tracking to provider_profiles table
ALTER TABLE public.provider_profiles
ADD COLUMN IF NOT EXISTS completed_jobs_since_commission INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_commission_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS commission_reminder_active BOOLEAN DEFAULT FALSE;

-- Create a commission_payments table to track payments
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  screenshot_url TEXT,
  booking_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_commission_payments_provider_id ON public.commission_payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_status ON public.commission_payments(status);

-- Create trigger function to update completed_jobs_since_commission counter
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
      WHERE id = NEW.provider_id;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the bookings table
DROP TRIGGER IF EXISTS update_jobs_counter_on_completion ON public.bookings;
CREATE TRIGGER update_jobs_counter_on_completion
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_completed_jobs_counter();

-- Function to reset the jobs counter after commission payment is approved
CREATE OR REPLACE FUNCTION reset_jobs_counter_on_commission_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Reset the counter and update last paid timestamp
    UPDATE public.provider_profiles
    SET 
      completed_jobs_since_commission = 0,
      last_commission_paid_at = NOW(),
      commission_reminder_active = FALSE
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the commission_payments table
DROP TRIGGER IF EXISTS reset_counter_on_commission_approval ON public.commission_payments;
CREATE TRIGGER reset_counter_on_commission_approval
AFTER UPDATE ON public.commission_payments
FOR EACH ROW
EXECUTE FUNCTION reset_jobs_counter_on_commission_approval();

-- Set up RLS policies for the commission_payments table
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- Providers can view and create their own commission payments
CREATE POLICY "Providers can view their own commission payments" 
ON public.commission_payments FOR SELECT 
USING (auth.uid() = provider_id);

CREATE POLICY "Providers can create their own commission payments" 
ON public.commission_payments FOR INSERT 
WITH CHECK (auth.uid() = provider_id);

-- Providers cannot update their own commission payments once submitted
CREATE POLICY "Providers cannot update their own commission payments" 
ON public.commission_payments FOR UPDATE 
USING (false);

-- Admins can do everything
CREATE POLICY "Admins can do everything with commission payments" 
ON public.commission_payments 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND user_type = 'admin'
));

-- Update the COMMENT to document purpose of this table
COMMENT ON TABLE public.commission_payments IS 'Tracks commission payments from providers with screenshot proof';