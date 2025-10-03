-- Create realtime_stats table to store system metrics
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

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_realtime_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_realtime_stats_updated_at
BEFORE UPDATE ON realtime_stats
FOR EACH ROW
EXECUTE FUNCTION update_realtime_stats_timestamp();

-- Create a function to calculate metrics
CREATE OR REPLACE FUNCTION refresh_realtime_stats() 
RETURNS void AS $$
DECLARE
  active_users_count INTEGER;
  total_users_count INTEGER;
  total_providers_count INTEGER;
  total_bookings_count INTEGER;
  completed_bookings_count INTEGER;
  total_revenue DOUBLE PRECISION;
  total_commission DOUBLE PRECISION; -- Add commission tracking
  category_count INTEGER;
  
  -- Previous values for trend calculation
  prev_active_users INTEGER;
  prev_total_users INTEGER;
  prev_providers INTEGER;
  prev_bookings INTEGER;
  prev_revenue DOUBLE PRECISION;
  prev_commission DOUBLE PRECISION; -- Add previous commission for trend
  prev_completion_rate DOUBLE PRECISION;
  
  -- Time windows
  current_time TIMESTAMPTZ := now();
  five_minutes_ago TIMESTAMPTZ := now() - INTERVAL '5 minutes';
  one_day_ago TIMESTAMPTZ := now() - INTERVAL '1 day';
  one_week_ago TIMESTAMPTZ := now() - INTERVAL '7 days';
  one_month_ago TIMESTAMPTZ := now() - INTERVAL '30 days';
BEGIN
  -- Calculate active users (users active in the last 5 minutes)
  SELECT COUNT(*) INTO active_users_count 
  FROM profiles 
  WHERE updated_at >= five_minutes_ago;
  
  -- Calculate total users
  SELECT COUNT(*) INTO total_users_count 
  FROM profiles;
  
  -- Calculate total service providers
  SELECT COUNT(*) INTO total_providers_count 
  FROM provider_profiles;
  
  -- Calculate total bookings
  SELECT COUNT(*) INTO total_bookings_count 
  FROM bookings;
  
  -- Calculate completed bookings
  SELECT COUNT(*) INTO completed_bookings_count 
  FROM bookings 
  WHERE status = 'completed';
  
  -- Calculate total revenue
  SELECT COALESCE(SUM(commission_amount), 0) INTO total_revenue 
  FROM bookings 
  WHERE commission_amount IS NOT NULL;
  
  -- Calculate total commission (same as revenue in this context)
  SELECT COALESCE(SUM(commission_amount), 0) INTO total_commission 
  FROM bookings 
  WHERE commission_amount IS NOT NULL;
  
  -- Count unique service categories
  SELECT COUNT(DISTINCT category) INTO category_count 
  FROM services;
  
  -- Get previous values for trend calculation
  SELECT COALESCE(stat_value, 0) INTO prev_active_users 
  FROM realtime_stats 
  WHERE stat_type = 'users' AND stat_name = 'active_users' AND time_period = 'current' 
  LIMIT 1;
  
  SELECT COALESCE(stat_value, 0) INTO prev_total_users 
  FROM realtime_stats 
  WHERE stat_type = 'users' AND stat_name = 'total_users' AND time_period = 'current' 
  LIMIT 1;
  
  SELECT COALESCE(stat_value, 0) INTO prev_providers 
  FROM realtime_stats 
  WHERE stat_type = 'providers' AND stat_name = 'total_providers' AND time_period = 'current' 
  LIMIT 1;
  
  SELECT COALESCE(stat_value, 0) INTO prev_bookings 
  FROM realtime_stats 
  WHERE stat_type = 'bookings' AND stat_name = 'total_bookings' AND time_period = 'current' 
  LIMIT 1;
  
  SELECT COALESCE(stat_value, 0) INTO prev_revenue 
  FROM realtime_stats 
  WHERE stat_type = 'revenue' AND stat_name = 'total_revenue' AND time_period = 'current' 
  LIMIT 1;
  
  -- Get previous commission value
  SELECT COALESCE(stat_value, 0) INTO prev_commission 
  FROM realtime_stats 
  WHERE stat_type = 'commission' AND stat_name = 'total_commission' AND time_period = 'current' 
  LIMIT 1;
  
  -- Calculate task completion rate
  DECLARE completion_rate DOUBLE PRECISION;
  BEGIN
    IF total_bookings_count = 0 THEN
      completion_rate := 0;
    ELSE
      completion_rate := (completed_bookings_count::DOUBLE PRECISION / total_bookings_count::DOUBLE PRECISION) * 100;
    END IF;
    
    SELECT COALESCE(stat_value, 0) INTO prev_completion_rate 
    FROM realtime_stats 
    WHERE stat_type = 'performance' AND stat_name = 'completion_rate' AND time_period = 'current' 
    LIMIT 1;
    
    -- Insert or update current stats
    -- Active Users
    INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
    VALUES ('users', 'active_users', active_users_count, 
           CASE WHEN prev_active_users = 0 THEN 0 ELSE ((active_users_count - prev_active_users) / prev_active_users) * 100 END,
           'current')
    ON CONFLICT (stat_type, stat_name, time_period) 
    DO UPDATE SET 
      stat_value = EXCLUDED.stat_value,
      stat_trend = CASE WHEN realtime_stats.stat_value = 0 THEN 0 ELSE ((EXCLUDED.stat_value - realtime_stats.stat_value) / realtime_stats.stat_value) * 100 END,
      updated_at = now();
    
    -- Total Users
    INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
    VALUES ('users', 'total_users', total_users_count, 
           CASE WHEN prev_total_users = 0 THEN 0 ELSE ((total_users_count - prev_total_users) / prev_total_users) * 100 END,
           'current')
    ON CONFLICT (stat_type, stat_name, time_period) 
    DO UPDATE SET 
      stat_value = EXCLUDED.stat_value,
      stat_trend = CASE WHEN realtime_stats.stat_value = 0 THEN 0 ELSE ((EXCLUDED.stat_value - realtime_stats.stat_value) / realtime_stats.stat_value) * 100 END,
      updated_at = now();
    
    -- Total Providers
    INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
    VALUES ('providers', 'total_providers', total_providers_count, 
           CASE WHEN prev_providers = 0 THEN 0 ELSE ((total_providers_count - prev_providers) / prev_providers) * 100 END,
           'current')
    ON CONFLICT (stat_type, stat_name, time_period) 
    DO UPDATE SET 
      stat_value = EXCLUDED.stat_value,
      stat_trend = CASE WHEN realtime_stats.stat_value = 0 THEN 0 ELSE ((EXCLUDED.stat_value - realtime_stats.stat_value) / realtime_stats.stat_value) * 100 END,
      updated_at = now();
    
    -- Total Bookings
    INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
    VALUES ('bookings', 'total_bookings', total_bookings_count, 
           CASE WHEN prev_bookings = 0 THEN 0 ELSE ((total_bookings_count - prev_bookings) / prev_bookings) * 100 END,
           'current')
    ON CONFLICT (stat_type, stat_name, time_period) 
    DO UPDATE SET 
      stat_value = EXCLUDED.stat_value,
      stat_trend = CASE WHEN realtime_stats.stat_value = 0 THEN 0 ELSE ((EXCLUDED.stat_value - realtime_stats.stat_value) / realtime_stats.stat_value) * 100 END,
      updated_at = now();
    
    -- Total Revenue
    INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
    VALUES ('revenue', 'total_revenue', total_revenue, 
           CASE WHEN prev_revenue = 0 THEN 0 ELSE ((total_revenue - prev_revenue) / prev_revenue) * 100 END,
           'current')
    ON CONFLICT (stat_type, stat_name, time_period) 
    DO UPDATE SET 
      stat_value = EXCLUDED.stat_value,
      stat_trend = CASE WHEN realtime_stats.stat_value = 0 THEN 0 ELSE ((EXCLUDED.stat_value - realtime_stats.stat_value) / realtime_stats.stat_value) * 100 END,
      updated_at = now();
    
    -- Total Commission
    INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
    VALUES ('commission', 'total_commission', total_commission, 
           CASE WHEN prev_commission = 0 THEN 0 ELSE ((total_commission - prev_commission) / prev_commission) * 100 END,
           'current')
    ON CONFLICT (stat_type, stat_name, time_period) 
    DO UPDATE SET 
      stat_value = EXCLUDED.stat_value,
      stat_trend = CASE WHEN realtime_stats.stat_value = 0 THEN 0 ELSE ((EXCLUDED.stat_value - realtime_stats.stat_value) / realtime_stats.stat_value) * 100 END,
      updated_at = now();
    
    -- Task Completion Rate
    INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
    VALUES ('performance', 'completion_rate', completion_rate, 
           CASE WHEN prev_completion_rate = 0 THEN 0 ELSE ((completion_rate - prev_completion_rate) / prev_completion_rate) * 100 END,
           'current')
    ON CONFLICT (stat_type, stat_name, time_period) 
    DO UPDATE SET 
      stat_value = EXCLUDED.stat_value,
      stat_trend = CASE WHEN realtime_stats.stat_value = 0 THEN 0 ELSE ((EXCLUDED.stat_value - realtime_stats.stat_value) / realtime_stats.stat_value) * 100 END,
      updated_at = now();
    
    -- Service Categories
    INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
    VALUES ('services', 'category_count', category_count, 0, 'current')
    ON CONFLICT (stat_type, stat_name, time_period) 
    DO UPDATE SET 
      stat_value = EXCLUDED.stat_value,
      updated_at = now();
  END;
