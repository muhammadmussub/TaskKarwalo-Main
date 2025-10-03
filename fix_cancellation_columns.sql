-- Fix cancellation columns in bookings table
DO $$
BEGIN
  -- Add cancellation_reason column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE public.bookings ADD COLUMN cancellation_reason TEXT;
    RAISE NOTICE 'Added cancellation_reason column to bookings table';
  END IF;

  -- Add cancelled_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancelled_by') THEN
    ALTER TABLE public.bookings ADD COLUMN cancelled_by TEXT;
    RAISE NOTICE 'Added cancelled_by column to bookings table';
  END IF;

  -- Add cancelled_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancelled_at') THEN
    ALTER TABLE public.bookings ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added cancelled_at column to bookings table';
  END IF;
END $$;

-- Add comments to explain the purpose of the columns
COMMENT ON COLUMN public.bookings.cancellation_reason IS 'Reason provided when a booking is cancelled by either customer or provider';
COMMENT ON COLUMN public.bookings.cancelled_by IS 'Who cancelled the booking: customer or provider';
COMMENT ON COLUMN public.bookings.cancelled_at IS 'When the booking was cancelled';

-- Verify the columns exist
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('cancellation_reason', 'cancelled_by', 'cancelled_at')
ORDER BY column_name;