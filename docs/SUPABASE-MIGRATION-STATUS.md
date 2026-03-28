# Supabase Migration Status & Server Actions Plan

## 1. Migration Audit

### Successfully Migrated Tables (7/8 collections)

| # | Supabase Table | MongoDB Collection | Rows | Status |
|---|---|---|---|---|
| 1 | `sohag.users` | `users` | 9 | ✅ Migrated |
| 2 | `sohag.products` | `products` | 9 | ✅ Migrated |
| 3 | `sohag.customers` | `customers` | 19 | ✅ Migrated (balances reset to 0) |
| 4 | `sohag.sellers` | `sellers` | 1 | ✅ Migrated |
| 5 | `sohag.raw_materials` | `rawmaterials` | 9 | ✅ Migrated |
| 6 | `sohag.company_settings` | `companysettings` | 1 | ✅ Migrated |
| 7 | `sohag.boms` + `sohag.bom_materials` | `boms` (embedded materials[]) | 5 + 29 | ✅ Migrated |

### Failed Migration (1/8)

| # | Supabase Table | MongoDB Collection | Status | Error |
|---|---|---|---|---|
| 8 | `sohag.orders` + `sohag.order_items` | `orders` (embedded items[]) | ❌ Failed | `salesman_id` NOT NULL violation |

**Root cause**: Some MongoDB orders reference `salesman_id` values that don't exist in the users collection (orphaned references). The Supabase schema originally had `salesman_id UUID NOT NULL`.

**Fix already applied in code**:
1. Schema: `salesman_id UUID REFERENCES sohag.users(id)` — made nullable
2. Migration script: `salesman_id: refId(idMap.users, d.salesman_id) || null` — null fallback

**To complete**: Re-run migration on server (or just re-run orders portion).

### Empty Tables (by design — fresh FY start)

These 12 tables exist in Supabase but have no data; they'll be populated by the new server actions:

| Table | Purpose |
|---|---|
| `sohag.invoices` | GST invoices |
| `sohag.invoice_items` | Invoice line items |
| `sohag.sales` | Sale records |
| `sohag.sale_returns` | Sale return requests |
| `sohag.sale_return_items` | Return line items |
| `sohag.payments` | Payment tracking |
| `sohag.purchases` | Purchase records |
| `sohag.purchase_items` | Purchase line items |
| `sohag.purchase_returns` | Purchase returns |
| `sohag.assignments` | Salesman product assignments |

### Missing Tables (not in Supabase schema)

| MongoDB Model | Used By | Action Needed |
|---|---|---|
| `Location` | GPS tracking (`/api/locations`, `/api/clear-locations`, `/api/test-locations`) | **Add `sohag.locations` table** |
| `Invitation` | User invitations (`/api/invitations/send`, `/api/invitations/validate`, signup) | **Add `sohag.invitations` table** |

---

## 2. Schema Relationships (FK Map)

```
users
  ├── manager_id        → users.id (self-ref, team hierarchy)
  ├── invited_by        → users.id
  └── approved_by       → users.id

customers
  ├── primary_executive_id  → users.id
  ├── secondary_executive_id → users.id
  └── created_by            → users.id

boms
  ├── product_id  → products.id
  └── created_by  → users.id

bom_materials
  ├── bom_id       → boms.id (CASCADE)
  └── material_id  → raw_materials.id

orders
  ├── salesman_id   → users.id (nullable)
  ├── customer_id   → customers.id
  └── reviewed_by   → users.id

order_items
  ├── order_id    → orders.id (CASCADE)
  └── product_id  → products.id

invoices
  ├── sale_id      → sales.id (deferred FK)
  ├── customer_id  → customers.id
  └── salesman_id  → users.id

invoice_items
  ├── invoice_id  → invoices.id (CASCADE)
  └── product_id  → products.id

sales
  ├── assignment_id → assignments.id (deferred FK)
  ├── salesman_id   → users.id
  ├── product_id    → products.id
  └── customer_id   → customers.id

sale_returns
  ├── original_invoice_id → invoices.id
  ├── original_sale_id    → sales.id
  ├── customer_id         → customers.id
  ├── salesman_id         → users.id
  ├── created_by          → users.id
  └── approved_by         → users.id

sale_return_items
  ├── sale_return_id → sale_returns.id (CASCADE)
  └── product_id     → products.id

payments
  ├── invoice_id     → invoices.id
  ├── customer_id    → customers.id
  ├── salesman_id    → users.id
  ├── reconciled_by  → users.id
  └── created_by     → users.id

purchases
  └── seller_id → sellers.id

purchase_items
  └── purchase_id → purchases.id (CASCADE)

purchase_returns
  └── purchase_id → purchases.id

assignments
  ├── salesman_id → users.id
  └── product_id  → products.id
```

