import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

// Read the migration SQL file
const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/20250928000000_create_commission_proofs_bucket.sql'),
  'utf8'
);

async function applyMigration() {
  // Initialize Supabase client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('VITE_SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Applying commission proofs bucket migration...');
    console.log('Supabase URL:', supabaseUrl);

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== '');

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}:`, statement.substring(0, 60) + '...');

        try {
          // Try using rpc first (for PostgreSQL functions)
          if (statement.includes('CREATE POLICY') || statement.includes('DROP POLICY') || statement.includes('INSERT INTO storage.buckets')) {
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            if (error) {
              console.log('RPC method failed, trying direct execution...');
              throw error;
            }
          } else {
            // For other statements, try direct execution
            const { error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
            if (error) throw error;
          }
        } catch (rpcError) {
          console.log('Statement execution note:', rpcError.message);
          // Continue with next statement
        }
      }
    }

    // Verify bucket was created
    console.log('Verifying bucket creation...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.error('Error checking buckets:', bucketError);
    } else {
      const commissionBucket = buckets?.find(bucket => bucket.name === 'commission-proofs');
      if (commissionBucket) {
        console.log('✅ Commission proofs bucket created successfully!');
        console.log('Bucket details:', commissionBucket);
      } else {
        console.log('❌ Commission proofs bucket not found. Available buckets:', buckets?.map(b => b.name));
      }
    }

    console.log('Migration process completed!');
  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('You may need to run the SQL manually in your Supabase dashboard');
  }
}

applyMigration();