/**
 * migrate-local-to-cloud.js
 * 
 * Migrates ALL data from self-hosted Supabase (local Docker)
 * to cloud Supabase (supabase.com). UUID-preserving.
 * 
 * Usage: node scripts/migrate-local-to-cloud.js
 */

const { createClient } = require('@supabase/supabase-js');

// ── Clients ──────────────────────────────────────────────────────────────────

const local = createClient(
  'http://100.109.194.15:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q',
  { db: { schema: 'sohag' } }
);

const cloud = createClient(
  'https://aeuisbcypjkeorveqxss.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWlzYmN5cGprZW9ydmVxeHNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA5NDM3NywiZXhwIjoyMDkxNjcwMzc3fQ.Bq7WJqdYl2mNSauoK8BAfQ_9lgcwMBP2ueLEKtOZHc0',
  { db: { schema: 'sohag' } }
);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchAll(client, table) {
  const { data, error } = await client.from(table).select('*');
  if (error) throw new Error(`Fetch ${table}: ${error.message}`);
  return data || [];
}

async function wipe(table) {
  // Delete all rows. Use a filter that matches everything.
  const { error } = await cloud.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    // Some tables might have different PK or be empty — try gte on created_at
    const { error: e2 } = await cloud.from(table).delete().gte('created_at', '1970-01-01');
    if (e2) console.warn(`  ⚠ Could not wipe ${table}: ${e2.message}`);
    else console.log(`  ✓ Wiped ${table} (via created_at)`);
  } else {
    console.log(`  ✓ Wiped ${table}`);
  }
}

async function insertBatch(table, rows) {
  if (!rows.length) return 0;
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await cloud.from(table).insert(batch);
    if (error) throw new Error(`Insert ${table} batch ${i}: ${error.message}`);
    inserted += batch.length;
  }
  return inserted;
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// Columns that exist locally but not on cloud — strip before insert
const STRIP_COLUMNS = {
  company_settings: ['qr_code_url'],
  orders: ['location_lat', 'location_lng'],
};

// Stripped data we'll patch later (after user adds columns)
const strippedData = {};

