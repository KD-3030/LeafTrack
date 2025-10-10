# Purchase Module - Quick Start Guide

## What Was Created

### ✅ Complete Purchase Management System
A fully functional, **standalone module** for recording all material purchases with manual data entry.

## Files Created

### 1. **Model** (Database Schema)
📄 `models/Purchase.ts`
- Complete schema with 30+ fields
- Auto-generate purchase numbers (PUR000001, PUR000002...)
- Auto-calculate amounts and payment status
- Pre-save hooks for validations

### 2. **API Routes** (Backend)
📄 `app/api/purchases/route.ts`
- **GET**: List all purchases with filters & search
- **POST**: Create new purchase record

📄 `app/api/purchases/[id]/route.ts`
- **GET**: Get single purchase details
- **PUT**: Update purchase record
- **DELETE**: Delete purchase record

### 3. **User Interface** (Frontend)
📄 `app/admin/purchases/page.tsx`
- Summary dashboard with 4 stat cards
- Search & multiple filters
- Data table with all purchases
- Add/Edit dialog with 5 sections
- View dialog for detailed information
- Auto-calculation of amounts

### 4. **Navigation**
📄 `components/admin/Sidebar.tsx`
- Added "Purchases" menu item (Shopping Cart icon)

### 5. **Documentation**
📄 `PURCHASE-MANAGEMENT-DOCUMENTATION.md`
- Complete module documentation
- API reference
- Usage examples
- Data model details

## How to Access

1. **Login** to admin panel
2. **Click "Purchases"** in the sidebar (Shopping Cart icon)
3. **Click "Add Purchase"** to create your first record

## Key Features

### 📊 Dashboard Summary
- Total Purchases count
- Total Amount (₹)
- Total Paid (₹)
- Total Due (₹)
- Status breakdown

### 🔍 Search & Filters
- **Global Search**: Search across all fields
- **Payment Status**: Pending/Partial/Paid
- **Quality Check**: Pending/Pass/Fail
- **Date Range**: From/To dates
- **Clear Filters** button

### 📝 Manual Entry Form (5 Sections)

#### 1. Purchase Information
- Purchase Date
- Invoice Number

#### 2. Product Details
- Product Name* (Required)
- Product Category
- Description
- Quantity* (Required)
- Unit* (kg/liter/pieces/etc.)
- Unit Price* (₹)

#### 3. Batch Details
- Batch Number* (Required)
- Manufacturing Date
- Expiry Date

#### 4. Supplier Details
- Supplier Name* (Required)
- Contact Number
- Address
- GSTIN
- Email

#### 5. Pricing & Payment
- Tax Percentage (%)
- Discount Amount (₹)
- Paid Amount (₹)
- Payment Method (Cash/UPI/etc.)
- Payment Date

### 🧮 Auto-Calculations
- **Total Amount** = Quantity × Unit Price
- **Tax Amount** = Total × Tax% / 100
- **Final Amount** = Total + Tax - Discount
- **Due Amount** = Final - Paid
- **Payment Status** = Auto-updated (Pending/Partial/Paid)

### 📋 Data Table
Displays all purchases with:
- Purchase # and Date
- Product Name & Category
- Quantity & Unit
- Batch Number
- Supplier Name
- Amount/Paid/Due
- Payment Status (color-coded)
- Quality Check Status
- Actions (View/Edit/Delete)

### 👁️ View Dialog
Complete purchase details in organized sections:
- Purchase Information
- Product Information
- Batch Information
- Supplier Information
- Pricing Information
- Additional Information
- Metadata (Created/Updated timestamps)

## Required Fields (Minimum to Create)
1. ✅ Product Name
2. ✅ Quantity
3. ✅ Unit
4. ✅ Batch Number
5. ✅ Supplier Name
6. ✅ Unit Price
7. ✅ Final Amount (auto-calculated)

## Example Usage

### Record a Purchase:
```
1. Click "Add Purchase"
2. Select Purchase Date
3. Enter Product Name: "Green Tea Leaves"
4. Enter Quantity: 100
5. Select Unit: kg
6. Enter Unit Price: 500
7. Enter Batch Number: BATCH-2025-001
8. Enter Supplier Name: ABC Trading Company
9. Enter Tax%: 18 (optional)
10. Enter Paid Amount: 30000 (optional)
11. Click "Create Purchase"
```

### Result:
```
Purchase Number: PUR000001
Total: ₹50,000
Tax: ₹9,000
Final: ₹59,000
Paid: ₹30,000
Due: ₹29,000
Status: Partial (shown in yellow badge)
```

## API Testing (Optional)

### Create Purchase via API
```bash
POST http://localhost:3000/api/purchases
Headers: Authorization: Bearer YOUR_TOKEN
Body:
{
  "purchase_date": "2025-10-09",
  "product_name": "Green Tea Leaves",
  "quantity": 100,
  "unit": "kg",
  "batch_number": "BATCH-2025-001",
  "supplier_name": "ABC Trading Company",
  "unit_price": 500,
  "final_amount": 59000,
  "tax_percentage": 18,
  "paid_amount": 30000
}
```

### List Purchases
```bash
GET http://localhost:3000/api/purchases?payment_status=Pending
Headers: Authorization: Bearer YOUR_TOKEN
```

## Important Notes

### ⚠️ Standalone Module
- **NO connection** to Products module
- **NO connection** to Inventory module
- **NO connection** to Sales module
- All data is **manually entered**
- Completely **independent storage**

### ✅ Features
- Auto-generated purchase numbers
- Real-time amount calculations
- Payment tracking
- Supplier information storage
- Batch tracking with dates
- Quality check status
- Comprehensive search & filters
- Multi-unit support
- Multiple payment methods

### 📱 Responsive Design
- Works on desktop, tablet, and mobile
- Scrollable dialogs for small screens
- Touch-friendly buttons

## Color Coding

### Payment Status
- 🔴 **Red**: Pending (no payment)
- 🟡 **Yellow**: Partial (some payment)
- 🟢 **Green**: Paid (fully paid)

### Quality Check
- 🟠 **Orange**: Pending (not checked)
- 🟢 **Green**: Pass (approved)
- 🔴 **Red**: Fail (rejected)

## Next Steps

1. ✅ **Start Recording**: Click "Add Purchase" and enter your first purchase
2. ✅ **Test Filters**: Try searching and filtering purchases
3. ✅ **Edit Records**: Update payment amounts as you pay suppliers
4. ✅ **Track Dues**: Monitor outstanding payments in the dashboard
5. ✅ **View Details**: Click the eye icon to see complete information

## Support

For detailed documentation, see:
📖 `PURCHASE-MANAGEMENT-DOCUMENTATION.md`

---

**Created**: October 9, 2025
**Status**: ✅ Complete & Ready to Use
**No Integration**: This is a standalone module with manual entry only
