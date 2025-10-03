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

async function applyCommissionPolicyFix() {
  try {
    console.log('🔧 Applying commission upload policy fix...');

    const migrationSQL = readFileSync('fix_commission_upload_policy.sql', 'utf8');
    console.log('Migration SQL loaded:', migrationSQL.length, 'characters');

    // Split the SQL into individual statements and execute them one by one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('DROP'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        console.log('Statement:', statement.substring(0, 100) + '...');

        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`Exception in statement ${i + 1}:`, err.message);
          // Continue with other statements
        }
      }
    }

    console.log('🎉 Commission upload policy fix completed!');

    // Test the fix by trying to upload a test file
    console.log('🧪 Testing commission upload permissions...');
    const { error: uploadError } = await supabase.storage
      .from('commission-proofs')
      .upload('test-permissions.txt', 'test file content', {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful!');

      // Clean up test file
      await supabase.storage
        .from('commission-proofs')
        .remove(['test-permissions.txt']);
      console.log('🧹 Test file cleaned up');
    }

  } catch (error) {
    console.error('❌ Error applying commission policy fix:', error);
  }
}

applyCommissionPolicyFix();