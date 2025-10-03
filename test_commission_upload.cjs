// Simple test to check if commission payment upload works
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommissionUpload() {
  console.log('🧪 Testing Commission Payment Upload Functionality...\n');

  try {
    // Test file upload directly
    console.log('Testing file upload to commission-proofs bucket...');

    // Create a simple test image file (1x1 pixel PNG)
    const pngData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const response = await fetch(pngData);
    const blob = await response.blob();
    const testFile = new File([blob], 'test.png', { type: 'image/png' });

    const fileName = `test_${Date.now()}.txt`;
    const filePath = `test/${fileName}`;

    console.log(`Attempting to upload: ${filePath}`);

    const { data, error } = await supabase.storage
      .from('commission-proofs')
      .upload(filePath, testFile);

    if (error) {
      console.error('❌ Upload failed:', error.message);

      if (error.message.includes('Bucket not found')) {
        console.log('\n💡 The commission-proofs bucket does not exist.');
        console.log('Please run the migration script to create it:');
        console.log('node apply_commission_bucket_migration.js');
      } else if (error.message.includes('permission denied')) {
        console.log('\n💡 Permission denied. The bucket exists but you cannot access it.');
        console.log('This might be because:');
        console.log('- The bucket was created with service role key');
        console.log('- The RLS policies are not set up correctly');
        console.log('- You need to authenticate as a provider to upload');
      }
    } else {
      console.log('✅ Upload successful!');
      console.log('File uploaded:', data);

      // Clean up test file
      await supabase.storage.from('commission-proofs').remove([filePath]);
      console.log('🗑️  Test file cleaned up');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testCommissionUpload();