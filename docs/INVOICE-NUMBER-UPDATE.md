# Invoice Number Update Summary

## Overview
Updated the invoice numbering system to:
1. Keep existing sequence numbers (last 4 digits) in the database
2. Update only the date portion to match the invoice date (INV-YYYYMMDD-XXXX format)
3. Make the last 4 digits editable in the manual invoice creation UI
4. Continue sequence numbering from the highest existing number (0026 → next: 0027)

---

## Database Changes

### Current Database State
- **Total Invoices**: 26
- **Highest Sequence**: 0026
- **Next Invoice Sequence**: 0027
- **Format**: INV-YYYYMMDD-XXXX (e.g., INV-20250605-0001)

### Migration Script
Created: `scripts/rollback-invoice-migration.js`
- Analyzed all existing invoices
- Kept original sequence numbers (last 4 digits)
- Updated date portion to match invoice_date
- Verified highest sequence is 0026

---

## API Updates

### 1. Regular Invoice Generation (`/api/invoices/route.ts`)
✅ Already updated to find highest sequence number
```typescript
// Find the highest sequence number from existing invoices
const allInvoices = await Invoice.find({}).select('invoice_number');
let maxSequence = 0;
allInvoices.forEach(inv => {
  const match = inv.invoice_number.match(/(\d{4})$/);
  if (match) {
    const seq = parseInt(match[1]);
    if (seq > maxSequence) {
      maxSequence = seq;
    }
  }
});

const nextSequence = maxSequence + 1;
const invoiceNumber = `INV-${dateStr}-${String(nextSequence).padStart(4, '0')}`;
```

### 2. Manual Invoice Generation (`/api/invoices/manual/route.ts`)
✅ Already supports custom sequence numbers
- Accepts `invoice_sequence` in request body
- Falls back to next available sequence if not provided
- Uses invoice_date from form for date portion

### 3. Preview Endpoint (`/api/invoices/preview-number/route.ts`)
✅ Updated to support custom sequence preview
- Accepts optional `sequence` query parameter
- Returns `max_sequence` and `next_sequence`
- Allows preview with custom sequence number

---

## Frontend Updates

### Manual Invoice Dialog (`app/admin/invoicing/page.tsx`)

#### 1. State Management
```typescript
const [invoiceSequence, setInvoiceSequence] = useState<string>(''); // Custom sequence
const [maxSequenceNumber, setMaxSequenceNumber] = useState<number>(0); // Highest used
```

#### 2. Updated Preview Fetch Function
```typescript
const fetchPreviewInvoiceNumber = async (date?: string, customSequence?: string) => {
  // Fetches preview with custom sequence if provided
  // Updates maxSequenceNumber from API response
  // Auto-fills invoiceSequence with next available if empty
};
```

#### 3. Enhanced UI Display
**Before:**
- Static invoice number display
- No editing capability

**After:**
- Split display: `INV-YYYYMMDD-` + editable 4-digit input
- Real-time preview updates
- Shows next available sequence
- Shows highest used sequence
- Input validation (4 digits max, numbers only)

#### 4. Form Submission
Updated to include `invoice_sequence` in request body:
```typescript
body: JSON.stringify({
  ...manualInvoiceForm,
  invoice_sequence: invoiceSequence ? parseInt(invoiceSequence) : undefined
})
```

---

## UI Features

### Editable Invoice Number Section
```
┌─────────────────────────────────────────┐
│ 📄 Invoice Number                       │
│                                          │
│ INV-20251101- [0027]  ← Editable input │
│                                          │
│ Next available: 0027 | Highest: 0026   │
└─────────────────────────────────────────┘
```

### Input Features:
- **Max Length**: 4 digits
- **Validation**: Numbers only (automatic filtering)
- **Auto-fill**: Loads next available sequence on dialog open
- **Real-time Update**: Preview updates as you type
- **Visual Feedback**: Blue border, large font for clarity

---

## Usage Examples

### Example 1: Auto-Increment (Default Behavior)
1. Open manual invoice dialog
2. Sequence auto-fills with "0027" (next available)
3. Create invoice → generates: `INV-20251101-0027`

### Example 2: Custom Sequence Number
1. Open manual invoice dialog
2. Edit sequence to "0100"
3. Preview shows: `INV-20251101-0100`
4. Create invoice → generates: `INV-20251101-0100`
5. Next invoice will auto-suggest: "0101"

### Example 3: Backfill Missing Number
1. Notice gap in sequence (e.g., 0025 → 0027, missing 0026)
2. Open manual invoice dialog
3. Manually enter "0026"
4. Create invoice → fills the gap

---

## Testing Checklist

✅ Database migration completed successfully
✅ All 26 invoices updated with correct format
✅ Sequence numbers preserved (1-26)
✅ Next sequence calculated correctly (27)
✅ Preview endpoint returns correct data
✅ Manual invoice API accepts custom sequence
✅ UI displays editable sequence input
✅ Input validation works (4 digits, numbers only)
✅ Real-time preview updates
✅ Form submission includes sequence number
✅ State resets on dialog close

---

## Important Notes

### Sequence Numbering Rules:
1. **Global Sequence**: Last 4 digits are globally sequential across ALL invoices
2. **Date Independent**: Sequence is NOT reset per day/month/year
3. **Manual Control**: Admin can override sequence for special cases
4. **Gap Filling**: Admin can backfill gaps in sequence if needed
5. **Collision Prevention**: API validates sequence uniqueness before creation

### Best Practices:
- Let the system auto-increment for regular invoices
- Only edit sequence for special cases (corrections, backfilling, etc.)
- Check "Next available" and "Highest used" before manual override
- Keep sequence numbers sequential when possible for better tracking

---

## Files Modified

1. **scripts/rollback-invoice-migration.js** (NEW)
   - Database migration script
   - Preserves sequence numbers
   - Updates date portions

2. **app/admin/invoicing/page.tsx**
   - Added editable sequence input
   - Updated preview fetch function
   - Enhanced UI display
   - Form submission with custom sequence

3. **app/api/invoices/route.ts** (Previously updated)
   - Finds highest sequence from all invoices
   - Auto-increments from max

4. **app/api/invoices/manual/route.ts** (Previously updated)
   - Accepts custom invoice_sequence
   - Falls back to next available

5. **app/api/invoices/preview-number/route.ts** (Previously updated)
   - Supports custom sequence parameter
   - Returns max and next sequence

---

## Next Steps

### Immediate:
1. ✅ Test invoice creation with auto-increment
2. ✅ Test manual sequence override
3. ✅ Verify sequence persistence across app restarts

### Future Enhancements (Optional):
- Add sequence validation warning if skipping numbers
- Add duplicate sequence prevention in UI
- Add bulk invoice number update tool
- Add invoice sequence report/audit log
- Add sequence reservation system for manual invoices

---

## Summary

The invoice numbering system now provides:
- **Flexibility**: Edit last 4 digits when needed
- **Automation**: Auto-increment from highest sequence
- **Visibility**: See next available and highest used sequences
- **Safety**: Input validation and duplicate prevention
- **Backward Compatible**: All existing invoices updated correctly

The system will continue from sequence **0027** for the next invoice.
