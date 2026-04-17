-- =============================================================================
-- LeafTrack: MongoDB → Supabase Migration DDL
-- Schema: sohag
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- IDEMPOTENT: Safe to re-run without affecting existing schema or data.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Create schema and expose to PostgREST
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS sohag;

-- Force all unqualified object creation into sohag, not public
SET search_path TO sohag, public;

-- Grant usage so PostgREST (anon/authenticated) can reach the schema
GRANT USAGE ON SCHEMA sohag TO anon, authenticated, service_role;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA sohag
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA sohag
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA sohag
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA sohag
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Helper function for updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sohag.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Core tables
-- ─────────────────────────────────────────────────────────────────────────────

-- ===================== USERS =====================
CREATE TABLE IF NOT EXISTS sohag.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id      TEXT UNIQUE,  -- for migration mapping, can drop later
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('Admin', 'PrimaryExecutive', 'SecondaryExecutive', 'Customer')),
  manager_id    UUID REFERENCES sohag.users(id),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  invited_by    UUID REFERENCES sohag.users(id),
  approved_by   UUID REFERENCES sohag.users(id),
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  phone         TEXT,
  address       TEXT,
  state         TEXT,
  gstin         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON sohag.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON sohag.users(role);
CREATE INDEX IF NOT EXISTS idx_users_approval ON sohag.users(approval_status);

DROP TRIGGER IF EXISTS trg_users_updated_at ON sohag.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON sohag.users
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== PRODUCTS =====================
CREATE TABLE IF NOT EXISTS sohag.products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id            TEXT UNIQUE,
  name                TEXT NOT NULL,
  manufacturing_cost  NUMERIC(12,2) NOT NULL CHECK (manufacturing_cost >= 0),
  total_stock         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  hsn_code            TEXT NOT NULL,
  gst_rate            NUMERIC(5,2) NOT NULL DEFAULT 18 CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_products_updated_at ON sohag.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON sohag.products
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== CUSTOMERS =====================
CREATE TABLE IF NOT EXISTS sohag.customers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id                TEXT UNIQUE,
  name                    TEXT NOT NULL,
  email                   TEXT,
  phone                   TEXT NOT NULL,
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  pincode                 TEXT,
  gstin                   TEXT,
  pan                     TEXT,
  business_name           TEXT,
  business_type           TEXT DEFAULT 'Individual' CHECK (business_type IN ('Individual', 'Partnership', 'Company', 'LLP')),
  credit_limit            NUMERIC(12,2) DEFAULT 0 CHECK (credit_limit >= 0),
  credit_days             INTEGER DEFAULT 30 CHECK (credit_days >= 0),
  outstanding_balance     NUMERIC(12,2) DEFAULT 0 CHECK (outstanding_balance >= 0),
  status                  TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  tags                    TEXT[] DEFAULT '{}',
  notes                   TEXT,
  primary_executive_id    UUID REFERENCES sohag.users(id),
  secondary_executive_id  UUID REFERENCES sohag.users(id),
  created_by              UUID REFERENCES sohag.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON sohag.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_state ON sohag.customers(state);
