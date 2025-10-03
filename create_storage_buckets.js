import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vqqqdsmyytuvxrtwvifn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcXFkc215eXR1dnhydHd2aWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjY2NzMsImV4cCI6MjA3NDAwMjY3M30.NRkeXmPrEnOvv4LClYuxCJMXZ2fJ6nqAmiHg_6Pjy-o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createStorageBuckets() {
  console.log('Creating storage buckets...');

  try {
    // Create commission screenshots bucket specifically
    console.log('Creating commission-screenshots bucket...');

    const { data, error } = await supabase.storage.createBucket('commission-screenshots', {
      public: false,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (error) {
      console.error('Error creating commission-screenshots bucket:', error.message);
      console.log('\n⚠️  Manual Setup Required:');
      console.log('Please create the "commission-screenshots" bucket manually in your Supabase dashboard:');
      console.log('1. Go to Storage in your Supabase dashboard');
      console.log('2. Click "New bucket"');
      console.log('3. Name: commission-screenshots');
      console.log('4. Public: No (private bucket)');
      console.log('5. File size limit: 5MB');
      console.log('6. Allowed MIME types: image/jpeg, image/png, image/webp');
    } else {
      console.log('✓ Created bucket: commission-screenshots');
    }

    // List buckets to verify
    console.log('\nVerifying buckets...');
    const { data: bucketsList, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError.message);
    } else {
      console.log('Available buckets:', bucketsList.map(b => b.name));
      console.log('\n✅ If you see "commission-screenshots" in the list above, the bucket was created successfully!');
    }

  } catch (error) {
    console.error('Error creating storage buckets:', error);
  }
}

createStorageBuckets();