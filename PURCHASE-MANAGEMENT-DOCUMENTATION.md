# Purchase Management Module

## Overview
The Purchase Management module is a **standalone system** for recording and managing all material purchases. It has **no connections** to other modules (Products, Inventory, etc.) - all data is manually entered and stored independently.

## Features

### 1. **Complete Manual Entry System**
- All fields are manually entered by the user
- No auto-population from other modules
- Independent data storage

### 2. **Comprehensive Data Fields**

#### Purchase Identification
- **Purchase Number**: Auto-generated (PUR000001, PUR000002, etc.)
- **Purchase Date**: Date of purchase transaction
- **Invoice Number**: Supplier's invoice number

#### Product Details
- **Product Name** * (Required): Name of the material/product purchased
- **Product Category**: Classification (e.g., Raw Materials, Packaging)
- **Product Description**: Detailed description of the product
- **Quantity** * (Required): Amount purchased
- **Unit** * (Required): Measurement unit (kg, liters, pieces, etc.)
- **Unit Price** * (Required): Price per unit in INR

#### Batch Information
- **Batch Number** * (Required): Unique batch identifier
- **Manufacturing Date**: Production date
- **Expiry Date**: Expiration date

#### Supplier/Store Details
- **Supplier Name** * (Required): Name of the vendor/store
- **Supplier Contact**: Phone number
- **Supplier Address**: Full address
- **Supplier GSTIN**: GST registration number
- **Supplier Email**: Email address

#### Pricing & Payment
- **Total Amount**: Automatically calculated (Quantity × Unit Price)
- **Tax Percentage**: GST percentage (e.g., 18%)
- **Tax Amount**: Automatically calculated
- **Discount Amount**: Any discount applied
- **Final Amount**: Total after tax and discount
- **Paid Amount**: Amount paid so far
- **Due Amount**: Automatically calculated (Final - Paid)
- **Payment Status**: Auto-updated (Pending/Partial/Paid)
- **Payment Method**: Cash, Card, UPI, Cheque, Bank Transfer, Credit
- **Payment Date**: Date of payment

#### Additional Information
- **Received By**: Person who received the goods
- **Quality Check**: Pass/Fail/Pending
- **Notes**: Additional remarks
- **Created By**: User who created the record

## API Endpoints

### GET /api/purchases
Fetch all purchases with optional filters.

**Query Parameters:**
- `search`: Search in purchase number, product name, supplier name, batch number
- `supplier_name`: Filter by supplier
- `product_name`: Filter by product
- `payment_status`: Filter by Pending/Partial/Paid
- `quality_check`: Filter by Pass/Fail/Pending
- `from_date`: Start date filter
- `to_date`: End date filter

**Response:**
```json
{
  "success": true,
  "purchases": [...],
  "summary": {
    "total_purchases": 25,
    "total_amount": 500000,
    "total_paid": 350000,
    "total_due": 150000,
    "pending_count": 5,
    "partial_count": 10,
    "paid_count": 10
  }
}
```

### POST /api/purchases
Create a new purchase record.

**Required Fields:**
- `product_name`
- `quantity`
- `unit`
- `batch_number`
- `supplier_name`
- `unit_price`
- `final_amount`

**Request Body:**
```json
{
  "purchase_date": "2025-10-09",
  "product_name": "Green Tea Leaves",
  "product_category": "Raw Materials",
  "quantity": 100,
  "unit": "kg",
  "batch_number": "BATCH-2025-001",
  "supplier_name": "ABC Trading Company",
  "supplier_contact": "+91 98765 43210",
  "unit_price": 500,
  "tax_percentage": 18,
  "discount_amount": 1000,
  "paid_amount": 25000,
  "payment_method": "Bank Transfer",
  "quality_check": "Pending",
  "notes": "First order from this supplier"
}
```

### GET /api/purchases/[id]
Get details of a specific purchase.

### PUT /api/purchases/[id]
Update an existing purchase record.

### DELETE /api/purchases/[id]
Delete a purchase record.

## User Interface

### Summary Dashboard
- **Total Purchases**: Count of all purchases
- **Total Amount**: Sum of all purchase amounts
- **Total Paid**: Total amount paid to suppliers
- **Total Due**: Outstanding payment amount
- **Status Breakdown**: Pending, Partial, Paid counts

### Search & Filters
- **Global Search**: Search across all text fields
- **Payment Status Filter**: Pending/Partial/Paid
- **Quality Check Filter**: Pending/Pass/Fail
- **Date Range Filter**: From date to To date

### Purchase Table
Displays all purchases with:
- Purchase number and date
- Product name and category
- Quantity and unit
- Batch number
- Supplier name
- Amount, Paid, Due
- Payment status badge
- Quality check badge
- Action buttons (View/Edit/Delete)

### Add/Edit Purchase Dialog
Multi-section form with:
1. **Purchase Information**: Date, invoice number
2. **Product Details**: Name, category, description, quantity, unit, price
3. **Batch Details**: Batch number, manufacturing date, expiry date
4. **Supplier Details**: Name, contact, address, GSTIN, email
5. **Pricing Details**: Tax, discount, payment information
6. **Additional Details**: Received by, quality check, notes

**Real-time Calculations:**
- Total Amount = Quantity × Unit Price
- Tax Amount = Total × Tax Percentage / 100
- Final Amount = Total + Tax - Discount
- Due Amount = Final - Paid
- Payment Status = Auto-updated based on amounts

