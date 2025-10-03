-- Create no_show_strikes table to track user no-show behavior
CREATE TABLE IF NOT EXISTS no_show_strikes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
    strike_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_suspensions table to track account suspensions
CREATE TABLE IF NOT EXISTS user_suspensions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    suspension_reason TEXT NOT NULL,
    suspension_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    suspension_end TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(user_id), -- For manual suspensions by admin
    auto_suspension BOOLEAN DEFAULT FALSE, -- TRUE if auto-suspended due to strikes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add no_show_strikes_count, last_strike_date, and phone_verified to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS no_show_strikes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_strike_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_no_show_strikes_user_id ON no_show_strikes(user_id);
CREATE INDEX IF NOT EXISTS idx_no_show_strikes_booking_id ON no_show_strikes(booking_id);
CREATE INDEX IF NOT EXISTS idx_no_show_strikes_date ON no_show_strikes(strike_date);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_active ON user_suspensions(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_strikes ON profiles(no_show_strikes_count);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(is_suspended);

-- Create function to update user strike count
CREATE OR REPLACE FUNCTION update_user_strike_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's strike count and last strike date
    UPDATE profiles
    SET
        no_show_strikes_count = (
            SELECT COUNT(*)
            FROM no_show_strikes
            WHERE user_id = NEW.user_id
            AND strike_date >= NOW() - INTERVAL '7 days'
        ),
        last_strike_date = NEW.strike_date,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    -- Check if user should be auto-suspended (3+ strikes in 7 days)
    IF (
        SELECT COUNT(*)
        FROM no_show_strikes
        WHERE user_id = NEW.user_id
        AND strike_date >= NOW() - INTERVAL '7 days'
    ) >= 3 THEN
        -- Auto-suspend the user for 48 hours
        INSERT INTO user_suspensions (
            user_id,
            suspension_reason,
            suspension_end,
            auto_suspension
        ) VALUES (
            NEW.user_id,
            'Automatic suspension: 3+ no-show strikes in 7 days',
            NOW() + INTERVAL '48 hours',
            TRUE
        ) ON CONFLICT DO NOTHING;

        -- Update user status
        UPDATE profiles
        SET
            is_suspended = TRUE,
            suspension_end_time = NOW() + INTERVAL '48 hours',
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update strike counts
DROP TRIGGER IF EXISTS trigger_update_strike_count ON no_show_strikes;
CREATE TRIGGER trigger_update_strike_count
    AFTER INSERT ON no_show_strikes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_strike_count();

-- Create function to check if user is currently suspended
CREATE OR REPLACE FUNCTION is_user_suspended(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_suspensions
        WHERE user_id = check_user_id
        AND is_active = TRUE
        AND suspension_end > NOW()
    ) OR EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = check_user_id
        AND is_suspended = TRUE
        AND suspension_end_time > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get user strike count in last 7 days
CREATE OR REPLACE FUNCTION get_user_strike_count(check_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE((
        SELECT no_show_strikes_count
        FROM profiles
        WHERE user_id = check_user_id
    ), 0);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE no_show_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- RLS policies for no_show_strikes
CREATE POLICY "Users can view their own no-show strikes" ON no_show_strikes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Providers can view strikes for their bookings" ON no_show_strikes
    FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all no-show strikes" ON no_show_strikes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND user_type = 'admin'
        )
    );

CREATE POLICY "Providers can insert no-show strikes for their bookings" ON no_show_strikes
    FOR INSERT WITH CHECK (auth.uid() = provider_id);

-- RLS policies for user_suspensions
CREATE POLICY "Users can view their own suspensions" ON user_suspensions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suspensions" ON user_suspensions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND user_type = 'admin'
        )
    );

CREATE POLICY "Admins can manage suspensions" ON user_suspensions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND user_type = 'admin'
        )
    );