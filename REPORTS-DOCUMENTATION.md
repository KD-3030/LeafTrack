# Business Reports & Analytics Documentation

## Overview
The LeafTrack application includes a comprehensive reporting system with business analytics and GST compliance reports.

## Fixed Issues

### 1. Model Registration Errors
**Problem:** Reports were failing due to missing Customer, User, and Product model imports.

**Solution:** 
- Added proper imports to both report API routes
- Added model registration checks before populate operations
- Ensured consistent referencing across all models

**Files Modified:**
- `app/api/reports/business/route.ts`
- `app/api/reports/gst/route.ts`

### 2. Report Types & Features

#### Business Reports (`/api/reports/business`)

**Available Report Types:**

1. **Overview Report** (`type=overview`)
   - Total revenue, invoices, paid/pending amounts
   - Top 5 selling products
   - Top 5 performing salesmen
   - Monthly sales trend (last 12 months)

2. **Profit & Loss Report** (`type=profit_loss`)
   - Total revenue and cost calculation (uses manufacturingCost from Product model)
   - Tax breakdown (CGST + SGST + IGST)
   - Gross profit and net profit
   - Profit margin percentage
   - Formula: 
     * Cost = Σ(quantity × manufacturingCost) per product
     * Gross Profit = Total Revenue - Total Cost
     * Net Profit = Gross Profit - Total Tax

3. **Sales Performance** (`type=sales_performance`)
   - Salesman-wise performance metrics
   - Product-wise sales analysis
   - Average invoice value per salesman
   - Customer count per salesman

4. **Customer Ledger** (`type=customer_ledger`)
   - Requires `customer_id` parameter
   - Complete transaction history
   - Outstanding balance tracking
   - Payment status analysis

#### GST Reports (`/api/reports/gst`)

**Available Report Types:**

1. **GSTR-1 Format** (`type=gstr1`)
   - B2B and B2C invoice classification
   - Item-level HSN code details
   - Tax split: CGST, SGST, IGST
   - Customer GSTIN tracking
   - Export-ready format

2. **Summary Report** (`type=summary`)
   - Total taxable amount
   - Tax collection breakdown
   - GST rate-wise summary
   - Invoice value totals

3. **Detailed Report** (`type=detailed`)
   - Complete invoice listing
   - Customer and salesman details
   - Payment status tracking
   - Tax breakdown per invoice

## Data Inputs & Requirements

### Date Range Parameters
- **Required for all reports**
- `from_date`: Start date (YYYY-MM-DD format)
- `to_date`: End date (YYYY-MM-DD format)

### Report-Specific Parameters

#### Business Reports
```typescript
// Overview
GET /api/reports/business?type=overview&from_date=2025-01-01&to_date=2025-12-31

// Profit & Loss
GET /api/reports/business?type=profit_loss&from_date=2025-01-01&to_date=2025-12-31

// Sales Performance
GET /api/reports/business?type=sales_performance&from_date=2025-01-01&to_date=2025-12-31

// Customer Ledger
GET /api/reports/business?type=customer_ledger&customer_id=<CUSTOMER_ID>
```

#### GST Reports
```typescript
// GSTR-1
GET /api/reports/gst?type=gstr1&from_date=2025-01-01&to_date=2025-01-31

// Summary
GET /api/reports/gst?type=summary&from_date=2025-01-01&to_date=2025-01-31

// Detailed
GET /api/reports/gst?type=detailed&from_date=2025-01-01&to_date=2025-01-31
```

## GST Compliance Features

### Tax Calculations
The system properly handles:
- **CGST + SGST**: For intra-state transactions
- **IGST**: For inter-state transactions
- **Rate-wise breakup**: 0%, 5%, 12%, 18%, 28%

### GSTR-1 Data Structure
```typescript
{
  invoice_number: string;
  invoice_date: Date;
  customer_name: string;
  customer_gstin: string;
  customer_state: string;
  place_of_supply: string;
  invoice_type: 'B2B' | 'B2C';
  items: [{
    item_description: string;
    hsn_code: string;
    quantity: number;
    unit_price: number;
    taxable_amount: number;
    gst_rate: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
  }];
  total_taxable_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  invoice_value: number;
}
```

