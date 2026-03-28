# LeafTrack v2.0 — Full Implementation Plan

> **Version**: 2.0.0  
> **Migration Stage**: MongoDB → Supabase (dual-read, Supabase-first)  
> **Date**: March 28, 2026

---

## Current State Summary

- **Database**: 7/8 MongoDB collections migrated to Supabase (`sohag` schema). Orders pending re-run. 12 empty tables ready for fresh FY.
- **Missing tables**: `locations` removed (feature dropped), `invitations` needs creation in Supabase.
- **Auth**: Invite-only signup ✅, JWT-based, role-based routing. Login has unnecessary role dropdown.
- **Pages**: 17 admin pages, 3 salesman pages (no distinction between primary/secondary executive).
- **Location tracking**: Present in admin dashboard, salesman dashboard, sidebar, dedicated page — **to be removed entirely**.
- **Stock**: Orders don't check stock. Assignments check stock on creation. Sales check assignment quantity.
- **UI**: Default shadcn gray theme with hardcoded green/beige. No cohesive design system.

---

## Architecture: Role Hierarchy

```
Admin
  └── Full control: inventory, users, approvals, settings, analytics, reports
  
Primary Executive (PE)
  ├── Manages team of Secondary Executives
  ├── Monitors orders from their SEs
  ├── Owns a stock pool (assigned by Admin from global inventory)
  ├── Gets low-stock alerts
  ├── Can view SE activity/performance
  └── Can place their own orders

Secondary Executive (SE)
  ├── Assigned under a Primary Executive
  ├── Takes orders from customers (against PE's stock pool)
  ├── Orders flow: SE → PE review → Admin approval
  └── Can view own orders/activity only
```

### Order Flow
```
SE creates order → status: pending_primary
  → PE reviews/forwards → status: pending (for admin)
    → Admin approves (with optional modifications) → status: approved
    OR Admin rejects → status: rejected

PE creates own order → status: pending (direct to admin)
  → Admin approves/rejects
```

### Stock Flow
```
Global Inventory (Admin manages totalStock per product)
  → Admin assigns stock pool to PE (deducts from global)
    → SE/PE place orders AGAINST that pool
    → Orders show available stock, warn on low/negative
    → Allow negative allocation (soft limit, alert-only)
```

---

## Design System: Color Palette

**Theme**: Professional tea-industry green with warm accents

| Token | Value | Usage |
|-------|-------|-------|
| `--brand-50` | `#f0fdf4` | Lightest background tint |
| `--brand-100` | `#dcfce7` | Card highlights, badges |
| `--brand-500` | `#22c55e` | Primary actions, active states |
| `--brand-600` | `#16a34a` | Buttons, links |
| `--brand-700` | `#15803d` | Hover states |
| `--brand-900` | `#14532d` | Sidebar background, headings |
| `--accent-amber` | `#f59e0b` | Warnings, pending states |
| `--accent-red` | `#ef4444` | Destructive, rejected |
| `--surface` | `#fafaf9` | Page backgrounds (warm gray) |
| `--surface-card` | `#ffffff` | Card backgrounds |
| `--border` | `#e5e5e5` | Borders |
| `--text-primary` | `#171717` | Main text |
| `--text-muted` | `#737373` | Secondary text |

---

## Page Architecture (New)

### Admin Pages (16 sections, remove locations)
```
/admin/dashboard          — Overview: key metrics, recent activity feed, stock alerts
/admin/users              — RENAME from /salesmen: user list, invite, approve/reject, online/offline status
/admin/customers          — Customer CRUD with outstanding balance
/admin/products           — Product catalog with stock levels
/admin/orders             — Order approval queue (all orders from all PEs/SEs)
/admin/inventory          — NEW: global stock overview, assignment history, stock movements
/admin/invoicing          — Invoice management + PDF
/admin/financial          — Financial dashboard + payments sub-page
/admin/sales-returns      — Return management
/admin/purchases          — Purchase CRUD
/admin/purchase-returns   — Purchase return CRUD
/admin/sellers            — Supplier management
/admin/boms               — BOM management + detail
/admin/raw-materials      — Raw material inventory
/admin/reports            — Analytics: salesman activity, order trends, GST, business
/admin/settings           — Company settings + system config
```

