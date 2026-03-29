# LeafTrack - Workspace Instructions

LeafTrack is an enterprise tea distribution management system built with Next.js 14, TypeScript, Supabase (PostgreSQL), and React. It handles inventory, sales, financial management, GPS tracking, and GST-compliant reporting for tea distribution networks.

## Build and Test

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Production build
npm run build            # Build production bundle (output: standalone)

# Code Quality
npm run lint             # Check for linting issues
```

**Deployment**: Self-hosted on a bare-metal Ubuntu server. NOT deployed on Vercel. Uses `output: 'standalone'` in `next.config.js`.

After `npm run build`, you must manually copy static assets — standalone mode does NOT include them automatically:
```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

The production server is started via PM2:
```bash
pm2 start .next/standalone/server.js --name leaftrack
# or to reload after deploy:
pm2 reload leaftrack
```
Do NOT use `npm run start` in production.

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase Kong gateway URL (use port `54321`, NOT `5432`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (client-safe)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only, bypasses RLS)
- `JWT_SECRET` - Secret for JWT token signing (single-line value)
- `JWT_REFRESH_SECRET` - Secret for JWT refresh tokens (single-line value)
- `PUPPETEER_EXECUTABLE_PATH` - Path to system Chromium: `/usr/bin/chromium-browser`

**⚠️ Supabase URL Warning**: Always use `http://<server-ip>:54321` (Kong gateway). Never use port `5432` (raw PostgreSQL) — the JS client requires Kong.

## Infrastructure

### Server
- **OS**: Ubuntu bare-metal
- **LAN IP**: `192.168.29.23`
- **Tailscale IP**: `100.109.194.15`
- **App root**: `/var/www/leaftrack`
- **Process manager**: PM2 running `.next/standalone/server.js`
- **Reverse proxy**: Nginx → `localhost:3000`
- **Public access**: Via Cloudflare Tunnel (no port forwarding required)

### Cloudflare Tunnel
- **Tunnel ID**: `8c4e3d1a-9412-49f5-801a-f2bbbfd5c7b8`
- **Domain**: `https://sohagtea.in` (also `www.sohagtea.in`)
- **Config**: `~/.cloudflared/config.yml` on server
- **Service**: `cloudflared.service` (systemd, survives reboots)
- **SSL**: Cloudflare terminates TLS — the app itself runs plain HTTP on port 3000
- HSTS / `upgrade-insecure-requests` headers are currently **disabled** in `next.config.js` — do NOT re-enable until HTTPS is confirmed stable end-to-end

### Self-Hosted Supabase
- **Kong gateway**: port `54321` (use this in `NEXT_PUBLIC_SUPABASE_URL`)
- **Studio**: port `54323` (browser UI for DB management)
- **PostgreSQL**: port `5432` (direct DB access only — not used by app)
- **Schema**: `sohag` (all app tables live here)

### CI/CD (GitHub Actions)
- Workflow: `.github/workflows/deploy.yml`
- Triggered on push to `main`
- Flow: Tailscale auth → SSH to server → git pull → `npm ci` → `npm run build` → copy static assets → `pm2 reload`
- Uses `npm ci` (NOT `npm ci --omit=dev`) because devDependencies (TypeScript, ESLint) are required at build time
- **GitHub Secrets required**:
  - `TAILSCALE_AUTHKEY` — reusable ephemeral auth key (**expires every 90 days — must renew**)
  - `SSH_PRIVATE_KEY` — ed25519 deploy key (no passphrase)
  - `SSH_USERNAME` — server username
  - `SERVER_TAILSCALE_IP` — `100.109.194.15`
- **Deploy SSH key**: ed25519, no passphrase, pubkey must be in `~/.ssh/authorized_keys` on server

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind)
- **Database**: Self-hosted Supabase (PostgreSQL) with `sohag` schema, accessed via `@supabase/supabase-js`
- **Authentication**: Custom JWT-based auth with role-based access control (Admin, Primary Executive, Secondary Executive) — NOT Supabase Auth
- **State Management**: React Context API + custom hooks
- **Forms**: react-hook-form + Zod validation
- **Maps**: Leaflet + react-leaflet for GPS tracking
- **PDF Generation**: Puppeteer-core + system Chromium (`/usr/bin/chromium-browser`)

> **MongoDB is fully retired.** Do not reference or reintroduce any MongoDB/Mongoose code.

