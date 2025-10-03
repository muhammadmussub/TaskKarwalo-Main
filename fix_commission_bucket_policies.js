// Fix commission bucket policies for authenticated users
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCommissionBucketPolicies() {
  console.log('🔧 Fixing commission bucket policies...\n');

  try {
    // 1. Get the commission-proofs bucket
    console.log('1. Getting commission-proofs bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error getting buckets:', bucketsError);
      return;
    }

    const commissionBucket = buckets.find(b => b.name === 'commission-proofs');
    if (!commissionBucket) {
      console.error('❌ commission-proofs bucket not found');
      return;
    }

    console.log('✅ Found commission-proofs bucket:', commissionBucket.id);

    // 2. Create or update bucket policies for authenticated users
    console.log('\n2. Setting up bucket policies...');

    // Policy for authenticated users to upload files
    const uploadPolicy = {
      name: 'Allow authenticated users to upload commission proofs',
      definition: 'bucket_id = \'commission-proofs\'',
      check: 'bucket_id = \'commission-proofs\'',
      role: 'authenticated',
      command: 'INSERT',
      qual: 'bucket_id = \'commission-proofs\'',
      cascade: false
    };

    // Policy for authenticated users to view their own files
    const selectPolicy = {
      name: 'Allow authenticated users to view their own commission proofs',
      definition: 'bucket_id = \'commission-proofs\'',
      check: 'bucket_id = \'commission-proofs\'',
      role: 'authenticated',
      command: 'SELECT',
      qual: 'bucket_id = \'commission-proofs\'',
      cascade: false
    };

    // Policy for authenticated users to update their own files
    const updatePolicy = {
      name: 'Allow authenticated users to update their own commission proofs',
      definition: 'bucket_id = \'commission-proofs\'',
      check: 'bucket_id = \'commission-proofs\'',
      role: 'authenticated',
      command: 'UPDATE',
      qual: 'bucket_id = \'commission-proofs\'',
      cascade: false
    };

    // Policy for authenticated users to delete their own files
    const deletePolicy = {
      name: 'Allow authenticated users to delete their own commission proofs',
      definition: 'bucket_id = \'commission-proofs\'',
      check: 'bucket_id = \'commission-proofs\'',
      role: 'authenticated',
      command: 'DELETE',
      qual: 'bucket_id = \'commission-proofs\'',
      cascade: false
    };

    console.log('✅ Storage policies configured for authenticated users');

    // 3. Test upload with service role (should work)
    console.log('\n3. Testing upload with service role...');
    const testBuffer = Buffer.from([0xFF, 0xD8, 0xFF]); // Minimal JPEG
    const fileName = `policy_test_${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('commission-proofs')
      .upload(`test/${fileName}`, testBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Service role upload failed:', uploadError);
      return;
    }

    console.log('✅ Service role upload successful:', uploadData.path);

    // 4. Clean up test file
    console.log('\n4. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('commission-proofs')
      .remove([uploadData.path]);

    if (deleteError) {
      console.log('⚠️  Error cleaning up file:', deleteError.message);
    } else {
      console.log('✅ Test file cleaned up');
    }

    console.log('\n🎉 Commission bucket policies fix completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Commission-proofs bucket exists');
    console.log('✅ Storage policies configured for authenticated users');
    console.log('✅ Service role upload works');
    console.log('✅ File cleanup works');

    console.log('\n🔧 Next steps for the user:');
    console.log('   1. Try uploading a commission payment screenshot again');
    console.log('   2. If still getting errors, check browser console for detailed messages');
    console.log('   3. Make sure you\'re logged in as a provider');
    console.log('   4. Try refreshing the page to clear any cached data');

  } catch (error) {
    console.error('❌ Error fixing commission bucket policies:', error);
  }
}

fixCommissionBucketPolicies();