## Frontend Features

### Reports Dashboard (`/admin/reports`)

**Tabs Available:**
1. Business Overview
2. Profit & Loss
3. GST Reports
4. Sales Analytics

**Interactive Features:**
- Date range selection
- Real-time data refresh
- Export GSTR-1 functionality
- Visual charts and graphs
- Responsive tables

**Charts & Visualizations:**
- Bar chart: Top selling products
- Pie chart: Salesman performance distribution
- Line chart: Monthly sales trend
- Tables: Product and salesman performance

## Authentication & Security

**Requirements:**
- Valid JWT token in Authorization header
- Admin role required for all report access
- Bearer token format: `Bearer <token>`

**Error Handling:**
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (non-admin access)
- 400: Bad request (missing required parameters)
- 500: Internal server error

## Data Sources

### Primary Collections Used:
1. **Invoices**: Main transaction data
2. **Customers**: Customer details and GSTIN
3. **Products**: Product manufacturing cost and pricing (uses `manufacturingCost` field)
4. **Users**: Salesman performance tracking
5. **Payments**: Payment status tracking

### Cost Calculation Details:
- **Manufacturing Cost**: Retrieved from `Product.manufacturingCost` field
- **Profit Calculation**: 
  ```
  Total Cost = Σ(Invoice Item Quantity × Product Manufacturing Cost)
  Gross Profit = Total Revenue - Total Manufacturing Cost
  Net Profit = Gross Profit - Total Tax (CGST + SGST + IGST)
  Profit Margin % = (Gross Profit / Total Revenue) × 100
  ```

### Aggregation Pipeline Features:
- Multi-stage aggregations for complex calculations
- Lookup operations for related data
- Date grouping for trend analysis
- Rate-wise tax grouping

## Export Functionality

### GSTR-1 Export
- JSON format compatible with GST portal
- Includes all required fields
- Automatic B2B/B2C classification
- HSN code level details

## Performance Optimizations

1. **Indexed Fields:**
   - invoice_date
   - customer_id
   - salesman_id
   - status

2. **Efficient Aggregations:**
   - Limited to relevant date ranges
   - Excluded cancelled invoices
   - Optimized grouping operations

## Usage Examples

### Frontend Integration
```typescript
// Load business overview
const response = await fetch(
  `/api/reports/business?type=overview&from_date=${fromDate}&to_date=${toDate}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

// Load GST summary
const gstResponse = await fetch(
  `/api/reports/gst?type=summary&from_date=${fromDate}&to_date=${toDate}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);
```

## Future Enhancements

### Potential Improvements:
1. PDF export for all reports
2. Email scheduling for periodic reports
3. Comparison with previous periods
4. Target vs actual analysis
5. Expense tracking integration
6. Advanced filters (product category, region)
7. Custom report builder
8. Real-time dashboard updates

## Troubleshooting

### Common Issues:

**Issue:** "Failed to load report"
- **Solution:** Check date range format, ensure valid token

**Issue:** "Schema hasn't been registered"
- **Solution:** Models are now properly imported and registered

**Issue:** "No data showing"
- **Solution:** Verify invoices exist in selected date range

**Issue:** Empty charts
- **Solution:** Ensure invoices have proper product/salesman assignments

## Testing Checklist

- [x] Business overview loads with correct stats
- [x] Top products chart displays properly
- [x] Top salesmen chart displays properly
- [x] Profit & Loss calculations are accurate
- [x] GST summary shows correct tax breakdown
- [x] GST rate-wise table populates
- [x] Date range filter updates data
- [x] Export GSTR-1 generates proper format
- [x] All model imports working
- [x] No schema registration errors

## Status

✅ **All reports functional and ready for production use**

The business reports and analytics section has been fixed with:
- Proper model imports (Customer, User, Product)
- Model registration checks
- Comprehensive data inputs
- GST compliance reporting
- Interactive visualizations
- Export functionality
