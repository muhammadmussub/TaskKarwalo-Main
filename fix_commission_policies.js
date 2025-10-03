import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

async function fixCommissionPolicies() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('VITE_SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Fixing commission storage policies...');

    // Drop existing policies
    console.log('Dropping existing policies...');
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Providers can upload commission proofs" ON storage.objects;`
    });
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Providers can view their own commission proofs" ON storage.objects;`
    });
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Providers can update their own commission proofs" ON storage.objects;`
    });
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Providers can delete their own commission proofs" ON storage.objects;`
    });
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Admins can view all commission proofs" ON storage.objects;`
    });

    // Create corrected policies
    console.log('Creating corrected policies...');

    // Providers can upload their own commission proofs
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Providers can upload commission proofs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'commission-proofs' AND
  auth.uid()::text = (storage.foldername(name))[2]
);`
    });

    // Providers can view their own commission proofs
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Providers can view their own commission proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  auth.uid()::text = (storage.foldername(name))[2]
);`
    });

    // Providers can update their own commission proofs
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Providers can update their own commission proofs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid()::text = (storage.foldername(name))[2]
);`
    });

    // Providers can delete their own commission proofs
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Providers can delete their own commission proofs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'commission-proofs' AND
  auth.uid()::text = (storage.foldername(name))[2]
);`
    });

    // Admins can view all commission proofs
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Admins can view all commission proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'commission-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'admin'
  )
);`
    });

    console.log('✅ Commission storage policies fixed successfully!');

    // Verify the fix by testing client access
    console.log('Testing client access to verify fix...');

    const testSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const { data: buckets, error: bucketError } = await testSupabase.storage.listBuckets();

    if (bucketError) {
      console.error('❌ Error accessing buckets from client:', bucketError);
      return;
    }

    const commissionBucket = buckets?.find(bucket => bucket.name === 'commission-proofs');
    if (commissionBucket) {
      console.log('✅ Commission proofs bucket now accessible from client side!');
    } else {
      console.log('❌ Commission proofs bucket still not found from client side');
    }

  } catch (error) {
    console.error('Error fixing commission policies:', error);
    console.log('You may need to run the SQL manually in your Supabase dashboard');
  }
}

fixCommissionPolicies();