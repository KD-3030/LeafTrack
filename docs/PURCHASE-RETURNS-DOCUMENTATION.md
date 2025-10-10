# Purchase Returns Management Module

## Overview
The Purchase Returns Management module is a **standalone system** for recording and managing all returned materials. It has **no connections** to other modules - all data is manually entered and stored independently, similar to the Purchase module.

## Features

### 1. **Complete Manual Entry System**
- All fields are manually entered by the user
- No auto-population from other modules
- Independent data storage

### 2. **Comprehensive Data Fields**

#### Return Identification
- **Return Number**: Auto-generated (PR000001, PR000002, etc.)
- **Return Date**: Date of return transaction
- **Original Purchase Number**: Reference to original purchase (optional)

#### Product Details
- **Product Name** * (Required): Name of the returned material/product
- **Product Category**: Classification
- **Product Description**: Detailed description
- **Returned Quantity** * (Required): Amount returned
- **Unit** * (Required): Measurement unit (kg, liters, pieces, etc.)
- **Unit Price** * (Required): Price per unit in INR

#### Batch Information
- **Batch Number** * (Required): Batch identifier of returned goods
- **Manufacturing Date**: Production date
- **Expiry Date**: Expiration date

#### Supplier/Store Details
- **Supplier Name** * (Required): Name of the supplier to whom goods are returned
- **Supplier Contact**: Phone number
- **Supplier Address**: Full address
- **Supplier GSTIN**: GST registration number
- **Supplier Email**: Email address

#### Return Reason & Type
- **Return Type** * (Required): Quality Issue, Damaged, Expired, Wrong Item, Excess Stock, Other
- **Return Reason** * (Required): Detailed explanation of why goods are being returned
- **Condition on Return**: Good, Damaged, Unusable

#### Pricing & Refund
- **Total Return Amount**: Automatically calculated (Quantity × Unit Price)
- **Tax Percentage**: GST percentage
- **Tax Amount**: Automatically calculated
- **Discount Amount**: Any discount adjustment
- **Final Return Amount**: Total return value after tax and discount
- **Refunded Amount**: Amount refunded so far
- **Pending Refund Amount**: Automatically calculated (Final - Refunded)
- **Refund Status**: Auto-updated (Pending/Partial/Completed/Rejected)
- **Refund Method**: Cash, Bank Transfer, Credit Note, Adjustment, Cheque
- **Refund Date**: Date of refund

#### Additional Information
- **Debit Note Number**: Debit note reference
- **Returned By**: Person who processed the return
- **Approval Status**: Pending, Approved, Rejected
- **Approved By**: Person who approved the return
- **Notes**: Additional remarks
- **Created By**: User who created the record

## API Endpoints

### GET /api/purchase-returns
Fetch all purchase returns with optional filters.

**Query Parameters:**
- `search`: Search in return number, product name, supplier name, batch number, debit note, original purchase number
- `supplier_name`: Filter by supplier
- `product_name`: Filter by product
- `refund_status`: Filter by Pending/Partial/Completed/Rejected
- `approval_status`: Filter by Pending/Approved/Rejected
- `return_type`: Filter by Quality Issue/Damaged/Expired/Wrong Item/Excess Stock/Other
- `from_date`: Start date filter
- `to_date`: End date filter

**Response:**
```json
{
  "success": true,
  "returns": [...],
  "summary": {
    "total_returns": 15,
    "total_return_amount": 150000,
    "total_refunded": 100000,
    "total_pending_refund": 50000,
    "pending_count": 3,
    "partial_count": 5,
    "completed_count": 5,
    "rejected_count": 2,
    "approval_pending_count": 4,
    "approved_count": 10,
    "rejected_approval_count": 1
  }
}
```

### POST /api/purchase-returns
Create a new purchase return record.

**Required Fields:**
- `product_name`
- `returned_quantity`
- `unit`
- `batch_number`
- `supplier_name`
- `return_reason`
- `return_type`
- `unit_price`
- `final_return_amount`

**Request Body:**
```json
{
  "return_date": "2025-10-09",
  "original_purchase_number": "PUR000001",
  "product_name": "Green Tea Leaves",
  "product_category": "Raw Materials",
  "returned_quantity": 10,
  "unit": "kg",
  "batch_number": "BATCH-2025-001",
  "supplier_name": "ABC Trading Company",
  "supplier_contact": "+91 98765 43210",
  "return_type": "Quality Issue",
  "return_reason": "Found contamination in the batch",
  "unit_price": 500,
  "tax_percentage": 18,
  "refunded_amount": 0,
  "condition_on_return": "Damaged",
  "approval_status": "Pending",
  "notes": "Immediate attention required"
}
```

