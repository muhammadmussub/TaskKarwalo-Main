import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vqqqdsmyytuvxrtwvifn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcXFkc215eXR1dnhydHd2aWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjY2NzMsImV4cCI6MjA3NDAwMjY3M30.NRkeXmPrEnOvv4LClYuxCJMXZ2fJ6nqAmiHg_6Pjy-o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthenticatedUpload() {
  console.log('🧪 Testing authenticated upload functionality...');

  try {
    // First, let's try to sign in with a test user or create one
    console.log('\n🔐 Testing authentication...');

    // Try to sign up a test user
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.log('❌ Sign up failed:', signUpError.message);
    } else {
      console.log('✅ Sign up successful:', signUpData.user?.email);

      // Now try to upload with authenticated user
      console.log('\n📤 Testing upload with authenticated user...');

      const testFile = new File(['test content'], 'test-authenticated.jpg', { type: 'image/jpeg' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shop-photos')
        .upload('authenticated-test/test.jpg', testFile);

      if (uploadError) {
        console.log('❌ Authenticated upload failed:', uploadError.message);
      } else {
        console.log('✅ Authenticated upload successful:', uploadData.path);

        // Clean up test file
        await supabase.storage.from('shop-photos').remove(['authenticated-test/test.jpg']);
        console.log('🧹 Test file cleaned up');
      }
    }

    console.log('\n🎯 Authenticated upload test complete!');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAuthenticatedUpload();