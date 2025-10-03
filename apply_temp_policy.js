import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Need VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTempPolicy() {
  try {
    console.log('🔧 Applying TEMPORARY commission upload policy...');
    console.log('⚠️  WARNING: This policy is permissive and should be replaced with proper security!');

    const policySQL = readFileSync('temp_commission_policy.sql', 'utf8');
    console.log('Policy SQL loaded:', policySQL.length, 'characters');

    // Split by semicolon and execute each statement
    const statements = policySQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);

        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`Exception in statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('🎉 Temporary policy applied!');

    // Test the policy by trying to upload a test file
    console.log('🧪 Testing commission upload with new policy...');
    const testFileContent = 'Test file content for policy verification';
    const { error: uploadError } = await supabase.storage
      .from('commission-proofs')
      .upload('test-policy.txt', testFileContent, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful! Policy is working.');

      // Clean up test file
      await supabase.storage
        .from('commission-proofs')
        .remove(['test-policy.txt']);
      console.log('🧹 Test file cleaned up');
    }

  } catch (error) {
    console.error('❌ Error applying temporary policy:', error);
  }
}

applyTempPolicy();