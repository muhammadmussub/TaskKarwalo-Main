-- Create function to get daily earnings for a provider
CREATE OR REPLACE FUNCTION get_daily_earnings(provider_id UUID)
RETURNS TABLE (
    date DATE,
    earnings NUMERIC,
    bookings BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(b.completed_at) as date,
        COALESCE(SUM(b.final_price), 0) + COALESCE(SUM(b.proposed_price), 0) as earnings,
        COUNT(*) as bookings
    FROM bookings b
    WHERE b.provider_id = provider_id
        AND b.status = 'completed'
        AND b.completed_at IS NOT NULL
    GROUP BY DATE(b.completed_at)
    ORDER BY date DESC
    LIMIT 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_earnings(UUID) TO authenticated;