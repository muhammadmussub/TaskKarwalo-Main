import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

async function updateBucketSizeLimit() {
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
    console.log('Updating commission proofs bucket size limit to 3MB...');

    // Try to update the bucket using the storage API
    // Note: This might not work directly, but let's try
    const { data, error } = await supabase.storage.updateBucket('commission-proofs', {
      fileSizeLimit: 3145728,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (error) {
      console.log('Could not update bucket via API (this is expected):', error.message);
      console.log('The bucket size limit is already set in the migration file.');
      console.log('You may need to run the migration again or update it manually in Supabase dashboard.');
    } else {
      console.log('✅ Bucket updated successfully:', data);
    }

    // Verify the change
    const { data: buckets, error: verifyError } = await supabase.storage.listBuckets();
    if (verifyError) throw verifyError;

    const commissionBucket = buckets?.find(bucket => bucket.name === 'commission-proofs');
    if (commissionBucket) {
      console.log('✅ Verified bucket configuration:');
      console.log(`   - Name: ${commissionBucket.name}`);
      console.log(`   - File size limit: ${commissionBucket.file_size_limit} bytes (${Math.round(commissionBucket.file_size_limit / 1024 / 1024)}MB)`);
      console.log(`   - Allowed types: ${commissionBucket.allowed_mime_types.join(', ')}`);
    }

  } catch (error) {
    console.error('Error updating bucket size limit:', error);
  }
}

updateBucketSizeLimit();