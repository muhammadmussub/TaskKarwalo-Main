import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    let value = values.join('=').trim();
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Applying content management migration...');

    // Read the SQL migration file
    const sqlContent = readFileSync('apply_content_management_migration.sql', 'utf8');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.log('Statement:', statement.substring(0, 100) + '...');
          // Continue with other statements
        }
      }
    }

    // Test if the tables were created successfully
    console.log('Testing if tables were created...');

    const tables = ['content_sections', 'contact_information', 'faqs', 'policies'];
    let allTablesCreated = true;

    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        console.error(`Table ${tableName} was not created successfully`);
        allTablesCreated = false;
      } else {
        console.log(`✅ Table ${tableName} exists and is accessible`);
      }
    }

    if (allTablesCreated) {
      console.log('🎉 Content management migration applied successfully!');
      console.log('All tables created and accessible!');
    } else {
      console.log('⚠️  Some tables may not have been created. Please check the Supabase dashboard.');
    }

  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('Please try running the SQL manually in your Supabase dashboard:');
    console.log('Go to: Project Settings > SQL Editor > New Query');
    console.log('Then paste the contents of apply_content_management_migration.sql');
  }
}

applyMigration();