function stripUnknownColumns(table, rows) {
  const cols = STRIP_COLUMNS[table];
  if (!cols || !rows.length) return rows;
  strippedData[table] = rows.map(r => {
    const stripped = {};
    for (const c of cols) {
      if (r[c] !== undefined && r[c] !== null) stripped[c] = r[c];
    }
    return { id: r.id, ...stripped };
  }).filter(r => Object.keys(r).length > 1); // only keep if has data beyond id
  return rows.map(r => {
    const copy = { ...r };
    for (const c of cols) delete copy[c];
    return copy;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('=== Local Supabase → Cloud Supabase Migration ===\n');

  // ── Phase 1: Wipe cloud in reverse-dependency order ────────────────────────
  log('Phase 1: Wiping cloud tables (leaf → root)...');

  const wipeOrder = [
    // Tier 6 (deepest leaves)
    'daily_sales', 'sale_return_items',
    // Tier 5
    'invoice_items', 'sale_returns', 'payments', 'purchase_returns',
    // Tier 4
    'invoices', 'purchase_items', 'distributor_inventory',
    // Tier 3
    'order_items', 'purchases', 'sales', 'bom_materials',
    // Tier 2 (orders depends on distributors)
    'orders', 'retailers', 'se_distributor_assignments',
    // Tier 1
    'distributors', 'boms', 'assignments',
    // Tier 0
    'users', 'products', 'sellers', 'raw_materials', 'company_settings',
  ];

  for (const table of wipeOrder) {
    await wipe(table);
  }

  log('Cloud wiped.\n');

  // ── Phase 2: Read all local data ───────────────────────────────────────────
  log('Phase 2: Reading local data...');

  const localData = {};
  const tables = [
    'users', 'products', 'sellers', 'raw_materials', 'company_settings',
    'distributors', 'orders', 'order_items', 'invoices', 'invoice_items',
    // Also try tables that might have data
    'boms', 'bom_materials', 'assignments', 'sales', 'purchases',
    'purchase_items', 'retailers', 'se_distributor_assignments',
    'distributor_inventory', 'sale_returns', 'sale_return_items',
    'payments', 'purchase_returns', 'daily_sales',
  ];

  for (const t of tables) {
    localData[t] = await fetchAll(local, t);
    if (localData[t].length > 0) {
      log(`  ${t}: ${localData[t].length} rows`);
    }
  }

  log('Local data loaded.\n');

  // ── Phase 3: Insert in dependency order ────────────────────────────────────
  log('Phase 3: Inserting into cloud...');

  // --- Tier 0: Users (pass 1 — null out self-references) ---
  if (localData.users.length > 0) {
    const usersPass1 = localData.users.map(u => ({
      ...u,
      manager_id: null,
      invited_by: null,
      approved_by: null,
    }));
    const n = await insertBatch('users', usersPass1);
    log(`  users (pass 1): ${n} rows inserted`);

    // --- Users pass 2: restore self-references ---
    const selfRefs = localData.users.filter(u => u.manager_id || u.invited_by || u.approved_by);
    for (const u of selfRefs) {
      const updates = {};
      if (u.manager_id) updates.manager_id = u.manager_id;
      if (u.invited_by) updates.invited_by = u.invited_by;
      if (u.approved_by) updates.approved_by = u.approved_by;
      
      const { error } = await cloud.from('users').update(updates).eq('id', u.id);
      if (error) throw new Error(`Users pass 2 (${u.id}): ${error.message}`);
    }
    if (selfRefs.length > 0) {
      log(`  users (pass 2): ${selfRefs.length} self-refs restored`);
    }
  }

  // --- Tier 0: Other root tables ---
  for (const t of ['products', 'sellers', 'raw_materials', 'company_settings']) {
    if (localData[t].length > 0) {
      const rows = stripUnknownColumns(t, localData[t]);
      const n = await insertBatch(t, rows);
      log(`  ${t}: ${n} rows inserted`);
    }
  }

  // --- Tier 1: distributors, boms, assignments ---
  for (const t of ['distributors', 'boms', 'assignments']) {
    if (localData[t].length > 0) {
      const n = await insertBatch(t, localData[t]);
      log(`  ${t}: ${n} rows inserted`);
    }
  }

  // --- Tier 2: orders, retailers, se_distributor_assignments ---
  for (const t of ['orders', 'retailers', 'se_distributor_assignments']) {
    if (localData[t].length > 0) {
      const rows = stripUnknownColumns(t, localData[t]);
      const n = await insertBatch(t, rows);
      log(`  ${t}: ${n} rows inserted`);
    }
  }

  // --- Tier 3: order_items, purchases, sales, bom_materials ---
  for (const t of ['order_items', 'purchases', 'sales', 'bom_materials']) {
    if (localData[t].length > 0) {
      const n = await insertBatch(t, localData[t]);
      log(`  ${t}: ${n} rows inserted`);
    }
  }

  // --- Tier 4: invoices, purchase_items, distributor_inventory ---
  for (const t of ['invoices', 'purchase_items', 'distributor_inventory']) {
    if (localData[t].length > 0) {
      const n = await insertBatch(t, localData[t]);
      log(`  ${t}: ${n} rows inserted`);
    }
  }

  // --- Tier 5: invoice_items, sale_returns, payments, purchase_returns ---
  for (const t of ['invoice_items', 'sale_returns', 'payments', 'purchase_returns']) {
    if (localData[t].length > 0) {
      const n = await insertBatch(t, localData[t]);
      log(`  ${t}: ${n} rows inserted`);
    }
  }

  // --- Tier 6: sale_return_items, daily_sales ---
  for (const t of ['sale_return_items', 'daily_sales']) {
    if (localData[t].length > 0) {
      const n = await insertBatch(t, localData[t]);
      log(`  ${t}: ${n} rows inserted`);
    }
  }

  log('Insertion complete.\n');

  // ── Phase 4: Verify ────────────────────────────────────────────────────────
  log('Phase 4: Verifying row counts...');

  let allGood = true;
  for (const t of tables) {
    const localCount = localData[t].length;
    if (localCount === 0) continue;

    const { count, error } = await cloud.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      log(`  ✗ ${t}: count error — ${error.message}`);
      allGood = false;
    } else if (count !== localCount) {
      log(`  ✗ ${t}: local=${localCount} cloud=${count}`);
      allGood = false;
    } else {
      log(`  ✓ ${t}: ${count} rows match`);
    }
  }

  if (allGood) {
    log('\n✅ Migration complete — all row counts match!');
  } else {
    log('\n⚠ Migration complete but some counts differ — check above.');
  }

  // ── Phase 5: Report stripped columns ───────────────────────────────────────
  if (Object.keys(strippedData).length > 0) {
    log('\n⚠ Some columns were stripped (not in cloud schema).');
    log('Run this SQL in Supabase SQL Editor to add them:\n');
    console.log('-- Add missing columns');
    console.log('ALTER TABLE sohag.orders ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10,7);');
    console.log('ALTER TABLE sohag.orders ADD COLUMN IF NOT EXISTS location_lng NUMERIC(10,7);');
    console.log('ALTER TABLE sohag.company_settings ADD COLUMN IF NOT EXISTS qr_code_url TEXT;');
    console.log('');
    log('After adding columns, run: node scripts/migrate-local-to-cloud.js --patch');
    log('to restore the stripped data.');

    // Save stripped data for patching
    const fs = require('fs');
    fs.writeFileSync(
      'scripts/_stripped-data.json',
      JSON.stringify(strippedData, null, 2)
    );
    log('Stripped data saved to scripts/_stripped-data.json');
  }
}

// ── Patch mode: restore stripped columns after user adds them ─────────────
async function patch() {
  const fs = require('fs');
  if (!fs.existsSync('scripts/_stripped-data.json')) {
    console.log('No stripped data to patch.');
    return;
  }
  const data = JSON.parse(fs.readFileSync('scripts/_stripped-data.json', 'utf8'));
  log('Patching stripped data...');
  for (const [table, rows] of Object.entries(data)) {
    for (const row of rows) {
      const { id, ...updates } = row;
      if (Object.keys(updates).length === 0) continue;
      const { error } = await cloud.from(table).update(updates).eq('id', id);
      if (error) log(`  ✗ ${table} ${id}: ${error.message}`);
      else log(`  ✓ ${table} ${id}: patched`);
    }
  }
  log('Patch complete.');
}

if (process.argv.includes('--patch')) {
  patch().catch(err => {
    console.error('PATCH FAILED:', err.message);
    process.exit(1);
  });
} else {
  main().catch(err => {
    console.error('\n❌ MIGRATION FAILED:', err.message);
    process.exit(1);
  });
}
