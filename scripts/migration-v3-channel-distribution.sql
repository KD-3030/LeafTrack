-- ============================================================================
-- LeafTrack v3: Channel Distribution Migration
-- ============================================================================
-- Transforms the system from PE-owned stock pool model to
-- Distributor-centric channel distribution with field sales tracking.
--
-- Changes:
-- 1. Rename customers → distributors
-- 2. Create retailers table
-- 3. Create distributor_inventory table
-- 4. Create daily_sales table
-- 5. Create se_distributor_assignments table
-- 6. Alter orders: add distributor_id, order_type, dispatched status
-- 7. Alter invoices: add order_id, distributor_id
-- 8. Update all FK references from customers → distributors
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Rename customers → distributors
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing indexes on customers (they reference old table name)
DROP INDEX IF EXISTS sohag.idx_customers_primary_exec;
DROP INDEX IF EXISTS sohag.idx_customers_secondary_exec;
DROP INDEX IF EXISTS sohag.idx_customers_created_by;
DROP INDEX IF EXISTS sohag.idx_customers_status;
DROP INDEX IF EXISTS sohag.idx_customers_state;
DROP INDEX IF EXISTS sohag.idx_customers_business_type;

-- Drop the trigger
DROP TRIGGER IF EXISTS trg_customers_updated_at ON sohag.customers;

-- Rename the table
ALTER TABLE sohag.customers RENAME TO distributors;

-- Rename the column primary_executive_id → pe_id for brevity
ALTER TABLE sohag.distributors RENAME COLUMN primary_executive_id TO pe_id;

-- Drop secondary_executive_id (SE assignment is now via se_distributor_assignments)
ALTER TABLE sohag.distributors DROP COLUMN IF EXISTS secondary_executive_id;

-- Add new columns
ALTER TABLE sohag.distributors ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE sohag.distributors ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Recreate indexes with new names
CREATE INDEX IF NOT EXISTS idx_distributors_pe ON sohag.distributors(pe_id);
CREATE INDEX IF NOT EXISTS idx_distributors_created_by ON sohag.distributors(created_by);
CREATE INDEX IF NOT EXISTS idx_distributors_status ON sohag.distributors(status);
CREATE INDEX IF NOT EXISTS idx_distributors_state ON sohag.distributors(state);
CREATE INDEX IF NOT EXISTS idx_distributors_business_type ON sohag.distributors(business_type);
CREATE INDEX IF NOT EXISTS idx_distributors_approval ON sohag.distributors(approval_status);

-- Recreate the updated_at trigger
CREATE TRIGGER trg_distributors_updated_at
  BEFORE UPDATE ON sohag.distributors
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- Enable RLS
ALTER TABLE sohag.distributors ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Create retailers table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sohag.retailers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  phone             TEXT,
  shop_name         TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  pincode           TEXT,
  location_lat      NUMERIC(10,7),
  location_lng      NUMERIC(10,7),
  distributor_id    UUID NOT NULL REFERENCES sohag.distributors(id),
  created_by_se_id  UUID REFERENCES sohag.users(id),
  status            TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retailers_distributor ON sohag.retailers(distributor_id);
CREATE INDEX IF NOT EXISTS idx_retailers_se ON sohag.retailers(created_by_se_id);
CREATE INDEX IF NOT EXISTS idx_retailers_status ON sohag.retailers(status);

DROP TRIGGER IF EXISTS trg_retailers_updated_at ON sohag.retailers;
CREATE TRIGGER trg_retailers_updated_at
  BEFORE UPDATE ON sohag.retailers
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