### GET /api/purchase-returns/[id]
Get details of a specific purchase return.

### PUT /api/purchase-returns/[id]
Update an existing purchase return record.

### DELETE /api/purchase-returns/[id]
Delete a purchase return record.

## User Interface

### Summary Dashboard
- **Total Returns**: Count of all returns
- **Total Return Amount**: Sum of all return amounts
- **Total Refunded**: Total amount refunded by suppliers
- **Pending Refund**: Outstanding refund amount
- **Status Breakdown**: Pending, Partial, Completed, Rejected counts
- **Approval Breakdown**: Approval pending count

### Search & Filters
- **Global Search**: Search across all text fields
- **Refund Status Filter**: Pending/Partial/Completed/Rejected
- **Approval Status Filter**: Pending/Approved/Rejected
- **Return Type Filter**: Quality Issue/Damaged/Expired/Wrong Item/Excess Stock/Other
- **Date Range Filter**: From date to To date

### Return Table
Displays all returns with:
- Return number and date
- Product name & category
- Returned quantity & unit
- Supplier name
- Return type badge (color-coded by type)
- Amount/Refunded/Pending
- Refund status badge (color-coded)
- Approval status badge (color-coded)
- Action buttons (View/Edit/Delete)

### Add/Edit Return Dialog
Multi-section form with:
1. **Return Information**: Date, original purchase number
2. **Product Details**: Name, category, description, quantity, unit, price
3. **Batch Details**: Batch number, manufacturing date, expiry date
4. **Supplier Details**: Name, contact, address, GSTIN, email
5. **Return Reason**: Return type, condition, detailed reason
6. **Pricing & Refund Details**: Tax, discount, refund information
7. **Additional Details**: Debit note, returned by, approval status, notes

**Real-time Calculations:**
- Total Return Amount = Returned Quantity × Unit Price
- Tax Amount = Total × Tax Percentage / 100
- Final Return Amount = Total + Tax - Discount
- Pending Refund = Final - Refunded
- Refund Status = Auto-updated based on amounts

### View Return Dialog
Read-only detailed view showing all return information organized by sections.

## Data Model

### Database Schema
```typescript
{
  return_number: String (unique, auto-generated),
  return_date: Date (default: now),
  original_purchase_number: String,
  
  // Product
  product_name: String (required),
  product_category: String,
  product_description: String,
  returned_quantity: Number (required),
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
  
  // Return Info
  return_reason: String (required),
  return_type: Enum (required),
  
  // Pricing
  unit_price: Number (required),
  total_return_amount: Number (required),
  tax_amount: Number,
  tax_percentage: Number,
  discount_amount: Number,
  final_return_amount: Number (required),
  
  // Refund
  refund_status: Enum ['Pending', 'Partial', 'Completed', 'Rejected'],
  refunded_amount: Number (default: 0),
  pending_refund_amount: Number,
  refund_method: String,
  refund_date: Date,
  
  // Additional
  debit_note_number: String,
  notes: String,
  returned_by: String,
  condition_on_return: Enum ['Good', 'Damaged', 'Unusable'],
  approval_status: Enum ['Pending', 'Approved', 'Rejected'],
  approved_by: String,
  created_by: String,
  
  // Metadata
  created_at: Date,
  updated_at: Date
}
```

### Indexes
- `return_number` (unique)
- `batch_number`
- `return_date` (descending)
- `supplier_name`
- `product_name`
- `refund_status`
- `approval_status`
- `return_type`

## Auto-calculations & Validations

### Pre-save Hooks
1. **Auto-generate Return Number**: `PR000001`, `PR000002`, etc.
2. **Calculate Pending Refund**: `final_return_amount - refunded_amount`
3. **Update Refund Status**:
   - Refunded = 0 → Status = 'Pending'
   - Refunded ≥ Final → Status = 'Completed'
   - Otherwise → Status = 'Partial'
4. **Update Timestamp**: `updated_at` on every save

### Frontend Calculations
- **Total Return Amount**: `returned_quantity × unit_price`
- **Tax Amount**: `(total_return_amount × tax_percentage) / 100`
- **Final Return Amount**: `total_return_amount + tax_amount - discount_amount`
- **Pending Refund**: `final_return_amount - refunded_amount`

## Return Types
- **Quality Issue**: Product doesn't meet quality standards
- **Damaged**: Product received damaged
- **Expired**: Product past expiry date
- **Wrong Item**: Incorrect product delivered
- **Excess Stock**: Returning surplus inventory
- **Other**: Any other reason

## Condition on Return
- **Good**: Product in good condition
- **Damaged**: Product damaged
- **Unusable**: Product cannot be used

