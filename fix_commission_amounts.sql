-- Fix commission_amount field for existing completed bookings
-- This script will backfill commission_amount for completed bookings that don't have it set

DO $$
DECLARE
    booking_record RECORD;
    calculated_commission NUMERIC(10,2);
BEGIN
    -- Loop through all completed bookings that have final_price but no commission_amount
    FOR booking_record IN
        SELECT id, final_price, proposed_price, commission_amount
        FROM public.bookings
        WHERE status = 'completed'
        AND final_price IS NOT NULL
        AND (commission_amount IS NULL OR commission_amount = 0)
    LOOP
        -- Calculate commission as 5% of final_price
        calculated_commission := booking_record.final_price * 0.05;

        -- Update the booking with the calculated commission
        UPDATE public.bookings
        SET commission_amount = calculated_commission
        WHERE id = booking_record.id;

        RAISE NOTICE 'Updated booking % with commission amount: %',
                     booking_record.id, calculated_commission;
    END LOOP;

    RAISE NOTICE 'Commission amount backfill completed';
END $$;

-- Verify the fix by counting how many bookings now have commission_amount set
SELECT
    COUNT(*) as total_completed_bookings,
    COUNT(commission_amount) as bookings_with_commission,
    COUNT(*) - COUNT(commission_amount) as bookings_missing_commission
FROM public.bookings
WHERE status = 'completed' AND final_price IS NOT NULL;