### Project Structure
```
app/              # Next.js App Router pages and API routes
  api/            # RESTful API endpoints (Next.js Route Handlers)
  admin/          # Admin-only pages
  executive/      # Executive-specific pages
  salesman/       # Salesman-specific pages
components/       # React components (domain-specific and UI)
  ui/             # shadcn/ui components
  admin/          # Admin-specific components
contexts/         # React Context providers (AuthContext, etc.)
hooks/            # Custom React hooks
lib/              # Utilities and core logic
  supabase.ts         # Client-side Supabase client (anon key)
  supabase-server.ts  # Server-side Supabase client (supabaseAdmin, service role)
  supabase-helpers.ts # Response helpers (withId, withIds, mapProductToFrontend)
  authMiddleware.ts   # Auth middleware (requireAuth, requireAdminAuth, etc.)
  auth.ts             # Auth primitives (hashPassword, comparePassword, generateToken, verifyToken)
  roles.ts            # Role normalization and permission checks
  validation.ts       # Zod schemas for input validation
types/            # Shared TypeScript type definitions
docs/             # Feature documentation and guides
```

### Key Design Decisions
1. **App Router**: Uses Next.js 14 App Router (not Pages Router)
2. **Database**: Self-hosted Supabase with `sohag` schema — use `supabaseAdmin` from `@/lib/supabase-server` for all DB operations (bypasses RLS)
3. **Type Safety**: TypeScript interfaces + Zod validation (dual validation layer)
4. **Authentication Flow**: Custom JWT tokens stored in localStorage; AuthContext manages global auth state; NOT Supabase Auth
5. **Role-Based Access**: Middleware functions from `@/lib/authMiddleware` enforce permissions
6. **Import Aliases**: Use `@/` prefix for absolute imports (e.g., `@/lib/supabase-server`)
7. **Self-Hosted + Standalone**: `output: 'standalone'` — static files must be copied manually after build (see Build section)
8. **PDF**: Puppeteer-core is used server-side; `PUPPETEER_EXECUTABLE_PATH` must point to system Chromium

## Code Conventions

### API Routes (app/api/**/route.ts)

**Pattern to Follow:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, requireAdminAuth } from '@/lib/authMiddleware';
import { withIds } from '@/lib/supabase-helpers';

export const dynamic = 'force-dynamic'; // Always include for API routes

