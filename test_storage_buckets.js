import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vqqqdsmyytuvxrtwvifn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcXFkc215eXR1dnhydHd2aWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjY2NzMsImV4cCI6MjA3NDAwMjY3M30.NRkeXmPrEnOvv4LClYuxCJMXZ2fJ6nqAmiHg_6Pjy-o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorageBuckets() {
  console.log('Testing storage buckets...');

  try {
    // List buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError.message);
      return;
    }

    console.log('Available buckets:', buckets?.map(b => b.name) || []);

    // Test each required bucket
    const requiredBuckets = ['verification-docs', 'shop-photos', 'provider-documents', 'profile-photos'];

    for (const bucketName of requiredBuckets) {
      const bucket = buckets?.find(b => b.name === bucketName);

      if (!bucket) {
        console.log(`❌ Bucket '${bucketName}' not found`);
        continue;
      }

      console.log(`✓ Bucket '${bucketName}' exists (${bucket.public ? 'public' : 'private'})`);

      // Test upload permissions (this will fail for private buckets without auth)
      try {
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload('test/test.txt', testFile);

        if (uploadError) {
          console.log(`  Upload test: ${uploadError.message}`);
        } else {
          console.log(`  ✓ Upload test passed`);
          // Clean up test file
          await supabase.storage.from(bucketName).remove(['test/test.txt']);
        }
      } catch (error) {
        console.log(`  Upload test: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Error testing storage buckets:', error);
  }
}

testStorageBuckets();