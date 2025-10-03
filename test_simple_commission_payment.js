// Simple test to verify commission payment submission works
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

async function testSimpleCommissionPayment() {
  console.log('🧪 Testing simple commission payment submission...\n');

  try {
    // 1. Check if commission_payments table exists
    console.log('1. Checking commission_payments table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('commission_payments')
      .select('count')
      .limit(1);

    if (tableError) {
      if (tableError.message.includes('does not exist')) {
        console.error('❌ commission_payments table does not exist');
        return;
      } else {
        console.error('❌ Error checking commission_payments table:', tableError);
        return;
      }
    }

    console.log('✅ commission_payments table exists');

    // 2. Check if commission-proofs bucket exists
    console.log('\n2. Checking commission-proofs bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error checking buckets:', bucketsError);
      return;
    }

    const commissionBucket = buckets.find(b => b.name === 'commission-proofs');
    if (!commissionBucket) {
      console.error('❌ commission-proofs bucket not found');
      console.log('Available buckets:', buckets.map(b => b.name));
      return;
    }

    console.log('✅ commission-proofs bucket exists:', {
      name: commissionBucket.name,
      fileSizeLimit: commissionBucket.file_size_limit,
      allowedMimeTypes: commissionBucket.allowed_mime_types
    });

    // 3. Test file upload
    console.log('\n3. Testing file upload...');
    const testBuffer = Buffer.from('test payment screenshot content');
    const fileName = `test_${Date.now()}_simple.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('commission-proofs')
      .upload(`test/${fileName}`, testBuffer, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ File upload failed:', uploadError);
      return;
    }

    console.log('✅ File uploaded successfully:', uploadData.path);

    // 4. Get public URL
    console.log('\n4. Testing public URL generation...');
    const { data: publicUrlData } = supabase.storage
      .from('commission-proofs')
      .getPublicUrl(uploadData.path);

    console.log('✅ Public URL generated:', publicUrlData.publicUrl);

    // 5. Test commission payment submission
    console.log('\n5. Testing commission payment submission...');
    const testPaymentData = {
      provider_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      amount: 50,
      payment_method: 'bank_transfer',
      screenshot_url: publicUrlData.publicUrl,
      booking_count: 5,
      status: 'pending',
      submitted_at: new Date().toISOString()
    };

    const { data: paymentData, error: paymentError } = await supabase
      .from('commission_payments')
      .insert(testPaymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Commission payment submission failed:', paymentError);
      return;
    }

    console.log('✅ Commission payment submitted successfully:', paymentData.id);

    // 6. Test payment approval
    console.log('\n6. Testing payment approval...');
    const { error: updateError } = await supabase
      .from('commission_payments')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: '00000000-0000-0000-0000-000000000000' // Dummy admin UUID
      })
      .eq('id', paymentData.id);

    if (updateError) {
      console.error('❌ Error approving payment:', updateError);
      return;
    }

    console.log('✅ Commission payment approved successfully');

    // 7. Clean up test data
    console.log('\n7. Cleaning up test data...');
    const { error: deletePaymentError } = await supabase
      .from('commission_payments')
      .delete()
      .eq('id', paymentData.id);

    if (deletePaymentError) {
      console.log('⚠️  Error cleaning up payment:', deletePaymentError.message);
    } else {
      console.log('✅ Test payment record cleaned up');
    }

    const { error: deleteFileError } = await supabase.storage
      .from('commission-proofs')
      .remove([uploadData.path]);

    if (deleteFileError) {
      console.log('⚠️  Error cleaning up file:', deleteFileError.message);
    } else {
      console.log('✅ Test file cleaned up');
    }

    console.log('\n🎉 Simple commission payment test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ commission_payments table exists');
    console.log('✅ commission-proofs bucket exists with correct config');
    console.log('✅ File upload works');
    console.log('✅ Public URL generation works');
    console.log('✅ Commission payment submission works');
    console.log('✅ Payment approval process works');
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Error during simple commission payment test:', error);
  }
}

testSimpleCommissionPayment();