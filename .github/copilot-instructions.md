# LeafTrack - Workspace Instructions

LeafTrack is an enterprise tea distribution management system built with Next.js 14, TypeScript, MongoDB, and React. It handles inventory, sales, financial management, GPS tracking, and GST-compliant reporting for tea distribution networks.

## Build and Test

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Production
npm run build            # Build production bundle
npm run start            # Start production server

# Database
npm run migrate          # Run database migrations
npm run production-setup # Prepare for production deployment

# Code Quality
npm run lint             # Check for linting issues
```

**Environment Variables Required:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `NEXT_PUBLIC_*` - Client-side environment variables

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access control (Admin, Salesman, Customer)
- **State Management**: React Context API + custom hooks
- **Forms**: react-hook-form + Zod validation
- **Maps**: Leaflet + react-leaflet for GPS tracking

### Project Structure
```
app/              # Next.js App Router pages and API routes
  api/            # RESTful API endpoints (Next.js Route Handlers)
  admin/          # Admin-only pages
  salesman/       # Salesman-specific pages
components/       # React components (domain-specific and UI)
  ui/             # shadcn/ui components
  admin/          # Admin-specific components
contexts/         # React Context providers (AuthContext, etc.)
hooks/            # Custom React hooks
lib/              # Utilities and core logic
  mongodb.ts      # Database connection with pooling
  dbTypes.ts      # Type-safe model accessors
  validation.ts   # Zod schemas for input validation
models/           # Mongoose schemas and TypeScript interfaces
types/            # Shared TypeScript type definitions
docs/             # Feature documentation and guides
```

### Key Design Decisions
1. **App Router**: Uses Next.js 14 App Router (not Pages Router)
2. **Database Connection**: Connection pooling via `lib/mongodb.ts` - always call `connectDB()` at API route start
3. **Type Safety**: TypeScript interfaces for models + Mongoose schemas + Zod validation (triple validation layer)
4. **Authentication Flow**: JWT tokens stored in localStorage, AuthContext manages global auth state
5. **Role-Based Access**: Middleware functions (`requireAdminAuth`, `requireUserAuth`) enforce permissions
6. **Import Aliases**: Use `@/` prefix for absolute imports (e.g., `@/lib/mongodb`)

## Code Conventions

### API Routes (app/api/**/route.ts)

**Pattern to Follow:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Model from '@/models/ModelName';

export const dynamic = 'force-dynamic'; // Always include for API routes

export async function GET(req: NextRequest) {
  try {
    await connectDB(); // Always connect first
    
    // Verify authentication
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Decode and verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Admin-only check if needed
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Business logic here
    const data = await Model.find().populate('relatedField');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/route:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

**Key Patterns:**
- Always call `connectDB()` before database operations
- Use try/catch for all async operations
- Standardized error responses with appropriate status codes (401, 403, 500)
- Use `.populate()` for related data to avoid N+1 queries
- Export `dynamic = 'force-dynamic'` to disable static optimization

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

### Database Models

**Pattern:**
```typescript
// TypeScript Interface (for type safety)
export interface IModel {
  _id: string;
  field: string;
  relatedId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const schema = new Schema<IModel>(
  {
    field: { 
      type: String, 
      required: [true, 'Field is required'],
      trim: true 
    },
    relatedId: { 
      type: Schema.Types.ObjectId, 
      ref: 'RelatedModel',
      required: true 
    },
  },
  { timestamps: true } // Auto-add createdAt/updatedAt
);

export default mongoose.models.Model || mongoose.model<IModel>('Model', schema);
```

**Key Patterns:**
- Use TypeScript interfaces for type safety
- Always enable timestamps: `{ timestamps: true }`
- Use `ObjectId` with `ref` for relationships
- Provide custom validation error messages
- Check `mongoose.models` before creating to avoid hot-reload issues
- Use type-safe model accessors from `lib/dbTypes.ts` to avoid union type issues

### Authentication

**Client-Side:**
- Use `AuthContext` from `contexts/AuthContext.tsx` for login/signup/logout
- Wrap protected pages with `<ProtectedRoute allowedRoles={['admin']}>`
- Store JWT token in localStorage: `localStorage.getItem('token')`

**Server-Side:**
- Use middleware functions: `requireAdminAuth()`, `requireUserAuth()`
- Verify JWT with `jwt.verify(token, process.env.JWT_SECRET!)`
- Normalize role strings: capitalize first letter for schema consistency

## Common Pitfalls

❌ **Don't** forget to call `connectDB()` in API routes - will cause "MongooseError: Operation `model.find()` failed"

❌ **Don't** use Pages Router patterns (`getServerSideProps`, `getStaticProps`) - this uses App Router

❌ **Don't** create models without checking `mongoose.models` - causes duplicate model errors in dev

❌ **Don't** use CSS Modules or styled-components - use Tailwind CSS with `cn()` utility

❌ **Don't** store sensitive data in `NEXT_PUBLIC_` env vars - they're exposed to the client

✅ **Do** use `@/` import alias for cleaner imports

✅ **Do** populate related data in API responses to reduce client-side requests

✅ **Do** use Zod for input validation in addition to Mongoose validation

✅ **Do** handle errors with try/catch and return appropriate HTTP status codes

✅ **Do** use TypeScript strictly - enable all strict mode checks

## Additional Resources

- Full feature documentation in `docs/` directory
- Deployment guide: `docs/DEPLOYMENT-GUIDE.md`
- Security audit checklist: `docs/SECURITY-AUDIT.md`
- README for project overview: `README.md`
