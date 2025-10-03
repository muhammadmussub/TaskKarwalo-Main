-- Additional policies and updates for realtime_stats table

-- Ensure the table exists
CREATE TABLE IF NOT EXISTS realtime_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stat_type TEXT NOT NULL,
  stat_name TEXT NOT NULL,
  stat_value DOUBLE PRECISION NOT NULL,
  stat_trend DOUBLE PRECISION DEFAULT 0,
  time_period TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stat_type, stat_name, time_period)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_realtime_stats_type ON realtime_stats(stat_type);
CREATE INDEX IF NOT EXISTS idx_realtime_stats_name ON realtime_stats(stat_name);
CREATE INDEX IF NOT EXISTS idx_realtime_stats_period ON realtime_stats(time_period);
CREATE INDEX IF NOT EXISTS idx_realtime_stats_updated ON realtime_stats(updated_at);

-- Update RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow all authenticated users to read realtime_stats'
  ) THEN
    CREATE POLICY "Allow all authenticated users to read realtime_stats" 
    ON realtime_stats
    FOR SELECT 
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow only admins to modify realtime_stats'
  ) THEN
    CREATE POLICY "Allow only admins to modify realtime_stats"
    ON realtime_stats
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT auth.uid() FROM auth.users 
        WHERE raw_user_meta_data->>'user_type' = 'admin'
      )
    );
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE realtime_stats ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON realtime_stats TO authenticated;

-- Add a comment to describe the table
COMMENT ON TABLE realtime_stats IS 'Stores real-time statistics for the admin dashboard. Automatically updated by triggers on data changes.';