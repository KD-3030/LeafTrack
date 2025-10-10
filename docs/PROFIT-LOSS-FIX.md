# Profit & Loss Calculation Fix

## Issue
The profit and loss report was using an incorrect field (`cost_price`) for cost calculation, which doesn't exist in the Product model.

## Solution
Updated the profit & loss calculation to use the correct `manufacturingCost` field from the Product model.

## Changes Made

### File: `app/api/reports/business/route.ts`

**Before:**
```typescript
total_cost: { 
  $sum: { 
    $multiply: ['$items.quantity', '$product.cost_price'] 
  }
}
```

**After:**
```typescript
total_cost: { 
  $sum: { 
    $multiply: ['$items.quantity', '$product.manufacturingCost'] 
  }
}
```

## Product Model Schema
The Product model (`models/Product.ts`) has the following cost-related field:
```typescript
manufacturingCost: {
  type: Number,
  required: [true, 'Manufacturing cost is required'],
  min: [0, 'Manufacturing cost must be positive'],
}
```

## Profit & Loss Calculation Logic

### Formula Breakdown:

1. **Total Revenue**: Sum of all invoice item amounts
   ```
   Total Revenue = Σ(items.total_amount)
   ```

2. **Total Manufacturing Cost**: Sum of quantity × manufacturing cost per product
   ```
   Total Cost = Σ(items.quantity × product.manufacturingCost)
   ```

3. **Total Tax**: Sum of all GST components
   ```
   Total Tax = Σ(CGST + SGST + IGST)
   ```

4. **Gross Profit**: Revenue minus manufacturing cost
   ```
   Gross Profit = Total Revenue - Total Cost
   ```

5. **Net Profit**: Gross profit minus taxes
   ```
   Net Profit = Gross Profit - Total Tax
   ```

6. **Profit Margin**: Percentage of gross profit to revenue
   ```
   Profit Margin % = (Gross Profit / Total Revenue) × 100
   ```

## Example Calculation

### Sample Data:
- Product: Premium Tea
- Manufacturing Cost per kg: ₹200
- Selling Price per kg: ₹300
- Quantity Sold: 100 kg
- GST (18%): CGST 9% + SGST 9%

### Calculation:
```
Revenue (without tax) = 100 × 300 = ₹30,000
Manufacturing Cost = 100 × 200 = ₹20,000
GST = ₹30,000 × 18% = ₹5,400 (₹2,700 CGST + ₹2,700 SGST)
Invoice Total = ₹30,000 + ₹5,400 = ₹35,400

Gross Profit = ₹30,000 - ₹20,000 = ₹10,000
Net Profit = ₹10,000 - ₹5,400 = ₹4,600
Profit Margin = (₹10,000 / ₹30,000) × 100 = 33.33%
```

## API Response Format

```json
{
  "success": true,
  "report_type": "Profit & Loss",
  "period": {
    "from": "2025-01-01T00:00:00.000Z",
    "to": "2025-12-31T23:59:59.999Z"
  },
  "profit_loss": {
    "total_revenue": 30000,
    "total_cost": 20000,
    "total_tax": 5400,
    "gross_profit": 10000,
    "net_profit": 4600,
    "profit_margin": 33.33
  }
}
```

## Testing

### API Endpoint:
```
GET /api/reports/business?type=profit_loss&from_date=2025-01-01&to_date=2025-12-31
```

### Verification Steps:
1. ✅ Ensure products have `manufacturingCost` values set
2. ✅ Create invoices with those products
3. ✅ Call profit_loss report API
4. ✅ Verify calculations match manual computation
5. ✅ Check that profit margin is realistic (positive values)

### Expected Behavior:
- Report should now use actual manufacturing costs from products
- Profit calculations should be accurate and reflect true margins
- No null or undefined values for costs
- Profit margins should match business expectations

## Impact

### Affected Reports:
- ✅ Profit & Loss Report (fixed)
- ✅ Business Overview (no change needed)
- ✅ Sales Performance (no change needed)
- ✅ GST Reports (no change needed)

### Database Requirements:
All products in the database must have the `manufacturingCost` field populated with accurate values for correct profit calculations.

### Migration Notes:
If you have existing products without `manufacturingCost` values:
1. Update Product schema (already has required field)
2. Set manufacturing costs for all existing products
3. Historical reports will reflect accurate costs going forward

## Documentation Updates

Updated `REPORTS-DOCUMENTATION.md` with:
- Correct cost calculation formula
- Manufacturing cost field reference
- Detailed profit calculation breakdown

## Status
✅ **Fixed and tested** - Profit & Loss now correctly calculates costs using `manufacturingCost` from Product model

## Date
October 7, 2025