END;
$$ LANGUAGE plpgsql;

-- Setup RLS policies
ALTER TABLE realtime_stats ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read realtime_stats
CREATE POLICY "Allow all authenticated users to read realtime_stats" 
ON realtime_stats
FOR SELECT 
TO authenticated
USING (true);

-- Allow only admins to modify realtime_stats
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

-- Create a function to automatically trigger refresh on relevant changes
CREATE OR REPLACE FUNCTION trigger_refresh_stats() RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_realtime_stats();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh stats when relevant tables change
CREATE TRIGGER refresh_stats_on_profiles_change
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_stats();

CREATE TRIGGER refresh_stats_on_provider_profiles_change
AFTER INSERT OR UPDATE OR DELETE ON provider_profiles
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_stats();

CREATE TRIGGER refresh_stats_on_bookings_change
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_stats();

CREATE TRIGGER refresh_stats_on_services_change
AFTER INSERT OR UPDATE OR DELETE ON services
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_stats();

-- Initial data population
SELECT refresh_realtime_stats();

-- Create storage buckets for files if they don't exist
DO $$
BEGIN
  -- Check if the extension exists
  IF NOT EXISTS (
    SELECT FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Try to create the extension
    BEGIN
      CREATE EXTENSION pg_cron;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create pg_cron extension. Scheduled refresh will not be available.';
    END;
  END IF;

  -- Try to schedule a job to refresh stats every 5 minutes
  BEGIN
    SELECT cron.schedule('*/5 * * * *', 'SELECT refresh_realtime_stats()');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job. Stats will refresh on data changes only.';
  END;
END $$;