-- Add cancellation_reason column to bookings table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE public.bookings ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN public.bookings.cancellation_reason IS 'Reason provided when a booking is cancelled by either customer or provider';