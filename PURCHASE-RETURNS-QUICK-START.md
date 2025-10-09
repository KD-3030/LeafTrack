# Purchase Returns Module - Quick Start Guide

## 🚀 Getting Started (5 Minutes)

### Step 1: Access the Module
1. Log in to your LeafTrack admin panel
2. Click **"Purchase Returns"** in the sidebar (PackageX icon)
3. You'll see the Purchase Returns Management page

### Step 2: Create Your First Return

Click the **"Add Return"** button and fill in:

#### Required Fields (*)
```
✅ Return Date: 09/10/2025
✅ Product Name: Green Tea Leaves
✅ Returned Quantity: 10
✅ Unit: kg
✅ Unit Price: 500
✅ Batch Number: BATCH-2025-001
✅ Supplier Name: ABC Trading Company
✅ Return Type: Quality Issue
✅ Return Reason: Found contamination in the batch
```

#### Optional Fields
```
Original Purchase Number: PUR000001
Product Category: Raw Materials
Product Description: Premium grade
Manufacturing Date: 05/09/2025
Expiry Date: 05/09/2026
Supplier Contact: +91 98765 43210
Supplier Address: 123 Market Street, Mumbai
Supplier GSTIN: 27XXXXX1234X1Z5
Supplier Email: supplier@example.com
Condition on Return: Damaged
Tax Percentage: 18
Discount Amount: 0
Refund Method: Bank Transfer
Refund Date: 10/10/2025
Debit Note Number: DN000001
Returned By: John Doe
Approval Status: Pending
Notes: Immediate action required
```

#### Auto-calculated Fields (Read-only)
```
Return Number: PR000001 ← Auto-generated
Total Return Amount: ₹5,000 ← (10 × 500)
Tax Amount: ₹900 ← (5000 × 18%)
Final Return Amount: ₹5,900 ← (5000 + 900 - 0)
Refunded Amount: ₹0 ← Enter amount refunded
Pending Refund Amount: ₹5,900 ← (5900 - 0)
Refund Status: Pending ← Auto-updated
```

Click **"Add Return"** → ✅ Done!

---

## 📊 Understanding the Dashboard

### Summary Cards
```
┌──────────────────────────────────────────────────────────┐
│ Total Returns: 15                                        │
│ Total Return Amount: ₹1,50,000                          │
│ Total Refunded: ₹1,00,000                               │
│ Pending Refund: ₹50,000                                 │
└──────────────────────────────────────────────────────────┘
```

### Status Breakdown
- **Pending**: 3 returns awaiting refund
- **Partial**: 5 returns with partial refund
- **Completed**: 5 returns fully refunded
- **Rejected**: 2 returns rejected

---

## 🔍 Search & Filter

### Global Search
Search across:
- Return number (PR000001)
- Product name
- Supplier name
- Batch number
- Debit note number
- Original purchase number

### Filter Options
```
Refund Status: [All] [Pending] [Partial] [Completed] [Rejected]
Approval Status: [All] [Pending] [Approved] [Rejected]
Return Type: [All] [Quality Issue] [Damaged] [Expired] [Wrong Item] [Excess Stock] [Other]
Date Range: From [09/10/2025] To [09/11/2025]
```

Click **"Apply Filters"** to filter returns  
Click **"Clear Filters"** to reset

---

## 📝 Common Use Cases

### Case 1: Quality Issue Return
```
Scenario: Received contaminated tea leaves
Return Type: Quality Issue
Condition: Damaged
Approval: Pending → Get approval first
Refund: Pending → Will be refunded after approval
```

### Case 2: Damaged Goods Return
```
Scenario: Packaging damaged during transport
Return Type: Damaged
Condition: Damaged/Unusable
Approval: Approved → Already approved
Refund: Partial → ₹2,000 of ₹5,000 refunded
```

### Case 3: Expired Product Return
```
Scenario: Products expired before use
Return Type: Expired
Condition: Unusable
Approval: Approved
Refund: Completed → Full refund received
Refund Method: Credit Note
```

### Case 4: Wrong Item Delivered
```
Scenario: Supplier sent wrong product
Return Type: Wrong Item
Condition: Good (but wrong item)
Approval: Approved
Refund: Pending → Awaiting replacement or refund
```

### Case 5: Excess Stock Return
```
Scenario: Overstock of seasonal items
Return Type: Excess Stock
Condition: Good
Approval: Pending → Supplier reviewing
Refund: Pending → Awaiting approval
```

---

## 🎨 Color Coding Guide

### Return Type Badges
| Type | Color | Meaning |
|------|-------|---------|
| Quality Issue | 🔴 Red | Product doesn't meet standards |
| Damaged | 🟠 Orange | Product received damaged |
| Expired | 🟣 Purple | Past expiry date |
| Wrong Item | 🟡 Yellow | Incorrect product |
| Excess Stock | 🔵 Blue | Returning surplus |
| Other | ⚪ Gray | Other reasons |

### Refund Status Badges
| Status | Color | Meaning |
|--------|-------|---------|
| Completed | 🟢 Green | Fully refunded |
| Partial | 🟡 Yellow | Some refund received |
| Pending | 🟠 Orange | No refund yet |
| Rejected | 🔴 Red | Return rejected |

### Approval Status Badges
| Status | Color | Meaning |
|--------|-------|---------|
| Approved | 🟢 Green | Return approved |
| Rejected | 🔴 Red | Return rejected |
| Pending | 🔵 Blue | Awaiting approval |

---

## ✏️ Editing Returns

1. Click **"Edit"** button on any return row
2. Update any field (except Return Number)
3. Auto-calculations update in real-time:
   - Change refunded amount → Pending refund updates
   - Refund status auto-updates:
     - Refunded = 0 → "Pending"
     - Refunded = Final → "Completed"
     - Otherwise → "Partial"
