-- Create user_strikes table to track no-show incidents
CREATE TABLE user_strikes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
  strike_reason TEXT NOT NULL,
  is_no_show BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  reviewed_by UUID REFERENCES profiles(user_id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Create user_suspensions table for account suspensions
CREATE TABLE user_suspensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  suspension_reason TEXT NOT NULL,
  strike_count INTEGER NOT NULL DEFAULT 3,
  suspension_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  suspension_end TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lifted_by UUID REFERENCES profiles(user_id),
  lifted_at TIMESTAMP WITH TIME ZONE,
  lift_reason TEXT
);

-- Create indexes for performance
CREATE INDEX idx_user_strikes_user_id ON user_strikes(user_id);
CREATE INDEX idx_user_strikes_created_at ON user_strikes(created_at);
CREATE INDEX idx_user_strikes_expires_at ON user_strikes(expires_at);
CREATE INDEX idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_active ON user_suspensions(is_active);

-- Create function to get active strikes count for a user
CREATE OR REPLACE FUNCTION get_user_active_strikes(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  strike_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO strike_count
  FROM user_strikes
  WHERE user_id = user_id_param
    AND expires_at > NOW()
    AND is_no_show = TRUE;

  RETURN strike_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is currently suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_suspensions
    WHERE user_id = user_id_param
      AND is_active = TRUE
      AND suspension_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add a strike for no-show
CREATE OR REPLACE FUNCTION add_user_strike(
  user_id_param UUID,
  booking_id_param UUID,
  provider_id_param UUID,
  strike_reason_param TEXT,
  is_no_show_param BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  strike_id UUID;
  current_strikes INTEGER;
  suspension_id UUID;
BEGIN
  -- Insert the strike
  INSERT INTO user_strikes (
    user_id,
    booking_id,
    provider_id,
    strike_reason,
    is_no_show
  ) VALUES (
    user_id_param,
    booking_id_param,
    provider_id_param,
    strike_reason_param,
    is_no_show_param
  ) RETURNING id INTO strike_id;

  -- Get current active strikes count
  SELECT get_user_active_strikes(user_id_param) INTO current_strikes;

  -- If user has 3 or more strikes, suspend them
  IF current_strikes >= 3 THEN
    INSERT INTO user_suspensions (
      user_id,
      suspension_reason,
      strike_count,
      suspension_end,
      created_by
    ) VALUES (
      user_id_param,
      'Automated suspension: 3 no-show strikes in 7 days',
      current_strikes,
      NOW() + INTERVAL '48 hours',
      provider_id_param
    ) RETURNING id INTO suspension_id;
  END IF;

  RETURN strike_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's suspension status
CREATE OR REPLACE FUNCTION get_user_suspension_status(user_id_param UUID)
RETURNS TABLE (
  is_suspended BOOLEAN,
  suspension_end TIMESTAMP WITH TIME ZONE,
  suspension_reason TEXT,
  strikes_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sus.is_active AND sus.suspension_end > NOW() AS is_suspended,
    sus.suspension_end,
    sus.suspension_reason,
    get_user_active_strikes(user_id_param) AS strikes_count
  FROM user_suspensions sus
  WHERE sus.user_id = user_id_param
    AND sus.is_active = TRUE
    AND sus.suspension_end > NOW()
  ORDER BY sus.suspension_end DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE user_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_strikes
CREATE POLICY "Users can view their own strikes" ON user_strikes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Providers can view strikes they reported" ON user_strikes
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert strikes" ON user_strikes
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Admins can view all strikes" ON user_strikes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- RLS Policies for user_suspensions
CREATE POLICY "Users can view their own suspensions" ON user_suspensions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all suspensions" ON user_suspensions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );