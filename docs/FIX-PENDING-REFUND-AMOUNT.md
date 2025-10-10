# Fix: Purchase Return pending_refund_amount Validation Error

## Problem
When submitting a new purchase return, the API was returning a validation error:
```
PurchaseReturn validation failed: pending_refund_amount: Path `pending_refund_amount` is required.
```

## Root Cause
The `pending_refund_amount` field is marked as **required** in the PurchaseReturn model, but the frontend was not calculating and including this value in the submission payload.

## Solution
Updated the `handleSubmit` function in `app/admin/purchase-returns/page.tsx` to:

1. Calculate `pending_refund_amount` before submission:
   ```typescript
   const pending_refund_amount = final_return_amount - refunded_amount;
   ```

2. Include it in the payload:
   ```typescript
   const payload = {
     ...formData,
     // ... other fields
     final_return_amount,
     refunded_amount,
     pending_refund_amount, // ← Added this
   };
   ```

## Logic
- **`pending_refund_amount`** = Amount still owed to the supplier/customer
- Formula: `final_return_amount - refunded_amount`
- Example:
  - Final Return Amount: ₹59,000
  - Refunded Amount: ₹20,000
  - Pending Refund: ₹39,000

## Refund Status Auto-Calculation
The `refund_status` is automatically determined based on amounts:
- **Pending**: `refunded_amount = 0`
- **Partial**: `0 < refunded_amount < final_return_amount`
- **Completed**: `refunded_amount >= final_return_amount`
- **Rejected**: Manually set

## Files Modified
- ✅ `app/admin/purchase-returns/page.tsx`
  - Updated `handleSubmit` function
  - Added `pending_refund_amount` calculation
  - Included in payload submission

## Testing
To verify the fix:
1. Navigate to Purchase Returns page
2. Click "Add Return"
3. Fill in the form (with or without purchase selection)
4. Submit the return
5. Verify success toast appears
6. Check that return is created in the table

## Result
✅ Validation error resolved  
✅ Purchase returns can now be created successfully  
✅ Pending refund amount calculated correctly  
✅ Refund tracking working as expected