### Primary Executive Pages (7 sections, new)
```
/executive/dashboard      — Team overview: own + SE activity, stock pool levels, alerts
/executive/team           — NEW: list of assigned SEs, their status, activity log
/executive/orders         — Orders from SEs (review/forward) + own orders
/executive/orders/new     — Create new order
/executive/stock          — NEW: assigned stock pool view, product-wise levels, low-stock alerts
/executive/customers      — Customers assigned to PE (filtered view)
/executive/invoicing      — Invoices for PE's customers
```

### Secondary Executive Pages (4 sections)
```
/salesman/dashboard       — Personal dashboard: order summary, assigned stock view
/salesman/orders          — Own orders with status
/salesman/orders/new      — Create new order (stock-aware)
/salesman/customers       — NEW: customers assigned to this SE
```

### Auth Pages
```
/login                    — Login form (remove role dropdown — detect from DB)
/signup                   — Invite-only signup (unchanged)
/                         — Landing page (minimal refresh)
```

---

## Implementation Phases (Minute-Level Plan)

### Phase 0: Cleanup & Foundation (Tasks 0.1–0.9)

**0.1 — Remove location tracking completely**
- Delete files:
  - `components/LocationTrackingWidget.tsx`
  - `components/SalesmanLocationMap.tsx`
  - `components/admin/SalesmanLocationMap.tsx`
  - `components/MapBoundsController.tsx`
  - `hooks/useLocationTracking.ts`
  - `lib/locationService.ts`
  - `lib/leafletIcons.ts`
  - `lib/osmConfig.ts`
  - `models/Location.ts`
  - `app/admin/locations/page.tsx` (entire folder)
  - `app/api/locations/route.ts` (entire folder)
  - `app/api/clear-locations/route.ts` (entire folder)
  - `app/api/test-locations/route.ts` (entire folder)
- Remove location imports from:
  - `components/admin/Sidebar.tsx` — remove "Location Tracking" nav item
  - `app/admin/dashboard/page.tsx` — remove SalesmanLocationMap embed
  - `app/salesman/dashboard/page.tsx` — remove LocationTrackingWidget and SalesmanLocationMap
- Uninstall packages: `leaflet`, `react-leaflet`, `@types/leaflet` (if no other usage)
- Delete `public/leaflet/` assets

**0.2 — Update design system (globals.css + tailwind.config.js)**
- Replace CSS variables in `app/globals.css` with tea-green palette
- Add brand color tokens to `tailwind.config.js` extend.colors
- Update `--primary` HSL to green-600
- Set `--background` to warm `stone-50`
- Update chart colors to green palette

**0.3 — Fix login page**
- Remove role dropdown from login form
- Auto-detect role from user's DB record on login
- Update `app/api/auth/login/route.ts` to return role from DB (not from request body)
- Remove role field from `AuthContext.login()` signature
- Clean up login UI with new color scheme

**0.4 — Remove signup link from navigation**
- Ensure no public signup link exists anywhere
- Keep `/signup?token=` route functional for invited users only
- Remove any "Sign up" buttons from landing page or navigation

**0.5 — Create Supabase `invitations` table**
- Add DDL to `scripts/supabase-schema.sql`
- Run on server

**0.6 — Create `lib/supabase-queries/` foundation**
- Create barrel file `lib/supabase-queries/index.ts`
- Create `lib/supabase-queries/helpers.ts` — shared `getServerClient()`, error handling
- Pattern: each domain file exports async functions that return `{ data, error }`

**0.7 — Migrate first API route to Supabase (proof-of-concept)**
- Convert `app/api/settings/company/route.ts` to use Supabase
- Validate pattern works end-to-end

**0.8 — Update admin sidebar**
- Rename "Salesmen" to "Users" with UserCog icon
- Remove "Location Tracking" item
- Add "Inventory" item with Warehouse icon
- Reorder sections logically

**0.9 — Create executive layout & routing**
- Create `app/executive/layout.tsx` with ProtectedRoute for `primary_executive`
- Create executive sidebar component
- Update `AuthContext` redirect: `primary_executive` → `/executive/dashboard`
- Keep `app/salesman/` for secondary executives

---

### Phase 1: User Management & Auth (Tasks 1.1–1.5)

**1.1 — Rename /admin/salesmen to /admin/users**
- Rename folder `app/admin/salesmen/` → `app/admin/users/`
- Update sidebar href
- Add online/offline status indicator (based on `last_active_at` timestamp)
- Add filters: by role, by approval_status, by online/offline

**1.2 — Add `last_active_at` to users table**
- Add column to Supabase schema: `last_active_at TIMESTAMPTZ`
- Update login API to set `last_active_at = NOW()` on successful login
- Add periodic heartbeat from frontend (every 5 min) to keep status alive
- User is "online" if `last_active_at` > NOW() - 10 minutes

