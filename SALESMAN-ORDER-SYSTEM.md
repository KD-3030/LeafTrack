# New Salesman Order System - Complete Overhaul

## 🎯 Overview

Completely redesigned the salesman system from an allocation-based model to an **order approval workflow**. Salesmen now create customer orders that require admin approval, with full order modification capabilities for administrators.

---

## 📋 System Architecture

### Old System (Removed)
- ❌ Assignment/allocation of products to salesmen
- ❌ Pre-allocated inventory management
- ❌ Territory-based product distribution

### New System (Implemented)
- ✅ **Order Creation**: Salesmen create orders with customer details and products
- ✅ **Approval Workflow**: All orders require admin review and approval
- ✅ **Admin Modifications**: Admins can adjust quantities, prices, and terms
- ✅ **Status Tracking**: Pending → Approved/Rejected with full audit trail

---

## 🗂️ Database Model

### Order Model (`models/Order.ts`)

```typescript
interface IOrder {
  // Identification
  order_number: string;        // Auto-generated: ORD-202510-0001
  order_date: Date;
  
  // Salesman Info
  salesman_id: ObjectId;        // Reference to User
  salesman_name: string;
  salesman_contact?: string;
  
  // Customer Info
  customer_id?: ObjectId;       // Optional reference to Customer
  customer_name: string;
  customer_contact: string;
  customer_address?: string;
  customer_gstin?: string;
  customer_email?: string;
  
  // Order Items (Array)
  items: [{
    product_id?: ObjectId;
    product_name: string;
    quantity: number;
    unit: 'kg' | 'box' | 'bag';
    price_per_unit: number;
    total_price: number;
  }];
  
  // Pricing
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Approval Status
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: Date;
  reviewed_at?: Date;
  reviewed_by?: ObjectId;
  reviewer_name?: string;
  
  // Admin Modifications
  admin_modified: boolean;
  admin_notes?: string;
  original_total?: number;      // Before admin changes
  
  // Additional
  delivery_date?: Date;
  payment_terms?: string;
  notes?: string;
  rejection_reason?: string;
}
```

**Key Features**:
- Auto-generated order numbers with month-based sequence
- Support for multiple items per order
- Tracks admin modifications separately
- Full audit trail of approvals/rejections
- Indexed for performance (salesman_id, status, dates)

---

## 🔌 API Endpoints

### 1. GET /api/orders
**Purpose**: List all orders (filtered by user role)

**Access**:
- **Admin**: Sees all orders
- **Salesman**: Only sees their own orders

**Query Parameters**:
- `status`: pending | approved | rejected | all
- `customer_name`: Filter by customer
- `from_date`, `to_date`: Date range filter
- `search`: Global search (order number, customer, contact)

**Response**:
```json
{
  "success": true,
  "orders": [...],
  "summary": {
    "total_orders": 45,
    "pending_count": 12,
    "approved_count": 28,
    "rejected_count": 5,
    "total_value": 450000,
    "pending_value": 120000,
    "approved_value": 310000
  }
}
```

---

### 2. POST /api/orders
**Purpose**: Create new order (Salesman only)

**Access**: Salesman role required

**Request Body**:
```json
{
  "customer_name": "ABC Store",
  "customer_contact": "+91 98765 43210",
  "customer_address": "123 Main St",
  "customer_gstin": "22AAAAA0000A1Z5",
  "customer_email": "abc@store.com",
  "items": [
    {
      "product_name": "Green Tea",
      "quantity": 100,
      "unit": "kg",
      "price_per_unit": 500,
      "total_price": 50000
    }
  ],
  "subtotal": 50000,
  "tax_percentage": 18,
  "tax_amount": 9000,
  "discount_amount": 0,
  "total_amount": 59000,
  "notes": "Urgent delivery required"
}
```

**Auto-Added Fields**:
- `salesman_id`: From JWT token
- `salesman_name`: From JWT token
- `status`: Set to 'pending'
- `submitted_at`: Current timestamp
- `order_number`: Auto-generated

---

### 3. GET /api/orders/[id]
**Purpose**: Get single order details

**Access**:
- **Admin**: Any order
- **Salesman**: Only their own orders

---

### 4. PUT /api/orders/[id]
**Purpose**: Update order

