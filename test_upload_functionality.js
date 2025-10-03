import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vqqqdsmyytuvxrtwvifn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcXFkc215eXR1dnhydHd2aWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjY2NzMsImV4cCI6MjA3NDAwMjY3M30.NRkeXmPrEnOvv4LClYuxCJMXZ2fJ6nqAmiHg_6Pjy-o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUploadFunctionality() {
  console.log('🧪 Testing upload functionality...');

  try {
    // Test 1: Try to upload a small test file to shop-photos (public bucket)
    console.log('\n📤 Test 1: Uploading to shop-photos bucket...');
    const testFile = new File(['test content'], 'test-shop.jpg', { type: 'image/jpeg' });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('shop-photos')
      .upload('test/test-shop.jpg', testFile);

    if (uploadError) {
      console.log('❌ Upload to shop-photos failed:', uploadError.message);
    } else {
      console.log('✅ Upload to shop-photos successful:', uploadData.path);

      // Clean up test file
      await supabase.storage.from('shop-photos').remove(['test/test-shop.jpg']);
      console.log('🧹 Test file cleaned up');
    }

    // Test 2: Try to upload to verification-docs (private bucket)
    console.log('\n📤 Test 2: Uploading to verification-docs bucket...');
    const testFile2 = new File(['test content'], 'test-doc.jpg', { type: 'image/jpeg' });

    const { data: uploadData2, error: uploadError2 } = await supabase.storage
      .from('verification-docs')
      .upload('test/test-doc.jpg', testFile2);

    if (uploadError2) {
      console.log('❌ Upload to verification-docs failed:', uploadError2.message);
    } else {
      console.log('✅ Upload to verification-docs successful:', uploadData2.path);

      // Clean up test file
      await supabase.storage.from('verification-docs').remove(['test/test-doc.jpg']);
      console.log('🧹 Test file cleaned up');
    }

    // Test 3: Check if we can list files (this might fail for private buckets)
    console.log('\n📋 Test 3: Listing files in shop-photos...');
    const { data: listData, error: listError } = await supabase.storage
      .from('shop-photos')
      .list();

    if (listError) {
      console.log('❌ List shop-photos failed:', listError.message);
    } else {
      console.log('✅ List shop-photos successful:', listData?.length || 0, 'files');
    }

    console.log('\n🎯 Upload functionality test complete!');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testUploadFunctionality();