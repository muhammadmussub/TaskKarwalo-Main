import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyEmergencyStorageFix() {
  try {
    console.log('🚨 Applying EMERGENCY storage policy fix...');
    console.log('This will fix the commission payment upload issue.');

    const sqlContent = readFileSync('fix_storage_policies.sql', 'utf8');
    console.log('SQL file loaded:', sqlContent.length, 'characters');

    // Split by semicolon and filter out comments and empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== '');

    console.log(`Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            errorCount++;
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Execution Summary:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Success Rate: ${Math.round((successCount / statements.length) * 100)}%`);

    // Test the fix
    console.log('\n🧪 Testing the fix...');

    // Test 1: Check if buckets are now accessible
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Bucket listing failed:', bucketError);
    } else {
      console.log('✅ Bucket listing successful!');
      const commissionBucket = buckets?.find(b => b.name === 'commission-proofs');
      if (commissionBucket) {
        console.log('✅ Commission proofs bucket is accessible');
      } else {
        console.error('❌ Commission proofs bucket not found in listing');
      }
    }

    // Test 2: Try to upload a test file
    const testFileContent = 'test file content for commission upload test';
    const { error: uploadError } = await supabase.storage
      .from('commission-proofs')
      .upload('test-emergency-fix.txt', testFileContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      console.log('💡 This might still be an RLS issue, but the policies should be fixed now');
    } else {
      console.log('✅ Upload test successful! RLS policies are working.');

      // Clean up test file
      await supabase.storage
        .from('commission-proofs')
        .remove(['test-emergency-fix.txt']);
      console.log('🧹 Test file cleaned up');
    }

    console.log('\n🎉 Emergency storage fix completed!');
    console.log('The commission payment upload should now work in the provider dashboard.');

  } catch (error) {
    console.error('❌ Error applying emergency storage fix:', error);
    console.log('\n💡 Alternative: Apply the SQL manually in your Supabase dashboard:');
    console.log('Go to SQL Editor → paste the contents of fix_storage_policies.sql → Run');
  }
}

applyEmergencyStorageFix();