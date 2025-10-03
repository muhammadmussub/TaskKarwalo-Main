import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkCommissionTable() {
  console.log('🔍 Checking commission_payments table structure and policies...\n');

  try {
    // 1. Check table structure
    console.log('1. Checking table structure...');
    const { data: tableInfo, error: tableInfoError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'commission_payments')
      .eq('table_schema', 'public');

    if (tableInfoError) {
      console.error('❌ Error checking table info:', tableInfoError);
    } else {
      console.log('✅ Table info:', tableInfo);
    }

    // 2. Check table columns
    console.log('\n2. Checking table columns...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_name', 'commission_payments')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError);
    } else {
      console.log('✅ Table columns:');
      columns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }

    // 3. Try to insert a test record as service role
    console.log('\n3. Testing insert as service role...');
    const testRecord = {
      provider_id: 'test-provider-id',
      amount: 100,
      payment_method: 'test',
      screenshot_url: 'test-url',
      status: 'pending',
      submitted_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('commission_payments')
      .insert(testRecord)
      .select();

    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
    } else {
      console.log('✅ Insert test successful:', insertData);

      // Clean up test record
      await supabase
        .from('commission_payments')
        .delete()
        .eq('provider_id', 'test-provider-id');
      console.log('🧹 Test record cleaned up');
    }

    // 4. Check if there are any existing records
    console.log('\n4. Checking existing records...');
    const { data: existingRecords, error: recordsError } = await supabase
      .from('commission_payments')
      .select('*')
      .limit(5);

    if (recordsError) {
      console.error('❌ Error checking existing records:', recordsError);
    } else {
      console.log(`✅ Found ${existingRecords?.length || 0} existing records`);
      if (existingRecords && existingRecords.length > 0) {
        console.log('Sample record:', existingRecords[0]);
      }
    }

    console.log('\n✅ Commission table check completed');

  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

checkCommissionTable();