**1.3 — Migrate users API to Supabase**
- Convert `app/api/users/route.ts` (GET/POST)
- Convert `app/api/users/[id]/route.ts` (PUT/DELETE)
- Convert `app/api/users/[id]/approve/route.ts`
- Convert `app/api/users/[id]/reject/route.ts`
- Convert `app/api/users/team/route.ts`

**1.4 — Migrate auth APIs to Supabase**
- Convert `app/api/auth/login/route.ts` — remove role from request, lookup from DB
- Convert `app/api/auth/signup/route.ts`
- Convert `app/api/invitations/send/route.ts`
- Convert `app/api/invitations/validate/route.ts`

**1.5 — Admin user management page UI overhaul**
- Redesign `/admin/users` with new color scheme
- User table with columns: Name, Email, Role, Status (pending/approved), Online/Offline indicator
- Quick actions: Approve, Reject, Edit, View activity
- Invite dialog: email + role selector + manager assignment (for SE)
- Filter bar: role, status, online/offline

---

### Phase 2: Core Data Pages — Supabase Migration (Tasks 2.1–2.6)

**2.1 — Products page + API migration**
- Convert `app/api/products/route.ts` & `[id]/route.ts` to Supabase
- Update UI with new theme
- Show `totalStock` with color-coded indicators (green/amber/red)

**2.2 — Sellers page + API migration**
- Convert `app/api/sellers/route.ts` & `[id]/route.ts` to Supabase
- Update UI with new theme

**2.3 — Raw Materials page + API migration**
- Convert `app/api/raw-materials/route.ts` & `[id]/route.ts` to Supabase
- Update UI with new theme

**2.4 — BOM pages + API migration**
- Convert `app/api/boms/route.ts` & `[id]/route.ts` to Supabase
- Need to query `bom_materials` as nested data (join in select)
- Update UI with new theme

**2.5 — Customers page + API migration**
- Convert `app/api/customers/route.ts` & `[id]/route.ts` & `[id]/transactions/route.ts`
- Role-based filtering (PE sees own, SE sees assigned)
- Update UI with new theme

**2.6 — Company Settings page + API migration**
- Already started in 0.7 (proof-of-concept)
- Add more admin controls:
  - Invoice number format customization
  - Financial year settings
  - Default credit days
  - Tax configuration
  - Notification preferences
- Update UI with new theme, organized in sections/tabs

---

### Phase 3: Inventory & Stock Management (Tasks 3.1–3.4)

**3.1 — Create /admin/inventory page (NEW)**
- Global stock overview: product list with totalStock, assigned, available
- Assignment history: who was assigned what and when
- Stock movement log: assignments, sales, returns
- Low-stock alerts configuration

**3.2 — Migrate assignments API to Supabase**
- Convert `app/api/assignments/route.ts` & `[id]/route.ts`
- Stock deduction logic: update `products.total_stock` via Supabase
- Transaction safety: use Supabase RPC for atomic stock operations

**3.3 — Create /executive/stock page (NEW)**
- PE's assigned stock pool view
- Product-wise breakdown: assigned, sold, available
- Low-stock alerts (configurable threshold)
- Request more stock button (creates a notification/request for admin)

