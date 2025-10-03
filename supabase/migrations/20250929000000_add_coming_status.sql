-- Add "coming" status to booking workflow
-- This migration adds the "coming" status to the allowed booking status values

-- Update the booking status constraint to include "coming"
-- The workflow will be: pending → confirmed → coming → in_progress → completed

DO $$
BEGIN
    -- First, we need to drop the existing constraint and recreate it with the new status
    -- We'll use a more flexible approach by updating the constraint

    -- Check if the constraint exists and update it
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%bookings%status%'
        AND constraint_schema = 'public'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

        -- Add the new constraint with "coming" status included
        ALTER TABLE public.bookings
        ADD CONSTRAINT bookings_status_check
        CHECK (status IN ('pending', 'negotiating', 'accepted', 'rejected', 'confirmed', 'coming', 'in_progress', 'completed', 'cancelled'));

        RAISE NOTICE 'Updated booking status constraint to include "coming" status';
    ELSE
        RAISE NOTICE 'No existing booking status constraint found to update';
    END IF;

    -- Also update any other tables that might have similar constraints
    -- Update commission_payments status constraint if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%commission_payments%status%'
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE public.commission_payments DROP CONSTRAINT IF EXISTS commission_payments_status_check;

        ALTER TABLE public.commission_payments
        ADD CONSTRAINT commission_payments_status_check
        CHECK (status IN ('pending', 'approved', 'rejected'));

        RAISE NOTICE 'Updated commission_payments status constraint';
    END IF;

    -- Update pro_badge_requests status constraint if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%pro_badge_requests%status%'
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE public.pro_badge_requests DROP CONSTRAINT IF EXISTS pro_badge_requests_status_check;

        ALTER TABLE public.pro_badge_requests
        ADD CONSTRAINT pro_badge_requests_status_check
        CHECK (status IN ('pending', 'approved', 'rejected'));

        RAISE NOTICE 'Updated pro_badge_requests status constraint';
    END IF;

END $$;

-- Add a comment to document the new status
COMMENT ON COLUMN public.bookings.status IS 'Booking status: pending, negotiating, accepted, rejected, confirmed, coming, in_progress, completed, cancelled';

-- Verify the constraint was updated
SELECT
    conname as constraint_name,
    consrc as constraint_source
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
AND conname LIKE '%status%';