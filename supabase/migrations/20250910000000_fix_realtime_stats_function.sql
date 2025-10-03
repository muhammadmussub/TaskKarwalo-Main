-- Fix the realtime_stats refresh function to work without parameters
CREATE OR REPLACE FUNCTION public.refresh_realtime_stats() 
RETURNS void AS $$
DECLARE
  active_users_count INTEGER;
  total_users_count INTEGER;
  total_providers_count INTEGER;
  total_bookings_count INTEGER;
  completed_bookings_count INTEGER;
  total_revenue DOUBLE PRECISION;
  total_commission DOUBLE PRECISION;
  category_count INTEGER;
  
  -- Previous values for trend calculation
  prev_active_users INTEGER;
  prev_total_users INTEGER;
  prev_providers INTEGER;
  prev_bookings INTEGER;
  prev_revenue DOUBLE PRECISION;
  prev_commission DOUBLE PRECISION;
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
  
  -- Calculate total verified and approved service providers
  SELECT COUNT(*) INTO total_providers_count
  FROM provider_profiles
  WHERE admin_approved = true AND verified = true;
  
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
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create test stat insertion function
CREATE OR REPLACE FUNCTION public.insert_test_stat()
RETURNS void AS $$
DECLARE
  random_value INTEGER;
  random_trend DOUBLE PRECISION;
BEGIN
  -- Generate random values
  random_value := floor(random() * 1000) + 500;
  random_trend := (random() * 40) - 15;  -- Random trend between -15 and 25
  
  -- Insert or update a test statistic
  INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
  VALUES ('users', 'active_users', random_value, random_trend, 'current')
  ON CONFLICT (stat_type, stat_name, time_period) 
  DO UPDATE SET 
    stat_value = EXCLUDED.stat_value,
    stat_trend = EXCLUDED.stat_trend,
    updated_at = now();
    
  -- Also update total users with a slightly higher value
  INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
  VALUES ('users', 'total_users', random_value * 4, random_trend / 2, 'current')
  ON CONFLICT (stat_type, stat_name, time_period) 
  DO UPDATE SET 
    stat_value = EXCLUDED.stat_value,
    stat_trend = EXCLUDED.stat_trend,
    updated_at = now();
    
  -- Update service providers count
  INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
  VALUES ('providers', 'total_providers', random_value * 0.9, random_trend * 0.8, 'current')
  ON CONFLICT (stat_type, stat_name, time_period) 
  DO UPDATE SET 
    stat_value = EXCLUDED.stat_value,
    stat_trend = EXCLUDED.stat_trend,
    updated_at = now();
    
  -- Update task categories count
  INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
  VALUES ('services', 'category_count', floor(random() * 30) + 10, random_trend * 0.5, 'current')
  ON CONFLICT (stat_type, stat_name, time_period) 
  DO UPDATE SET 
    stat_value = EXCLUDED.stat_value,
    stat_trend = EXCLUDED.stat_trend,
    updated_at = now();
    
  -- Update revenue
  INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
  VALUES ('revenue', 'total_revenue', (random_value * 1000), random_trend * 0.7, 'current')
  ON CONFLICT (stat_type, stat_name, time_period) 
  DO UPDATE SET 
    stat_value = EXCLUDED.stat_value,
    stat_trend = EXCLUDED.stat_trend,
    updated_at = now();
    
  -- Update commission
  INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
  VALUES ('commission', 'total_commission', (random_value * 100), random_trend * 0.6, 'current')
  ON CONFLICT (stat_type, stat_name, time_period) 
  DO UPDATE SET 
    stat_value = EXCLUDED.stat_value,
    stat_trend = EXCLUDED.stat_trend,
    updated_at = now();
    
  -- Update completion rate
  INSERT INTO realtime_stats (stat_type, stat_name, stat_value, stat_trend, time_period)
  VALUES ('performance', 'completion_rate', 75 + (random() * 20), random_trend * 0.3, 'current')
  ON CONFLICT (stat_type, stat_name, time_period) 
  DO UPDATE SET 
    stat_value = EXCLUDED.stat_value,
    stat_trend = EXCLUDED.stat_trend,
    updated_at = now();
    
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create function to get real-time stats count
CREATE OR REPLACE FUNCTION public.get_stats_count()
RETURNS INTEGER AS $$
DECLARE
  stats_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO stats_count FROM realtime_stats;
  RETURN stats_count;
END;
$$ LANGUAGE plpgsql;

-- Grant access to these functions
GRANT EXECUTE ON FUNCTION public.refresh_realtime_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_test_stat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_count() TO authenticated;

-- Make sure triggers are recreated
DROP TRIGGER IF EXISTS update_jobs_counter_on_completion ON public.bookings;
CREATE TRIGGER update_jobs_counter_on_completion
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_completed_jobs_counter();

-- Initial data population if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM realtime_stats LIMIT 1) THEN
    PERFORM refresh_realtime_stats();
  END IF;
END $$;