**Admin Actions** (any order):
- Approve/reject order
- Modify items (quantities, prices)
- Add admin notes
- Set delivery date and payment terms
- Add rejection reason

**Salesman Actions** (own pending orders only):
- Edit customer details
- Modify items
- Update notes
- **Cannot edit after review**

**Example (Admin Approval with Modifications)**:
```json
{
  "status": "approved",
  "items": [
    {
      "product_name": "Green Tea",
      "quantity": 80,        // Reduced from 100
      "unit": "kg",
      "price_per_unit": 480, // Discounted from 500
      "total_price": 38400
    }
  ],
  "subtotal": 38400,
  "total_amount": 45312,
  "admin_notes": "Approved with reduced quantity due to stock availability",
  "delivery_date": "2025-10-15",
  "payment_terms": "Net 30"
}
```

---

### 5. DELETE /api/orders/[id]
**Purpose**: Delete order

**Access**:
- **Admin**: Can delete any order
- **Salesman**: Can only delete own pending orders

---

## 🎨 User Interface

### Salesman Pages

#### 1. Orders List (`/salesman/orders`)

**Features**:
- ✅ Summary cards showing: Total, Pending, Approved, Rejected orders
- ✅ Status badges with color coding (Yellow=Pending, Green=Approved, Red=Rejected)
- ✅ Search by order number, customer name, or contact
- ✅ Filter by status (All, Pending, Approved, Rejected)
- ✅ View/Edit/Delete actions
- ✅ "Modified by admin" indicator

**Summary Cards**:
```
┌─────────────┬──────────────┬─────────────┬─────────────┐
│ Total: 45   │ Pending: 12  │ Approved:28 │ Rejected: 5 │
│ ₹450,000    │ ₹120,000     │ ₹310,000    │             │
└─────────────┴──────────────┴─────────────┴─────────────┘
```

**Table Columns**:
- Order Number
- Date
- Customer (name + contact)
- Items count
- Total Amount (with admin modified flag)
- Status badge
- Actions (View/Edit/Delete)

**Permissions**:
- View all own orders
- Edit only pending orders
- Delete only pending orders
- Cannot modify approved/rejected orders

---

#### 2. Create Order (`/salesman/orders/new`)

**Workflow**:

**Step 1: Customer Information**
- Select from existing customers OR enter manually
- Required: Name, Contact
- Optional: Address, GSTIN, Email

**Step 2: Add Order Items**
- Select products from dropdown (shows: name, unit, price)
- OR enter product details manually
- Add multiple items with [+ Add Item] button
- Each item shows:
  - Product selection/manual entry
  - Quantity input
  - Unit dropdown (kg, box, bag)
  - Price per unit
  - Auto-calculated total
  - Remove button

**Step 3: Pricing**
- Tax percentage (default: 18%)
- Discount amount
- Auto-calculated summary:
  - Subtotal
  - Tax amount
  - Discount
  - **Total Amount**
- Optional notes field

**Step 4: Submit**
- Validation ensures:
  - Customer name and contact provided
  - At least one item with quantity > 0
- Creates order with status 'pending'
- Redirects to orders list
- Shows success toast

**Visual Layout**:
```
┌──────────────────────────────────────────────────┐
│ Customer Information                              │
│ - Select existing or enter manually              │
│ - Name, Contact, Address, GSTIN, Email          │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Order Items                        [+ Add Item]   │
│ ┌────┬─────────┬────┬───────┬───────┬────────┐  │
│ │Prod│Quantity│Unit│ Price │ Total │ Action │  │
│ ├────┼─────────┼────┼───────┼───────┼────────┤  │
│ │ ..dropdown or manual entry...  │ [🗑️]    │  │
│ └────┴─────────┴────┴───────┴───────┴────────┘  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Pricing Summary                                   │
│ - Tax: 18%                                       │
│ - Discount: ₹0                                   │
│ ┌────────────────────────────────────────────┐  │
│ │ Subtotal:     ₹50,000.00                   │  │
│ │ Tax (18%):    ₹9,000.00                    │  │
│ │ Discount:     -₹0.00                       │  │
│ │ ──────────────────────────────────────     │  │
│ │ Total Amount: ₹59,000.00                   │  │
│ └────────────────────────────────────────────┘  │
│ - Notes (optional)                               │
└──────────────────────────────────────────────────┘

          [Cancel]  [Submit for Approval]
```

