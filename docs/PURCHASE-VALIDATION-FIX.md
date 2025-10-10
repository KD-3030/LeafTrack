# Purchase Validation Error Fix

## Issue
When creating a purchase, the application was throwing validation errors:
```
Purchase validation failed: 
- due_amount: Path `due_amount` is required.
- purchase_number: Path `purchase_number` is required.
```

## Root Cause
Both `purchase_number` and `due_amount` fields were marked as `required: true` in the Mongoose schema, but they are meant to be auto-generated/calculated by pre-save hooks. The validation was running before the pre-save hooks could set these values.

## Solution

### 1. Made `due_amount` Not Required
Changed `due_amount` from required to having a default value since it's calculated automatically:

**Before:**
```typescript
due_amount: {
  type: Number,
  required: true,  // ❌ Validation fails before pre-save hook
  min: 0,
}
```

**After:**
```typescript
due_amount: {
  type: Number,
  default: 0,      // ✅ Has default, calculated in pre-save hook
  min: 0,
}
```

### 2. Made `purchase_number` Not Required
Changed `purchase_number` from required to optional since it's auto-generated:

**Before:**
```typescript
purchase_number: {
  type: String,
  required: true,  // ❌ Validation fails before pre-save hook
  unique: true,
  index: true,
}
```

**After:**
```typescript
purchase_number: {
  type: String,
  unique: true,    // ✅ Still unique, but not required
  index: true,
}
```

### 3. Consolidated Pre-Save Hooks
Merged multiple separate pre-save hooks into one comprehensive hook that:
1. Updates `updated_at` timestamp
2. Auto-generates `purchase_number` if not provided
3. Calculates `due_amount` from `final_amount - paid_amount`
4. Auto-updates `payment_status` based on payment amounts

**New Consolidated Hook:**
```typescript
PurchaseSchema.pre<IPurchase>('save', async function(next) {
  try {
    // Update timestamp
    this.updated_at = new Date();
    
    // Auto-generate purchase number if not provided
    if (!this.purchase_number) {
      const Purchase = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);
      const count = await Purchase.countDocuments();
      this.purchase_number = `PUR${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate due_amount
    this.due_amount = this.final_amount - (this.paid_amount || 0);
    
    // Update payment status based on amounts
    if ((this.paid_amount || 0) === 0) {
      this.payment_status = 'Pending';
    } else if ((this.paid_amount || 0) >= this.final_amount) {
      this.payment_status = 'Paid';
    } else {
      this.payment_status = 'Partial';
    }
    
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Pre-save hook failed'));
  }
});
```

## Benefits

1. **Validation Passes**: Fields are no longer required, so validation doesn't fail
2. **Auto-Generated Values**: Pre-save hook still generates `purchase_number` and calculates `due_amount`
3. **Better Error Handling**: Consolidated hook has try-catch for better error messages
4. **Safer Model Access**: Uses `mongoose.models.Purchase || mongoose.model()` pattern
5. **Null Safety**: Uses `(this.paid_amount || 0)` to handle undefined values

## How It Works Now

### Create Purchase Flow:
1. **Frontend** sends purchase data (without `purchase_number` or `due_amount`)
2. **API Route** validates required business fields (product, quantity, etc.)
3. **API Route** calculates `total_amount` and `final_amount` if needed
4. **Create Document**: `new Purchase(body)` creates document
5. **Pre-Save Hook** runs BEFORE validation:
   - Generates `purchase_number` (e.g., `PUR000001`)
   - Calculates `due_amount` (e.g., `final_amount - paid_amount`)
   - Sets `payment_status` based on paid amount
   - Updates `updated_at` timestamp
6. **Validation**: Now passes because fields have values
7. **Save to Database**: Document saved successfully
8. **Response**: Returns success with generated purchase

### Example:
**Input:**
```json
{
  "product_name": "Green Tea",
  "quantity": 10,
  "unit_price": 500,
  "paid_amount": 2000,
  "final_amount": 5000
}
```

**After Pre-Save Hook:**
```json
{
  "purchase_number": "PUR000001",  // ✅ Auto-generated
  "product_name": "Green Tea",
  "quantity": 10,
  "unit_price": 500,
  "paid_amount": 2000,
  "final_amount": 5000,
  "due_amount": 3000,              // ✅ Auto-calculated (5000 - 2000)
  "payment_status": "Partial",     // ✅ Auto-set (2000 < 5000)
  "updated_at": "2025-10-09T..."   // ✅ Auto-set
}
```

## Testing

Test the fix by creating a purchase:
1. Go to Admin → Purchases
2. Click "Add Purchase"
3. Fill in required fields (product, quantity, unit price, etc.)
4. Click "Add Purchase"
5. ✅ Should create successfully without validation errors
6. ✅ Should see auto-generated `PUR000001` number
7. ✅ Should see correct `due_amount` calculated

## Files Modified
- `models/Purchase.ts` - Updated schema and consolidated pre-save hooks

## Status
✅ **Fixed** - Purchase creation now works without validation errors

