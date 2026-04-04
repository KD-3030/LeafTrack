// Cleanup script: remove all users except kinjaldutta005@gmail.com,
// delete all transactional data, and reset product stock to 0.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'sohag' } });

const KEEP_EMAIL = 'kinjaldutta005@gmail.com';

async function deleteAll(table) {
  // Supabase JS doesn't allow .delete() without a filter,
  // so we select all ids then delete by id list.
  const { data, error: selErr } = await supabase.from(table).select('id');
  if (selErr) {
    console.log(`  ⚠ ${table}: select error — ${selErr.message}`);
    return 0;
  }
  if (!data || data.length === 0) {
    console.log(`  ✓ ${table}: already empty`);
    return 0;
  }
  const ids = data.map(r => r.id);
  // Delete in chunks of 500
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { error } = await supabase.from(table).delete().in('id', chunk);
    if (error) {
      console.log(`  ⚠ ${table}: delete error — ${error.message}`);
    } else {
      deleted += chunk.length;
    }
  }
  console.log(`  ✓ ${table}: deleted ${deleted} rows`);
  return deleted;
}

async function main() {
  console.log('=== LeafTrack Database Cleanup ===\n');

  // Step 1: Get the user to keep
  const { data: keeper, error: keepErr } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('email', KEEP_EMAIL)
    .single();

  if (keepErr || !keeper) {
    console.error(`ERROR: Could not find user ${KEEP_EMAIL}`, keepErr?.message);
    process.exit(1);
  }
  console.log(`Keeping user: ${keeper.name} (${keeper.email}) [${keeper.role}]\n`);

  // Step 2: Delete transactional/child tables first (order matters for FK constraints)
  console.log('--- Deleting transactional data ---');
  const transactionalTables = [
    // Child/leaf tables first
    'invoice_items',
    'order_items',
    'sale_return_items',
    'purchase_items',
    'bom_materials',
    // Parent transaction tables
    'payments',
    'invoices',
    'sales',
    'orders',
    'sale_returns',
    'purchase_returns',
    'purchases',
    'daily_sales',
    'locations',
    'assignments',
    'se_distributor_assignments',
    'distributor_inventory',
    'invitations',
    'boms',
    'retailers',
    // NOTE: distributors are kept
  ];

  for (const table of transactionalTables) {
    await deleteAll(table);
  }

  // Step 3: Null out FK refs on distributors so users can be deleted
  console.log('\n--- Clearing distributor FK references ---');
  const { data: allDists } = await supabase.from('distributors').select('id');
  if (allDists && allDists.length > 0) {
    const { error: fkErr } = await supabase
      .from('distributors')
      .update({ created_by: keeper.id, pe_id: null })
      .in('id', allDists.map(d => d.id));
    if (fkErr) console.log('  ⚠ distributors FK clear error:', fkErr.message);
    else console.log(`  ✓ distributors: reassigned created_by to keeper, cleared pe_id (${allDists.length} rows)`);
  }

  // Step 4: Delete all users except the keeper
  console.log('\n--- Deleting users ---');
  const { data: otherUsers, error: usersErr } = await supabase
    .from('users')
    .select('id, name, email')
    .neq('email', KEEP_EMAIL);

  if (usersErr) {
    console.error('Error fetching users:', usersErr.message);
  } else if (otherUsers && otherUsers.length > 0) {
    const ids = otherUsers.map(u => u.id);
    console.log(`  Deleting ${ids.length} users:`);
    otherUsers.forEach(u => console.log(`    - ${u.name} (${u.email})`));
    const { error } = await supabase.from('users').delete().in('id', ids);
    if (error) {
      console.error('  ⚠ Error deleting users:', error.message);
    } else {
      console.log(`  ✓ users: deleted ${ids.length} rows`);
    }
  } else {
    console.log('  ✓ users: no other users to delete');
  }

  // Step 5: Reset all product stock to 0
  console.log('\n--- Resetting product stock ---');
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, total_stock');

  if (prodErr) {
    console.error('Error fetching products:', prodErr.message);
  } else if (products && products.length > 0) {
    console.log(`  Resetting stock for ${products.length} products:`);
    products.forEach(p => console.log(`    - ${p.name}: ${p.total_stock} → 0`));
    const { error } = await supabase
      .from('products')
      .update({ total_stock: 0 })
      .in('id', products.map(p => p.id));
    if (error) {
      console.error('  ⚠ Error resetting stock:', error.message);
    } else {
      console.log(`  ✓ products: stock reset to 0 for ${products.length} products`);
    }
  } else {
    console.log('  ✓ products: no products found');
  }

  // Step 5: Verify
  console.log('\n--- Verification ---');
  const { data: remainingUsers } = await supabase.from('users').select('id, name, email, role');
  console.log(`  Users remaining: ${remainingUsers?.length || 0}`);
  remainingUsers?.forEach(u => console.log(`    - ${u.name} (${u.email}) [${u.role}]`));

  const { data: remainingProducts } = await supabase.from('products').select('id, name, total_stock');
  console.log(`  Products: ${remainingProducts?.length || 0} (all stock should be 0)`);
  remainingProducts?.forEach(p => console.log(`    - ${p.name}: total_stock=${p.total_stock}`));

  const { data: remainingDists } = await supabase.from('distributors').select('id, name');
  console.log(`  Distributors (kept): ${remainingDists?.length || 0}`);
  remainingDists?.forEach(d => console.log(`    - ${d.name}`));

  for (const t of ['orders', 'sales', 'invoices', 'payments', 'assignments']) {
    const { data } = await supabase.from(t).select('id');
    console.log(`  ${t}: ${data?.length || 0} rows`);
  }

  console.log('\n=== Cleanup complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
