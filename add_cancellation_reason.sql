-- Create a new query to run in SQL editor to add the cancellation_reason column

-- First, check if the column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'cancellation_reason'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE public.bookings ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN public.bookings.cancellation_reason IS 'Reason provided when a booking is cancelled by either customer or provider';

-- Verify the column exists by selecting a test record
SELECT id, cancellation_reason FROM public.bookings LIMIT 1;