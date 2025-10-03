// Script to apply Pro Badge migration manually
// Run this in your browser's developer console when connected to Supabase

const applyProBadgeMigration = async () => {
  try {
    console.log('Applying Pro Badge migration...');

    // Create the table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS pro_badge_requests (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          provider_id UUID NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
          request_message TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          reviewed_at TIMESTAMP WITH TIME ZONE,
          reviewed_by UUID REFERENCES auth.users(id),
          admin_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_provider_id ON pro_badge_requests(provider_id);
        CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_status ON pro_badge_requests(status);
        CREATE INDEX IF NOT EXISTS idx_pro_badge_requests_requested_at ON pro_badge_requests(requested_at DESC);

        ALTER TABLE pro_badge_requests ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Providers can view their own requests" ON pro_badge_requests;
        CREATE POLICY "Providers can view their own requests"
          ON pro_badge_requests FOR SELECT
          USING (provider_id = auth.uid());

        DROP POLICY IF EXISTS "Providers can create their own requests" ON pro_badge_requests;
        CREATE POLICY "Providers can create their own requests"
          ON pro_badge_requests FOR INSERT
          WITH CHECK (provider_id = auth.uid());

        DROP POLICY IF EXISTS "Admins can view all requests" ON pro_badge_requests;
        CREATE POLICY "Admins can view all requests"
          ON pro_badge_requests FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.user_id = auth.uid()
              AND profiles.user_type = 'admin'
            )
          );

        DROP POLICY IF EXISTS "Admins can update requests" ON pro_badge_requests;
        CREATE POLICY "Admins can update requests"
          ON pro_badge_requests FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.user_id = auth.uid()
              AND profiles.user_type = 'admin'
            )
          );

        CREATE OR REPLACE FUNCTION update_pro_badge_requests_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_pro_badge_requests_updated_at ON pro_badge_requests;
        CREATE TRIGGER update_pro_badge_requests_updated_at
          BEFORE UPDATE ON pro_badge_requests
          FOR EACH ROW
          EXECUTE FUNCTION update_pro_badge_requests_updated_at();
      `
    });

    if (createTableError) {
      console.error('Error creating table:', createTableError);
      return;
    }

    console.log('✅ Pro Badge migration applied successfully!');
    console.log('The Pro Badge system should now work properly.');

    // Test the table exists
    const { data, error } = await supabase
      .from('pro_badge_requests')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Table test failed:', error);
    } else {
      console.log('✅ Table exists and is accessible');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Run the migration
applyProBadgeMigration();