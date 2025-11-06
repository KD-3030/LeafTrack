# LeafTrack - SohagTea Management System

A comprehensive, modern inventory and distribution management solution designed for tea distribution networks. Built with Next.js 14, featuring role-based access control, real-time location tracking, financial management, and production planning capabilities.

## 🌟 Key Features

### 👥 User Management & Authentication
- **Role-Based Access Control**: Separate dashboards and permissions for Admin and Salesman roles
- **JWT-Based Authentication**: Secure login/signup with token-based sessions
- **User CRUD Operations**: Complete user management for admins

### 📦 Inventory & Product Management
- **Product Management**: Full CRUD operations for tea leaf products
- **Product Batches**: Track multiple batches with expiry dates and quantities
- **Stock Tracking**: Real-time inventory monitoring and stock levels
- **Product Categories**: Organize products by type and category
- **Low Stock Alerts**: Automatic notifications for inventory replenishment

### 🏭 Manufacturing & Production Planning
- **Bill of Materials (BOM)**: Define manufacturing recipes for products
- **Raw Materials Management**: Track raw material inventory and costs
- **BOM Materials**: Link raw materials to products with quantities and costs
- **Auto-Cost Calculation**: Automatically update product manufacturing costs based on BOM
- **Production Cost Analysis**: View detailed cost breakdowns

### 💰 Financial Management
- **GST-Compliant Invoicing**: Generate invoices with CGST/SGST/IGST calculations
- **Custom Invoice Numbering**: Format: INV-YYYYMMDD-XXXX with manual editing capability
- **Manual Invoice Creation**: Create invoices manually with custom items and pricing
- **Invoice Number Editing**: Edit invoice numbers for both new and existing invoices
- **Payment Tracking**: Record and monitor customer payments
- **Outstanding Balance**: Track pending payments and dues
- **Financial Reports**: Comprehensive profit/loss and GST reports
- **Payment History**: Complete transaction history by customer

### 📄 Invoicing System
- **Automatic Invoice Generation**: Create invoices from sales transactions
- **Manual Invoice Creation**: Generate standalone invoices with custom line items
- **Invoice Preview**: Real-time preview before generation
- **PDF Export**: Download invoices as formatted PDF documents
- **Invoice Returns**: Process sale returns with automatic balance adjustments
- **Invoice Editing**: Modify invoice numbers for existing invoices
- **Sequence Management**: Auto-increment invoice sequences with manual override

### 👨‍💼 Customer Management
- **Customer CRUD**: Complete customer information management
- **Contact Details**: Store customer contact and address information
- **GST Information**: Track customer GSTIN for tax compliance
- **Transaction History**: View all customer orders, invoices, and payments
- **Outstanding Balances**: Monitor customer-wise pending amounts
- **Customer Analytics**: Sales patterns and payment behavior

### 🚚 Sales & Distribution
- **Order Management**: Create and track customer orders
- **Stock Assignment**: Assign inventory to field salesmen
- **Sales Recording**: Log sales transactions with product details
- **Salesman Dashboard**: Dedicated interface for field operations
- **Order Status Tracking**: Monitor order fulfillment stages

### 🛒 Procurement Management
- **Purchase Recording**: Track all purchase transactions
- **Purchase Returns**: Process returned purchases with credit notes
- **Supplier Management**: Maintain supplier information
- **Purchase Analytics**: Cost analysis and purchase trends

### 📍 Location Tracking
- **Real-Time GPS Tracking**: Track salesman locations during field visits
- **Location History**: View historical location data with timestamps
- **Interactive Maps**: Leaflet-based mapping with OpenStreetMap
- **Route Visualization**: See salesman travel routes and visit patterns
- **Location Widgets**: Live location display in dashboards

### 📊 Reporting & Analytics
- **Business Reports**: Comprehensive business performance metrics
- **Order Reports**: Detailed order analysis by date, salesman, and product
- **Financial Reports**: Profit/loss statements and revenue analysis
- **GST Reports**: Tax-compliant GST reporting (CGST/SGST/IGST)
- **Salesman Performance**: Individual salesman sales metrics
- **Product Analytics**: Best-selling products and inventory trends

