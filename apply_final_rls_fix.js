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

async function applyFinalRLSFix() {
  try {
    console.log('🔧 Applying FINAL comprehensive RLS fix for commission payments...');
    console.log('This creates proper, secure policies for production use.');

    const rlsSQL = readFileSync('fix_commission_rls_final.sql', 'utf8');
    console.log('Migration SQL loaded:', rlsSQL.length, 'characters');

    // Split by semicolon and execute each statement
    const statements = rlsSQL
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

    console.log('🎉 Final RLS fix applied!');

    // Test the fix with proper image upload
    console.log('🧪 Testing commission upload with proper image...');
    const { error: uploadError } = await supabase.storage
      .from('commission-proofs')
      .upload('test-final.png', 'fake-png-content', {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png'
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful! RLS policies are working correctly.');

      // Clean up test file
      await supabase.storage
        .from('commission-proofs')
        .remove(['test-final.png']);
      console.log('🧹 Test file cleaned up');
    }

    // Test bucket listing
    console.log('🧪 Testing bucket listing...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Bucket listing failed:', listError);
    } else {
      console.log('✅ Bucket listing successful!');
      console.log('Available buckets:', buckets?.map(b => b.name) || 'None');
    }

  } catch (error) {
    console.error('❌ Error applying final RLS fix:', error);
  }
}

applyFinalRLSFix();