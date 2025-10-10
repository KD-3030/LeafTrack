# Purchase Taxable Feature Update

## Overview
Added an optional tax feature to the Purchase module. Now users can choose whether a purchase is taxable or not using a checkbox. When unchecked, tax fields are hidden and tax is not applied to calculations.

## Changes Made

### 1. Database Model Update (`models/Purchase.ts`)

#### Added Field:
- **`is_taxable`**: Boolean field (default: false) to indicate if the purchase includes GST/Tax

```typescript
// Interface
is_taxable?: boolean;

// Schema
is_taxable: {
  type: Boolean,
  default: false,
}
```

### 2. UI Updates (`app/admin/purchases/page.tsx`)

#### A. Added Checkbox Component
- Imported `Checkbox` from shadcn/ui components
- Added checkbox in the Pricing Details section

```tsx
import { Checkbox } from '@/components/ui/checkbox';
```

#### B. Form State Updated
- Added `is_taxable: false` to initial form state
- Included in all form reset operations

#### C. Checkbox in Form
```tsx
<Checkbox
  id="is_taxable"
  checked={formData.is_taxable}
  onCheckedChange={(checked) => {
    setFormData({
      ...formData,
      is_taxable: checked as boolean,
      tax_percentage: checked ? formData.tax_percentage : '',
    });
  }}
/>
<Label htmlFor="is_taxable">
  This purchase is taxable (includes GST/Tax)
</Label>
```

#### D. Conditional Tax Field Display
- Tax percentage input only shows when `is_taxable` is `true`
- Tax amount in calculations only displays when `is_taxable` is `true`

```tsx
{formData.is_taxable && (
  <div>
    <Label htmlFor="tax_percentage">Tax Percentage (%) *</Label>
    <Input id="tax_percentage" ... />
  </div>
)}
```

#### E. Updated Calculations
The `calculateAmounts()` function now checks `is_taxable`:

```typescript
const tax_percentage = formData.is_taxable 
  ? (parseFloat(formData.tax_percentage) || 0) 
  : 0;
  
const tax_amount = formData.is_taxable 
  ? (total_amount * tax_percentage) / 100 
  : 0;
```

#### F. Updated Payload
When submitting, only include tax values if `is_taxable` is true:

```typescript
const payload = {
  ...formData,
  is_taxable: formData.is_taxable,
  tax_amount: formData.is_taxable ? tax_amount : 0,
  tax_percentage: formData.is_taxable ? (parseFloat(formData.tax_percentage) || 0) : 0,
  // ... other fields
};
```

#### G. View Dialog Update
Tax information only displays in the view dialog when `is_taxable` is `true`:

```tsx
{selectedPurchase.is_taxable && (
  <div className="flex justify-between">
    <span>Tax ({selectedPurchase.tax_percentage}%):</span>
    <span>₹{selectedPurchase.tax_amount}</span>
  </div>
)}
```

## User Experience

### Creating a New Purchase

#### Non-Taxable Purchase (Default)
1. Open "Add Purchase" dialog
2. Checkbox "This purchase is taxable" is **unchecked** by default
3. Tax percentage field is **hidden**
4. Fill in quantity (10 kg) and unit price (₹500)
5. Calculations show:
   - Total Amount: ₹5,000
   - Tax Amount: **Not displayed**
   - Discount: ₹0
   - Final Amount: ₹5,000

#### Taxable Purchase
1. Open "Add Purchase" dialog
2. **Check** the "This purchase is taxable" checkbox
3. Tax percentage field **appears**
4. Fill in quantity (10 kg) and unit price (₹500)
5. Enter tax percentage (18%)
6. Calculations show:
   - Total Amount: ₹5,000
   - Tax Amount (18%): ₹900
   - Discount: ₹0
   - Final Amount: ₹5,900

### Editing an Existing Purchase

When editing:
- If `is_taxable` is `false`: Checkbox unchecked, tax field hidden
- If `is_taxable` is `true`: Checkbox checked, tax field shown with saved value
- User can toggle the checkbox to change taxable status

### Viewing Purchase Details

In the view dialog:
- Non-taxable purchases: Tax line is **not displayed**
- Taxable purchases: Tax line shows with percentage and amount

## Benefits

1. **Flexibility**: Users can now record both taxable and non-taxable purchases
2. **Cleaner UI**: Tax fields only appear when needed
3. **Accurate Calculations**: Tax is only calculated when applicable
4. **Better UX**: Clear indication of whether purchase includes tax
5. **Data Integrity**: Existing purchases default to non-taxable (backward compatible)

## Examples

### Example 1: Non-Taxable Local Purchase
```
Quantity: 20 kg
Unit Price: ₹300/kg
Is Taxable: ❌ No
Total: ₹6,000
Tax: N/A
Final: ₹6,000
```

### Example 2: Taxable GST Purchase
```
Quantity: 20 kg
Unit Price: ₹300/kg
Is Taxable: ✅ Yes
Tax Percentage: 18%
Total: ₹6,000
Tax (18%): ₹1,080
Final: ₹7,080
```

### Example 3: Taxable with Discount
```
Quantity: 50 pieces
Unit Price: ₹100/piece
Is Taxable: ✅ Yes
Tax Percentage: 12%
Total: ₹5,000
Tax (12%): ₹600
Discount: ₹500
Final: ₹5,100
```

## Migration Notes

### Existing Data
- All existing purchase records will have `is_taxable: false` by default
- Their tax calculations remain unchanged
- Users can edit them to mark as taxable if needed

### API Compatibility
- The API accepts `is_taxable` as an optional boolean field
- If not provided, defaults to `false`
- Backward compatible with existing clients

## Technical Details

### Data Flow
1. User checks/unchecks "Is Taxable" checkbox
2. `formData.is_taxable` updates
3. Tax field visibility toggles
4. `calculateAmounts()` checks `is_taxable` flag
5. Tax calculations apply conditionally
6. Payload includes `is_taxable` value
7. Model saves with `is_taxable` flag
8. View dialog displays tax info conditionally

### Validation
- If `is_taxable` is `true`, tax percentage is marked as required (*)
- If `is_taxable` is `false`, tax percentage is cleared and not sent
- Tax amount is always calculated correctly based on the flag

## Future Enhancements (Optional)

1. **Tax Type Selection**: Add dropdown for different tax types (GST, VAT, etc.)
2. **Multiple Tax Rates**: Support CGST + SGST breakdown
3. **Tax Exemption Reason**: Add field to explain why purchase is non-taxable
4. **Tax Reports**: Generate tax summaries for filing
5. **Supplier Tax Info**: Link supplier GSTIN to taxable status

---

**Status**: ✅ Completed
**Files Modified**: 2 (models/Purchase.ts, app/admin/purchases/page.tsx)
**Compilation Status**: ✅ No errors
**Backward Compatible**: ✅ Yes