### ⚙️ Settings & Configuration
- **Company Settings**: Configure company information and GST details
- **System Configuration**: Customize application behavior
- **User Preferences**: Personalized settings per user role

### 📱 Responsive Design
- **Mobile-Friendly**: Fully responsive layouts for all screen sizes
- **Touch-Optimized**: Mobile-friendly navigation and interactions
- **Adaptive UI**: Hamburger menu, collapsible sidebars, and responsive grids
- **Cross-Device**: Works seamlessly on desktop, tablet, and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account
- npm or yarn

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your actual values:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
   JWT_SECRET=your-secure-jwt-secret-key
   NEXTAUTH_SECRET=your-nextauth-secret
   NEXTAUTH_URL=http://localhost:3000
   NODE_ENV=development
   ```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Security Notes

- **Never commit `.env` files** - They contain sensitive credentials
- **Use strong JWT secrets** - Generate random, complex secret keys
- **Environment variables** - All sensitive data should be stored in environment variables

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3.x
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Maps**: Leaflet with React-Leaflet
- **Charts**: Recharts (for analytics)
- **Fonts**: Google Fonts (Playfair Display, Montserrat, Inter)

### Backend
- **Runtime**: Node.js 18+
- **API**: Next.js API Routes
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Built-in validation with TypeScript

### Development Tools
- **Language**: TypeScript 5.x
- **Linting**: ESLint
- **Package Manager**: npm
- **Version Control**: Git

### Key Libraries
- **date-fns**: Date formatting and manipulation
- **react-hook-form**: Form state management
- **sonner**: Toast notifications
- **next-themes**: Dark mode support (future)
- **class-variance-authority**: Utility for UI variants

## 📁 Project Structure

```
LeafTrack/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── products/             # Product management
│   │   ├── customers/            # Customer management
│   │   ├── invoices/             # Invoice operations
│   │   ├── payments/             # Payment tracking
│   │   ├── orders/               # Order management
│   │   ├── boms/                 # Bill of Materials
│   │   ├── raw-materials/        # Raw material management
│   │   ├── purchases/            # Purchase transactions
│   │   ├── locations/            # GPS tracking
│   │   ├── reports/              # Analytics and reports
│   │   └── settings/             # System configuration
│   ├── admin/                    # Admin dashboard pages
│   │   ├── dashboard/            # Admin overview
│   │   ├── products/             # Product management UI
│   │   ├── customers/            # Customer management UI
│   │   ├── invoicing/            # Invoice generation
│   │   ├── financial/            # Financial management
│   │   ├── orders/               # Order management
│   │   ├── boms/                 # BOM management
│   │   ├── raw-materials/        # Raw materials UI
│   │   ├── purchases/            # Purchase management
│   │   ├── purchase-returns/     # Purchase returns
│   │   ├── salesmen/             # Salesman management
│   │   ├── locations/            # Location tracking
│   │   ├── reports/              # Reports and analytics
│   │   └── settings/             # Settings UI
│   ├── salesman/                 # Salesman dashboard
│   │   ├── dashboard/            # Salesman overview
│   │   └── orders/               # Order creation
│   ├── login/                    # Login page
│   └── signup/                   # Signup page
├── components/                   # React components
│   ├── admin/                    # Admin-specific components
│   ├── ui/                       # Reusable UI components
│   └── *.tsx                     # Shared components
├── contexts/                     # React Context providers
│   └── AuthContext.tsx           # Authentication context
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries
│   ├── mongodb.ts                # MongoDB connection
│   ├── auth.ts                   # Auth utilities
│   └── utils.ts                  # Helper functions
├── models/                       # Mongoose models
│   ├── User.ts                   # User schema
│   ├── Product.ts                # Product schema
│   ├── Customer.ts               # Customer schema
│   ├── Invoice.ts                # Invoice schema
│   ├── Payment.ts                # Payment schema
│   ├── Sale.ts                   # Sale schema
│   ├── BOM.ts                    # Bill of Materials
│   ├── RawMaterial.ts            # Raw materials
│   └── ...                       # Other models
├── scripts/                      # Utility scripts
└── types/                        # TypeScript type definitions
```

## 🚀 Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Type check
npx tsc --noEmit
```