**3.4 — Stock-aware order creation**
- Update `/salesman/orders/new` and `/executive/orders/new`
- Show available stock per product when adding items
- Warn (but don't block) when stock goes negative
- Color-code: green (available), amber (low), red (negative/zero)

---

### Phase 4: Order Flow & Approval System (Tasks 4.1–4.5)

**4.1 — Migrate orders API to Supabase**
- Convert `app/api/orders/route.ts` & `[id]/route.ts`
- Order items: query `order_items` with product join
- Role-based query filtering stays the same
- Add stock validation (soft limit)

**4.2 — Admin orders page UI overhaul**
- Approval queue with clear status badges
- Inline approve/reject with modification
- Filter by PE, SE, status, date range
- Show original vs modified totals
- Bulk approve/reject

**4.3 — PE order review page (/executive/orders)**
- Two tabs: "Team Orders" (from SEs) and "My Orders"
- Team orders: review, modify, forward to admin
- My orders: create, view status
- Stock context shown on each order

**4.4 — SE order page update (/salesman/orders)**
- Show order status with clear flow visualization
- Stock availability shown when creating orders
- Can only edit orders in `pending_primary` status

**4.5 — Order notification system**
- When SE submits → PE gets notified (in-app badge)
- When PE forwards → Admin gets notified
- When Admin approves/rejects → PE + SE get notified
- Simple: poll-based notification counter in header

---

### Phase 5: Financial & Invoicing — Supabase Migration (Tasks 5.1–5.5)

**5.1 — Migrate sales API to Supabase**
- Convert `app/api/sales/route.ts`
- Role-based filtering

**5.2 — Migrate invoices API to Supabase**
- Convert `app/api/invoices/route.ts`, `[id]/route.ts`, `manual/route.ts`
- Invoice number generation: use Supabase trigger (already defined)
- PDF generation: keep server-side, just change data source

**5.3 — Migrate payments API to Supabase**
- Convert `app/api/payments/route.ts` & `[id]/route.ts`
- Balance recalculation logic

**5.4 — Migrate sale returns API to Supabase**
- Convert `app/api/sale-returns/route.ts` & `[id]/route.ts`
- Transaction-like operations: use Supabase RPC

**5.5 — Migrate purchases & purchase returns API to Supabase**
- Convert `app/api/purchases/route.ts` & `[id]/route.ts`
- Convert `app/api/purchase-returns/route.ts` & `[id]/route.ts` & `purchases/route.ts`
- Financial pages UI update

---

### Phase 6: Executive Dashboard & Team Pages (Tasks 6.1–6.4)

**6.1 — Create /executive/dashboard**
- Team stats: total orders (pending/approved/rejected), total sales value
- Stock pool summary with low-stock alerts
- SE activity feed (recent orders from team)
- Quick actions: review orders, view stock

**6.2 — Create /executive/team page (NEW)**
- List of assigned SEs with:
  - Name, email, status (online/offline via last_active_at)
  - Order count (today/week/month)
  - Total sales value
- Click to view SE's order history

**6.3 — Create /executive/customers**
- Customers assigned to this PE
- Outstanding balance, recent transactions
- Same component as admin customers but filtered

**6.4 — Create /executive/invoicing**
- Invoices for PE's customers
- Same component as admin invoicing but filtered

---

### Phase 7: Analytics & Reports (Tasks 7.1–7.3)

**7.1 — Migrate reports API to Supabase**
- Convert `app/api/reports/business/route.ts`
- Convert `app/api/reports/gst/route.ts`
- Convert `app/api/financial/stats/route.ts` & `outstanding/route.ts`
- Aggregation queries: use Supabase RPC or client-side aggregation

**7.2 — Enhanced admin reports page**
- Salesman activity dashboard:
  - Orders per SE/PE (bar chart)
  - Sales value per SE/PE (line chart)
  - Approval rate (pie chart)
  - Activity heatmap (orders by day/hour)
- Stock movement reports
- Customer acquisition/retention

**7.3 — Update admin dashboard**
- Redesign with new color scheme
- Key metric cards: Total Revenue, Pending Orders, Active Users, Stock Alerts
- Recent activity feed (orders, approvals, payments)
- Remove location map (replaced with activity chart)

---

### Phase 8: SE Dashboard & Polish (Tasks 8.1–8.4)

**8.1 — Update /salesman/dashboard**
- Remove location tracking widget and map
- Add: order summary (today/week/month), stock availability
- Recent orders with status
- Assigned PE info

**8.2 — Create /salesman/customers (NEW)**
- Customers assigned to this SE
- Contact details, recent orders per customer

**8.3 — UI polish pass**
- Apply new color scheme to ALL remaining pages
- Consistent card styling, button hierarchy, spacing
- Mobile responsiveness check
- Loading states, empty states, error states

**8.4 — Update landing page**
- Clean hero with new brand colors
- Login-only CTA (no signup link)
- Professional tea-industry imagery/styling

---

### Phase 9: Cleanup & Final Migration (Tasks 9.1–9.4)

**9.1 — Remove all MongoDB imports**
- Delete `lib/mongodb.ts`, `lib/dbTypes.ts`, `lib/testModels.ts`
- Delete all files in `models/` (replaced by Supabase types)
- Remove `mongoose` from package.json dependencies
- Delete test/utility API routes: `test-db`, `test-models`, `test-users`, `debug-token`, `seed`

**9.2 — Generate Supabase TypeScript types**
- Run `npx supabase gen types typescript` against the `sohag` schema
- Create `types/supabase.ts` with generated types
- Update all query files to use typed responses

**9.3 — Remove deprecated files**
- `lib/mockData.ts`
- `lib/seedDatabase.ts`
- `lib/db-optimization.ts`
- `package-updates.json`
- `app/admin/fix-balances/page.tsx` (utility page, no longer needed)

**9.4 — Final testing & deployment**
- Verify all API routes work with Supabase
- Test all role-based flows end-to-end
- Update `scripts/supabase-schema.sql` with any new columns/tables added during implementation
- Deploy to production server

---

## File Deletion Summary

### Location Tracking (Phase 0.1)
```
DELETE: components/LocationTrackingWidget.tsx
DELETE: components/SalesmanLocationMap.tsx
DELETE: components/admin/SalesmanLocationMap.tsx
DELETE: components/MapBoundsController.tsx
DELETE: hooks/useLocationTracking.ts
DELETE: lib/locationService.ts
DELETE: lib/leafletIcons.ts
DELETE: lib/osmConfig.ts
DELETE: models/Location.ts
DELETE: app/admin/locations/ (entire folder)
DELETE: app/api/locations/ (entire folder)
DELETE: app/api/clear-locations/ (entire folder)
DELETE: app/api/test-locations/ (entire folder)
DELETE: public/leaflet/ (entire folder)
```

### Cleanup (Phase 9)
```
DELETE: lib/mongodb.ts
DELETE: lib/dbTypes.ts
DELETE: lib/testModels.ts
DELETE: lib/mockData.ts
DELETE: lib/seedDatabase.ts
DELETE: lib/db-optimization.ts
DELETE: models/ (entire folder — replaced by Supabase types)
DELETE: package-updates.json
DELETE: app/admin/fix-balances/ (entire folder)
DELETE: app/api/test-db/ (entire folder)
DELETE: app/api/test-models/ (entire folder)
DELETE: app/api/test-users/ (entire folder)
DELETE: app/api/debug-token/ (entire folder)
DELETE: app/api/seed/ (entire folder)
DELETE: app/api/geocode/ (entire folder)
```

## New Files Summary

### Phase 0
```
CREATE: lib/supabase-queries/index.ts
CREATE: lib/supabase-queries/helpers.ts
CREATE: app/executive/layout.tsx
CREATE: components/executive/Sidebar.tsx
```

### Phase 1
```
RENAME: app/admin/salesmen/ → app/admin/users/
```

### Phase 3
```
CREATE: app/admin/inventory/page.tsx
CREATE: app/executive/stock/page.tsx
```

### Phase 4
```
CREATE: app/executive/orders/page.tsx
CREATE: app/executive/orders/new/page.tsx
```

### Phase 6
```
CREATE: app/executive/dashboard/page.tsx
CREATE: app/executive/team/page.tsx
CREATE: app/executive/customers/page.tsx
CREATE: app/executive/invoicing/page.tsx
```

### Phase 8
```
CREATE: app/salesman/customers/page.tsx
```

### Per Phase (incremental)
```
CREATE: lib/supabase-queries/users.ts
CREATE: lib/supabase-queries/products.ts
CREATE: lib/supabase-queries/customers.ts
CREATE: lib/supabase-queries/sellers.ts
CREATE: lib/supabase-queries/raw-materials.ts
CREATE: lib/supabase-queries/boms.ts
CREATE: lib/supabase-queries/orders.ts
CREATE: lib/supabase-queries/invoices.ts
CREATE: lib/supabase-queries/sales.ts
CREATE: lib/supabase-queries/sale-returns.ts
CREATE: lib/supabase-queries/payments.ts
CREATE: lib/supabase-queries/purchases.ts
CREATE: lib/supabase-queries/purchase-returns.ts
CREATE: lib/supabase-queries/assignments.ts
CREATE: lib/supabase-queries/invitations.ts
CREATE: lib/supabase-queries/financial.ts
CREATE: lib/supabase-queries/reports.ts
CREATE: lib/supabase-queries/settings.ts
```
- [ ] Push final code via CI/CD.
- [ ] Decommission MongoDB Atlas instance.

### 4. Automated Backups (Cron)
- [ ] Install Postgres client: `sudo apt install postgresql-client`.
- [ ] Create `backup_db.sh` to run `pg_dump` targeting the Supabase URI, outputting to `/mnt/leaftrack_storage/db_backups`.
- [ ] Make executable (`chmod +x`).
- [ ] Add to Crontab (`crontab -e`) to run quarterly: `0 0 1 */3 * /home/$USER/backup_db.sh`.