// Any authenticated user
export async function GET(req: NextRequest) {
  try {
    const decoded = requireAuth(req);
    if (decoded instanceof NextResponse) return decoded;
    
    // Business logic — query Supabase
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*, related_table(*)');
    
    if (error) throw error;
    
    return NextResponse.json(withIds(data || []));
  } catch (error) {
    console.error('Error in GET /api/route:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Admin-only route
export async function POST(req: NextRequest) {
  try {
    const decoded = requireAdminAuth(req);
    if (decoded instanceof NextResponse) return decoded;
    
    const body = await req.json();
    
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .insert(body)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/route:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

**Auth Middleware Functions** (from `@/lib/authMiddleware`):
- `requireAuth(request, allowedRoles?)` — Any authenticated user (optionally restrict to roles)
- `requireAdminAuth(request)` — Admin only
- `requirePrimaryExecutiveAuth(request)` — Primary executive only
- `requireSalesmanAuth(request)` — Secondary executive only
- `requireUserAuth(request)` — Admin + primary + secondary executives
- `requireAuthWithUserFilter(request, allowedRoles?)` — Returns `{ decoded, userFilter }` for role-based data filtering

All return `DecodedToken | NextResponse`. Check `instanceof NextResponse` to detect auth failures.

**Key Patterns:**
- Use `supabaseAdmin` from `@/lib/supabase-server` for all database operations (bypasses RLS)
- Use auth middleware instead of manual JWT verification
- Use try/catch for all async operations
- Standardized error responses with appropriate status codes (401, 403, 500)
- Use Supabase `.select('*, related_table(*)')` for joins
- Use `withId()`/`withIds()` from `@/lib/supabase-helpers` to add `_id` field for frontend compatibility
- Export `dynamic = 'force-dynamic'` to disable static optimization
- All tables use the `sohag` schema (configured in supabaseAdmin client)

### Components

**UI Components (components/ui/):**
- Based on shadcn/ui patterns using Radix UI primitives
- Use `cn()` utility from `@/lib/utils` for conditional classNames
- Forward refs for composability: `React.forwardRef<HTMLElement, Props>`
- Tailwind CSS for styling (no CSS modules or styled-components)

**Domain Components:**
- Group by feature/domain (e.g., `components/admin/`, `components/salesman/`)
- Use PascalCase naming: `CustomerTable.tsx`, `InvoiceForm.tsx`
- Prefer composition over prop drilling - use Context when state needs to be global

### Forms and Validation

**Always use react-hook-form + Zod:**
```typescript
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
```

- Define Zod schemas in `lib/validation.ts` for reusability
- Use `FormField`, `FormItem`, `FormLabel`, `FormControl` wrappers from `components/ui/form`
- Show validation errors inline with `FormMessage`

### Database Queries

**Supabase Query Patterns:**
```typescript
import { supabaseAdmin } from '@/lib/supabase-server';
import { withId, withIds } from '@/lib/supabase-helpers';

// Select with joins
const { data, error } = await supabaseAdmin
  .from('orders')
  .select('*, customer:customers(*), salesman:users(*)')
  .eq('status', 'active')
  .order('created_at', { ascending: false });

// Insert
const { data, error } = await supabaseAdmin
  .from('orders')
  .insert({ customer_id, salesman_id, total })
  .select()
  .single();

// Update
const { data, error } = await supabaseAdmin
  .from('orders')
  .update({ status: 'completed' })
  .eq('id', orderId)
  .select()
  .single();

// Delete
const { error } = await supabaseAdmin
  .from('orders')
  .delete()
  .eq('id', orderId);

// RPC (stored procedures)
const { data, error } = await supabaseAdmin
  .rpc('function_name', { param: value });
```

**Key Patterns:**
- All tables live in the `sohag` schema (configured in the supabaseAdmin client)
- Use snake_case for column names (PostgreSQL convention)
- Use `withId()`/`withIds()` helpers to add `_id` alias for frontend compatibility
- Use `.select()` after `.insert()`/`.update()` to get the result back
- Use `.single()` when expecting exactly one row
- Check `error` from every Supabase call

### Authentication

**Client-Side:**
- Use `AuthContext` from `contexts/AuthContext.tsx` for login/signup/logout
- Wrap protected pages with `<ProtectedRoute allowedRoles={['admin']}>`
- Store JWT token in localStorage: `localStorage.getItem('token')`

**Server-Side:**
- Use middleware functions: `requireAdminAuth()`, `requireUserAuth()`
- Never use `verifyToken()` directly in API routes — use `requireAuth()` from `@/lib/authMiddleware`
- Normalize role strings: capitalize first letter for schema consistency

## Common Pitfalls

❌ **Don't** use `verifyToken()` directly in API routes — use `requireAuth()`/`requireAdminAuth()` from `@/lib/authMiddleware`

❌ **Don't** use Pages Router patterns (`getServerSideProps`, `getStaticProps`) - this uses App Router

❌ **Don't** use CSS Modules or styled-components - use Tailwind CSS with `cn()` utility

❌ **Don't** store sensitive data in `NEXT_PUBLIC_` env vars - they're exposed to the client

❌ **Don't** forget to check `if (decoded instanceof NextResponse) return decoded;` after auth middleware calls

❌ **Don't** use port `5432` in `NEXT_PUBLIC_SUPABASE_URL` — always use `54321` (Kong gateway)

❌ **Don't** use `npm run start` in production — PM2 runs `.next/standalone/server.js` directly

❌ **Don't** forget to copy static files after build — `cp -r .next/static .next/standalone/.next/static` and `cp -r public .next/standalone/public`

❌ **Don't** use `npm ci --omit=dev` — devDependencies (TypeScript, ESLint) are required at build time

❌ **Don't** re-enable HSTS / `upgrade-insecure-requests` headers in `next.config.js` until HTTPS is confirmed stable end-to-end

✅ **Do** use `@/` import alias for cleaner imports

✅ **Do** use Supabase joins (`.select('*, related_table(*)')`) to reduce client-side requests

✅ **Do** use Zod for input validation on API request bodies

✅ **Do** handle errors with try/catch and return appropriate HTTP status codes

✅ **Do** use TypeScript strictly - enable all strict mode checks

✅ **Do** use `withId()`/`withIds()` helpers for frontend compatibility

✅ **Do** use `supabaseAdmin` (service role, from `@/lib/supabase-server`) in API routes — never the anon client

## Additional Resources

- Full feature documentation in `docs/` directory
- Deployment guide: `docs/DEPLOYMENT-GUIDE.md`
- Security audit checklist: `docs/SECURITY-AUDIT.md`
- README for project overview: `README.md`

