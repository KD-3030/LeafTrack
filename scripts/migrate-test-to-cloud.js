#!/usr/bin/env node
/**
 * MongoDB (test DB) → Cloud Supabase Migration
 * 
 * Migrates: products, raw_materials, customers, sellers, company_settings, boms + bom_materials
 * Does NOT migrate: users (already seeded), invoices, payments, orders, assignments, sales
 * 
 * Customer FK references to users are set to null (no user mapping).
 * 
 * Usage:
 *   node scripts/migrate-test-to-cloud.js
 * 
 * Requires:
 *   .env.local       → MONGODB_URI
 *   .env.temp.local  → NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (cloud)
 */

const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load MongoDB URI from .env.local
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

// Load Supabase creds from .env.temp.local (cloud)
const dotenv = require('dotenv');
const tempEnv = dotenv.parse(require('fs').readFileSync(path.resolve(__dirname, '..', '.env.temp.local')));
const SUPABASE_URL = tempEnv.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = tempEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!MONGODB_URI) { console.error('Missing MONGODB_URI in .env.local'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('Missing Supabase creds in .env.temp.local'); process.exit(1); }

console.log(`MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
console.log(`Supabase: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'sohag' },
});

// ID maps: mongo ObjectId string → Supabase UUID
const idMap = { products: {}, raw_materials: {}, distributors: {}, sellers: {}, boms: {} };

function mongoId(doc) { return doc._id?.toString?.() || doc._id; }
function refId(map, mongoRef) {
  if (!mongoRef) return null;
  return map[mongoRef?.toString?.() || mongoRef] || null;
}

async function insertBatch(table, rows, selectCols = 'id, mongo_id') {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from(table).insert(rows).select(selectCols);
  if (error) {
    console.error(`  ERROR inserting into ${table}:`, error.message);
    console.error('  First row:', JSON.stringify(rows[0]).slice(0, 500));
    throw error;
  }
  return data || [];
}

// ─── Migration Functions ─────────────────────────────────────────────────────

async function migrateProducts(db) {
  console.log('\n[1/6] Migrating Products...');
  const docs = await db.collection('products').find({}).toArray();
  const rows = docs.map(d => ({
    mongo_id: mongoId(d),
    name: d.name,
    manufacturing_cost: d.manufacturingCost || 0,
    total_stock: d.totalStock || 0,
    hsn_code: d.hsn_code || '',
    gst_rate: d.gst_rate ?? 18,
    created_at: d.createdAt || new Date(),
    updated_at: d.updatedAt || new Date(),
  }));

  const result = await insertBatch('products', rows);
  result.forEach(r => { idMap.products[r.mongo_id] = r.id; });
  console.log(`  → ${result.length} products migrated`);
}

async function migrateRawMaterials(db) {
  console.log('\n[2/6] Migrating Raw Materials...');
  const docs = await db.collection('rawmaterials').find({}).toArray();
  const rows = docs.map(d => ({
    mongo_id: mongoId(d),
    name: d.name,
    description: d.description || null,
    unit: d.unit || 'kg',
    base_cost_per_unit: d.base_cost_per_unit || 0,
    current_stock: d.current_stock || 0,
    min_stock_level: d.min_stock_level || 0,
    supplier: d.supplier || null,
    is_active: d.is_active ?? true,
    created_at: d.created_at || d.createdAt || new Date(),
    updated_at: d.updated_at || d.updatedAt || new Date(),
  }));

  const result = await insertBatch('raw_materials', rows);
  result.forEach(r => { idMap.raw_materials[r.mongo_id] = r.id; });
  console.log(`  → ${result.length} raw materials migrated`);
}

async function migrateDistributors(db) {
  console.log('\n[3/6] Migrating Customers → Distributors...');
  const docs = await db.collection('customers').find({}).toArray();
  const rows = docs.map(d => ({
    mongo_id: mongoId(d),
    name: d.name,
    email: d.email?.toLowerCase?.() || null,
    phone: d.phone,
    address: d.address || null,
    city: d.city || null,
    state: d.state || null,
    pincode: d.pincode || null,
    gstin: d.gstin || null,
    pan: d.pan || null,
    business_name: d.business_name || null,
    business_type: d.business_type || 'Individual',
    credit_limit: d.credit_limit || 0,
    credit_days: d.credit_days ?? 30,
    outstanding_balance: d.outstanding_balance || 0,
    status: d.status || 'Active',
    tags: d.tags || [],
    notes: d.notes || null,
    pe_id: null,
    created_by: null,
    created_at: d.createdAt || new Date(),
    updated_at: d.updatedAt || new Date(),
  }));

  const result = await insertBatch('distributors', rows);
  result.forEach(r => { idMap.distributors[r.mongo_id] = r.id; });
  console.log(`  → ${result.length} distributors migrated`);
}

