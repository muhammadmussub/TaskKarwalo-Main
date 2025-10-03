-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_type TEXT NOT NULL,
  name TEXT,
  value TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default contact info
INSERT INTO app_settings (setting_type, email, phone, address, website)
VALUES ('contact_info', 'contact@tasktap.com', '+92 300 1234567', 'Islamabad, Pakistan', 'www.tasktap.com')
ON CONFLICT DO NOTHING;

-- Set RLS policies
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all users to read app_settings
CREATE POLICY "Allow all users to read app_settings" 
ON app_settings
FOR SELECT 
TO authenticated, anon 
USING (true);

-- Allow only admins to update app_settings
CREATE POLICY "Allow only admins to update app_settings"
ON app_settings
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT auth.uid() FROM auth.users 
    WHERE raw_user_meta_data->>'user_type' = 'admin'
  )
);

-- Allow only admins to insert app_settings
CREATE POLICY "Allow only admins to insert app_settings"
ON app_settings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT auth.uid() FROM auth.users 
    WHERE raw_user_meta_data->>'user_type' = 'admin'
  )
);