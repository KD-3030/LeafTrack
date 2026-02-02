# LeafTrack - Enterprise Tea Distribution Management System

> A comprehensive, production-ready inventory and distribution management solution designed specifically for tea distribution networks. Built with Next.js 14, featuring role-based access control, real-time GPS tracking, GST-compliant financial management, and advanced production planning capabilities.

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Security](#-security)

## 🎯 Project Overview

**LeafTrack** is an enterprise-grade web application built to streamline tea distribution operations. It provides a complete ecosystem for managing inventory, tracking field sales teams, processing orders, handling finances, and generating compliance reports. The system supports multi-role access with distinct interfaces for administrators and field salesman.

### Business Context
- **Industry**: Tea Distribution & FMCG
- **Target Users**: Tea distribution companies, wholesale distributors
- **Deployment**: Cloud-based SaaS model (Vercel + MongoDB Atlas)
- **Scale**: Multi-user, multi-location support

### Core Capabilities
1. **Inventory Management**: Track products, batches, stock levels, and raw materials
2. **Sales Operations**: Order processing, stock assignments, and sales recording
3. **Financial Management**: GST-compliant invoicing, payment tracking, and profit/loss reporting
4. **Manufacturing**: Bill of Materials (BOM) for production cost calculation
5. **Location Intelligence**: Real-time GPS tracking of field salesmen
6. **Business Analytics**: Comprehensive reports on sales, inventory, and finances


## 🌟 Key Features

### 1. User Management & Authentication
- **Multi-Role System**: Distinct access levels for Admin, Salesman, and Customer roles
- **JWT Authentication**: Secure, stateless authentication with token-based sessions
- **Protected Routes**: Client and server-side route protection with middleware
- **User Management**: Complete CRUD operations for user accounts (admin-only)
- **Profile Management**: User profile viewing and updates
- **Session Management**: Automatic token refresh and logout handling

### 2. Product & Inventory Management
- **Product Catalog**: Comprehensive product management with SKUs, HSN codes, and pricing
- **Batch Tracking**: Multiple batch support with expiry dates and quantities per batch
- **Stock Management**: Real-time stock level monitoring and updates
- **Product Categories**: Organize products by categories and types
- **Stock Alerts**: Low stock warnings and notifications
- **Product Search**: Advanced filtering by name, category, stock status
- **HSN Code Management**: GST-compliant HSN/SAC codes for tax reporting

### 3. Manufacturing & Production Planning (BOM)
- **Bill of Materials**: Define manufacturing recipes linking raw materials to finished products
- **Raw Material Inventory**: Track raw material stock, costs, and suppliers
- **Cost Calculation**: Automatic product cost calculation based on BOM components
- **BOM Versioning**: Maintain multiple BOM versions with active/inactive status
- **Material Costing**: Track cost per unit for accurate profit margins
- **Production Analysis**: Cost breakdown and material usage reports

### 4. Customer Management
- **Customer Database**: Comprehensive customer information with contact details
- **GST Compliance**: Store GSTIN for business customers
- **Customer Transactions**: View complete transaction history per customer
- **Outstanding Balances**: Track receivables and pending payments
- **Customer Analytics**: Sales patterns, payment behavior, and credit limits
- **Address Management**: Shipping and billing address storage
- **Customer Search**: Filter by name, phone, GST number, or location

### 5. Financial Management
- **GST-Compliant Invoicing**: Full GST support (CGST, SGST, IGST)
- **Invoice Generation**: Auto-generate invoices from sales with custom numbering
- **Manual Invoices**: Create standalone invoices with custom line items
- **Invoice Editing**: Modify invoice numbers for accounting compliance
- **Invoice Numbering**: Format: `INV-YYYYMMDD-XXXX` with auto-increment
- **Payment Recording**: Track payments with multiple methods (Cash, UPI, Bank Transfer)
- **Payment History**: Complete payment audit trail per customer
- **Outstanding Management**: Track pending amounts and overdue invoices
- **Profit/Loss Reports**: Comprehensive P&L statements with date filtering
- **GST Reports**: GSTR-1 compliant reports with tax breakdowns
- **Financial Dashboard**: Real-time revenue, expenses, and profit metrics

### 6. Sales & Distribution
- **Order Management**: Create, approve, and track customer orders
- **Order Workflow**: Pending → Approved → Completed status tracking
- **Stock Assignments**: Allocate inventory to field salesmen
- **Sales Recording**: Log field sales with product details and pricing
- **Multi-Product Orders**: Support for multiple items per order
- **Order Approval**: Admin approval workflow for salesman orders
- **Order Modification**: Edit pending orders before approval
- **Sales Returns**: Process returns with refund management

### 7. Purchase Management
- **Purchase Recording**: Track all purchase transactions with suppliers
- **Purchase Returns**: Process returns with credit notes and adjustments
- **Supplier Management**: Maintain supplier database with contact info
- **Taxable Purchases**: GST tracking on purchases
- **Purchase Analytics**: Cost analysis and vendor performance reports
- **Stock Updates**: Automatic stock updates on purchase entry

### 8. Location Tracking & Field Management
- **Real-Time GPS**: Live tracking of salesman locations during field visits
- **Location History**: Historical location data with timestamps
- **Interactive Maps**: Leaflet + OpenStreetMap integration
- **Route Visualization**: View salesman travel routes and patterns
- **Geofencing**: Location-based attendance and visit tracking (future)
- **Location Widgets**: Live location display in dashboards
- **Multi-Salesman View**: Track multiple salesmen simultaneously

### 9. Reporting & Analytics
- **Business Dashboard**: KPI widgets for sales, revenue, and inventory
- **Order Reports**: Detailed order analysis by date, salesman, product
- **Financial Reports**: P&L, balance sheet, cash flow statements
- **GST Reports**: GSTR-1 compliant tax reports
- **Salesman Performance**: Individual sales metrics and targets
- **Product Analytics**: Best sellers, slow movers, and inventory turnover
- **Customer Analytics**: Top customers, payment trends, credit analysis
- **Date Range Filters**: Custom date filtering for all reports
- **Export Capabilities**: Download reports as Excel/CSV (future)

### 10. Settings & Configuration
- **Company Settings**: Configure company name, GST details, address, logo
- **System Configuration**: Customize invoice formats and numbering
- **User Preferences**: Role-based preference management
- **Tax Configuration**: Set GST rates and tax slabs
- **Email Settings**: SMTP configuration for notifications (future)

### 11. UI/UX Features
- **Responsive Design**: Fully responsive across desktop, tablet, and mobile
- **Modern UI**: Clean, professional interface using Shadcn/ui components
- **Dark Mode Ready**: Theme support infrastructure (implementation pending)
- **Toast Notifications**: Real-time feedback using Sonner
- **Loading States**: Skeleton loaders and progress indicators
- **Error Handling**: Comprehensive error boundaries and user-friendly messages
- **Form Validation**: Client and server-side validation
- **Search & Filters**: Advanced filtering on all list views
- **Pagination**: Efficient data loading for large datasets
- **Accessibility**: ARIA labels and keyboard navigation support


## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Admin Portal │  │Salesman Portal│  │  Login/Auth  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS/REST API
┌───────────────────────────▼─────────────────────────────────┐
│              Next.js Application Server (Vercel)             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Frontend (React + Next.js)              │  │
│  │   • Server Components  • Client Components           │  │
│  │   • App Router Pages   • UI Components (Shadcn)      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          API Routes (Backend Logic)                  │  │
│  │   • Authentication    • Business Logic               │  │
│  │   • Authorization     • Data Validation              │  │
│  │   • Route Handlers    • Error Handling               │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ Mongoose ODM
┌───────────────────────────▼─────────────────────────────────┐
│            Database Layer (MongoDB Atlas)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Users DB   │  │Products DB │  │Invoices DB │  ...      │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Application Flow

1. **Authentication Flow**
   ```
   User → Login Page → API (/api/auth/login)
        → JWT Token Generation
        → Token Storage (localStorage)
        → Protected Route Access
        → Dashboard Rendering
   ```

2. **Data Flow**
   ```
   UI Component → User Action
              → API Call (fetch)
              → API Route Handler
              → Authentication Middleware
              → Database Query (Mongoose)
              → Response Processing
              → UI Update (React State)
   ```

3. **Role-Based Access**
   ```
   Request → Extract JWT Token
          → Verify Token
          → Decode User Role
          → Check Route Permissions
          → Allow/Deny Access
   ```

### Database Schema Design

#### Core Collections

**Users Collection**
```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  password: string (hashed),
  role: 'Admin' | 'Salesman' | 'Customer',
  phone?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Products Collection**
```typescript
{
  _id: ObjectId,
  name: string,
  sku: string,
  hsn_code: string,
  category: string,
  gst_rate: number,
  selling_price: number,
  manufacturing_cost: number,
  totalStock: number,
  batches: [{
    batch_number: string,
    quantity: number,
    expiry_date: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Invoices Collection**
```typescript
{
  _id: ObjectId,
  invoice_number: string,
  invoice_date: Date,
  customer_id: ObjectId (ref: Customer),
  salesman_id?: ObjectId (ref: User),
  items: [{
    product_id: ObjectId,
    product_name: string,
    quantity: number,
    unit_price: number,
    gst_rate: number,
    total: number
  }],
  subtotal: number,
  cgst: number,
  sgst: number,
  igst: number,
  total_amount: number,
  payment_status: 'Pending' | 'Partial' | 'Paid',
  createdAt: Date,
  updatedAt: Date
}
```

**Orders Collection**
```typescript
{
  _id: ObjectId,
  order_number: string,
  salesman_id: ObjectId (ref: User),
  customer_name: string,
  customer_contact: string,
  items: [{
    product_name: string,
    quantity: number,
    unit_price: number
  }],
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed',
  subtotal: number,
  total_amount: number,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**BOM (Bill of Materials) Collection**
```typescript
{
  _id: ObjectId,
  product_id: ObjectId (ref: Product),
  bom_number: string,
  materials: [{
    raw_material_id: ObjectId (ref: RawMaterial),
    quantity: number,
    cost_per_unit: number,
    total_cost: number
  }],
  total_manufacturing_cost: number,
  is_current: boolean,
  status: 'Active' | 'Inactive',
  createdAt: Date,
  updatedAt: Date
}
```

**Customers Collection**
```typescript
{
  _id: ObjectId,
  name: string,
  email?: string,
  phone: string,
  gstin?: string,
  address: string,
  city: string,
  state: string,
  outstanding_balance: number,
  createdAt: Date,
  updatedAt: Date
}
```

**Payments Collection**
```typescript
{
  _id: ObjectId,
  invoice_id: ObjectId (ref: Invoice),
  customer_id: ObjectId (ref: Customer),
  payment_date: Date,
  amount: number,
  payment_method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque',
  reference_number?: string,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Locations Collection**
```typescript
{
  _id: ObjectId,
  salesman_id: ObjectId (ref: User),
  latitude: number,
  longitude: number,
  accuracy?: number,
  timestamp: Date,
  createdAt: Date
}
```

### API Architecture

#### Authentication Middleware
```typescript
// lib/authMiddleware.ts
export function requireAuth(request: NextRequest, allowedRoles: string[]) {
  // Extract JWT from Authorization header
  // Verify token signature
  // Check role permissions
  // Return decoded token or error response
}
```

#### Route Structure
```
/api/
  auth/
    login/          POST - User login
    signup/         POST - User registration
  products/         GET, POST - List/create products
    [id]/           GET, PUT, DELETE - Product operations
  customers/        GET, POST - List/create customers
    [id]/           GET, PUT, DELETE - Customer operations
  invoices/         GET, POST - List/create invoices
    [id]/           GET, PUT, DELETE - Invoice operations
    manual/         POST - Create manual invoice
  orders/           GET, POST - List/create orders
    [id]/           GET, PUT, DELETE - Order operations
  boms/             GET, POST - List/create BOMs
    [id]/           GET, PUT, DELETE - BOM operations
  payments/         GET, POST - List/create payments
  locations/        GET, POST - Track/retrieve locations
  reports/
    gst/            GET - GST reports
    profit-loss/    GET - P&L reports
    orders/         GET - Order reports
```

### Security Architecture

1. **Authentication Layer**
   - JWT token-based authentication
   - Token expiration (24 hours)
   - Secure password hashing (bcrypt, 10 rounds)

2. **Authorization Layer**
   - Role-based access control (RBAC)
   - Route-level permission checks
   - Resource-level filtering (salesmen see only their data)

3. **Data Protection**
   - Environment variable encryption
   - No sensitive data in client code
   - HTTPS enforcement in production
   - CORS configuration

4. **Input Validation**
   - Server-side validation on all API routes
   - TypeScript type checking
   - Mongoose schema validation

### Performance Optimizations

1. **Frontend Optimizations**
   - Server-side rendering (SSR) for initial load
   - Code splitting and lazy loading
   - Image optimization (Next.js Image component)
   - Efficient re-rendering (React memoization)

2. **Backend Optimizations**
   - Database indexing on frequently queried fields
   - Mongoose lean queries for read-only operations
   - API response caching strategies
   - Efficient MongoDB aggregation pipelines

3. **Network Optimizations**
   - CDN distribution (Vercel Edge Network)
   - Gzip compression
   - Minimal bundle size (tree shaking)
   - Prefetching and preloading


## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher
- **MongoDB Atlas Account**: Cloud database (free tier available)
- **Git**: For version control
- **Code Editor**: VS Code recommended

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd LeafTrack
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB Connection (Get from MongoDB Atlas)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/leaftrack?retryWrites=true&w=majority

   # JWT Secret (Generate a random 32+ character string)
   JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars

   # Application Settings
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   **Security Note**: Never commit `.env.local` to version control!

4. **MongoDB Atlas Setup**
   - Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster (free tier works)
   - Add database user with read/write permissions
   - Whitelist your IP address (or use 0.0.0.0/0 for development)
   - Get connection string from "Connect" → "Connect your application"
   - Replace `<username>`, `<password>`, and `<dbname>` in connection string

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open browser: [http://localhost:3000](http://localhost:3000)
   - Login page will appear
   - Create admin account via signup

### Initial Setup

#### Create Admin User
1. Navigate to `/signup`
2. Fill in details:
   - Name: Admin User
   - Email: admin@example.com
   - Password: (secure password)
   - Role: Select "Admin"
3. Login with admin credentials
4. Access admin dashboard

#### Configure Company Settings
1. Go to Admin → Settings
2. Fill in company information:
   - Company Name
   - GST Number
   - Address
   - Contact Details
3. Upload company logo (optional)
4. Save settings

### Development Commands

```bash
# Start development server
npm run dev                 # Runs on http://localhost:3000

# Build for production
npm run build              # Creates optimized production build

# Start production server
npm start                  # Runs production build

# Run linter
npm run lint               # Check code quality

# Type checking
npx tsc --noEmit          # Verify TypeScript types

# Database migration (if needed)
npm run migrate           # Run data migration scripts
```

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET` | Yes | Secret key for JWT signing | `your-secret-key-min-32-characters` |
| `NODE_ENV` | Yes | Environment mode | `development` or `production` |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL | `http://localhost:3000` |


## 🛠️ Technology Stack

### Frontend Technologies
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 14.2.0 | React framework with App Router, SSR, and API routes |
| **React** | 18.3.0 | UI library for component-based architecture |
| **TypeScript** | 5.5.0 | Type safety and enhanced developer experience |
| **Tailwind CSS** | 3.4.0 | Utility-first CSS framework for styling |
| **Shadcn/ui** | Latest | Accessible, customizable UI components (Radix UI) |
| **Lucide React** | 0.400.0 | Modern icon library |
| **React Hook Form** | 7.52.1 | Form state management and validation |
| **Leaflet** | 1.9.4 | Interactive maps for location tracking |
| **React Leaflet** | 4.2.1 | React bindings for Leaflet maps |
| **Recharts** | 2.12.7 | Charting library for analytics dashboards |
| **date-fns** | 3.6.0 | Date formatting and manipulation |
| **Sonner** | 1.7.4 | Toast notifications |
| **jsPDF** | 3.0.2 | PDF generation for invoices |
| **jsPDF-AutoTable** | 5.0.2 | Table formatting in PDFs |

### Backend Technologies
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime environment |
| **Next.js API Routes** | 14.2.0 | RESTful API endpoints |
| **MongoDB** | 6.19.0 | NoSQL database (via MongoDB Atlas) |
| **Mongoose** | 8.18.0 | MongoDB ODM for data modeling |
| **JWT** | 9.0.2 | Token-based authentication |
| **bcryptjs** | 3.0.2 | Password hashing and encryption |

### Development & Build Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 8.57.0 | Code linting and quality checks |
| **PostCSS** | 8.4.0 | CSS processing and optimization |
| **Autoprefixer** | 10.4.0 | CSS vendor prefixing |
| **TypeScript Compiler** | 5.5.0 | Type checking and transpilation |

### Deployment & Infrastructure
- **Hosting**: Vercel (Frontend & API Routes)
- **Database**: MongoDB Atlas (Cloud Database)
- **CDN**: Vercel Edge Network
- **Domain**: Custom domain with SSL/TLS
- **Environment**: Production & Development separation

### Key Libraries & Utilities
- **class-variance-authority**: UI component variants
- **clsx**: Conditional CSS classes
- **tailwind-merge**: Merge Tailwind classes safely
- **cmdk**: Command menu component
- **input-otp**: OTP input component (future 2FA)
- **vaul**: Drawer component for mobile
- **embla-carousel**: Carousel/slider components

### Architecture Patterns
- **MVC Pattern**: Separation of models, views, and controllers
- **RESTful API**: Standard HTTP methods and status codes
- **JWT Authentication**: Stateless authentication mechanism
- **Context API**: Global state management (AuthContext)
- **Custom Hooks**: Reusable logic encapsulation
- **Middleware Pattern**: Authentication and authorization middleware
- **Repository Pattern**: Data access layer abstraction


## 📁 Project Structure

```
LeafTrack/
├── app/                                # Next.js App Router
│   ├── api/                            # Backend API Routes
│   │   ├── auth/                       # Authentication endpoints
│   │   │   ├── login/route.ts          # POST - User login
│   │   │   └── signup/route.ts         # POST - User registration
│   │   ├── products/                   # Product management
│   │   │   ├── route.ts                # GET, POST - List/create products
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE - Product operations
│   │   ├── customers/                  # Customer management
│   │   │   ├── route.ts                # GET, POST - List/create customers
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE - Customer operations
│   │   ├── invoices/                   # Invoice operations
│   │   │   ├── route.ts                # GET, POST - List/create invoices
│   │   │   ├── manual/route.ts         # POST - Create manual invoice
│   │   │   └── [id]/
│   │   │       ├── route.ts            # GET, PUT, DELETE
│   │   │       └── update-number/route.ts
│   │   ├── payments/                   # Payment tracking
│   │   │   ├── route.ts                # GET, POST - List/create payments
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE
│   │   ├── orders/                     # Order management
│   │   │   ├── route.ts                # GET, POST - List/create orders
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE - Order operations
│   │   ├── boms/                       # Bill of Materials
│   │   │   ├── route.ts                # GET, POST - List/create BOMs
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE - BOM operations
│   │   ├── raw-materials/              # Raw material management
│   │   │   ├── route.ts                # GET, POST
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE
│   │   ├── purchases/                  # Purchase transactions
│   │   │   ├── route.ts                # GET, POST
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE
│   │   ├── purchase-returns/           # Purchase returns
│   │   │   ├── route.ts                # GET, POST
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE
│   │   ├── sales/                      # Sales recording
│   │   │   ├── route.ts                # GET, POST
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE
│   │   ├── sale-returns/               # Sale returns
│   │   │   ├── route.ts                # GET, POST, PATCH
│   │   │   └── [id]/route.ts           # GET, PATCH, DELETE
│   │   ├── assignments/                # Stock assignments
│   │   │   ├── route.ts                # GET, POST
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE
│   │   ├── locations/                  # GPS tracking
│   │   │   └── route.ts                # GET, POST, DELETE
│   │   ├── reports/                    # Analytics and reports
│   │   │   ├── gst/route.ts            # GET - GST reports
│   │   │   ├── profit-loss/route.ts    # GET - P&L reports
│   │   │   └── orders/route.ts         # GET - Order reports
│   │   ├── users/                      # User management
│   │   │   ├── route.ts                # GET, POST - List/create users
│   │   │   └── [id]/route.ts           # GET, PUT, DELETE
│   │   └── settings/                   # System configuration
│   │       └── company/route.ts        # GET, PUT - Company settings
│   │
│   ├── admin/                          # Admin Dashboard Pages
│   │   ├── dashboard/                  # Admin overview
│   │   │   └── page.tsx                # Main dashboard with KPIs
│   │   ├── products/                   # Product management UI
│   │   │   ├── page.tsx                # Product list view
│   │   │   ├── new/page.tsx            # Create product form
│   │   │   └── [id]/page.tsx           # Edit product
│   │   ├── customers/                  # Customer management UI
│   │   │   ├── page.tsx                # Customer list
│   │   │   └── [id]/page.tsx           # Customer details + transactions
│   │   ├── invoicing/                  # Invoice generation
│   │   │   ├── page.tsx                # Invoice list
│   │   │   ├── new/page.tsx            # Create invoice
│   │   │   └── manual/page.tsx         # Manual invoice creation
│   │   ├── financial/                  # Financial management
│   │   │   ├── page.tsx                # Financial dashboard
│   │   │   ├── payments/page.tsx       # Payment recording
│   │   │   └── outstanding/page.tsx    # Outstanding balances
│   │   ├── orders/                     # Order management
│   │   │   ├── page.tsx                # Order list with approval
│   │   │   └── [id]/page.tsx           # Order details
│   │   ├── boms/                       # BOM management
│   │   │   ├── page.tsx                # BOM list
│   │   │   ├── new/page.tsx            # Create BOM
│   │   │   └── [id]/page.tsx           # Edit BOM
│   │   ├── raw-materials/              # Raw materials UI
│   │   │   ├── page.tsx                # Material list
│   │   │   └── new/page.tsx            # Create material
│   │   ├── purchases/                  # Purchase management
│   │   │   ├── page.tsx                # Purchase list
│   │   │   └── new/page.tsx            # Record purchase
│   │   ├── purchase-returns/           # Purchase returns
│   │   │   ├── page.tsx                # Return list
│   │   │   └── new/page.tsx            # Create return
│   │   ├── sales-returns/              # Sale returns
│   │   │   ├── page.tsx                # Return list
│   │   │   └── [id]/page.tsx           # Return details
│   │   ├── salesmen/                   # Salesman management
│   │   │   └── page.tsx                # Salesman list + create
│   │   ├── locations/                  # Location tracking
│   │   │   └── page.tsx                # Map view with live tracking
│   │   ├── reports/                    # Reports and analytics
│   │   │   ├── page.tsx                # Report dashboard
│   │   │   ├── gst/page.tsx            # GST reports
│   │   │   ├── profit-loss/page.tsx    # P&L reports
│   │   │   └── orders/page.tsx         # Order analysis
│   │   ├── settings/                   # Settings UI
│   │   │   └── page.tsx                # Company settings
│   │   └── layout.tsx                  # Admin layout with sidebar
│   │
│   ├── salesman/                       # Salesman Dashboard
│   │   ├── dashboard/                  # Salesman overview
│   │   │   └── page.tsx                # Dashboard with stats + location widget
│   │   ├── orders/                     # Order management
│   │   │   ├── page.tsx                # Order list (own orders)
│   │   │   └── new/page.tsx            # Create new order
│   │   └── layout.tsx                  # Salesman layout
│   │
│   ├── login/                          # Login page
│   │   └── page.tsx                    # Login form
│   ├── signup/                         # Signup page
│   │   └── page.tsx                    # Registration form
│   ├── layout.tsx                      # Root layout
│   ├── page.tsx                        # Home/landing page
│   └── globals.css                     # Global styles
│
├── components/                         # React Components
│   ├── admin/                          # Admin-specific components
│   │   ├── Sidebar.tsx                 # Admin navigation sidebar
│   │   ├── Header.tsx                  # Admin header
│   │   └── ...                         # Other admin components
│   ├── ui/                             # Reusable UI components (Shadcn)
│   │   ├── button.tsx                  # Button component
│   │   ├── input.tsx                   # Input component
│   │   ├── dialog.tsx                  # Modal dialog
│   │   ├── table.tsx                   # Table component
│   │   ├── card.tsx                    # Card component
│   │   └── ...                         # Other UI components
│   ├── ProtectedRoute.tsx              # Route protection HOC
│   ├── LocationTrackingWidget.tsx      # Location tracking component
│   ├── SalesmanLocationMap.tsx         # Map component for tracking
│   └── ErrorBoundary.tsx               # Error handling boundary
│
├── contexts/                           # React Context
│   └── AuthContext.tsx                 # Authentication context provider
│
├── hooks/                              # Custom React Hooks
│   ├── useAuth.ts                      # Authentication hook
│   ├── useLocalStorage.ts              # localStorage management
│   └── ...                             # Other custom hooks
│
├── lib/                                # Utility Libraries
│   ├── mongodb.ts                      # MongoDB connection utility
│   ├── auth.ts                         # JWT utilities (sign, verify)
│   ├── authMiddleware.ts               # Authentication middleware
│   ├── utils.ts                        # Helper functions
│   └── cn.ts                           # Class name utility
│
├── models/                             # Mongoose Data Models
│   ├── User.ts                         # User schema + interface
│   ├── Product.ts                      # Product schema
│   ├── Customer.ts                     # Customer schema
│   ├── Invoice.ts                      # Invoice schema
│   ├── Payment.ts                      # Payment schema
│   ├── Order.ts                        # Order schema
│   ├── Sale.ts                         # Sale schema
│   ├── SaleReturn.ts                   # Sale return schema
│   ├── BOM.ts                          # Bill of Materials schema
│   ├── RawMaterial.ts                  # Raw material schema
│   ├── Purchase.ts                     # Purchase schema
│   ├── PurchaseReturn.ts               # Purchase return schema
│   ├── Assignment.ts                   # Stock assignment schema
│   ├── Location.ts                     # Location tracking schema
│   └── CompanySettings.ts              # Company settings schema
│
├── types/                              # TypeScript Type Definitions
│   ├── index.ts                        # Shared types
│   └── ...                             # Other type files
│
├── scripts/                            # Utility Scripts
│   ├── migrate-data-working.js         # Data migration script
│   └── prepare-production.mjs          # Production build prep
│
├── public/                             # Static Assets
│   ├── images/                         # Image assets
│   └── ...                             # Other static files
│
├── docs/                               # Project Documentation
│   ├── BOM-IMPLEMENTATION-COMPLETE.md  # BOM feature docs
│   ├── DEPLOYMENT-GUIDE.md             # Deployment instructions
│   ├── GST-REPORTS-SUMMARY.md          # GST reporting docs
│   └── ...                             # Other documentation
│
├── .env.local                          # Local environment variables (not in git)
├── .env.example                        # Environment template
├── .env.production                     # Production env (not in git)
├── .gitignore                          # Git ignore rules
├── next.config.js                      # Next.js configuration
├── tailwind.config.js                  # Tailwind CSS config
├── tsconfig.json                       # TypeScript configuration
├── postcss.config.js                   # PostCSS configuration
├── package.json                        # Dependencies and scripts
├── package-lock.json                   # Dependency lock file
├── vercel.json                         # Vercel deployment config
└── README.md                           # This file
```

### Key Directory Explanations

- **`app/api/`**: Backend API routes using Next.js route handlers (server-side code)
- **`app/admin/`**: Admin-facing UI pages (requires Admin role)
- **`app/salesman/`**: Salesman-facing UI pages (requires Salesman role)
- **`components/`**: Reusable React components for UI
- **`models/`**: Mongoose schemas defining database structure
- **`lib/`**: Utility functions and helper libraries
- **`contexts/`**: React Context for global state (authentication)
- **`docs/`**: Project documentation and feature guides


## 📊 Database Schema

### Entity Relationships

```
┌──────────┐        ┌─────────────┐        ┌──────────┐
│  Users   │───────▶│   Orders    │───────▶│ Products │
└──────────┘        └─────────────┘        └──────────┘
     │                     │                     │
     │                     │                     │
     ▼                     ▼                     ▼
┌──────────┐        ┌─────────────┐        ┌──────────┐
│Locations │        │  Invoices   │───────▶│   BOMs   │
└──────────┘        └─────────────┘        └──────────┘
                           │                     │
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐        ┌──────────────┐
                    │  Payments   │        │RawMaterials  │
                    └─────────────┘        └──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Customers  │
                    └─────────────┘
```

### Collection Schemas (MongoDB)

#### Users
- Primary roles: Admin, Salesman, Customer
- Handles authentication and authorization
- Links to: Orders (salesman), Locations (salesman), Sales

#### Products
- Central inventory management
- Links to: Orders, Invoices, BOMs, Assignments, Sales
- Tracks: Stock levels, batches, pricing, GST rates

#### Customers
- Customer master data
- Links to: Invoices, Payments, Sales, Orders
- Tracks: Outstanding balances, transaction history

#### Invoices
- GST-compliant invoicing
- Links to: Customers, Products (via items), Payments
- Supports: Manual creation, automatic generation from sales

#### Orders
- Salesman order requests for admin approval
- Links to: Salesmen (users), Customers (indirectly via name)
- Workflow: Pending → Approved → Completed

#### BOMs (Bill of Materials)
- Manufacturing cost calculation
- Links to: Products, RawMaterials
- Tracks: Material quantities, costs, active status

#### RawMaterials
- Inventory of manufacturing inputs
- Links to: BOMs
- Tracks: Stock, costs, suppliers

#### Payments
- Payment transaction records
- Links to: Invoices, Customers
- Tracks: Payment methods, amounts, dates

#### Locations
- GPS coordinates of salesmen
- Links to: Users (salesmen)
- Tracks: Latitude, longitude, timestamp

#### Assignments
- Stock allocation to salesmen
- Links to: Users (salesman), Products
- Tracks: Quantity, selling price

#### Sales
- Individual sale transactions
- Links to: Assignments, Customers, Products
- Records: Quantity sold, amount, date

#### Purchases
- Purchase transactions from suppliers
- Tracks: Supplier, items, amounts, GST

#### PurchaseReturns
- Returns to suppliers with credit tracking
- Links to: Purchases
- Manages: Return quantities, refund amounts

#### SaleReturns
- Customer returns processing
- Links to: Invoices, Customers
- Tracks: Return reasons, refund status

#### CompanySettings
- Application configuration
- Stores: Company name, GST number, logo, address

### Indexing Strategy

- **Users**: `email` (unique), `role`
- **Products**: `sku` (unique), `name`, `category`
- **Customers**: `phone`, `gstin`, `email`
- **Invoices**: `invoice_number` (unique), `customer_id`, `invoice_date`
- **Orders**: `salesman_id`, `status`, `createdAt`
- **Locations**: `salesman_id`, `timestamp`
- **Payments**: `invoice_id`, `customer_id`, `payment_date`


## 🚀 Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint for code quality
npm run lint

# Type check without emitting files
npx tsc --noEmit

# Run data migration scripts
npm run migrate

# Production setup script
npm run production-setup
```

## 📝 API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
Login user and get JWT token
```typescript
Request Body:
{
  email: string,
  password: string,
  role: 'Admin' | 'Salesman' | 'Customer'
}

Response:
{
  success: true,
  token: string,
  user: {
    id: string,
    name: string,
    email: string,
    role: string
  }
}
```

#### POST `/api/auth/signup`
Register new user
```typescript
Request Body:
{
  name: string,
  email: string,
  password: string,
  role: 'Admin' | 'Salesman' | 'Customer',
  phone?: string
}

Response:
{
  success: true,
  message: 'User created successfully'
}
```

### Product Endpoints

#### GET `/api/products`
List all products (with pagination and filtering)
- Query params: `search`, `category`, `stock_status`, `page`, `limit`
- Auth: Admin, Salesman
- Response: Array of products with stock information

#### POST `/api/products`
Create new product
- Auth: Admin only
- Body: Product details (name, sku, price, hsn_code, etc.)

#### GET `/api/products/[id]`
Get single product details
- Auth: Admin, Salesman
- Response: Product with batch information

#### PUT `/api/products/[id]`
Update product
- Auth: Admin only
- Body: Partial product update

#### DELETE `/api/products/[id]`
Delete product
- Auth: Admin only

### Invoice Endpoints

#### GET `/api/invoices`
List all invoices
- Query params: `customer_id`, `from_date`, `to_date`, `payment_status`
- Auth: Admin, Salesman (filtered by salesman)
- Response: Array of invoices with customer info

#### POST `/api/invoices/manual`
Create manual invoice
- Auth: Admin only
- Body: Invoice details with line items
- Response: Created invoice with invoice_number

#### GET `/api/invoices/preview-number`
Preview next invoice number
- Auth: Admin, Salesman
- Query params: `date` (optional)
- Response: { invoice_number: 'INV-YYYYMMDD-XXXX' }

#### PATCH `/api/invoices/[id]/update-number`
Update invoice number
- Auth: Admin only
- Body: { invoice_number: string }

### Order Endpoints

#### GET `/api/orders`
List orders (filtered by role)
- Query params: `status`, `customer_name`, `from_date`, `to_date`
- Auth: Admin (all orders), Salesman (own orders)
- Response: Array of orders

#### POST `/api/orders`
Create new order (salesman only)
- Auth: Salesman
- Body: Order details with items
- Response: Created order with order_number

#### PUT `/api/orders/[id]`
Update order (admin approval or salesman edit)
- Auth: Admin (approve/reject), Salesman (edit pending)
- Body: Order updates or { status: 'Approved'/'Rejected' }

#### DELETE `/api/orders/[id]`
Delete order
- Auth: Admin (any), Salesman (own pending orders)

### Customer Endpoints

#### GET `/api/customers`
List all customers
- Query params: `search`, `city`, `state`
- Auth: Admin, Salesman
- Response: Array of customers

#### POST `/api/customers`
Create new customer
- Auth: Admin, Salesman
- Body: Customer details

#### GET `/api/customers/[id]`
Get customer details with transaction history
- Auth: Admin, Salesman
- Response: Customer with invoices, payments, outstanding balance

### Payment Endpoints

#### POST `/api/payments`
Record payment
- Auth: Admin
- Body: Payment details (invoice_id, amount, method)
- Response: Created payment + updated invoice

#### GET `/api/payments`
List all payments
- Query params: `customer_id`, `from_date`, `to_date`
- Auth: Admin

### BOM Endpoints

#### GET `/api/boms`
List all BOMs
- Query params: `product_id`, `status`, `is_current`
- Auth: Admin
- Response: Array of BOMs with material details

#### POST `/api/boms`
Create new BOM
- Auth: Admin
- Body: BOM with materials array
- Response: Created BOM with auto-calculated costs

#### PUT `/api/boms/[id]`
Update BOM
- Auth: Admin
- Body: BOM updates
- Response: Updated BOM with recalculated costs

### Location Endpoints

#### GET `/api/locations`
Get salesman locations
- Query params: `salesman_id`, `hours` (default 24), `limit`
- Auth: Admin (all salesmen), Salesman (own locations)
- Response: Array of location points

#### POST `/api/locations`
Record location
- Auth: Salesman
- Body: { latitude, longitude, accuracy?, timestamp }
- Response: Created location record

### Report Endpoints

#### GET `/api/reports/gst`
Generate GST report
- Query params: `from_date`, `to_date`
- Auth: Admin
- Response: GST summary with CGST/SGST/IGST breakdowns

#### GET `/api/reports/profit-loss`
Generate profit/loss report
- Query params: `from_date`, `to_date`
- Auth: Admin
- Response: Revenue, costs, and profit calculations

#### GET `/api/reports/orders`
Generate order analysis report
- Query params: `from_date`, `to_date`, `salesman_id`
- Auth: Admin
- Response: Order statistics and trends

### Response Formats

#### Success Response
```typescript
{
  success: true,
  data: any,
  message?: string
}
```

#### Error Response
```typescript
{
  success: false,
  error: string,
  details?: any
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error


## 🔐 Security

### Authentication & Authorization

1. **JWT Token-Based Authentication**
   - Tokens generated on successful login
   - 24-hour expiration (configurable)
   - Stored in localStorage on client
   - Sent in `Authorization: Bearer <token>` header

2. **Password Security**
   - Bcrypt hashing with 10 salt rounds
   - Minimum password requirements enforced
   - Passwords never stored in plain text
   - No password transmission in URLs

3. **Role-Based Access Control (RBAC)**
   - Three roles: Admin, Salesman, Customer
   - Route-level protection using middleware
   - Admin: Full system access
   - Salesman: Limited to own data (orders, locations, assignments)
   - Customer: View-only access to own transactions

4. **API Route Protection**
   ```typescript
   // Middleware checks on every protected route
   - Token validation
   - Token expiration check
   - Role authorization
   - Resource ownership verification (for salesmen)
   ```

### Data Protection

1. **Environment Variables**
   - All sensitive data in `.env.local` (never committed)
   - Separate production environment variables
   - No hardcoded secrets in codebase

2. **Input Validation**
   - Server-side validation on all API routes
   - TypeScript type checking
   - Mongoose schema validation
   - Sanitization of user inputs

3. **Database Security**
   - MongoDB Atlas with IP whitelisting
   - Database user authentication
   - Encrypted connections (TLS/SSL)
   - Regular automated backups

4. **CORS Configuration**
   - Restricted to allowed origins in production
   - Preflight request handling
   - Credentials support for cookies/auth headers

### Best Practices Implemented

- ✅ HTTPS enforcement in production
- ✅ Secure headers (Helmet.js ready)
- ✅ Rate limiting on authentication endpoints
- ✅ No sensitive data in error messages
- ✅ SQL injection prevention (NoSQL database)
- ✅ XSS prevention (React auto-escaping)
- ✅ CSRF protection (token-based auth)
- ✅ Dependency security audits (`npm audit`)

### Security Checklist for Production

- [ ] Change default JWT secret to strong random value
- [ ] Enable HTTPS on production domain
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting on all API routes
- [ ] Set up MongoDB IP whitelist for production
- [ ] Implement session timeout/refresh mechanism
- [ ] Add security headers (CSP, X-Frame-Options)
- [ ] Enable logging and monitoring
- [ ] Regular security audits and dependency updates
- [ ] Implement backup and disaster recovery


## 🚢 Deployment

### Vercel Deployment (Recommended)

**Prerequisites:**
- GitHub/GitLab account with repository
- Vercel account (free tier available)
- MongoDB Atlas database

**Steps:**

1. **Prepare Repository**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select "LeafTrack" project

3. **Configure Environment Variables**
   In Vercel dashboard, add:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-production-secret-key
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build completion
   - Access your application at provided URL

5. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

### MongoDB Atlas Production Setup

1. **Create Production Cluster**
   - Use dedicated cluster for production (M10+)
   - Enable automated backups
   - Configure appropriate instance size

2. **Security Configuration**
   - Add Vercel IP ranges to IP whitelist (or 0.0.0.0/0 for serverless)
   - Create dedicated database user for production
   - Use strong password for database user
   - Enable encryption at rest

3. **Performance Optimization**
   - Create indexes on frequently queried fields
   - Enable MongoDB query profiling
   - Set up connection pooling

### Environment-Specific Configuration

#### Production (`vercel.json`)
```json
{
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  }
}
```

#### Build Optimization
```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}
```

### Post-Deployment Checklist

- [ ] Test all authentication flows
- [ ] Verify database connectivity
- [ ] Check API endpoint functionality
- [ ] Test role-based access control
- [ ] Verify invoice generation and PDFs
- [ ] Test location tracking (requires HTTPS)
- [ ] Check mobile responsiveness
- [ ] Monitor error logs in Vercel dashboard
- [ ] Set up custom domain (if applicable)
- [ ] Configure CDN and caching
- [ ] Set up monitoring and alerts

### Alternative Deployment Platforms

#### Netlify
- Similar to Vercel deployment process
- Configure build command: `npm run build`
- Publish directory: `.next`
- Add environment variables in Netlify dashboard

#### Railway
- Direct deployment from GitHub
- Built-in MongoDB support
- Automatic HTTPS
- Simple environment variable configuration

#### Self-Hosted (VPS/Cloud Server)
```bash
# On server
git clone <repository>
cd LeafTrack
npm install
npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start npm --name "leaftrack" -- start
pm2 save
pm2 startup
```

### Continuous Deployment

With Vercel, automatic deployments occur on:
- Push to `main` branch → Production deployment
- Push to `develop` branch → Preview deployment
- Pull requests → Preview deployment

### Monitoring & Maintenance

1. **Error Tracking**
   - Set up Sentry or similar service
   - Monitor API error rates
   - Track failed authentication attempts

2. **Performance Monitoring**
   - Use Vercel Analytics
   - Monitor API response times
   - Track page load speeds

3. **Database Maintenance**
   - Regular backup verification
   - Index optimization
   - Query performance monitoring
   - Disk space monitoring

4. **Security Updates**
   ```bash
   # Regular dependency updates
   npm audit
   npm audit fix
   npm update
   ```



## 📖 Usage Guide

### Admin Workflows

#### 1. Product Management
```
Dashboard → Products → Create Product
- Enter product details (name, SKU, HSN code, pricing)
- Add initial stock and batch information
- Set GST rate
- Save product
```

#### 2. Create Invoice
```
Dashboard → Invoicing → New Invoice
- Select customer
- Add products to invoice
- System calculates GST automatically
- Preview invoice
- Generate and download PDF
```

#### 3. BOM Management
```
Dashboard → Raw Materials → Create materials
Dashboard → BOM Management → Create BOM
- Select product
- Add raw materials with quantities
- System auto-calculates manufacturing cost
- Activate BOM to update product cost
```

#### 4. Approve Orders
```
Dashboard → Orders
- View pending orders from salesmen
- Review order details
- Approve or reject with notes
- System updates stock on approval
```

#### 5. Track Salesmen
```
Dashboard → Locations
- View real-time map of salesman locations
- Filter by salesman and time range
- View route history and patterns
```

### Salesman Workflows

#### 1. Create Order
```
Dashboard → Orders → New Order
- Enter customer details
- Add products and quantities
- Submit for admin approval
- Track order status
```

#### 2. Location Tracking
```
Dashboard → Enable location tracking widget
- System automatically sends GPS coordinates
- Admin can view your location in real-time
```

### Key Features Usage

#### Manual Invoice Creation
For creating invoices for non-standard sales:
1. Go to Admin → Invoicing → Manual Invoice
2. Select customer or enter details
3. Add custom line items with descriptions
4. Set custom pricing and quantities
5. System handles GST calculation
6. Generate PDF invoice

#### Payment Recording
To record customer payments:
1. Go to Admin → Financial → Payments
2. Select invoice or customer
3. Enter payment amount and method
4. Add reference number (for bank transfers/UPI)
5. System updates outstanding balance automatically

#### GST Reports
Generate tax-compliant reports:
1. Go to Admin → Reports → GST Reports
2. Select date range (month/quarter/year)
3. System generates GSTR-1 compliant data
4. Download or export report
5. Shows CGST, SGST, IGST breakdowns

## 🧪 Testing

### Manual Testing Scripts

Test database connection:
```bash
node test-mongodb-connection.js
```

Test authentication:
```bash
node scripts/test-auth.js
```

### API Testing with Postman/Thunder Client

Import the collection and test endpoints:

**Login**
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123",
  "role": "Admin"
}
```

**Get Products (with auth)**
```
GET http://localhost:3000/api/products
Authorization: Bearer YOUR_JWT_TOKEN
```

### Testing Checklist

- [ ] User registration and login
- [ ] Role-based dashboard access
- [ ] Product CRUD operations
- [ ] Customer CRUD operations
- [ ] Invoice generation and PDF export
- [ ] Payment recording and balance updates
- [ ] Order creation and approval workflow
- [ ] BOM creation and cost calculation
- [ ] Location tracking (requires HTTPS in production)
- [ ] GST report generation
- [ ] Profit/loss calculations

## 🐛 Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**
```
Error: MongoServerError: Authentication failed
```
Solution:
- Verify `MONGODB_URI` in `.env.local`
- Check database user credentials
- Ensure IP address is whitelisted in MongoDB Atlas
- Verify network access settings

**2. JWT Token Invalid**
```
Error: Invalid token or signature
```
Solution:
- Clear localStorage and login again
- Check `JWT_SECRET` matches between sessions
- Verify token hasn't expired (24-hour default)

**3. Build Errors**
```
Error: Cannot find module '...'
```
Solution:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**4. Location Tracking Not Working**
- Requires HTTPS in production (browser geolocation API requirement)
- Check browser permissions for location access
- Verify navigator.geolocation is available

**5. PDF Generation Issues**
```
Error: jsPDF not defined
```
Solution:
- Ensure jsPDF and jsPDF-AutoTable are installed
- Check import statements
- Verify client-side rendering (use 'use client' directive)

**6. Type Errors in Development**
```
TypeScript error: Property 'x' does not exist
```
Solution:
```bash
npm run lint
npx tsc --noEmit
# Fix type issues based on output
```

### Development Tips

- **Hot Reload Issues**: Restart dev server (`npm run dev`)
- **Stale Data**: Clear browser cache and localStorage
- **API Route Changes**: Restart server after modifying API routes
- **Environment Variables**: Restart server after changing `.env.local`

### Performance Issues

**Slow Page Load**
- Check MongoDB query optimization
- Add indexes to frequently queried fields
- Implement pagination on large datasets
- Use `lean()` queries for read-only operations

**API Timeouts**
- Increase serverless function timeout in Vercel
- Optimize database queries
- Implement caching strategies
- Use connection pooling

## 📚 Documentation

Additional documentation available in `/docs` folder:

- **BOM-IMPLEMENTATION-COMPLETE.md**: BOM feature details
- **DEPLOYMENT-GUIDE.md**: Detailed deployment instructions
- **GST-REPORTS-SUMMARY.md**: GST reporting documentation
- **CUSTOMER-TRANSACTIONS-FEATURE.md**: Customer transaction history
- **FINANCIAL-MANAGEMENT-ANALYSIS.md**: Financial feature overview
- **PURCHASE-MANAGEMENT-DOCUMENTATION.md**: Purchase module guide
- **REPORTS-DOCUMENTATION.md**: Reporting system details

## 🤝 Contributing

This is a private project for SohagTea Distribution Network. For internal development:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit pull request with description
5. Code review by team lead
6. Merge to main after approval

### Coding Standards

- Follow TypeScript best practices
- Use ESLint configuration
- Write meaningful commit messages
- Document complex logic with comments
- Update README for major features

## 📄 License

Private - SohagTea Distribution Network. All rights reserved.

## 👥 Support & Contact

For issues, questions, or feature requests:
- Contact development team
- Create internal issue ticket
- Email: support@sohagtea.com (example)

---

## 🎯 Project Summary

**LeafTrack** is a complete, production-ready tea distribution management system that provides:

✅ **Core Functionality**
- Multi-role authentication system
- Complete inventory management
- GST-compliant financial tracking
- Real-time location tracking
- Order approval workflows
- Manufacturing cost calculation (BOM)

✅ **Technology Excellence**
- Modern tech stack (Next.js 14, React 18, TypeScript 5)
- Responsive, mobile-friendly UI
- RESTful API architecture
- Cloud-based deployment ready
- Security best practices implemented

✅ **Business Value**
- Streamlined operations
- Compliance with GST regulations
- Real-time business insights
- Improved field team management
- Accurate inventory tracking
- Financial transparency

**Built with ❤️ for SohagTea Distribution Network**

---

*Last Updated: January 2026*
*Version: 1.0.0*