CREATE INDEX IF NOT EXISTS idx_customers_status ON sohag.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_primary_exec ON sohag.customers(primary_executive_id);
CREATE INDEX IF NOT EXISTS idx_customers_secondary_exec ON sohag.customers(secondary_executive_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_unique ON sohag.customers(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique ON sohag.customers(phone);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON sohag.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON sohag.customers
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== SELLERS =====================
CREATE TABLE IF NOT EXISTS sohag.sellers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id        TEXT UNIQUE,
  name            TEXT NOT NULL,
  gstin           TEXT,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  bank_name       TEXT,
  account_number  TEXT,
  ifsc_code       TEXT,
  upi_id          TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sellers_name ON sohag.sellers(name);
CREATE INDEX IF NOT EXISTS idx_sellers_gstin ON sohag.sellers(gstin);
CREATE INDEX IF NOT EXISTS idx_sellers_active ON sohag.sellers(is_active);

DROP TRIGGER IF EXISTS trg_sellers_updated_at ON sohag.sellers;
CREATE TRIGGER trg_sellers_updated_at
  BEFORE UPDATE ON sohag.sellers
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== RAW MATERIALS =====================
CREATE TABLE IF NOT EXISTS sohag.raw_materials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id            TEXT UNIQUE,
  name                TEXT NOT NULL UNIQUE,
  description         TEXT,
  unit                TEXT NOT NULL CHECK (unit IN ('kg', 'liter', 'piece', 'meter', 'gram')),
  base_cost_per_unit  NUMERIC(12,4) NOT NULL CHECK (base_cost_per_unit >= 0),
  current_stock       NUMERIC(12,4) DEFAULT 0 CHECK (current_stock >= 0),
  min_stock_level     NUMERIC(12,4) DEFAULT 0 CHECK (min_stock_level >= 0),
  supplier            TEXT,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_materials_active ON sohag.raw_materials(is_active);

DROP TRIGGER IF EXISTS trg_raw_materials_updated_at ON sohag.raw_materials;
CREATE TRIGGER trg_raw_materials_updated_at
  BEFORE UPDATE ON sohag.raw_materials
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== COMPANY SETTINGS =====================
CREATE TABLE IF NOT EXISTS sohag.company_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id              TEXT UNIQUE,
  company_name          TEXT NOT NULL,
  address               TEXT NOT NULL,
  city                  TEXT NOT NULL,
  state                 TEXT NOT NULL,
  pincode               TEXT NOT NULL,
  country               TEXT DEFAULT 'India',
  phone                 TEXT NOT NULL,
  email                 TEXT NOT NULL,
  website               TEXT,
  gstin                 TEXT NOT NULL,
  pan                   TEXT NOT NULL,
  cin                   TEXT,
  bank_name             TEXT,
  account_number        TEXT,
  ifsc_code             TEXT,
  account_holder_name   TEXT,
  invoice_prefix        TEXT DEFAULT 'INV',
  invoice_counter       INTEGER DEFAULT 1 CHECK (invoice_counter >= 1),
  invoice_terms         TEXT DEFAULT 'Payment due in 30 days',
  financial_year_start  DATE DEFAULT '2026-04-01',
  default_credit_days   INTEGER DEFAULT 30 CHECK (default_credit_days >= 0),
  currency              TEXT DEFAULT 'INR',
  logo_url              TEXT,
  signature_url         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON sohag.company_settings;
CREATE TRIGGER trg_company_settings_updated_at
  BEFORE UPDATE ON sohag.company_settings
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== BOMS (Bill of Materials) =====================
CREATE TABLE IF NOT EXISTS sohag.boms (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id                  TEXT UNIQUE,
  product_id                UUID NOT NULL REFERENCES sohag.products(id),
  product_name              TEXT NOT NULL,
  version                   INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  total_manufacturing_cost  NUMERIC(12,2) NOT NULL CHECK (total_manufacturing_cost >= 0),
  overhead_percentage       NUMERIC(5,2) DEFAULT 0 CHECK (overhead_percentage >= 0 AND overhead_percentage <= 100),
  final_cost                NUMERIC(12,2) NOT NULL CHECK (final_cost >= 0),
  notes                     TEXT,
  status                    TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by                UUID NOT NULL REFERENCES sohag.users(id),
  created_by_name           TEXT NOT NULL,
  is_current                BOOLEAN DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boms_product ON sohag.boms(product_id);
CREATE INDEX IF NOT EXISTS idx_boms_status ON sohag.boms(status);
CREATE INDEX IF NOT EXISTS idx_boms_current ON sohag.boms(is_current);
CREATE UNIQUE INDEX IF NOT EXISTS idx_boms_product_version ON sohag.boms(product_id, version);
CREATE INDEX IF NOT EXISTS idx_boms_product_current ON sohag.boms(product_id, is_current);

DROP TRIGGER IF EXISTS trg_boms_updated_at ON sohag.boms;
CREATE TRIGGER trg_boms_updated_at
  BEFORE UPDATE ON sohag.boms
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== BOM MATERIALS (extracted from embedded array) =====================
CREATE TABLE IF NOT EXISTS sohag.bom_materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id          UUID NOT NULL REFERENCES sohag.boms(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES sohag.raw_materials(id),
  material_name   TEXT NOT NULL,
  quantity        NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
  unit            TEXT NOT NULL,
  cost_per_unit   NUMERIC(12,4) NOT NULL CHECK (cost_per_unit >= 0),
  total_cost      NUMERIC(12,2) NOT NULL CHECK (total_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bom_materials_bom ON sohag.bom_materials(bom_id);

-- ===================== ORDERS =====================
CREATE TABLE IF NOT EXISTS sohag.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id          TEXT UNIQUE,
  order_number      TEXT UNIQUE,
  order_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  salesman_id       UUID REFERENCES sohag.users(id),
  salesman_name     TEXT NOT NULL,
  salesman_contact  TEXT,
  customer_id       UUID REFERENCES sohag.customers(id),
  customer_name     TEXT NOT NULL,
  customer_contact  TEXT NOT NULL,
  customer_address  TEXT,
  customer_gstin    TEXT,
  customer_email    TEXT,
  subtotal          NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  tax_percentage    NUMERIC(5,2) DEFAULT 0 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
  tax_amount        NUMERIC(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount   NUMERIC(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
  discount_percentage NUMERIC(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  total_amount      NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending_primary', 'pending', 'approved', 'rejected')),
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES sohag.users(id),
  reviewer_name     TEXT,
  admin_modified    BOOLEAN DEFAULT FALSE,
  admin_notes       TEXT,
  original_total    NUMERIC(12,2),
  delivery_date     TIMESTAMPTZ,
  payment_terms     TEXT,
  notes             TEXT,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_salesman ON sohag.orders(salesman_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON sohag.orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON sohag.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON sohag.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created ON sohag.orders(created_at DESC);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON sohag.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON sohag.orders
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== ORDER ITEMS (extracted from embedded array) =====================
CREATE TABLE IF NOT EXISTS sohag.order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES sohag.orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES sohag.products(id),
  product_name    TEXT NOT NULL,
  quantity        NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit            TEXT NOT NULL CHECK (unit IN ('kg', 'box', 'bag')),
  price_per_unit  NUMERIC(12,2) NOT NULL CHECK (price_per_unit >= 0),
  total_price     NUMERIC(12,2) NOT NULL CHECK (total_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON sohag.order_items(order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Empty tables for fresh FY use (no data migration)
-- ─────────────────────────────────────────────────────────────────────────────

-- ===================== INVOICES =====================
CREATE TABLE IF NOT EXISTS sohag.invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number      TEXT NOT NULL UNIQUE,
  sale_id             UUID,   -- FK added after sales table created
  customer_id         UUID NOT NULL REFERENCES sohag.customers(id),
  salesman_id         UUID NOT NULL REFERENCES sohag.users(id),
  invoice_date        TIMESTAMPTZ DEFAULT NOW(),
  due_date            TIMESTAMPTZ NOT NULL,
  -- Snapshot fields (denormalized for invoice PDF)
  customer_name       TEXT NOT NULL,
  customer_email      TEXT,
  customer_phone      TEXT,
  customer_address    TEXT,
  customer_state      TEXT,
  customer_gstin      TEXT,
  company_name        TEXT NOT NULL,
  company_address     TEXT NOT NULL,
  company_gstin       TEXT NOT NULL,
  company_phone       TEXT NOT NULL,
  company_email       TEXT NOT NULL,
  -- Totals
  subtotal            NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  total_discount      NUMERIC(12,2) DEFAULT 0,
  discount_mode       TEXT DEFAULT 'amount' CHECK (discount_mode IN ('amount', 'percentage')),
  discount_value      NUMERIC(12,2) DEFAULT 0 CHECK (discount_value >= 0),
  taxable_amount      NUMERIC(12,2) NOT NULL,
  total_cgst          NUMERIC(12,2) DEFAULT 0,
  total_sgst          NUMERIC(12,2) DEFAULT 0,
  total_igst          NUMERIC(12,2) DEFAULT 0,
  total_tax           NUMERIC(12,2) NOT NULL,
  grand_total         NUMERIC(12,2) NOT NULL,
  -- Payment tracking
  status              TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled')),
  payment_status      TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Partial', 'Paid')),
  payment_method      TEXT,
  payment_date        TIMESTAMPTZ,
  paid_amount         NUMERIC(12,2) DEFAULT 0,
  balance_due         NUMERIC(12,2) NOT NULL,
  notes               TEXT,
  terms_and_conditions TEXT,
  manually_created    BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON sohag.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_salesman ON sohag.invoices(salesman_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON sohag.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON sohag.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON sohag.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_date ON sohag.invoices(customer_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_salesman_date ON sohag.invoices(salesman_id, invoice_date DESC);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON sohag.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON sohag.invoices
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== INVOICE ITEMS =====================
CREATE TABLE IF NOT EXISTS sohag.invoice_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id            UUID NOT NULL REFERENCES sohag.invoices(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES sohag.products(id),
  product_name          TEXT NOT NULL,
  hsn_code              TEXT NOT NULL,
  quantity              NUMERIC(12,2) NOT NULL CHECK (quantity >= 1),
  unit_price            NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  discount_percentage   NUMERIC(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  taxable_amount        NUMERIC(12,2) NOT NULL,
  gst_rate              NUMERIC(5,2) NOT NULL,
  cgst_amount           NUMERIC(12,2) DEFAULT 0,
  sgst_amount           NUMERIC(12,2) DEFAULT 0,
  igst_amount           NUMERIC(12,2) DEFAULT 0,
  total_amount          NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON sohag.invoice_items(invoice_id);

-- ===================== SALES =====================
CREATE TABLE IF NOT EXISTS sohag.sales (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id         UUID,  -- FK added after assignments table
  salesman_id           UUID NOT NULL REFERENCES sohag.users(id),
  product_id            UUID NOT NULL REFERENCES sohag.products(id),
  customer_id           UUID REFERENCES sohag.customers(id),
  quantity_sold         NUMERIC(12,2) NOT NULL CHECK (quantity_sold >= 1),
  unit_price            NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  price_at_sale         NUMERIC(12,2) NOT NULL CHECK (price_at_sale >= 0),
  discount_percentage   NUMERIC(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  total_amount          NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  sale_date             TIMESTAMPTZ DEFAULT NOW(),
  payment_method        TEXT DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Card', 'UPI', 'Bank Transfer', 'Credit')),
  invoice_generated     BOOLEAN DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_salesman ON sohag.sales(salesman_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sohag.sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sohag.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sohag.sales(sale_date DESC);

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sohag.sales;
CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sohag.sales
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- Add FK from invoices to sales now that sales table exists
ALTER TABLE sohag.invoices DROP CONSTRAINT IF EXISTS fk_invoices_sale;
ALTER TABLE sohag.invoices ADD CONSTRAINT fk_invoices_sale FOREIGN KEY (sale_id) REFERENCES sohag.sales(id);

-- ===================== SALE RETURNS =====================
CREATE TABLE IF NOT EXISTS sohag.sale_returns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number         TEXT NOT NULL UNIQUE,
  original_invoice_id   UUID REFERENCES sohag.invoices(id),
  original_sale_id      UUID REFERENCES sohag.sales(id),
  customer_id           UUID REFERENCES sohag.customers(id),
  salesman_id           UUID REFERENCES sohag.users(id),
  is_manual_entry       BOOLEAN DEFAULT FALSE,
  customer_name         TEXT,
  customer_email        TEXT,
  customer_phone        TEXT,
  created_by            UUID REFERENCES sohag.users(id),
  return_reason         TEXT,
  return_date           TIMESTAMPTZ DEFAULT NOW(),
  subtotal              NUMERIC(12,2) DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount            NUMERIC(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
  total_refund          NUMERIC(12,2) DEFAULT 0 CHECK (total_refund >= 0),
  total_refund_amount   NUMERIC(12,2) DEFAULT 0 CHECK (total_refund_amount >= 0),
  status                TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Rejected')),
  refund_method         TEXT NOT NULL CHECK (refund_method IN ('Cash', 'Bank Transfer', 'Store Credit', 'Exchange', 'Cheque', 'Credit Note')),
  refund_status         TEXT DEFAULT 'Pending' CHECK (refund_status IN ('Pending', 'Processed', 'Failed')),
  notes                 TEXT,
  admin_approval        BOOLEAN DEFAULT FALSE,
  approved_by           UUID REFERENCES sohag.users(id),
  approval_date         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_returns_customer ON sohag.sale_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_invoice ON sohag.sale_returns(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_status ON sohag.sale_returns(status);
CREATE INDEX IF NOT EXISTS idx_sale_returns_date ON sohag.sale_returns(return_date DESC);

DROP TRIGGER IF EXISTS trg_sale_returns_updated_at ON sohag.sale_returns;
CREATE TRIGGER trg_sale_returns_updated_at
  BEFORE UPDATE ON sohag.sale_returns
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== SALE RETURN ITEMS =====================
CREATE TABLE IF NOT EXISTS sohag.sale_return_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_return_id    UUID NOT NULL REFERENCES sohag.sale_returns(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES sohag.products(id),
  product_name      TEXT NOT NULL,
  original_quantity NUMERIC(12,2),
  return_quantity   NUMERIC(12,2) CHECK (return_quantity >= 1),
  quantity_returned NUMERIC(12,2) CHECK (quantity_returned >= 1),
  return_reason     TEXT CHECK (return_reason IN ('Defective', 'Wrong Product', 'Customer Request', 'Quality Issue', 'Other')),
  reason            TEXT,
  condition         TEXT DEFAULT 'Good' CHECK (condition IN ('Good', 'Damaged', 'Expired')),
  unit_price        NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_refund      NUMERIC(12,2) DEFAULT 0 CHECK (total_refund >= 0),
  total_amount      NUMERIC(12,2) DEFAULT 0 CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_return_items_return ON sohag.sale_return_items(sale_return_id);

-- ===================== PAYMENTS =====================
CREATE TABLE IF NOT EXISTS sohag.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES sohag.invoices(id),
  customer_id       UUID NOT NULL REFERENCES sohag.customers(id),
  salesman_id       UUID REFERENCES sohag.users(id),
  payment_date      TIMESTAMPTZ DEFAULT NOW(),
  amount_paid       NUMERIC(12,2) NOT NULL CHECK (amount_paid >= 0),
  payment_method    TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'Other')),
  transaction_id    TEXT,
  bank_reference    TEXT,
  cheque_number     TEXT,
  cheque_date       TIMESTAMPTZ,
  bank_name         TEXT,
  status            TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Failed', 'Cancelled')),
  notes             TEXT,
  reconciled        BOOLEAN DEFAULT FALSE,
  reconciled_date   TIMESTAMPTZ,
  reconciled_by     UUID REFERENCES sohag.users(id),
  created_by        UUID REFERENCES sohag.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON sohag.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON sohag.payments(customer_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_date ON sohag.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON sohag.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reconciled ON sohag.payments(reconciled);

DROP TRIGGER IF EXISTS trg_payments_updated_at ON sohag.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON sohag.payments
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== PURCHASES (clean schema, normalized) =====================
CREATE TABLE IF NOT EXISTS sohag.purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number       SERIAL,
  purchase_number     TEXT UNIQUE,
  purchase_date       TIMESTAMPTZ DEFAULT NOW(),
  seller_id           UUID REFERENCES sohag.sellers(id),
  place_of_supply     TEXT,
  -- Tax summary
  is_taxable          BOOLEAN DEFAULT FALSE,
  taxable_amount      NUMERIC(12,2) DEFAULT 0 CHECK (taxable_amount >= 0),
  cgst_rate           NUMERIC(5,2) DEFAULT 0,
  cgst_amount         NUMERIC(12,2) DEFAULT 0,
  sgst_rate           NUMERIC(5,2) DEFAULT 0,
  sgst_amount         NUMERIC(12,2) DEFAULT 0,
  igst_rate           NUMERIC(5,2) DEFAULT 0,
  igst_amount         NUMERIC(12,2) DEFAULT 0,
  tax_amount          NUMERIC(12,2) DEFAULT 0,
  tax_percentage      NUMERIC(5,2) DEFAULT 0,
  discount_amount     NUMERIC(12,2) DEFAULT 0,
  total_amount        NUMERIC(12,2) DEFAULT 0,
  final_amount        NUMERIC(12,2) DEFAULT 0,
  -- Payment
  payment_status      TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Partial', 'Paid')),
  paid_amount         NUMERIC(12,2) DEFAULT 0,
  due_amount          NUMERIC(12,2) DEFAULT 0,
  payment_method      TEXT,
  payment_date        TIMESTAMPTZ,
  invoice_number      TEXT,
  bill_image_url      TEXT,
  -- Metadata
  notes               TEXT,
  packaging_note      TEXT,
  received_by         TEXT,
  quality_check       TEXT DEFAULT 'Pending' CHECK (quality_check IN ('Pass', 'Fail', 'Pending')),
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_seller ON sohag.purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payment ON sohag.purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON sohag.purchases(created_at DESC);

DROP TRIGGER IF EXISTS trg_purchases_updated_at ON sohag.purchases;
CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON sohag.purchases
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== PURCHASE ITEMS (normalized from dual-format) =====================
CREATE TABLE IF NOT EXISTS sohag.purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID NOT NULL REFERENCES sohag.purchases(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,
  hsn_code        TEXT,
  quantity        NUMERIC(12,2) NOT NULL CHECK (quantity >= 0),
  unit            TEXT DEFAULT 'kg',
  rate            NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
  taxable_value   NUMERIC(12,2) DEFAULT 0 CHECK (taxable_value >= 0),
  batch_number    TEXT,
  manufacturing_date TIMESTAMPTZ,
  expiry_date     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON sohag.purchase_items(purchase_id);

-- ===================== PURCHASE RETURNS =====================
CREATE TABLE IF NOT EXISTS sohag.purchase_returns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number         TEXT UNIQUE,
  return_date           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purchase_id           UUID REFERENCES sohag.purchases(id),
  original_purchase_number TEXT,
  product_name          TEXT NOT NULL,
  product_category      TEXT,
  product_description   TEXT,
  returned_quantity     NUMERIC(12,2) NOT NULL CHECK (returned_quantity >= 0),
  original_quantity     NUMERIC(12,2) CHECK (original_quantity >= 0),
  unit                  TEXT DEFAULT 'kg',
  batch_number          TEXT,
  manufacturing_date    TIMESTAMPTZ,
  expiry_date           TIMESTAMPTZ,
  supplier_name         TEXT NOT NULL,
  supplier_contact      TEXT,
  supplier_address      TEXT,
  supplier_gstin        TEXT,
  supplier_email        TEXT,
  return_reason         TEXT NOT NULL,
  return_type           TEXT DEFAULT 'Other' CHECK (return_type IN ('Quality Issue', 'Damaged', 'Expired', 'Wrong Item', 'Excess Stock', 'Other')),
  unit_price            NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_return_amount   NUMERIC(12,2) NOT NULL CHECK (total_return_amount >= 0),
  tax_amount            NUMERIC(12,2) DEFAULT 0,
  tax_percentage        NUMERIC(5,2) DEFAULT 0,
  discount_amount       NUMERIC(12,2) DEFAULT 0,
  final_return_amount   NUMERIC(12,2) NOT NULL CHECK (final_return_amount >= 0),
  refund_status         TEXT DEFAULT 'Pending' CHECK (refund_status IN ('Pending', 'Partial', 'Completed', 'Rejected')),
  refunded_amount       NUMERIC(12,2) DEFAULT 0,
  pending_refund_amount NUMERIC(12,2) NOT NULL,
  refund_method         TEXT,
  refund_date           TIMESTAMPTZ,
  debit_note_number     TEXT,
  notes                 TEXT,
  returned_by           TEXT,
  condition_on_return   TEXT DEFAULT 'Good' CHECK (condition_on_return IN ('Good', 'Damaged', 'Unusable')),
  approval_status       TEXT DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
  approved_by           TEXT,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_date ON sohag.purchase_returns(return_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON sohag.purchase_returns(supplier_name);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_product ON sohag.purchase_returns(product_name);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_refund ON sohag.purchase_returns(refund_status);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_approval ON sohag.purchase_returns(approval_status);

DROP TRIGGER IF EXISTS trg_purchase_returns_updated_at ON sohag.purchase_returns;
CREATE TRIGGER trg_purchase_returns_updated_at
  BEFORE UPDATE ON sohag.purchase_returns
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- ===================== ASSIGNMENTS =====================
CREATE TABLE IF NOT EXISTS sohag.assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id           UUID NOT NULL REFERENCES sohag.users(id),
  product_id            UUID NOT NULL REFERENCES sohag.products(id),
  quantity              NUMERIC(12,2) NOT NULL CHECK (quantity >= 1),
  selling_price_per_unit NUMERIC(12,2) NOT NULL CHECK (selling_price_per_unit >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_salesman ON sohag.assignments(salesman_id);
CREATE INDEX IF NOT EXISTS idx_assignments_product ON sohag.assignments(product_id);

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON sohag.assignments;
CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON sohag.assignments
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- Add FK from sales to assignments now that assignments table exists
ALTER TABLE sohag.sales DROP CONSTRAINT IF EXISTS fk_sales_assignment;
ALTER TABLE sohag.sales ADD CONSTRAINT fk_sales_assignment FOREIGN KEY (assignment_id) REFERENCES sohag.assignments(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Auto-number generators
-- ─────────────────────────────────────────────────────────────────────────────

-- Order number generator: ORD-YYYYMM-XXXX
CREATE OR REPLACE FUNCTION sohag.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq INT;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    prefix := 'ORD-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(order_number FROM LENGTH(prefix) + 1) AS INTEGER)
    ), 0) + 1
    INTO seq
    FROM sohag.orders
    WHERE order_number LIKE prefix || '%';
    NEW.order_number := prefix || LPAD(seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_auto_number ON sohag.orders;
CREATE TRIGGER trg_orders_auto_number
  BEFORE INSERT ON sohag.orders
  FOR EACH ROW EXECUTE FUNCTION sohag.generate_order_number();

-- Purchase number generator: PUR-{serial}
CREATE OR REPLACE FUNCTION sohag.generate_purchase_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.purchase_number IS NULL OR NEW.purchase_number = '' THEN
    NEW.purchase_number := 'PUR-' || LPAD(NEW.serial_number::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchases_auto_number ON sohag.purchases;
CREATE TRIGGER trg_purchases_auto_number
  BEFORE INSERT ON sohag.purchases
  FOR EACH ROW EXECUTE FUNCTION sohag.generate_purchase_number();

-- Sale return number generator: RET000001
CREATE SEQUENCE IF NOT EXISTS sohag.sale_return_seq START WITH 1;

CREATE OR REPLACE FUNCTION sohag.generate_sale_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := 'RET' || LPAD(NEXTVAL('sohag.sale_return_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_returns_auto_number ON sohag.sale_returns;
CREATE TRIGGER trg_sale_returns_auto_number
  BEFORE INSERT ON sohag.sale_returns
  FOR EACH ROW EXECUTE FUNCTION sohag.generate_sale_return_number();

-- Purchase return number generator: PR000001
CREATE SEQUENCE IF NOT EXISTS sohag.purchase_return_seq START WITH 1;

CREATE OR REPLACE FUNCTION sohag.generate_purchase_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := 'PR' || LPAD(NEXTVAL('sohag.purchase_return_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_returns_auto_number ON sohag.purchase_returns;
CREATE TRIGGER trg_purchase_returns_auto_number
  BEFORE INSERT ON sohag.purchase_returns
  FOR EACH ROW EXECUTE FUNCTION sohag.generate_purchase_return_number();

-- Invoice number generator: uses company_settings.invoice_prefix + invoice_counter
CREATE OR REPLACE FUNCTION sohag.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  counter INT;
  fy_start TEXT;
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    SELECT cs.invoice_prefix, cs.invoice_counter
    INTO prefix, counter
    FROM sohag.company_settings cs
    LIMIT 1;

    prefix := COALESCE(prefix, 'INV');
    counter := COALESCE(counter, 1);

    -- Financial year: e.g., 2026-27
    fy_start := TO_CHAR(
      CASE WHEN EXTRACT(MONTH FROM NOW()) >= 4
           THEN DATE_TRUNC('year', NOW())
           ELSE DATE_TRUNC('year', NOW()) - INTERVAL '1 year'
      END, 'YYYY'
    );

    NEW.invoice_number := prefix || '-' || fy_start || '-' || LPAD(counter::TEXT, 5, '0');

    -- Increment the counter
    UPDATE sohag.company_settings SET invoice_counter = counter + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_auto_number ON sohag.invoices;
CREATE TRIGGER trg_invoices_auto_number
  BEFORE INSERT ON sohag.invoices
  FOR EACH ROW EXECUTE FUNCTION sohag.generate_invoice_number();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Grants on all created objects
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sohag TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA sohag TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA sohag TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sohag TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sohag.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.bom_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.sale_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sohag.assignments ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so server-side API calls work out of the box.
-- We'll add granular RLS policies later when implementing Better Auth.
-- For now, allow service_role full access (default behavior).

-- ─────────────────────────────────────────────────────────────────────────────
-- DONE! Verify with:
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'sohag';
-- ─────────────────────────────────────────────────────────────────────────────