---

### Admin Pages

#### 3. Order Approval Page (`/admin/orders` - To Be Created)

**Features Needed**:
- View all pending orders
- Filter by salesman, date, customer
- See full order details
- Modify items (quantities, prices)
- Approve with/without changes
- Reject with reason
- Add admin notes
- Set delivery date and payment terms

**Approval Workflow**:
```
1. Admin views pending order
2. Reviews customer and items
3. Options:
   a) Approve as-is
   b) Modify quantities/prices → Approve
   c) Reject with reason
4. System tracks:
   - Original vs modified amounts
   - Who approved/rejected
   - When reviewed
   - Admin notes
```

---

## 🔄 Workflow Diagrams

### Order Lifecycle

```
┌─────────────┐
│  Salesman   │
│ Creates     │
│   Order     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  PENDING    │◄─── Can edit/delete (salesman)
│   Status    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Admin     │
│  Reviews    │
└──────┬──────┘
       │
       ├─────────────┬─────────────┐
       ▼             ▼             ▼
┌───────────┐  ┌──────────┐  ┌──────────┐
│ APPROVED  │  │ APPROVED │  │ REJECTED │
│  (As-Is)  │  │(Modified)│  │          │
└───────────┘  └──────────┘  └──────────┘
       │             │             │
       └──────┬──────┴──────┬──────┘
              ▼             ▼
     ┌─────────────┐  ┌──────────┐
     │  Process    │  │  Notify  │
     │   Order     │  │ Salesman │
     └─────────────┘  └──────────┘
```

---

### User Permissions

```
┌──────────────────────────────────────────────────┐
│                   SALESMAN                        │
├──────────────────────────────────────────────────┤
│ ✅ Create new orders                             │
│ ✅ View own orders                               │
│ ✅ Edit own PENDING orders                       │
│ ✅ Delete own PENDING orders                     │
│ ❌ Cannot edit approved/rejected orders          │
│ ❌ Cannot view other salesmen's orders           │
│ ❌ Cannot approve orders                         │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                     ADMIN                         │
├──────────────────────────────────────────────────┤
│ ✅ View ALL orders                               │
│ ✅ Approve/Reject any order                      │
│ ✅ Modify order items and pricing                │
│ ✅ Add admin notes                               │
│ ✅ Set delivery dates and terms                  │
│ ✅ Delete any order                              │
│ ✅ View order history and modifications          │
└──────────────────────────────────────────────────┘
```

---

## 📊 Status Indicators

### Visual Badges

**Pending** (Yellow)
```
┌──────────────────┐
│ 🕐 Pending       │ ← Yellow background
└──────────────────┘
```

**Approved** (Green)
```
┌──────────────────┐
│ ✓ Approved       │ ← Green background
└──────────────────┘
```

**Rejected** (Red)
```
┌──────────────────┐
│ ✗ Rejected       │ ← Red background
└──────────────────┘
```

---

## 🔍 Key Features

### 1. **Flexible Customer Selection**
- Select from existing customer database
- OR enter new customer details manually
- Auto-populates address, GSTIN, email when selected

### 2. **Dynamic Product Entry**
- Select from product catalog (auto-fills price)
- OR enter product details manually
- Support for multiple items per order
- Real-time total calculation

### 3. **Admin Modification Tracking**
- `admin_modified` flag when changes made
- `original_total` preserved for reference
- Visual indicator in order list
- Full audit trail

### 4. **Smart Permissions**
- Salesmen can only edit pending orders
- Automatic salesman_id assignment from JWT
- Role-based API filtering
- Secure approval workflow

### 5. **Real-time Calculations**
- Item totals: quantity × price
- Subtotal: sum of all items
- Tax: subtotal × tax_percentage
- Final total: subtotal + tax - discount

---

## 🎯 Benefits Over Old System

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Control** | Pre-allocated inventory | Admin approves each order |
| **Flexibility** | Fixed allocations | Dynamic order creation |
| **Accuracy** | Manual tracking | Auto-calculated totals |
| **Visibility** | Limited | Full order history |
| **Modifications** | Difficult | Easy admin adjustments |
| **Customer Info** | Separate | Integrated in order |
| **Audit Trail** | None | Complete tracking |
| **Permissions** | Basic | Role-based granular |