4. Click **"Update Return"** to save

---

## 👁️ Viewing Return Details

Click **"View"** to see complete return information:

```
┌─────────────────────────────────────────────────────────┐
│ Return Information                                       │
│ Return Number: PR000001                                 │
│ Return Date: 09/10/2025                                 │
│ Original Purchase: PUR000001                            │
├─────────────────────────────────────────────────────────┤
│ Product Details                                          │
│ Product: Green Tea Leaves (Raw Materials)               │
│ Description: Premium grade                              │
│ Returned Quantity: 10 kg @ ₹500/kg                     │
├─────────────────────────────────────────────────────────┤
│ Batch Details                                            │
│ Batch: BATCH-2025-001                                   │
│ Manufacturing: 05/09/2025                               │
│ Expiry: 05/09/2026                                      │
├─────────────────────────────────────────────────────────┤
│ Supplier Details                                         │
│ Supplier: ABC Trading Company                           │
│ Contact: +91 98765 43210                                │
│ Address: 123 Market Street, Mumbai                      │
│ GSTIN: 27XXXXX1234X1Z5                                  │
│ Email: supplier@example.com                             │
├─────────────────────────────────────────────────────────┤
│ Return Reason                                            │
│ Type: Quality Issue (Damaged)                           │
│ Reason: Found contamination in the batch               │
├─────────────────────────────────────────────────────────┤
│ Pricing & Refund                                         │
│ Total Return: ₹5,000.00                                │
│ Tax (18%): ₹900.00                                      │
│ Discount: ₹0.00                                         │
│ Final Amount: ₹5,900.00                                │
│ Refunded: ₹0.00                                         │
│ Pending: ₹5,900.00                                      │
│ Status: Pending                                          │
│ Method: Bank Transfer                                    │
│ Date: 10/10/2025                                        │
├─────────────────────────────────────────────────────────┤
│ Additional Details                                       │
│ Debit Note: DN000001                                    │
│ Returned By: John Doe                                   │
│ Approval: Pending                                        │
│ Notes: Immediate action required                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🗑️ Deleting Returns

1. Click **"Delete"** button on any return row
2. Confirm deletion in the dialog
3. Return permanently removed from system

⚠️ **Warning**: Deletion is permanent and cannot be undone!

---

## 💡 Pro Tips

### 1. Fast Return Entry
- Use **Tab** key to navigate between fields
- Copy-paste supplier details from previous returns
- Use consistent naming for products and batches

### 2. Tracking Refunds
- Update "Refunded Amount" as payments come in
- System auto-updates "Pending Refund" and "Refund Status"
- Add refund date when payment received

### 3. Approval Workflow
- Set initial approval to "Pending"
- Update to "Approved" after review
- Add approver name in "Approved By" field
- Change to "Rejected" if return denied

### 4. Better Organization
- Use descriptive product names
- Add detailed return reasons
- Include batch numbers for traceability
- Keep debit note numbers updated

### 5. Using Filters Effectively
- Filter by "Pending" refund to see outstanding refunds
- Filter by "Pending" approval to review new returns
- Use date range for monthly reports
- Filter by supplier for supplier analysis

---

## 🔄 Typical Workflow

```
1. Receive Returned Goods
   ↓
2. Create Return Record
   - Enter all details
   - Add return reason
   - Note condition
   - Set approval to "Pending"
   ↓
3. Quality Inspection
   - Verify condition
   - Update condition field
   ↓
4. Get Approval
   - Review return reason
   - Approve or reject
   - Add approver name
   ↓
5. Process Refund
   - Issue refund via method
   - Update refunded amount
   - Add refund date
   - Generate debit note
   ↓
6. Complete
   - Status auto-updates to "Completed"
   - Pending refund becomes ₹0
```

---

## ❓ FAQs

**Q: Can I edit the return number?**  
A: No, return numbers are auto-generated and cannot be changed.

**Q: What if I enter wrong refunded amount?**  
A: Just click Edit and update the amount. Status will auto-correct.

**Q: Do I need to manually update refund status?**  
A: No, it updates automatically based on refunded amount.

**Q: Can I delete a return after approval?**  
A: Yes, but it's not recommended. Better to reject instead.

**Q: How to handle partial refunds?**  
A: Enter the amount received in "Refunded Amount". Status becomes "Partial" automatically. Update again when full refund received.

**Q: What if return is rejected?**  
A: Set approval status to "Rejected" and optionally set refund status to "Rejected".

**Q: Can I attach photos of damaged goods?**  
A: Not currently. Use the "Notes" field to describe damage and reference external documentation.

**Q: How to track multiple refunds for one return?**  
A: Update "Refunded Amount" each time. System tracks total refunded and pending amount.

---

## 📞 Support

For technical issues or questions:
1. Check this guide first
2. Review the detailed documentation (PURCHASE-RETURNS-DOCUMENTATION.md)
3. Contact your system administrator
4. Refer to the Purchase Returns API documentation

---

## 🎯 Quick Reference

### Keyboard Shortcuts
- **Tab**: Next field
- **Shift+Tab**: Previous field
- **Enter**: Submit form (in inputs)
- **Esc**: Close dialog

### Important Fields
- **Required**: product_name, returned_quantity, unit, batch_number, supplier_name, return_reason, return_type, unit_price
- **Auto-generated**: return_number
- **Auto-calculated**: total_return_amount, tax_amount, final_return_amount, pending_refund_amount, refund_status

### Status Transitions
```
Refund Status:
Pending → Partial → Completed
   ↓
Rejected

Approval Status:
Pending → Approved
   ↓
Rejected
```

---

**🎉 You're all set! Start recording your first purchase return now.**

