# Customer Transaction History - Filtering & Sorting Fix

## Date: October 8, 2025

## Issues Fixed

### 1. Payment History Section Not Working
**Problem**: Payment data was not displaying correctly because the Payment model uses `amount_paid` field but the frontend interface expected `amount` field.

**Solution**: 
- Updated `/api/customers/[id]/transactions` route to map `amount_paid` → `amount`
- Also mapped multiple reference fields (`transaction_id`, `bank_reference`, `cheque_number`) into a single `reference_number` field for consistent display

### 2. Missing Filter/Sort Functionality
**Problem**: No way to filter or sort invoices and payments in the customer details view.

**Solution**: Added comprehensive filtering and sorting for both invoices and payments.

## Changes Made

### 1. State Management (`app/admin/customers/page.tsx`)
Added new state variables for filtering and sorting:

```typescript
// Invoice filtering and sorting state
const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
const [invoiceSortBy, setInvoiceSortBy] = useState<'date' | 'amount' | 'invoice_number'>('date');
const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');

// Payment filtering and sorting state
const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
const [paymentSortBy, setPaymentSortBy] = useState<'date' | 'amount'>('date');
const [paymentSortOrder, setPaymentSortOrder] = useState<'asc' | 'desc'>('desc');
```

### 2. Filter & Sort Functions

#### Invoice Filter Function (`getFilteredAndSortedInvoices`)
- **Search Filter**: Search by invoice number
- **Status Filter**: Filter by payment status (Paid/Partial/Pending)
- **Sort Options**: 
  - By Date (invoice date)
  - By Amount (grand total)
  - By Invoice Number (alphanumeric)
- **Sort Order**: Ascending or Descending

#### Payment Filter Function (`getFilteredAndSortedPayments`)
- **Search Filter**: Search by invoice number or reference number
- **Method Filter**: Filter by payment method (Cash/Card/UPI/Bank Transfer/Cheque)
- **Sort Options**:
  - By Date (payment date)
  - By Amount (payment amount)
- **Sort Order**: Ascending or Descending

### 3. UI Components

#### Invoice Section Filter Bar
```tsx
<div className="flex items-center justify-between mb-4">
  <h3>Invoice History</h3>
  <div className="flex gap-2">
    - Search Input (by invoice number)
    - Status Select Dropdown (All/Paid/Partial/Pending)
    - Sort By Select (Date/Amount/Invoice #)
    - Sort Order Toggle Button (↑/↓)
  </div>
</div>
```

#### Payment Section Filter Bar
```tsx
<div className="flex items-center justify-between mb-4">
  <h3>Payment History</h3>
  <div className="flex gap-2">
    - Search Input (by invoice # or reference)
    - Method Select Dropdown (All/Cash/Card/UPI/etc.)
    - Sort By Select (Date/Amount)
    - Sort Order Toggle Button (↑/↓)
  </div>
</div>
```

### 4. API Route Update (`app/api/customers/[id]/transactions/route.ts`)

**Added field mapping**:
```typescript
const payments = rawPayments.map(payment => ({
  ...payment,
  amount: payment.amount_paid, // Map for frontend compatibility
  reference_number: payment.transaction_id || payment.bank_reference || payment.cheque_number,
}));
```

### 5. Filter Reset on Dialog Open
When opening the customer view dialog, all filters are reset to default values:
- Search terms cleared
- Filters set to "all"
- Sort by date, descending order

## Features Added

### Invoice Filtering & Sorting
✅ Search by invoice number (case-insensitive)
✅ Filter by payment status (All/Paid/Partial/Pending)
✅ Sort by date, amount, or invoice number
✅ Toggle ascending/descending order

### Payment Filtering & Sorting
✅ Search by invoice number or reference number (case-insensitive)
✅ Filter by payment method (All/Cash/Card/UPI/Bank Transfer/Cheque)
✅ Sort by date or amount
✅ Toggle ascending/descending order

### Data Display Fixes
✅ Fixed payment amount field mapping (amount_paid → amount)
✅ Combined reference fields for consistent display
✅ Added "No payments found" empty state
✅ All filters reset when dialog opens

## Testing Checklist

- [ ] Open customer details dialog
- [ ] Verify invoices display correctly
- [ ] Verify payments display correctly with amounts
- [ ] Test invoice search by invoice number
- [ ] Test invoice status filter (Paid/Partial/Pending)
- [ ] Test invoice sorting by date/amount/invoice#
- [ ] Test sort order toggle (ascending/descending)
- [ ] Test payment search by invoice# or reference
- [ ] Test payment method filter
- [ ] Test payment sorting by date/amount
- [ ] Verify filters reset when closing and reopening dialog
- [ ] Test with customer who has no invoices
- [ ] Test with customer who has no payments

## Files Modified

1. `app/admin/customers/page.tsx` - Added filtering/sorting state, functions, and UI
2. `app/api/customers/[id]/transactions/route.ts` - Fixed payment field mapping

## Notes

- All null/undefined values are handled with `|| 0` or `|| []` to prevent errors
- Filters work on the client side for instant response
- Sort operations create a copy of the array to avoid mutating state
- Empty states show helpful messages when no data matches filters
- Search is case-insensitive for better UX