---

## 🚀 Implementation Status

### ✅ Completed (Phase 1)
1. ✅ Order model with comprehensive fields
2. ✅ Complete API endpoints (GET, POST, PUT, DELETE)
3. ✅ Salesman orders list page
4. ✅ Salesman order creation page
5. ✅ Role-based permissions
6. ✅ Status tracking and badges
7. ✅ Summary statistics

### 🔄 In Progress (Phase 2)
1. Admin order approval page
2. Order modification interface
3. Rejection workflow with reasons

### ⏳ Pending (Phase 3)
1. Update salesman dashboard with order stats
2. Remove old allocation system
3. Order notifications
4. Export/print orders
5. Order analytics and reports

---

## 📁 Files Created/Modified

### Created Files:
1. ✅ `models/Order.ts` - Order database model
2. ✅ `app/api/orders/route.ts` - List and create orders
3. ✅ `app/api/orders/[id]/route.ts` - Get, update, delete order
4. ✅ `app/salesman/orders/page.tsx` - Orders list view
5. ✅ `app/salesman/orders/new/page.tsx` - Create order form

### To Be Created:
1. ⏳ `app/admin/orders/page.tsx` - Admin approval page
2. ⏳ `app/admin/orders/[id]/page.tsx` - Order details/modify
3. ⏳ Update `app/salesman/dashboard/page.tsx` - Add order stats

### To Be Removed:
1. ❌ Old assignment/allocation routes
2. ❌ Old assignment UI components
3. ❌ Assignment-related API endpoints

---

## 🧪 Testing Checklist

### Salesman Features:
- [ ] Create order with existing customer
- [ ] Create order with new customer (manual entry)
- [ ] Add multiple items to order
- [ ] Select products from catalog
- [ ] Enter products manually
- [ ] Calculate totals correctly
- [ ] Submit order successfully
- [ ] View own orders list
- [ ] Filter orders by status
- [ ] Search orders
- [ ] Edit pending order
- [ ] Delete pending order
- [ ] Cannot edit approved order
- [ ] Cannot view other salesman's orders

### Admin Features (To Test):
- [ ] View all orders
- [ ] Filter by salesman
- [ ] Approve order as-is
- [ ] Modify order and approve
- [ ] Reject order with reason
- [ ] Add admin notes
- [ ] Track modifications
- [ ] Delete any order

---

## 💡 Usage Examples

### Example 1: Salesman Creates Order
```
1. Navigate to /salesman/orders
2. Click "New Order"
3. Select customer "ABC Store" from dropdown
4. Click "Select product" → Choose "Green Tea (kg) - ₹500"
5. Enter quantity: 100
6. Price auto-fills: ₹500
7. Total shows: ₹50,000
8. Tax (18%) calculated: ₹9,000
9. Grand total: ₹59,000
10. Click "Submit for Approval"
11. Order created with status: Pending
12. Awaits admin review
```

### Example 2: Admin Approves with Changes
```
1. Admin sees pending order ORD-202510-0045
2. Reviews: 100 kg Green Tea @ ₹500/kg
3. Checks inventory: Only 80 kg available
4. Modifies order:
   - Reduces quantity to 80 kg
   - Adjusts price to ₹480/kg (discount)
5. Adds note: "Approved with available stock"
6. Clicks "Approve"
7. Order status → Approved
8. admin_modified = true
9. original_total preserved: ₹59,000
10. new total_amount: ₹45,312
11. Salesman notified of approval
```

---

## 🔐 Security Features

1. **JWT Authentication**: All endpoints require valid token
2. **Role-Based Access**: Separate permissions for admin/salesman
3. **Ownership Validation**: Salesmen can only access own orders
4. **Status Protection**: Cannot edit after review
5. **Audit Trail**: Tracks who/when/what changed

---

## 📈 Next Steps

1. **Complete Admin UI**: Build order approval interface
2. **Dashboard Integration**: Add order stats to salesman dashboard
3. **Notifications**: Email/SMS for status changes
4. **Reports**: Order analytics and trends
5. **Mobile Optimization**: Responsive design improvements
6. **Cleanup**: Remove old allocation system

---

**Status**: Phase 1 Complete ✅  
**Next**: Build Admin Order Approval Page  
**Target**: Full system operational