### View Purchase Dialog
Read-only detailed view showing all purchase information organized by sections.

## Data Model

### Database Schema
```typescript
{
  purchase_number: String (unique, auto-generated),
  purchase_date: Date (default: now),
  
  // Product
  product_name: String (required),
  product_category: String,
  product_description: String,
  quantity: Number (required),
  unit: String (required),
  
  // Batch
  batch_number: String (required),
  manufacturing_date: Date,
  expiry_date: Date,
  
  // Supplier
  supplier_name: String (required),
  supplier_contact: String,
  supplier_address: String,
  supplier_gstin: String,
  supplier_email: String,
  
  // Pricing
  unit_price: Number (required),
  total_amount: Number (required),
  tax_amount: Number,
  tax_percentage: Number,
  discount_amount: Number,
  final_amount: Number (required),
  
  // Payment
  payment_status: Enum ['Pending', 'Partial', 'Paid'],
  paid_amount: Number (default: 0),
  due_amount: Number,
  payment_method: String,
  payment_date: Date,
  
  // Additional
  invoice_number: String,
  notes: String,
  received_by: String,
  quality_check: Enum ['Pass', 'Fail', 'Pending'],
  created_by: String,
  
  // Metadata
  created_at: Date,
  updated_at: Date
}
```

### Indexes
- `purchase_number` (unique)
- `batch_number`
- `purchase_date` (descending)
- `supplier_name`
- `product_name`
- `payment_status`

## Auto-calculations & Validations

### Pre-save Hooks
1. **Auto-generate Purchase Number**: `PUR000001`, `PUR000002`, etc.
2. **Calculate Due Amount**: `final_amount - paid_amount`
3. **Update Payment Status**:
   - Paid = 0 → Status = 'Pending'
   - Paid ≥ Final → Status = 'Paid'
   - Otherwise → Status = 'Partial'
4. **Update Timestamp**: `updated_at` on every save

### Frontend Calculations
- **Total Amount**: `quantity × unit_price`
- **Tax Amount**: `(total_amount × tax_percentage) / 100`
- **Final Amount**: `total_amount + tax_amount - discount_amount`
- **Due Amount**: `final_amount - paid_amount`

## Unit Options
- **Weight**: kg, g, ton
- **Volume**: liter, ml
- **Count**: pieces, box, carton, bag, packet

## Payment Methods
- Cash
- Card
- UPI
- Cheque
- Bank Transfer
- Credit

## Quality Check Status
- **Pending**: Not yet inspected
- **Pass**: Quality approved
- **Fail**: Quality rejected

## Payment Status
- **Pending**: No payment made (paid_amount = 0)
- **Partial**: Partial payment (0 < paid_amount < final_amount)
- **Paid**: Fully paid (paid_amount ≥ final_amount)

## Navigation
**Admin Sidebar** → **Purchases** (Shopping Cart icon)

## Access Control
- **Authentication Required**: All API endpoints require valid token
- **Admin Access**: Only admin users can access purchase management

## Usage Examples

### Example 1: Record Tea Leaves Purchase
```
Purchase Date: 09/10/2025
Product: Green Tea Leaves
Quantity: 100 kg @ ₹500/kg
Batch: BATCH-2025-001
Supplier: ABC Trading Company
Contact: +91 98765 43210
Total: ₹50,000
Tax (18%): ₹9,000
Final: ₹59,000
Paid: ₹30,000
Due: ₹29,000
Status: Partial
```

### Example 2: Record Packaging Material
```
Purchase Date: 09/10/2025
Product: Tea Boxes
Quantity: 500 pieces @ ₹20/piece
Batch: BOX-2025-050
Supplier: Packaging Solutions Ltd
Total: ₹10,000
Tax (12%): ₹1,200
Discount: ₹200
Final: ₹11,000
Paid: ₹11,000
Due: ₹0
Status: Paid
```

## Key Points

✅ **Standalone Module**: No integration with Products, Inventory, or other modules
✅ **Manual Entry**: All fields are manually entered
✅ **Independent Storage**: Data stored separately in Purchase collection
✅ **Comprehensive Fields**: Captures all purchase transaction details
✅ **Auto-calculations**: Amounts and status calculated automatically
✅ **Flexible Filtering**: Multiple search and filter options
✅ **Payment Tracking**: Complete payment history and status
✅ **Supplier Management**: Detailed supplier information
✅ **Batch Tracking**: Manufacturing and expiry date tracking
✅ **Quality Control**: Quality check status field
✅ **Audit Trail**: Created by, created at, updated at fields

## File Locations

### Model
- `models/Purchase.ts` - Mongoose schema and interface

### API Routes
- `app/api/purchases/route.ts` - GET (list), POST (create)
- `app/api/purchases/[id]/route.ts` - GET (detail), PUT (update), DELETE (remove)

### UI
- `app/admin/purchases/page.tsx` - Main purchase management page

### Navigation
- `components/admin/Sidebar.tsx` - Added "Purchases" menu item

## Future Enhancements (Optional)
- Export purchases to Excel/PDF
- Supplier-wise purchase reports
- Payment reminder system
- Purchase order generation
- Multi-currency support
- Attachment upload (invoices, documents)
- Purchase approval workflow
- Integration with accounting systems (if needed later)

---

**Note**: This module is designed to be completely independent. If integration with other modules (like Products or Inventory) is needed in the future, it can be added without affecting the current manual entry functionality.