## 🔐 Environment Variables

Required environment variables (create `.env.local` file):

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-secure-jwt-secret-key-minimum-32-characters

# NextAuth (if using)
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=http://localhost:3000

# Application
NODE_ENV=development
```

## 🎯 Usage

### Admin Access
1. Navigate to `/login`
2. Login with admin credentials
3. Access full admin dashboard at `/admin/dashboard`
4. Manage products, customers, invoices, BOMs, and more

### Salesman Access
1. Navigate to `/login`
2. Login with salesman credentials
3. Access salesman dashboard at `/salesman/dashboard`
4. Create orders, view assignments, track locations

### Key Workflows

#### Invoice Creation
1. Go to Admin → Invoicing
2. Choose "Create Invoice" or "Manual Invoice"
3. Select customer and add items
4. Preview and generate invoice
5. Download PDF if needed

#### BOM Management
1. Go to Admin → Raw Materials (create materials first)
2. Go to Admin → BOM Management
3. Create new BOM for a product
4. Add materials with quantities
5. System auto-calculates product manufacturing cost

#### Location Tracking
1. Salesman enables location tracking in dashboard
2. Admin views real-time locations in Admin → Locations
3. View historical routes and visit patterns

## 🔒 Security Features

- **JWT Token Authentication**: Secure, stateless authentication
- **Password Hashing**: bcrypt-based password encryption
- **Role-Based Access Control**: Separate permissions for admin/salesman
- **API Route Protection**: Middleware-based authentication checks
- **Environment Security**: Sensitive data in environment variables
- **HTTPS Ready**: Production-ready SSL/TLS support

## 📱 Responsive Design

The application is fully responsive with:
- **Mobile-first approach**: Optimized for small screens
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1920px)
- **Touch-friendly**: Proper touch targets and gestures
- **Adaptive navigation**: Hamburger menu on mobile, sidebar on desktop
- **Responsive grids**: Auto-stacking layouts on smaller screens

## 🧪 Testing

The application includes:
- Database model validation scripts
- API endpoint testing utilities
- Connection testing tools

Run tests:
```bash
node scripts/test-financial-comprehensive.js
node test-connection.js
```

## 🚢 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy automatically

### Other Platforms
- **Netlify**: Configure build command and environment
- **Railway**: Direct deployment with MongoDB support
- **Self-hosted**: Use `npm run build` and `npm start`

## 📝 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get product details
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices/manual` - Create manual invoice
- `PATCH /api/invoices/[id]/update-number` - Update invoice number
- `GET /api/invoices/preview-number` - Preview next invoice number

### BOMs
- `GET /api/boms` - List all BOMs
- `POST /api/boms` - Create BOM
- `GET /api/boms/[id]` - Get BOM details
- `PUT /api/boms/[id]` - Update BOM
- `DELETE /api/boms/[id]` - Delete BOM

[See full API documentation in `/app/api/` directory]

## 🐛 Troubleshooting

### Build Issues
- **Font fetch errors**: Set `optimizeFonts: false` in `next.config.js`
- **MongoDB connection**: Verify `MONGODB_URI` in `.env.local`
- **Type errors**: Run `npm install` to ensure dependencies are up-to-date

### Runtime Issues
- **Authentication fails**: Check `JWT_SECRET` is set correctly
- **Database errors**: Verify MongoDB Atlas network access and credentials
- **Location tracking**: Ensure HTTPS for production (browser geolocation requirement)

## 📄 License

Private - SohagTea Distribution Network

## 👥 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for SohagTea Distribution Network**