## Refund Methods
- Cash
- Bank Transfer
- Credit Note
- Adjustment
- Cheque

## Refund Status
- **Pending**: No refund made (refunded_amount = 0)
- **Partial**: Partial refund (0 < refunded_amount < final_return_amount)
- **Completed**: Fully refunded (refunded_amount ≥ final_return_amount)
- **Rejected**: Return rejected, no refund

## Approval Status
- **Pending**: Awaiting approval
- **Approved**: Return approved
- **Rejected**: Return rejected

## Navigation
**Admin Sidebar** → **Purchase Returns** (PackageX icon)

## Access Control
- **Authentication Required**: All API endpoints require valid token
- **Admin Access**: Only admin users can access purchase returns

## Usage Examples

### Example 1: Quality Issue Return
```
Return Date: 09/10/2025
Original Purchase: PUR000001
Product: Green Tea Leaves
Returned Quantity: 10 kg @ ₹500/kg
Batch: BATCH-2025-001
Supplier: ABC Trading Company
Return Type: Quality Issue
Reason: Found contamination in the batch
Condition: Damaged
Total: ₹5,000
Tax (18%): ₹900
Final: ₹5,900
Refunded: ₹0
Pending: ₹5,900
Refund Status: Pending
Approval: Pending
```

### Example 2: Expired Product Return
```
Return Date: 09/10/2025
Product: Tea Boxes
Returned Quantity: 50 pieces @ ₹20/piece
Batch: BOX-2025-050
Supplier: Packaging Solutions Ltd
Return Type: Expired
Reason: Products expired before use
Condition: Unusable
Total: ₹1,000
Tax (12%): ₹120
Final: ₹1,120
Refunded: ₹1,120
Pending: ₹0
Refund Status: Completed
Approval: Approved
Refund Method: Credit Note
```

## Key Points

✅ **Standalone Module**: No integration with Purchases, Products, or other modules
✅ **Manual Entry**: All fields are manually entered
✅ **Independent Storage**: Data stored separately in PurchaseReturn collection
✅ **Comprehensive Fields**: Captures all return transaction details
✅ **Auto-calculations**: Amounts and status calculated automatically
✅ **Return Type Tracking**: 6 different return categories
✅ **Approval Workflow**: Track approval status of returns
✅ **Refund Tracking**: Complete refund history and status
✅ **Supplier Management**: Detailed supplier information
✅ **Batch Tracking**: Manufacturing and expiry date tracking
✅ **Condition Tracking**: Physical condition of returned goods
✅ **Multiple Filters**: Search by refund status, approval, return type
✅ **Audit Trail**: Created by, created at, updated at fields

## File Locations

### Model
- `models/PurchaseReturn.ts` - Mongoose schema and interface

### API Routes
- `app/api/purchase-returns/route.ts` - GET (list), POST (create)
- `app/api/purchase-returns/[id]/route.ts` - GET (detail), PUT (update), DELETE (remove)

### UI
- `app/admin/purchase-returns/page.tsx` - Main purchase returns management page

### Navigation
- `components/admin/Sidebar.tsx` - Added "Purchase Returns" menu item

## Color Coding

### Return Type Colors
- 🔴 **Red**: Quality Issue
- 🟠 **Orange**: Damaged
- 🟣 **Purple**: Expired
- 🟡 **Yellow**: Wrong Item
- 🔵 **Blue**: Excess Stock
- ⚪ **Gray**: Other

### Refund Status Colors
- 🟢 **Green**: Completed (fully refunded)
- 🟡 **Yellow**: Partial (some refund)
- 🟠 **Orange**: Pending (no refund)
- 🔴 **Red**: Rejected (return rejected)

### Approval Status Colors
- 🟢 **Green**: Approved
- 🔴 **Red**: Rejected
- 🔵 **Blue**: Pending

## Business Workflow

1. **Create Return**: Record returned goods with reason
2. **Quality Check**: Verify condition on return
3. **Approval**: Get return approved/rejected
4. **Process Refund**: Issue refund via chosen method
5. **Documentation**: Generate debit note
6. **Track Status**: Monitor refund status until completion

## Future Enhancements (Optional)
- Export returns to Excel/PDF
- Return analytics and reports
- Supplier-wise return analysis
- Automatic quality degradation alerts
- Integration with purchase records (if needed later)
- Refund reminder system
- Multi-approval workflow
- Attachment upload (photos, documents)
- Return pattern analysis
- Supplier performance tracking

---

**Note**: This module is designed to be completely independent. If integration with the Purchase module or other modules is needed in the future, it can be added without affecting the current manual entry functionality.