async function migrateSellers(db) {
  console.log('\n[4/6] Migrating Sellers...');
  const docs = await db.collection('sellers').find({}).toArray();
  const rows = docs.map(d => ({
    mongo_id: mongoId(d),
    name: d.name,
    gstin: d.gstin || null,
    contact_person: d.contact_person || null,
    phone: d.phone || null,
    email: d.email?.toLowerCase?.() || null,
    address: d.address || null,
    city: d.city || null,
    state: d.state || null,
    pincode: d.pincode || null,
    bank_name: d.bank_name || null,
    account_number: d.account_number || null,
    ifsc_code: d.ifsc_code || null,
    upi_id: d.upi_id || null,
    notes: d.notes || null,
    is_active: d.is_active ?? true,
    created_at: d.created_at || d.createdAt || new Date(),
    updated_at: d.updated_at || d.updatedAt || new Date(),
  }));

  const result = await insertBatch('sellers', rows);
  result.forEach(r => { idMap.sellers[r.mongo_id] = r.id; });
  console.log(`  → ${result.length} sellers migrated`);
}

async function migrateCompanySettings(db) {
  console.log('\n[5/6] Migrating Company Settings...');
  const docs = await db.collection('companysettings').find({}).toArray();
  if (docs.length === 0) { console.log('  → No company settings found'); return; }

  const d = docs[0];
  const row = {
    mongo_id: mongoId(d),
    company_name: d.company_name,
    address: d.address,
    city: d.city,
    state: d.state,
    pincode: d.pincode,
    country: d.country || 'India',
    phone: d.phone,
    email: d.email?.toLowerCase?.(),
    website: d.website || null,
    gstin: d.gstin,
    pan: d.pan,
    cin: d.cin || null,
    bank_name: d.bank_name || null,
    account_number: d.account_number || null,
    ifsc_code: d.ifsc_code || null,
    account_holder_name: d.account_holder_name || null,
    invoice_prefix: d.invoice_prefix || 'INV',
    invoice_counter: d.invoice_counter || 1,
    invoice_terms: d.invoice_terms || 'Payment due in 30 days',
    financial_year_start: '2026-04-01',
    default_credit_days: d.default_credit_days ?? 30,
    currency: d.currency || 'INR',
    logo_url: d.logo_url || null,
    signature_url: d.signature_url || null,
    created_at: d.createdAt || new Date(),
    updated_at: d.updatedAt || new Date(),
  };

  await insertBatch('company_settings', [row]);
  console.log(`  → Company settings migrated`);
}

async function migrateBOMs(db) {
  console.log('\n[6/6] Migrating BOMs...');

  // Get an admin user as fallback for created_by (NOT NULL column)
  const { data: adminUser } = await supabase.from('users').select('id').eq('role', 'Admin').limit(1).single();
  const fallbackUserId = adminUser?.id;
  if (!fallbackUserId) { console.log('  → No admin user found, skipping BOMs'); return; }

  const docs = await db.collection('boms').find({}).toArray();

  const bomRows = docs.map(d => ({
    mongo_id: mongoId(d),
    product_id: refId(idMap.products, d.product_id),
    product_name: d.product_name,
    version: d.version || 1,
    total_manufacturing_cost: d.total_manufacturing_cost || 0,
    overhead_percentage: d.overhead_percentage || 0,
    final_cost: d.final_cost || 0,
    notes: d.notes || null,
    status: d.status || 'draft',
    created_by: fallbackUserId,
    created_by_name: d.created_by_name || 'Admin',
    is_current: d.is_current ?? false,
    created_at: d.created_at || d.createdAt || new Date(),
    updated_at: d.updated_at || d.updatedAt || new Date(),
  }));

  const result = await insertBatch('boms', bomRows);
  result.forEach(r => { idMap.boms[r.mongo_id] = r.id; });

  // Migrate embedded materials → bom_materials
  let materialCount = 0;
  for (const d of docs) {
    const bomUuid = idMap.boms[mongoId(d)];
    if (!bomUuid || !d.materials?.length) continue;

    const matRows = d.materials.map(m => ({
      bom_id: bomUuid,
      material_id: refId(idMap.raw_materials, m.material_id),
      material_name: m.material_name,
      quantity: m.quantity,
      unit: m.unit || 'kg',
      cost_per_unit: m.cost_per_unit || 0,
      total_cost: m.total_cost || 0,
    }));

    await insertBatch('bom_materials', matRows, 'id');
    materialCount += matRows.length;
  }

  console.log(`  → ${result.length} BOMs + ${materialCount} materials migrated`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const mongo = new MongoClient(MONGODB_URI);

  try {
    await mongo.connect();
    console.log('Connected to MongoDB');

    const db = mongo.db('test');
    console.log('Using database: test');
    console.log('\n=== Starting migration to Cloud Supabase ===');

    // Clear existing data (order matters — child tables first)
    console.log('\nClearing existing data...');
    const tablesToClear = ['bom_materials', 'boms', 'company_settings', 'distributors', 'sellers', 'raw_materials', 'products'];
    for (const t of tablesToClear) {
      const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.warn(`  Warning clearing ${t}: ${error.message}`);
    }
    console.log('  → Tables cleared');

    // Migrate in dependency order
    await migrateProducts(db);
    await migrateRawMaterials(db);
    await migrateDistributors(db);
    await migrateSellers(db);
    await migrateCompanySettings(db);
    await migrateBOMs(db);

    console.log('\n=== Migration complete! ===');
    console.log('Summary:');
    Object.entries(idMap).forEach(([table, map]) => {
      console.log(`  ${table}: ${Object.keys(map).length} records`);
    });

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    process.exit(1);
  } finally {
    await mongo.close();
  }
}

main();