All FKs are correctly defined. The two deferred FKs (`invoices.sale_id → sales`, `sales.assignment_id → assignments`) use `ALTER TABLE ... ADD CONSTRAINT` since they reference tables created later.

---

## 3. Error Assessment

**Severity: LOW** — The `salesman_id` NOT NULL error is **not major**.

- It's a data quality issue in the source MongoDB data (orphaned ObjectId references)
- The fix is already applied in both the schema (nullable column) and migration script (null fallback)
- Only affects the orders table — all other 7 collections migrated successfully
- **Resolution**: SSH into server → re-run `node scripts/migrate-to-supabase.js` (it auto-truncates and re-inserts)

---

## 4. Server Actions Plan

### Architecture Decision: Keep API Routes (don't use Server Actions)

**Rationale**: All pages are client components (`'use client'`) that call API routes via `fetch()`. Server Actions require server components or special client-side hooks. Keeping the existing API route pattern and just swapping the data layer (Mongoose → Supabase) is the lowest-risk approach.

### Strategy: Create `lib/supabase-queries.ts` modules

Instead of rewriting every route, create a shared query layer that routes call:

```
lib/
  supabase-queries/
    users.ts        — User CRUD + auth queries
    products.ts     — Product CRUD
    customers.ts    — Customer CRUD + balance calc
    sellers.ts      — Seller CRUD
    raw-materials.ts — Raw material CRUD
    boms.ts         — BOM + materials CRUD
    orders.ts       — Order + items CRUD + approval workflow
    invoices.ts     — Invoice + items CRUD + PDF data
    sales.ts        — Sale CRUD
    sale-returns.ts — Sale return + items + approval
    payments.ts     — Payment CRUD + reconciliation
    purchases.ts    — Purchase + items CRUD
    purchase-returns.ts — Purchase return CRUD
    assignments.ts  — Assignment CRUD + stock management
    locations.ts    — GPS tracking
    invitations.ts  — Invitation send + validate
    financial.ts    — Stats + outstanding aggregation
    reports.ts      — GST + business reports
    settings.ts     — Company settings CRUD
    index.ts        — Re-exports + supabase client access
```

### Migration Order (by dependency + risk)

#### Phase 1: Foundation (no FK dependencies)
1. **Company Settings** — Single-row config, simplest possible route
2. **Products** — Simple CRUD, no FKs to other tables
3. **Sellers** — Simple CRUD, no FKs
4. **Raw Materials** — Simple CRUD, no FKs

#### Phase 2: User System
5. **Users** — Self-referencing FKs (manager_id), approval workflow
6. **Auth (Login/Signup)** — JWT generation stays, just swap password lookup
7. **Invitations** — Needs `sohag.invitations` table first

#### Phase 3: Customer & Hierarchy
8. **Customers** — FK to users, role-based access control
9. **Assignments** — FK to users + products, stock management

#### Phase 4: Order Pipeline
10. **Orders** — FK to users + customers, role-based workflow
11. **Sales** — FK to users + products + customers + assignments
12. **Invoices** — FK to customers + users + sales, complex aggregation
13. **Payments** — FK to invoices + customers, balance recalculation

#### Phase 5: Returns & Reports
14. **Sale Returns** — FK to invoices + sales + customers, transaction-like
15. **Purchase Returns** — FK to purchases
16. **Purchases** — FK to sellers, with purchase_items
17. **Financial Stats** — Aggregation queries on invoices + payments
18. **Reports (GST/Business)** — Complex aggregation across multiple tables
19. **Locations** — Needs `sohag.locations` table, GPS tracking

### Per-Route Migration Pattern

For each API route:

