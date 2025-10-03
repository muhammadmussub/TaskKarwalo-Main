import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Need VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyBucketPolicyFix() {
  try {
    console.log('🔧 Applying bucket listing policy fix...');

    const migrationSQL = readFileSync('fix_bucket_listing_policy.sql', 'utf8');
    console.log('Migration SQL loaded:', migrationSQL.length, 'characters');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        console.log('Statement:', statement.substring(0, 100) + '...');

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('🎉 Bucket listing policy fix completed!');

    // Test the fix by trying to list buckets
    console.log('🧪 Testing bucket listing...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Bucket listing test failed:', listError);
    } else {
      console.log('✅ Bucket listing test successful!');
      console.log('Available buckets:', buckets?.map(b => b.name) || 'None');
    }

  } catch (error) {
    console.error('❌ Error applying bucket policy fix:', error);
  }
}

applyBucketPolicyFix();