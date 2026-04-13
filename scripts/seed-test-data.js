/**
 * Seed script: Clears all transactional data and creates fresh test users.
 * 
 * Usage: node scripts/seed-test-data.js
 * 
 * Creates:
 *   - 1 Admin (admin@leaftrack.com / password123)
 *   - 1 PrimaryExecutive (pe@leaftrack.com / password123)
 *   - 1 SecondaryExecutive (se@leaftrack.com / password123) — manager = PE
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
// Load .env.temp.local first (cloud Supabase seeding), fall back to .env.local
require('dotenv').config({ path: '.env.temp.local' });
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'sohag' },
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('🌱 Starting seed...\n');

  // ── 1. Delete transactional data (order matters due to FK constraints) ──
  const tablesToClear = [
    'daily_sales',
    'distributor_inventory',
    'se_distributor_assignments',
    'retailers',
    'invoice_items',
    'invoices',
    'sale_return_items',
    'sale_returns',
    'order_items',
    'orders',
    'purchase_items',
    'purchase_returns',
    'purchases',
    'payments',
    'sales',
    'bom_materials',
    'boms',
    'assignments',
    'distributors',
  ];

  for (const table of tablesToClear) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`  ⚠ ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ Cleared ${table}`);
    }
  }

  // Clear users
  const { error: usersErr } = await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (usersErr) {
    console.warn(`  ⚠ users: ${usersErr.message}`);
  } else {
    console.log('  ✓ Cleared users');
  }

  console.log('');

  // ── 2. Create users ──
  const password = await bcrypt.hash('password123', 12);

  // Admin
  const { data: admin, error: adminErr } = await supabase
    .from('users')
    .insert({
      name: 'Test Admin',
      email: 'admin@leaftrack.com',
      password,
      role: 'Admin',
      approval_status: 'approved',
      phone: '9000000001',
    })
    .select('id')
    .single();

  if (adminErr) {
    console.error('❌ Failed to create Admin:', adminErr.message);
    process.exit(1);
  }
  console.log(`✅ Admin created  — admin@leaftrack.com / password123  (id: ${admin.id})`);

  // Primary Executive
  const { data: pe, error: peErr } = await supabase
    .from('users')
    .insert({
      name: 'Test PE',
      email: 'pe@leaftrack.com',
      password,
      role: 'PrimaryExecutive',
      approval_status: 'approved',
      phone: '9000000002',
    })
    .select('id')
    .single();

  if (peErr) {
    console.error('❌ Failed to create PE:', peErr.message);
    process.exit(1);
  }
  console.log(`✅ PE created     — pe@leaftrack.com / password123  (id: ${pe.id})`);

  // Secondary Executive (manager = PE)
  const { data: se, error: seErr } = await supabase
    .from('users')
    .insert({
      name: 'Test SE',
      email: 'se@leaftrack.com',
      password,
      role: 'SecondaryExecutive',
      approval_status: 'approved',
      phone: '9000000003',
      manager_id: pe.id,
    })
    .select('id')
    .single();

  if (seErr) {
    console.error('❌ Failed to create SE:', seErr.message);
    process.exit(1);
  }
  console.log(`✅ SE created     — se@leaftrack.com / password123  (id: ${se.id})`);

  console.log('\n🎉 Seed complete! All transactional data cleared, 3 test users created.');
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
