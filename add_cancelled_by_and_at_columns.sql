-- Add cancelled_by and cancelled_at columns to bookings table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancelled_by') THEN
    ALTER TABLE public.bookings ADD COLUMN cancelled_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancelled_at') THEN
    ALTER TABLE public.bookings ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add comments to explain the purpose of the columns
COMMENT ON COLUMN public.bookings.cancelled_by IS 'Indicates who cancelled the booking: customer or provider';
COMMENT ON COLUMN public.bookings.cancelled_at IS 'Timestamp when the booking was cancelled';

-- Verify the columns exist
SELECT id, cancellation_reason, cancelled_by, cancelled_at FROM public.bookings LIMIT 1;