ALTER TABLE sohag.retailers ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Create distributor_inventory table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sohag.distributor_inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id    UUID NOT NULL REFERENCES sohag.distributors(id),
  product_id        UUID NOT NULL REFERENCES sohag.products(id),
  current_stock     NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_restocked_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (distributor_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_dist_inv_distributor ON sohag.distributor_inventory(distributor_id);
CREATE INDEX IF NOT EXISTS idx_dist_inv_product ON sohag.distributor_inventory(product_id);

DROP TRIGGER IF EXISTS trg_distributor_inventory_updated_at ON sohag.distributor_inventory;
CREATE TRIGGER trg_distributor_inventory_updated_at
  BEFORE UPDATE ON sohag.distributor_inventory
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

ALTER TABLE sohag.distributor_inventory ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Create daily_sales table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sohag.daily_sales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  se_id             UUID NOT NULL REFERENCES sohag.users(id),
  distributor_id    UUID NOT NULL REFERENCES sohag.distributors(id),
  retailer_id       UUID REFERENCES sohag.retailers(id),
  product_id        UUID NOT NULL REFERENCES sohag.products(id),
  quantity_sold     NUMERIC(12,2) NOT NULL CHECK (quantity_sold > 0),
  unit              TEXT NOT NULL DEFAULT 'kg',
  sale_amount       NUMERIC(12,2) NOT NULL CHECK (sale_amount >= 0),
  payment_type      TEXT NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'credit', 'upi', 'cheque')),
  location_lat      NUMERIC(10,7),
  location_lng      NUMERIC(10,7),
  notes             TEXT,
  sale_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_sales_se ON sohag.daily_sales(se_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_distributor ON sohag.daily_sales(distributor_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_retailer ON sohag.daily_sales(retailer_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_product ON sohag.daily_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON sohag.daily_sales(sale_date DESC);

DROP TRIGGER IF EXISTS trg_daily_sales_updated_at ON sohag.daily_sales;
CREATE TRIGGER trg_daily_sales_updated_at
  BEFORE UPDATE ON sohag.daily_sales
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

ALTER TABLE sohag.daily_sales ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Create se_distributor_assignments table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sohag.se_distributor_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  se_id             UUID NOT NULL REFERENCES sohag.users(id),
  distributor_id    UUID NOT NULL REFERENCES sohag.distributors(id),
  assigned_by       UUID REFERENCES sohag.users(id),
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (se_id, distributor_id)
);

CREATE INDEX IF NOT EXISTS idx_se_dist_assign_se ON sohag.se_distributor_assignments(se_id);
CREATE INDEX IF NOT EXISTS idx_se_dist_assign_dist ON sohag.se_distributor_assignments(distributor_id);
CREATE INDEX IF NOT EXISTS idx_se_dist_assign_active ON sohag.se_distributor_assignments(is_active);

DROP TRIGGER IF EXISTS trg_se_distributor_assignments_updated_at ON sohag.se_distributor_assignments;
CREATE TRIGGER trg_se_distributor_assignments_updated_at
  BEFORE UPDATE ON sohag.se_distributor_assignments
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

ALTER TABLE sohag.se_distributor_assignments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Alter orders table
-- ─────────────────────────────────────────────────────────────────────────────

-- Add distributor_id column
ALTER TABLE sohag.orders ADD COLUMN IF NOT EXISTS distributor_id UUID REFERENCES sohag.distributors(id);

-- Add order_type column
ALTER TABLE sohag.orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'restock'
  CHECK (order_type IN ('restock', 'direct'));

-- Update the status CHECK constraint to include 'dispatched'
-- First drop the old constraint, then add the new one
ALTER TABLE sohag.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE sohag.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_primary', 'pending', 'approved', 'rejected', 'dispatched'));

CREATE INDEX IF NOT EXISTS idx_orders_distributor ON sohag.orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_orders_type ON sohag.orders(order_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: Alter invoices table
-- ─────────────────────────────────────────────────────────────────────────────

-- Add order_id FK
ALTER TABLE sohag.invoices ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES sohag.orders(id);

-- Add distributor_id FK
ALTER TABLE sohag.invoices ADD COLUMN IF NOT EXISTS distributor_id UUID REFERENCES sohag.distributors(id);

-- Make sale_id nullable (it was NOT NULL before; new invoices may be order-based)
ALTER TABLE sohag.invoices ALTER COLUMN sale_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_order ON sohag.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_distributor ON sohag.invoices(distributor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: Update FK references from customers → distributors
-- ─────────────────────────────────────────────────────────────────────────────

-- Rename customer_id columns to distributor_id where applicable in invoices, payments, sale_returns
-- NOTE: We keep customer_id in orders for backward compat (orders store denormalized customer info)
-- but add the new distributor_id FK column above.

-- Payments: rename customer_id → distributor_id
ALTER TABLE sohag.payments RENAME COLUMN customer_id TO distributor_id;

-- Sale returns: rename customer_id → distributor_id  
ALTER TABLE sohag.sale_returns RENAME COLUMN customer_id TO distributor_id;

-- Invoices: rename customer_id → distributor_id
ALTER TABLE sohag.invoices RENAME COLUMN customer_id TO distributor_id_legacy;
-- The new distributor_id column was already added above
-- Copy data from legacy column to new column
UPDATE sohag.invoices SET distributor_id = distributor_id_legacy WHERE distributor_id IS NULL;
-- Drop legacy column
ALTER TABLE sohag.invoices DROP COLUMN IF EXISTS distributor_id_legacy;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: Grant permissions on new tables
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON sohag.retailers TO authenticated;
GRANT SELECT ON sohag.retailers TO anon;
GRANT ALL ON sohag.retailers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON sohag.distributor_inventory TO authenticated;
GRANT SELECT ON sohag.distributor_inventory TO anon;
GRANT ALL ON sohag.distributor_inventory TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON sohag.daily_sales TO authenticated;
GRANT SELECT ON sohag.daily_sales TO anon;
GRANT ALL ON sohag.daily_sales TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON sohag.se_distributor_assignments TO authenticated;
GRANT SELECT ON sohag.se_distributor_assignments TO anon;
GRANT ALL ON sohag.se_distributor_assignments TO service_role;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify migration:
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'sohag' ORDER BY table_name;
--   SELECT column_name FROM information_schema.columns WHERE table_schema = 'sohag' AND table_name = 'distributors';
--   SELECT column_name FROM information_schema.columns WHERE table_schema = 'sohag' AND table_name = 'orders';
-- ─────────────────────────────────────────────────────────────────────────────
