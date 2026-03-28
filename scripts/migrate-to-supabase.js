#!/usr/bin/env node
/**
 * MongoDB → Supabase Data Migration Script
 * 
 * Migrates 8 collections WITH data:
 *   User, Product, Customer, Order, Seller, BOM, RawMaterial, CompanySettings
 * 
 * Decisions:
 *   - Customer outstanding_balance → reset to 0
 *   - Order embedded items[] → extracted to order_items table
 *   - BOM embedded materials[] → extracted to bom_materials table
 *   - All mongo _id values stored in mongo_id column for reference
 * 
 * Usage:
 *   node scripts/migrate-to-supabase.js
 * 
 * Requires in .env.local:
 *   MONGODB_URI, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

// ─── Config ──────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required env vars: MONGODB_URI, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'sohag' },
});

// ─── ID Mapping ──────────────────────────────────────────────────────────────

// Maps mongo ObjectId string → Supabase UUID for FK resolution
const idMap = {
  users: {},       // mongo_id → uuid
  products: {},
  customers: {},
  sellers: {},
  raw_materials: {},
  boms: {},
  orders: {},
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mongoId(doc) {
  return doc._id?.toString?.() || doc._id;
}

function refId(map, mongoRef) {
  if (!mongoRef) return null;
  const key = mongoRef?.toString?.() || mongoRef;
  return map[key] || null;
}

// Map old MongoDB roles to new Supabase roles
function mapRole(role) {
  const roleMap = {
    'Admin': 'Admin',
    'admin': 'Admin',
    'Salesman': 'PrimaryExecutive',
    'salesman': 'PrimaryExecutive',
    'Customer': 'Customer',
    'customer': 'Customer',
  };
  return roleMap[role] || 'PrimaryExecutive';
}

async function insertBatch(table, rows, selectCols = 'id, mongo_id') {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from(table).insert(rows).select(selectCols);
  if (error) {
    console.error(`  ERROR inserting into ${table}:`, error.message);
    console.error('  First failing row:', JSON.stringify(rows[0]).slice(0, 300));
    throw error;
  }
  return data || [];
}

// ─── Migration Functions ─────────────────────────────────────────────────────

async function migrateUsers(db) {
  console.log('\n1/8 Migrating Users...');
  const docs = await db.collection('users').find({}).toArray();
  const rows = docs.map(d => ({
    mongo_id: mongoId(d),
    name: d.name,
    email: d.email?.toLowerCase?.(),
    password: d.password,
    role: mapRole(d.role),
    approval_status: d.approval_status || 'pending',
    rejection_reason: d.rejection_reason || null,
    phone: d.phone || null,
    address: d.address || null,
    state: d.state || null,
    gstin: d.gstin || null,
    approval_date: d.approval_date || null,
    created_at: d.createdAt || new Date(),
    updated_at: d.updatedAt || new Date(),
  }));

  const result = await insertBatch('users', rows);
  result.forEach(r => { idMap.users[r.mongo_id] = r.id; });

  // Second pass: resolve self-references (manager_id, invited_by, approved_by)
  for (const d of docs) {
    const uuid = idMap.users[mongoId(d)];
    const updates = {};
    if (d.managerId) updates.manager_id = refId(idMap.users, d.managerId);
    if (d.invited_by) updates.invited_by = refId(idMap.users, d.invited_by);
    if (d.approved_by) updates.approved_by = refId(idMap.users, d.approved_by);
    if (Object.keys(updates).length > 0) {
      await supabase.from('users').update(updates).eq('id', uuid);
    }
  }

  console.log(`  → ${docs.length} users migrated`);
}

async function migrateProducts(db) {
  console.log('\n2/8 Migrating Products...');
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
  console.log(`  → ${docs.length} products migrated`);
}

async function migrateCustomers(db) {
  console.log('\n3/8 Migrating Customers...');
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
    outstanding_balance: 0, // RESET per migration decision
    status: d.status || 'Active',
    tags: d.tags || [],
    notes: d.notes || null,
    primary_executive_id: refId(idMap.users, d.primary_executive_id),
    secondary_executive_id: refId(idMap.users, d.secondary_executive_id),
    created_by: refId(idMap.users, d.created_by),
    created_at: d.createdAt || new Date(),
    updated_at: d.updatedAt || new Date(),
  }));

  const result = await insertBatch('customers', rows);
  result.forEach(r => { idMap.customers[r.mongo_id] = r.id; });
  console.log(`  → ${docs.length} customers migrated (balances reset to 0)`);
}

async function migrateSellers(db) {
  console.log('\n4/8 Migrating Sellers...');
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
  console.log(`  → ${docs.length} sellers migrated`);
}

async function migrateRawMaterials(db) {
  console.log('\n5/8 Migrating Raw Materials...');
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
  console.log(`  → ${docs.length} raw materials migrated`);
}

async function migrateCompanySettings(db) {
  console.log('\n6/8 Migrating Company Settings...');
  const docs = await db.collection('companysettings').find({}).toArray();
  if (docs.length === 0) {
    console.log('  → No company settings found, skipping');
    return;
  }
  const d = docs[0]; // single-row config
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
    invoice_counter: d.invoice_counter || 1,  // User will set desired starting number
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
  console.log('\n7/8 Migrating BOMs...');
  // Get first admin UUID as fallback for created_by
  const adminMongoId = Object.keys(idMap.users)[0];
  const fallbackUserId = idMap.users[adminMongoId];

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
    created_by: refId(idMap.users, d.created_by) || fallbackUserId,
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

  console.log(`  → ${docs.length} BOMs + ${materialCount} materials migrated`);
}

async function migrateOrders(db) {
  console.log('\n8/8 Migrating Orders...');
  const docs = await db.collection('orders').find({}).toArray();
  const orderRows = docs.map(d => ({
    mongo_id: mongoId(d),
    order_number: d.order_number || null,
    order_date: d.order_date || new Date(),
    salesman_id: refId(idMap.users, d.salesman_id) || null,
    salesman_name: d.salesman_name,
    salesman_contact: d.salesman_contact || null,
    customer_id: refId(idMap.customers, d.customer_id),
    customer_name: d.customer_name,
    customer_contact: d.customer_contact,
    customer_address: d.customer_address || null,
    customer_gstin: d.customer_gstin || null,
    customer_email: d.customer_email || null,
    subtotal: d.subtotal || 0,
    tax_percentage: d.tax_percentage || 0,
    tax_amount: d.tax_amount || 0,
    discount_amount: d.discount_amount || 0,
    total_amount: d.total_amount || 0,
    status: d.status || 'pending',
    submitted_at: d.submitted_at || null,
    reviewed_at: d.reviewed_at || null,
    reviewed_by: refId(idMap.users, d.reviewed_by),
    reviewer_name: d.reviewer_name || null,
    admin_modified: d.admin_modified || false,
    admin_notes: d.admin_notes || null,
    original_total: d.original_total || null,
    delivery_date: d.delivery_date || null,
    payment_terms: d.payment_terms || null,
    notes: d.notes || null,
    rejection_reason: d.rejection_reason || null,
    created_at: d.created_at || d.createdAt || new Date(),
    updated_at: d.updated_at || d.updatedAt || new Date(),
  }));

  const result = await insertBatch('orders', orderRows);
  result.forEach(r => { idMap.orders[r.mongo_id] = r.id; });

  // Migrate embedded items → order_items
  let itemCount = 0;
  for (const d of docs) {
    const orderUuid = idMap.orders[mongoId(d)];
    if (!orderUuid || !d.items?.length) continue;

    const itemRows = d.items.map(item => ({
      order_id: orderUuid,
      product_id: refId(idMap.products, item.product_id),
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit || 'kg',
      price_per_unit: item.price_per_unit || 0,
      total_price: item.total_price || 0,
    }));

    await insertBatch('order_items', itemRows, 'id');
    itemCount += itemRows.length;
  }

  console.log(`  → ${docs.length} orders + ${itemCount} line items migrated`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const mongo = new MongoClient(MONGODB_URI);

  try {
    await mongo.connect();
    console.log('Connected to MongoDB');

    const db = mongo.db();

    console.log('=== Starting migration to Supabase ===');
    console.log(`Target schema: sohag`);
    console.log(`URL: ${SUPABASE_URL}`);

    // Clean slate: truncate all tables to prevent duplicates on re-runs
    console.log('\nClearing existing data...');
    const tables = ['order_items', 'bom_materials', 'orders', 'boms', 'company_settings', 'raw_materials', 'sellers', 'customers', 'products', 'users'];
    for (const t of tables) {
      await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    console.log('  → All tables cleared');

    // Order matters: Users first (referenced by almost everything)
    await migrateUsers(db);
    await migrateProducts(db);
    await migrateCustomers(db);
    await migrateSellers(db);
    await migrateRawMaterials(db);
    await migrateCompanySettings(db);
    await migrateBOMs(db);
    await migrateOrders(db);

    console.log('\n=== Migration complete! ===');
    console.log('ID mapping summary:');
    Object.entries(idMap).forEach(([table, map]) => {
      console.log(`  ${table}: ${Object.keys(map).length} records`);
    });
    console.log('\nNext steps:');
    console.log('  1. Verify data in Supabase Dashboard');
    console.log('  2. Set invoice_counter in company_settings to your desired starting number');
    console.log('  3. Drop mongo_id columns when ready (optional)');

  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  } finally {
    await mongo.close();
  }
}

main();