```typescript
// BEFORE (MongoDB)
import { connectDB } from '@/lib/mongodb';
import Model from '@/models/ModelName';

export async function GET(req: NextRequest) {
  await connectDB();
  const data = await Model.find(query).populate('ref').lean();
  return NextResponse.json(data);
}

// AFTER (Supabase)
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('table_name')
    .select('*, ref_table(col1, col2)')
    .eq('column', value);
  
  if (error) throw error;
  return NextResponse.json(data);
}
```

### Key Differences: Mongoose → Supabase

| Mongoose Pattern | Supabase Equivalent |
|---|---|
| `Model.find(query)` | `supabase.from('table').select('*').match(query)` |
| `Model.findById(id)` | `supabase.from('table').select('*').eq('id', id).single()` |
| `.populate('ref', 'field1 field2')` | `.select('*, ref_table(field1, field2)')` |
| `Model.findByIdAndUpdate(id, data)` | `supabase.from('table').update(data).eq('id', id)` |
| `Model.findByIdAndDelete(id)` | `supabase.from('table').delete().eq('id', id)` |
| `Model.countDocuments(filter)` | `supabase.from('table').select('*', { count: 'exact', head: true })` |
| `Model.aggregate([...])` | Supabase RPC (postgres function) or client-side calc |
| `$regex` search | `.ilike('column', '%search%')` or `.or('col1.ilike.%s%,col2.ilike.%s%')` |
| `$gte`/`$lte` date range | `.gte('col', from).lte('col', to)` |
| `$in: [...]` | `.in('column', [...])` |
| `session.withTransaction()` | Supabase RPC with `BEGIN...COMMIT` |
| `.sort({ field: -1 })` | `.order('field', { ascending: false })` |
| `.skip(n).limit(m)` | `.range(n, n + m - 1)` |

### Auth Migration Notes

- **Keep JWT for now**: The auth routes generate JWTs from password verification. Just swap `User.findOne({ email })` → `supabase.from('users').select('*').eq('email', email).single()`
- **Better Auth later**: Plan to migrate to Better Auth (Supabase's auth system) in a future phase
- **Role normalization**: `normalizeRoleId()` and `roleIdToDbRole()` stay unchanged

### Missing Schema: Add Before Phase 2 & 5

```sql
-- LOCATIONS (for GPS tracking)
CREATE TABLE IF NOT EXISTS sohag.locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id   UUID NOT NULL REFERENCES sohag.users(id),
  latitude      NUMERIC(10,7) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude     NUMERIC(10,7) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy      NUMERIC(10,2),
  address       TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_salesman ON sohag.locations(salesman_id);
CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON sohag.locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_locations_salesman_time ON sohag.locations(salesman_id, timestamp DESC);

ALTER TABLE sohag.locations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_locations_updated_at ON sohag.locations;
CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON sohag.locations
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- INVITATIONS (for user onboarding)
CREATE TABLE IF NOT EXISTS sohag.invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('PrimaryExecutive', 'SecondaryExecutive')),
  invited_by    UUID NOT NULL REFERENCES sohag.users(id),
  manager_id    UUID REFERENCES sohag.users(id),
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN DEFAULT FALSE,
  used_at       TIMESTAMPTZ,
  user_id       UUID REFERENCES sohag.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON sohag.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON sohag.invitations(email);

ALTER TABLE sohag.invitations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_invitations_updated_at ON sohag.invitations;
CREATE TRIGGER trg_invitations_updated_at
  BEFORE UPDATE ON sohag.invitations
  FOR EACH ROW EXECUTE FUNCTION sohag.set_updated_at();

-- Grants for new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON sohag.locations TO authenticated;
GRANT SELECT ON sohag.locations TO anon;
GRANT ALL ON sohag.locations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON sohag.invitations TO authenticated;
GRANT SELECT ON sohag.invitations TO anon;
GRANT ALL ON sohag.invitations TO service_role;
```

---

## 5. Immediate Next Steps

1. **SSH to server** → Ensure `ALTER TABLE sohag.orders ALTER COLUMN salesman_id DROP NOT NULL` has been run
2. **Re-run migration** → `node scripts/migrate-to-supabase.js` to migrate orders
3. **Run the missing schema SQL** → Add `locations` and `invitations` tables
4. **Create `lib/supabase-queries/` directory** and start Phase 1 routes
5. **Migrate one route end-to-end** (e.g., `/api/settings/company`) as a proof-of-concept
