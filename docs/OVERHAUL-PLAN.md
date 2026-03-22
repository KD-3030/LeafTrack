# LeafTrack — Complete Overhaul Plan

> **Status:** Planning  
> **Created:** March 10, 2026  
> **Target Launch:** ~10 weeks from start  
> **Branch:** `feature/modern-stack-overhaul` (parallel development, zero downtime)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Target Architecture](#3-target-architecture)
4. [Key Decisions & Rationale](#4-key-decisions--rationale)
5. [Phase 1 — Foundation Setup](#phase-1--foundation-setup-weeks-12)
6. [Phase 2 — Convex Database Migration](#phase-2--convex-database-migration-weeks-23)
7. [Phase 3 — Better Auth Implementation](#phase-3--better-auth-implementation-weeks-34)
8. [Phase 4 — Feature Migration](#phase-4--feature-migration-weeks-46)
9. [Phase 5 — Professional Landing Page](#phase-5--professional-landing-page-weeks-67)
10. [Phase 6 — UI Polish & Optimization](#phase-6--ui-polish--optimization-weeks-78)
11. [Phase 7 — Security Hardening](#phase-7--security-hardening-week-8)
12. [Phase 8 — Deployment Preparation](#phase-8--deployment-preparation-week-9)
13. [Phase 9 — Launch](#phase-9--launch-week-10)
14. [Technical Debt Cleanup](#14-technical-debt-cleanup)
15. [Testing Checklist](#15-testing-checklist)
16. [Environment Variables Reference](#16-environment-variables-reference)
17. [Timeline Summary](#17-timeline-summary)
18. [Post-Launch Roadmap](#18-post-launch-roadmap)

---

## 1. Executive Summary

LeafTrack is a functioning enterprise tea distribution management system. It works, but the underlying architecture carries significant technical debt that will become progressively more expensive to maintain:

- **Next.js 14** — one major version behind; misses server actions, improved caching, and compiler improvements in v15
- **localStorage JWT auth** — XSS-vulnerable, no server-enforcement, no refresh tokens, no session invalidation
- **MongoDB/Mongoose** — manually typed, no real-time support, verbose query patterns
- **Flat component structure** — growing components folder has no organizational principle
- **Dual toast systems** — Sonner + Radix Toast both installed and used in different places
- **No Next.js middleware** — every route relies entirely on client-side `<ProtectedRoute>` wrappers
- **Debug routes in production** — `/test-salesman`, `/debug-auth`, `/api/test-*`, `/api/debug-*` are all accessible
- **TypeScript `ignoreBuildErrors: true`** in dev config — type safety only enforced at production build time

**The overhaul targets:**

| Concern | Before | After |
|---|---|---|
| Framework | Next.js 14.2.35 | Next.js 15.x |
| Runtime | React 18.3.0 | React 19.x |
| TypeScript | 5.5.0 | 5.7.x |
| Auth | Custom JWT + localStorage | Better Auth + httpOnly cookies |
| Database | MongoDB + Mongoose | Convex |
| Route protection | Client-side `<ProtectedRoute>` | Next.js `middleware.ts` |
| Component org | Flat `components/` | Feature-based `features/` + `components/layout/` + `components/common/` |
| Toast system | Sonner + Radix Toast (both) | Sonner only |
| Deployment | Vercel (basic) | Vercel (optimised) + Docker-ready for future private server |

---

## 2. Current State Audit

### 2.1 Dependencies

```json
// Current versions (package.json)
"next": "14.2.35",        // → target: 15.x
"react": "^18.3.0",       // → target: 19.x
"react-dom": "^18.3.0",   // → target: 19.x
"typescript": "^5.5.0",   // → target: 5.7.x

// Unused — remove
"pg": "^8.16.3",
"@types/pg": "^8.15.5",

// Consolidate — keep Sonner, remove Radix toast
"@radix-ui/react-toast": "^1.2.1",   // REMOVE
"sonner": "^1.7.4",                   // KEEP
```

### 2.2 Authentication Vulnerabilities

| Issue | Location | Risk |
|---|---|---|
| Token in localStorage | `contexts/AuthContext.tsx` | XSS can steal tokens |
| No server middleware | (missing `middleware.ts`) | API routes accessible without auth if client check skipped |
| Inconsistent JWT verification | `lib/auth.ts` vs raw `jwt.verify()` in some routes | Auth bypass possible if wrong path taken |
| No refresh tokens | `lib/auth.ts` (7-day expiry only) | Long sessions can't be revoked |
| Unused `lib/auth-improved.ts` | `lib/auth-improved.ts` | Dead code with refresh token logic written but never wired up |
| Debug token route | `app/api/debug-token/` | Token inspection endpoint in production |

### 2.3 Project Structure Problems

```
components/               # No organisation principle
  ui/                     # 42 shadcn components (fine)
  admin/                  # Only 3 files — inconsistently used
  SalesmanLocationMap.backup.tsx   # ← backup file in source
  LocationTrackingWidget.tsx
  MapBoundsController.tsx
  ProtectedRoute.tsx
  ErrorBoundary.tsx

app/
  test-salesman/          # ← debug page, should not be in production
  debug-auth/             # ← debug page, should not be in production
  api/
    test-db/              # ← test routes in production
    test-users/
    test-locations/
    debug-token/

lib/
  auth.ts                 # active auth utilities
  auth-improved.ts        # dead code — refresh token version, never used
  mongodb.ts              # DB connection
  db-optimization.ts      # duplicate/extension of mongodb.ts
```

### 2.4 Toast System Conflict

- `app/layout.tsx` — imports Sonner `<Toaster />`
- `app/admin/layout.tsx` — imports Radix `<Toaster />` from `components/ui/toaster`
- Most pages: `import { toast } from 'sonner'`
- Some admin pages (e.g., `app/admin/invoicing/page.tsx`): use Radix `useToast()`

This means admin pages have **two** toast providers active simultaneously.

### 2.5 Key Strengths to Preserve

- GST-compliant invoice system with CGST/SGST/IGST/HSN codes — complex business logic, migrate carefully
- 16 well-defined Mongoose models — good starting schema for Convex
- PDF generation (jsPDF + autotable) — preserve as-is, just update imports
- Rate limiting in `lib/rateLimit.ts` — keep logic, move to middleware
- Security headers in `next.config.production.js` — migrate to `next.config.ts`
- Real-time location tracking architecture — gets better with Convex subscriptions
- Comprehensive `scripts/` folder — migration scripts for data handling

---

## 3. Target Architecture

### 3.1 Folder Structure

```
leaftrack/
├── app/                         # Next.js App Router
│   ├── (marketing)/             # Route group — public marketing pages
│   │   ├── page.tsx             # Landing page
│   │   └── layout.tsx
│   ├── (auth)/                  # Route group — login/signup
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/             # Route group — protected app
│   │   ├── admin/               # Admin routes
│   │   ├── salesman/            # Salesman routes
│   │   └── layout.tsx
│   └── api/
│       └── auth/                # Better Auth handler only
│           └── [...all]/route.ts
│
├── features/                    # Feature-based modules
│   ├── auth/
│   │   ├── components/          # LoginForm, SignupForm, UserMenu
│   │   ├── actions.ts           # Server actions (login, logout, signup)
│   │   └── types.ts
│   ├── customers/
│   │   ├── components/          # CustomerTable, CustomerForm, CustomerCard
│   │   ├── actions.ts
│   │   └── types.ts
│   ├── products/
│   ├── invoices/                # Complex — GST logic lives here
│   ├── orders/
│   ├── payments/
│   ├── purchases/
│   ├── purchase-returns/
│   ├── sellers/
│   ├── financial/
│   ├── reports/
│   ├── locations/               # GPS tracking
│   └── bom/                     # Bill of Materials
│
├── components/
│   ├── ui/                      # shadcn components (unchanged)
│   ├── layout/                  # App shell components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── DashboardShell.tsx
│   └── common/                  # Reusable domain-agnostic components
│       ├── DataTable.tsx
│       ├── PageHeader.tsx
│       ├── StatCard.tsx
│       ├── EmptyState.tsx
│       └── LoadingState.tsx
│
├── convex/                      # Convex backend (replaces app/api/ + models/)
│   ├── schema.ts                # Database schema (replaces models/)
│   ├── auth.ts                  # Better Auth + Convex integration
│   ├── customers.ts             # Customer queries/mutations
│   ├── products.ts
│   ├── invoices.ts
│   ├── orders.ts
│   ├── payments.ts
│   ├── purchases.ts
│   ├── sellers.ts
│   ├── financial.ts
│   ├── reports.ts
│   ├── locations.ts
│   └── _generated/              # Auto-generated by Convex CLI
│
├── lib/
│   ├── auth.ts                  # Better Auth server instance
│   ├── convex.ts                # Convex client setup
│   └── utils.ts                 # cn() and shared utilities
│
├── config/
│   └── site.ts                  # Branding, navigation, feature flags
│
├── types/
│   └── index.ts                 # Shared TypeScript types
│
├── middleware.ts                 # Route protection (NEW)
├── next.config.ts               # Unified Next.js config (replaces dual configs)
└── convex.json                  # Convex project config
```

### 3.2 Authentication Flow (Better Auth)

```
User visits /admin/*
      ↓
middleware.ts (server-side)
      ↓ checks httpOnly session cookie
      ↓ no cookie / invalid → redirect /login
      ↓ valid cookie, role=admin → allow
      ↓ valid cookie, role=salesman → redirect /salesman/dashboard
      ↓
Admin page renders (server component)
      ↓
Better Auth session available via auth.api.getSession()
      ↓
Convex queries run with authenticated user context
```

### 3.3 Data Flow (Convex)

```
React Component (client)
      ↓ useQuery(api.customers.list, { page: 1 })
Convex Runtime (serverless)
      ↓ validates auth, runs query
Convex Database
      ↓ returns typed result
React Component
      ↓ auto re-renders when data changes (real-time)
```

No manual fetch(), no API routes for data, no JWT headers in client code.

---

## 4. Key Decisions & Rationale

### 4.1 Better Auth (over Clerk / NextAuth v5)

| | Better Auth | Clerk | NextAuth v5 |
|---|---|---|---|
| Cost | Free | $0-25/mo | Free |
| Hosting | Self-hosted | Managed | Self-hosted |
| httpOnly cookies | ✅ Built-in | ✅ | ✅ |
| Convex adapter | ✅ Available | ❌ Custom work | ⚠️ Possible |
| Private server ready | ✅ | ❌ Vendor lock-in | ✅ |
| Setup complexity | Medium | Low | High |
| CSRF protection | ✅ Built-in | ✅ | Manual |

**Decision:** Better Auth. Full control, no vendor lock-in, works identically on Vercel and a private VPS, and has a maintained Convex adapter.

### 4.2 Convex (over staying with MongoDB)

| | Convex | MongoDB + Mongoose |
|---|---|---|
| TypeScript | Auto-generated types | Manual interface definitions |
| Real-time | ✅ Built-in subscriptions | ❌ Requires polling or WebSockets |
| Auth integration | ✅ First-class | Manual middleware per route |
| Serverless | ✅ | Requires connection pooling |
| Location tracking | Real-time push | Polling workarounds |
| Maintenance | Managed infrastructure | Connection pooling, index management |
| Learning curve | Medium | Already known |

**Decision:** Migrate to Convex. Location tracking becomes genuinely real-time, auth integrates cleanly, and TypeScript types are generated automatically — eliminating the triple-validation pattern (interface + Mongoose schema + manual type guards).

### 4.3 Hybrid Deployment (Vercel now, private server later)

- Vercel: zero-config, fast to deploy, works immediately
- Next.js `output: 'standalone'` (already in `next.config.js`) makes the app containerisable
- Docker + Caddy setup documented in [Phase 8](#phase-8--deployment-preparation-week-9) for future migration
- No code changes needed to move from Vercel to a VPS

### 4.4 Parallel Development Branch

- Production system stays live and functional throughout
- `feature/modern-stack-overhaul` developed independently
- Data migration only happens at final launch (Phase 9)
- Rollback: merge main back, revert DNS — MongoDB backup kept 30 days post-launch

---

## Phase 1 — Foundation Setup (Weeks 1–2)

### 1.1 Create Development Branch

```bash
git checkout -b feature/modern-stack-overhaul
```

### 1.2 Upgrade Core Dependencies

```bash
# Upgrade Next.js, React, TypeScript
npm install next@latest react@latest react-dom@latest
npm install -D typescript@latest @types/react@latest @types/react-dom@latest @types/node@latest

# Remove unused packages
npm uninstall pg @types/pg

# Remove Radix toast (keeping Sonner)
npm uninstall @radix-ui/react-toast

# Update all Radix components to latest
npm install @radix-ui/react-accordion@latest @radix-ui/react-alert-dialog@latest \
  @radix-ui/react-avatar@latest @radix-ui/react-checkbox@latest \
  @radix-ui/react-dialog@latest @radix-ui/react-dropdown-menu@latest \
  @radix-ui/react-label@latest @radix-ui/react-navigation-menu@latest \
  @radix-ui/react-popover@latest @radix-ui/react-progress@latest \
  @radix-ui/react-radio-group@latest @radix-ui/react-scroll-area@latest \
  @radix-ui/react-select@latest @radix-ui/react-separator@latest \
  @radix-ui/react-slider@latest @radix-ui/react-slot@latest \
  @radix-ui/react-switch@latest @radix-ui/react-tabs@latest \
  @radix-ui/react-tooltip@latest

# Update lucide-react
npm install lucide-react@latest

# Add new dependencies
npm install better-auth convex zod
```

### 1.3 Create New Folder Structure

```bash
# Create feature folders
mkdir -p features/{auth,customers,products,invoices,orders,payments,purchases,purchase-returns,sellers,financial,reports,locations,bom}/components

# Create component folders
mkdir -p components/{layout,common}

# Create config folder
mkdir -p config
```

### 1.4 Consolidate Next.js Config

Replace the dual `next.config.js` / `next.config.production.js` pattern with a single `next.config.ts`:

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default config;
```

### 1.5 Update TypeScript Config

```json
// tsconfig.json — add strict options
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

### 1.6 Technical Debt Cleanup

Files to **delete**:

| File | Reason |
|---|---|
| `components/SalesmanLocationMap.backup.tsx` | Backup file, not imported anywhere |
| `lib/auth-improved.ts` | Dead code — refresh token version never wired up |
| `lib/db-optimization.ts` | Functionality being superseded by Convex |
| `app/test-salesman/` | Debug route — must not be in production |
| `app/debug-auth/` | Debug route — must not be in production |
| `app/api/test-db/` | Test API route |
| `app/api/test-users/` | Test API route |
| `app/api/test-locations/` | Test API route |
| `app/api/debug-token/` | Security risk — token inspection endpoint |
| `components/ui/toaster.tsx` | Radix toast component (keeping Sonner) |

---

## Phase 2 — Convex Database Migration (Weeks 2–3)

### 2.1 Convex Setup

```bash
npx convex dev   # Follow prompts to create/link project
```

This creates:
- `convex/` directory with `_generated/` subfolder
- `convex.json` with project deployment URL
- Updates `.env.local` with `NEXT_PUBLIC_CONVEX_URL`

### 2.2 Schema Design

The Convex schema (`convex/schema.ts`) maps directly from the 16 existing Mongoose models:

```typescript
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal('admin'), v.literal('salesman'), v.literal('customer')),
    passwordHash: v.string(),
    isActive: v.boolean(),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  products: defineTable({
    name: v.string(),
    sku: v.string(),
    category: v.string(),
    unit: v.string(),
    pricePerUnit: v.number(),
    currentStock: v.number(),
    minStockLevel: v.number(),
    hsnCode: v.optional(v.string()),
    gstRate: v.optional(v.number()),        // GST %
    isActive: v.boolean(),
  })
    .index('by_sku', ['sku'])
    .index('by_category', ['category']),

  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.string(),
    gstNumber: v.optional(v.string()),
    outstandingBalance: v.number(),
    assignedSalesmanId: v.optional(v.id('users')),
    isActive: v.boolean(),
  })
    .index('by_salesman', ['assignedSalesmanId'])
    .index('by_phone', ['phone']),

  invoices: defineTable({
    invoiceNumber: v.string(),
    customerId: v.id('customers'),
    salesmanId: v.optional(v.id('users')),
    items: v.array(v.object({
      productId: v.id('products'),
      productName: v.string(),
      hsnCode: v.optional(v.string()),
      quantity: v.number(),
      unit: v.string(),
      pricePerUnit: v.number(),
      discount: v.optional(v.number()),
      cgst: v.optional(v.number()),
      sgst: v.optional(v.number()),
      igst: v.optional(v.number()),
      totalPrice: v.number(),
    })),
    subtotal: v.number(),
    totalCgst: v.number(),
    totalSgst: v.number(),
    totalIgst: v.number(),
    totalAmount: v.number(),
    paidAmount: v.number(),
    pendingAmount: v.number(),
    status: v.union(
      v.literal('draft'),
      v.literal('sent'),
      v.literal('paid'),
      v.literal('partial'),
      v.literal('overdue'),
      v.literal('cancelled')
    ),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.number()),        // Unix timestamp
  })
    .index('by_customer', ['customerId'])
    .index('by_invoice_number', ['invoiceNumber'])
    .index('by_status', ['status'])
    .index('by_salesman', ['salesmanId']),

  // ... orders, payments, purchases, purchaseReturns,
  //     sales, saleReturns, sellers, assignments,
  //     locations, bom, rawMaterials, companySettings
});
```

> **Note on GST fields:** The existing `models/Invoice.ts` has comprehensive GST logic. Preserve every field — CGST, SGST, IGST, HSN codes, tax rate, taxable amounts — exactly as-is in the Convex schema.

### 2.3 Data Migration Script

```typescript
// scripts/migrate-mongo-to-convex.ts
// 1. Connect to MongoDB using existing MONGODB_URI
// 2. Export all documents from each collection
// 3. Transform ObjectId references to Convex-format IDs
// 4. Import via Convex HTTP API

// Run: npx tsx scripts/migrate-mongo-to-convex.ts
```

Migration order (respects references):
1. `users` (no dependencies)
2. `products`, `rawMaterials` (no dependencies)
3. `customers`, `sellers` (reference users)
4. `assignments` (references users + customers)
5. `invoices`, `orders`, `purchases` (reference customers + products)
6. `payments`, `saleReturns`, `purchaseReturns` (reference invoices/orders)
7. `locations` (references users)
8. `bom` (references products + rawMaterials)
9. `companySettings` (no dependencies)

### 2.4 Convex Functions Pattern

Each entity gets a dedicated file in `convex/`:

```typescript
// convex/customers.ts
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

export const list = query({
  args: {
    page: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthenticated');
    // query logic
  },
});

export const create = mutation({
  args: { name: v.string(), phone: v.string(), /* ... */ },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthenticated');
    return await ctx.db.insert('customers', { ...args, outstandingBalance: 0, isActive: true });
  },
});
```

---

## Phase 3 — Better Auth Implementation (Weeks 3–4)

### 3.1 Installation

```bash
npm install better-auth
# Convex adapter
npm install @better-auth/convex
```

### 3.2 Better Auth Server Config

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth';
import { convexAdapter } from '@better-auth/convex';
import { convex } from './convex';

export const auth = betterAuth({
  database: convexAdapter(convex),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,   // optional for internal tool
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,        // 7 days — matches current JWT expiry
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: { enabled: false },
  },
});

export type Session = typeof auth.$Infer.Session;
```

### 3.3 API Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

### 3.4 Next.js Middleware

```typescript
// middleware.ts (NEW FILE — does not exist currently)
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth-client';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — no auth required
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Role enforcement
  if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/salesman/dashboard', req.url));
  }

  if (pathname.startsWith('/salesman') && session.user.role === 'customer') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
```

### 3.5 Client Auth Hook

```typescript
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

### 3.6 Migrate Login/Signup Pages

Replace `contexts/AuthContext.tsx` usage with Better Auth hooks:

```typescript
// Before (AuthContext.tsx pattern)
const { login, user, isLoading } = useAuth();

// After (Better Auth)
const { data: session, isPending } = useSession();
const handleLogin = async () => {
  await signIn.email({ email, password, callbackURL: '/admin/dashboard' });
};
```

---

## Phase 4 — Feature Migration (Weeks 4–6)

### 4.1 Feature Folder Convention

Each feature follows this structure:

```
features/invoices/
├── components/
│   ├── InvoiceTable.tsx      # List view
│   ├── InvoiceForm.tsx       # Create/edit form
│   ├── InvoiceDetail.tsx     # Detail view
│   └── InvoicePDF.tsx        # PDF generation (from existing code)
├── actions.ts                # Server actions (create, update, delete)
├── types.ts                  # Feature-specific TypeScript types
└── hooks.ts                  # Feature-specific React hooks (useInvoices, etc.)
```

### 4.2 Admin Page Migration Checklist

| Current Path | New Feature Folder | Convex File | Status |
|---|---|---|---|
| `app/admin/customers/` | `features/customers/` | `convex/customers.ts` | ⬜ |
| `app/admin/products/` | `features/products/` | `convex/products.ts` | ⬜ |
| `app/admin/invoicing/` | `features/invoices/` | `convex/invoices.ts` | ⬜ |
| `app/admin/orders/` | `features/orders/` | `convex/orders.ts` | ⬜ |
| `app/admin/payments/` | `features/payments/` | `convex/payments.ts` | ⬜ |
| `app/admin/purchases/` | `features/purchases/` | `convex/purchases.ts` | ⬜ |
| `app/admin/purchase-returns/` | `features/purchase-returns/` | `convex/purchaseReturns.ts` | ⬜ |
| `app/admin/sellers/` | `features/sellers/` | `convex/sellers.ts` | ⬜ |
| `app/admin/financial/` | `features/financial/` | `convex/financial.ts` | ⬜ |
| `app/admin/reports/` | `features/reports/` | `convex/reports.ts` | ⬜ |
| `app/admin/dashboard/` | `features/dashboard/` | (multiple queries) | ⬜ |
| `app/salesman/dashboard/` | `features/salesman-dashboard/` | (multiple queries) | ⬜ |
| `app/salesman/orders/` | `features/orders/` | `convex/orders.ts` | ⬜ |
| `app/admin/locations/` | `features/locations/` | `convex/locations.ts` | ⬜ |

### 4.3 API Route Consolidation

Current `app/api/` routes (25+) are replaced by Convex. After migration, the only API routes remaining in `app/api/` are:

```
app/api/
└── auth/
    └── [...all]/route.ts    # Better Auth handler (only remaining route)
```

Everything else (customers, products, invoices, payments, etc.) moves to Convex mutations/queries called directly from client components or server actions.

### 4.4 Common Components to Extract

During migration, extract these reusable patterns into `components/common/`:

**`DataTable.tsx`** — Extract from repeated table patterns in admin pages:
- Column definitions prop
- Sorting state
- Search/filter input
- Pagination controls
- Row actions (edit/delete)

**`StatCard.tsx`** — Extract from dashboard metric cards:
- Title, value, change indicator (up/down)
- Icon slot
- Loading skeleton state

**`PageHeader.tsx`** — Extract from page titles:
- Title + description
- Breadcrumb slot
- Action button slot (e.g., "Add New")

**`EmptyState.tsx`** — Extract from empty list states:
- Icon + title + description
- Optional CTA button

### 4.5 Layout Components

**`components/layout/Sidebar.tsx`** — Extract from `app/admin/layout.tsx`:
- Navigation links with active states
- Collapsible mobile drawer
- Role-aware link visibility

**`components/layout/Header.tsx`** — Merged from `components/ui/navigation.tsx`:
- Logo + app name
- User avatar + name + role badge
- Logout button
- Notification bell (future)

**`components/layout/DashboardShell.tsx`** — Wrapper that composes Sidebar + Header:
```typescript
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## Phase 5 — Professional Landing Page (Weeks 6–7)

### 5.1 Site Configuration

```typescript
// config/site.ts
export const siteConfig = {
  name: 'LeafTrack',
  tagline: 'The smart way to manage your tea distribution business',
  description:
    'End-to-end distribution management — invoicing, inventory, GPS tracking, and GST-compliant reporting built for tea traders.',
  logo: {
    emoji: '🍃',
    svgPath: '/logo.svg',
  },
  colors: {
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#F5F5DC',
  },
  fonts: {
    heading: 'Montserrat',
    display: 'Playfair Display',
    body: 'Inter',
  },
  navigation: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
  ],
  features: [
    {
      icon: 'FileText',
      title: 'GST-Compliant Invoicing',
      description: 'Generate invoices with CGST, SGST & IGST breakdown. Print-ready PDF output.',
    },
    {
      icon: 'Package',
      title: 'Inventory Management',
      description: 'Track stock levels in real-time with low-stock alerts and reorder triggers.',
    },
    {
      icon: 'MapPin',
      title: 'Live GPS Tracking',
      description: 'Monitor your sales team location in real-time with route history.',
    },
    {
      icon: 'BarChart3',
      title: 'Financial Dashboard',
      description: 'Profit/loss, outstanding balances, and payment trends at a glance.',
    },
    {
      icon: 'Users',
      title: 'Multi-Role Access',
      description: 'Admin, Salesman, and Customer roles with appropriate access controls.',
    },
    {
      icon: 'FileBarChart',
      title: 'GST Reports',
      description: 'GSTR-1, GSTR-3B ready reports. Export to Excel for CA submission.',
    },
    {
      icon: 'ShoppingCart',
      title: 'Purchase Management',
      description: 'Track purchases, purchase returns, and supplier accounts in one place.',
    },
    {
      icon: 'CreditCard',
      title: 'Payment Tracking',
      description: 'Record payments against invoices, track outstanding dues, send reminders.',
    },
  ],
  social: {
    // Add when available
  },
  contact: {
    email: '',     // Add company email
    phone: '',     // Add company phone
  },
};
```

### 5.2 Landing Page Sections

**Section 1 — Hero**
- Full-width section, centered content
- Large headline using Playfair Display
- Sub-headline in Inter
- Two CTAs: "Start Free Trial" (primary, green) + "See Demo" (secondary, outline)
- Dashboard screenshot/mockup below on desktop

**Section 2 — Social Proof Strip**
- Simple row: "Trusted by X businesses | ₹XX lakhs managed | Y invoices generated"
- Placeholder values initially, replace with real data

**Section 3 — Features Grid**
- 2-column (mobile) → 4-column (desktop) grid
- Icon + title + description per card
- Subtle card hover effect
- 8 features from `siteConfig.features`

**Section 4 — How It Works**
- 3-step horizontal flow (desktop) / vertical (mobile)
- Step 1: "Add your products & customers"
- Step 2: "Create invoices & record sales"
- Step 3: "Track payments & generate GST reports"
- Connecting arrows between steps

**Section 5 — Testimonials** *(placeholder until real testimonials available)*
- 2-3 quote cards
- Placeholder: "Our CA loves the GST reports — saving us 2 hours every month."

**Section 6 — Pricing** *(optional)*
- Single plan card or "Contact for pricing"
- List key features included

**Section 7 — CTA Banner**
- Final call-to-action before footer
- "Ready to streamline your distribution?" + "Get Started" button

**Section 8 — Footer**
- Logo + brief description
- Navigation links
- Contact info (email, phone)
- Copyright © 2026 LeafTrack
- Privacy Policy + Terms of Service links (placeholder pages)

### 5.3 SVG Logo Design Spec

File: `public/logo.svg`

```svg
<!-- Tea leaf + subtle geometric shape -->
<!-- Primary color: #22c55e -->
<!-- Accent: #16a34a for depth -->
<!-- Clean, modern, scalable -->
<!-- Works at 16px (favicon) and 200px (header) -->
```

Variants needed:
- `public/logo.svg` — full color (for light backgrounds)
- `public/logo-dark.svg` — white variant (for dark backgrounds / dark mode)
- `public/favicon.ico` — 32×32 ICO
- `public/apple-touch-icon.png` — 180×180

### 5.4 Updated Layout Metadata

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: {
    default: 'LeafTrack — Tea Distribution Management',
    template: '%s | LeafTrack',
  },
  description: siteConfig.description,
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'LeafTrack',
    description: siteConfig.description,
    type: 'website',
  },
};
```

---

## Phase 6 — UI Polish & Optimization (Weeks 7–8)

### 6.1 Toast System Consolidation

All usage of Radix `useToast()` / `<Toaster />` replaced with Sonner equivalents:

```typescript
// Before (Radix)
import { useToast } from '@/components/ui/use-toast';
const { toast } = useToast();
toast({ title: 'Success', description: 'Invoice created' });

// After (Sonner)
import { toast } from 'sonner';
toast.success('Invoice created');
toast.error('Failed to create invoice');
toast.loading('Generating PDF...');
toast.promise(createInvoice(data), {
  loading: 'Creating invoice...',
  success: 'Invoice created!',
  error: 'Failed to create invoice',
});
```

Files requiring updates:
- `app/admin/layout.tsx` — remove Radix `<Toaster />`, it's already in root `app/layout.tsx`
- `app/admin/invoicing/page.tsx` — switch to Sonner
- Any other page importing `useToast` from `@/components/ui/use-toast`

### 6.2 TypeScript Strict Mode Fixes

Priority fixes when `"strict": true` is enabled:

| File | Issue | Fix |
|---|---|---|
| `lib/security.ts` | `any` types in crypto functions | Add proper crypto type imports |
| `lib/leafletIcons.ts` | `any` for Leaflet icon config | Use `Leaflet.IconOptions` type |
| API route handlers | `jwt.verify()` returns `string | JwtPayload` | Narrow type after verify |
| Event handlers | Implicit `any` in event params | Add `React.ChangeEvent<HTMLInputElement>` etc. |

### 6.3 Error Handling

Add to every app route segment:

```typescript
// app/(dashboard)/admin/error.tsx
'use client';
import { useEffect } from 'react';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/(dashboard)/admin/loading.tsx
export default function Loading() {
  return <DashboardShell><PageSkeleton /></DashboardShell>;
}
```

### 6.4 Pagination

`components/ui/pagination-controls.tsx` exists but is unused. Apply to all list pages:
- Customers list (currently loads all records)
- Products list
- Invoices list
- Orders list
- Payments list

Convex query pattern with pagination:
```typescript
const { results, status, loadMore } = usePaginatedQuery(
  api.customers.list,
  { search: searchTerm },
  { initialNumItems: 25 }
);
```

---

## Phase 7 — Security Hardening (Week 8)

### 7.1 Content Security Policy

Remove `'unsafe-inline'` and `'unsafe-eval'` from CSP headers. Use nonce-based approach for Next.js:

```typescript
// middleware.ts — add nonce generation
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
  style-src 'self' 'nonce-${nonce}';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();
```

### 7.2 Input Validation with Zod

Create validation schemas for all mutations:

```typescript
// features/invoices/types.ts
import { z } from 'zod';

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    pricePerUnit: z.number().positive(),
    discount: z.number().min(0).max(100).optional(),
  })).min(1, 'At least one item required'),
  notes: z.string().max(500).optional(),
  dueDate: z.date().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
```

### 7.3 Rate Limiting in Middleware

Move rate limiting from `lib/rateLimit.ts` into `middleware.ts`:

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';   // or use existing lib/rateLimit.ts logic

// Apply to auth routes only
if (pathname.startsWith('/api/auth')) {
  const ip = req.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return new NextResponse('Too many requests', { status: 429 });
  }
}
```

### 7.4 Environment Variables Cleanup

```bash
# .env.local (new variables)
NEXT_PUBLIC_CONVEX_URL=         # Convex deployment URL
NEXT_PUBLIC_APP_URL=            # App URL (for Better Auth)
BETTER_AUTH_SECRET=             # Random 32-char secret (replaces JWT_SECRET)
BETTER_AUTH_URL=                # Same as NEXT_PUBLIC_APP_URL

# Remove (no longer needed after migration)
# MONGODB_URI                   # Keep temporarily during parallel dev
# JWT_SECRET                    # Replace with BETTER_AUTH_SECRET
# NEXTAUTH_SECRET               # Was never used
# NEXTAUTH_URL                  # Was never used
```

---

## Phase 8 — Deployment Preparation (Week 9)

### 8.1 Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_CONVEX_URL": "@convex-url",
    "NEXT_PUBLIC_APP_URL": "@app-url",
    "BETTER_AUTH_SECRET": "@better-auth-secret",
    "BETTER_AUTH_URL": "@better-auth-url"
  }
}
```

### 8.2 Convex Production Deployment

```bash
# Deploy Convex functions to production
npx convex deploy

# Link to Vercel environment
vercel env add NEXT_PUBLIC_CONVEX_URL
```

### 8.3 Private Server (Docker) — Future Migration

When ready to move off Vercel, this Dockerfile will work with the `output: 'standalone'` Next.js config:

```dockerfile
# Dockerfile
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

Caddy reverse proxy config:

```caddy
# Caddyfile
yourdomain.com {
  reverse_proxy localhost:3000
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Frame-Options "DENY"
    X-Content-Type-Options "nosniff"
  }
}
```

VPS requirements:
- **Minimum:** 2 vCPU, 2GB RAM, 20GB SSD (~$6/mo on Hetzner/DigitalOcean)
- **Recommended:** 2 vCPU, 4GB RAM, 40GB SSD (~$12/mo)
- Note: Convex database remains cloud-hosted (not on VPS)

---

## Phase 9 — Launch (Week 10)

### 9.1 Pre-Launch Checklist

- [ ] All automated tests pass
- [ ] Full manual QA of each feature area (see [Testing Checklist](#15-testing-checklist))
- [ ] Convex production schema deployed and verified
- [ ] Better Auth production cookies tested across browsers
- [ ] Environment variables set in Vercel dashboard
- [ ] Custom domain configured (if applicable)
- [ ] MongoDB backup exported and stored safely
- [ ] Rollback procedure documented and tested

### 9.2 Data Migration Execution

```bash
# 1. Export MongoDB data
node scripts/export-mongo-to-json.js

# 2. Validate export (row counts)
node scripts/validate-export.js

# 3. Import to Convex production
npx convex run migrations:importFromJson --file exports/all-data.json

# 4. Verify Convex data
npx convex run migrations:verifyImport

# 5. Set MongoDB to read-only (don't delete yet)
# 6. Deploy new app pointing to Convex
```

### 9.3 Deployment Steps

```bash
# Merge feature branch
git checkout main
git merge feature/modern-stack-overhaul

# Deploy
vercel --prod

# Monitor
vercel logs --follow
```

### 9.4 Post-Launch

- Monitor Better Auth session errors in Vercel logs for 48 hours
- Watch Convex dashboard for query errors
- Keep MongoDB running as read-only backup for **30 days**
- Disable MongoDB URI from Vercel env after 30 days if no issues

---

## 14. Technical Debt Cleanup

### Files to Delete Before Launch

```bash
# Backup and debug files
rm components/SalesmanLocationMap.backup.tsx
rm -rf app/test-salesman/
rm -rf app/debug-auth/
rm -rf app/api/test-db/
rm -rf app/api/test-users/
rm -rf app/api/test-locations/
rm -rf app/api/debug-token/

# Superseded auth/db files (after migration)
rm lib/auth-improved.ts        # replaced by Better Auth
rm lib/db-optimization.ts      # replaced by Convex
rm lib/authMiddleware.ts       # replaced by middleware.ts
rm lib/mongodb.ts              # replaced by Convex (after migration complete)

# Removed toast system
rm components/ui/toaster.tsx
rm components/ui/use-toast.ts  # if exists

# Old configs (after unified next.config.ts created)
rm next.config.js
rm next.config.production.js
```

### Scripts Directory Cleanup

The `scripts/` folder has 40+ utility scripts, most of which are one-time fix scripts. Archive to `scripts/archive/`:

```bash
mkdir scripts/archive
# Move all fix-*.js and one-time migration scripts to archive
# Keep: migrate-data-working.js, prepare-production.mjs, and new migration scripts
```

---

## 15. Testing Checklist

### Authentication
- [ ] Login with admin credentials — redirects to `/admin/dashboard`
- [ ] Login with salesman credentials — redirects to `/salesman/dashboard`
- [ ] Invalid credentials show error message
- [ ] Session persists on page refresh
- [ ] Session expires after 7 days
- [ ] Logout clears session, redirects to `/login`
- [ ] Direct navigation to `/admin/*` without auth redirects to `/login`
- [ ] Admin cannot access `/salesman/*` URLs and vice versa

### Core Features
- [ ] Create, edit, delete customer
- [ ] Create, edit, delete product (with GST rate)
- [ ] Create invoice with multiple line items — totals calculate correctly
- [ ] CGST + SGST = total GST on invoices (verify against current production values)
- [ ] Generate invoice PDF — layout correct, all fields present
- [ ] Record payment against invoice — outstanding balance updates
- [ ] Generate GST report for date range — numbers match manual calculation
- [ ] Create purchase order — stock levels update
- [ ] Create purchase return — stock adjusts correctly
- [ ] Financial dashboard totals match sum of individual transactions

### Salesman Features
- [ ] Salesman login sees only assigned customers
- [ ] Create order from salesman dashboard
- [ ] Location tracking updates on map in real-time (test with two browser tabs)

### Performance
- [ ] Landing page Lighthouse score ≥ 90 (Performance, Accessibility, SEO)
- [ ] Admin dashboard loads in < 2 seconds
- [ ] Invoice list with 100+ records loads in < 1 second (pagination active)

### Mobile
- [ ] Landing page responsive on 375px (iPhone SE)
- [ ] Admin sidebar collapses to hamburger on mobile
- [ ] Forms usable on mobile keyboard

---

## 16. Environment Variables Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | ✅ | Convex deployment URL | `https://xxx.convex.cloud` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Full app URL for Better Auth | `https://leaftrack.yourdomain.com` |
| `BETTER_AUTH_SECRET` | ✅ | Random 32+ char secret | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | ✅ | Same as `NEXT_PUBLIC_APP_URL` | (same as above) |
| `MONGODB_URI` | ⚠️ Temp | Keep during parallel dev, remove post-migration | `mongodb+srv://...` |
| `JWT_SECRET` | ⚠️ Temp | Keep until all sessions migrated to Better Auth | (existing value) |

Variables to **remove** after migration:
- `NEXTAUTH_SECRET` — was never used
- `NEXTAUTH_URL` — was never used

---

## 17. Timeline Summary

| Week | Phase | Key Deliverables |
|---|---|---|
| 1 | Foundation | Branch created, deps upgraded, folder structure, debug routes removed |
| 2 | Foundation + Convex | Convex schema defined, data migration script written |
| 3 | Convex + Auth | Convex functions for all entities, Better Auth config |
| 4 | Auth + Features | Middleware.ts live, login/signup migrated, first 5 features migrated |
| 5 | Features | Features 6–10 migrated, layout components extracted |
| 6 | Features + Landing | All features migrated, landing page started |
| 7 | Landing | Landing page complete, SVG logo, site config |
| 8 | Polish + Security | Toast consolidation, TypeScript strict, CSP headers, Zod validation |
| 9 | Deployment | Vercel config, Convex production deploy, data migration dry run |
| 10 | Launch | Data migration, production deploy, monitoring |

---

## 18. Post-Launch Roadmap

Once the overhaul is stable (4+ weeks post-launch), these improvements become feasible:

**Near-term (1-3 months):**
- Email notifications with Resend or Nodemailer (invoice sent, payment received)
- Password reset flow (requires email)
- Structured logging with Pino (replace console.error calls)
- Sentry error monitoring integration

**Medium-term (3-6 months):**
- Private server migration (Docker + Caddy VPS) when comfortable with DevOps
- Mobile app with Expo/React Native (Convex works natively)
- Customer portal (customers login to view their invoices)
- WhatsApp invoice sharing via Twilio/WATI

**Long-term:**
- Multi-company support (different branches)
- Accounting software integration (Tally export)
- Advanced analytics with custom reports builder
- AI-powered demand forecasting for inventory

---

*Document maintained in `docs/OVERHAUL-PLAN.md`. Update status markers (⬜ → ✅) as phases complete.*
