# 🎯 Quick Reference Card - PDF System

## 📥 Download PDFs (Now with Auto Logo!)

### Admin Orders
```typescript
// Click download icon in orders table
// PDF auto-loads company details + logo
```

### Salesman Orders
```typescript
// Click download icon in orders table
// PDF auto-loads company details + logo
```

### Invoices
```typescript
// Click "Download PDF" button
// PDF auto-loads company details + logo
```

---

## ⚙️ Setup (One Time)

### 1. Add Company Info (`/admin/settings`)
```
Company Name: [Your Company]
Address: [Your Address]
City: [Your City]
State: [Your State]
Pincode: [Your Pincode]
Phone: [Your Phone]
Email: [Your Email]
GSTIN: [Your GSTIN]
PAN: [Your PAN]
```

### 2. Add Logo (`/admin/settings` → Branding Section)
```
1. Upload logo to Cloudinary (https://cloudinary.com)
2. Copy direct image URL
3. Paste in "Logo URL" field
4. Click Save Settings
```

---

## 🖼️ Logo Specs

- **Size**: 200-400px wide
- **Format**: PNG (transparent background)
- **File Size**: Under 500KB
- **Aspect**: Wide horizontal logo works best

---

## ✅ What Auto-Loads in PDFs

### Header Section
- ✅ Company Name (large, bold)
- ✅ Company Logo (top-right corner)
- ✅ Full Address (address + city + state + pincode)
- ✅ Phone (with "Tel:" prefix)
- ✅ Email
- ✅ GSTIN (with "GSTIN:" prefix)

### Footer Section
- ✅ Generated date/time
- ✅ "Thank you for your business!"
- ✅ Signature line

---

## 🔧 Technical Details

### Functions (Now Async)
```typescript
// Both are now async - use await!
await generateOrderBillPDF(order);
await generateInvoicePDF(invoice);
```

### API Called
```
GET /api/settings/company
Authorization: Bearer {token}
```

### Settings Fetched
```typescript
{
  company_name: string,
  address: string,
  city: string,
  state: string,
  pincode: string,
  phone: string,
  email: string,
  gstin: string,
  logo_url: string  // ← Used for logo
}
```

---

## 🐛 Quick Troubleshooting

### Logo Not Showing?
1. ✅ Check URL in settings
2. ✅ Open URL in browser
3. ✅ Re-save settings
4. ✅ Clear browser cache

### Details Missing?
1. ✅ Fill all fields in `/admin/settings`
2. ✅ Click "Save Settings"
3. ✅ Refresh page
4. ✅ Try download again

### PDF Fails?
1. ✅ Check browser console (F12)
2. ✅ Verify logged in
3. ✅ Check internet connection
4. ✅ Try different browser

---

## 📊 Logo Hosting Options

### Recommended:
1. **Cloudinary** - https://cloudinary.com (free tier)
2. **ImgBB** - https://imgbb.com (no account)
3. **Imgur** - https://imgur.com (easy upload)

### Get Direct URL:
- Right-click image → "Copy image address"
- Must start with `https://`
- Must be publicly accessible

---

## 🎨 PDF Header Layout

```
┌─────────────────────────────────────────┐
│ █████ BLUE HEADER ████████  [LOGO 50x20]│
│ YOUR COMPANY NAME (22pt, Bold)          │
│ Address, City, State Pincode (8pt)      │
│ Tel: Phone • Email • GSTIN: XXX (8pt)   │
│ ▂▂▂▂▂▂▂▂ TEAL ACCENT ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂  │
└─────────────────────────────────────────┘
```

---

## 📝 Code Examples

### Download Order Bill
```typescript
const handleDownloadPDF = async (order: Order) => {
  try {
    await generateOrderBillPDF(order);
    toast.success('Downloaded!');
  } catch (error) {
    toast.error('Failed!');
  }
};
```

### Download Invoice
```typescript
const downloadInvoice = async (invoice: Invoice) => {
  try {
    await generateInvoicePDF(invoice);
    toast.success('Downloaded!');
  } catch (error) {
    toast.error('Failed!');
  }
};
```

---

## 🎯 Key Points

1. **No parameters needed** - function fetches everything
2. **Logo auto-loads** - if URL exists in settings
3. **Smart fallbacks** - works even if fetch fails
4. **Async functions** - always use `await`
5. **One-time setup** - update settings once, done!

---

## 📚 Full Documentation

- **DATABASE-INTEGRATION-SUMMARY.md** - Quick overview
- **PDF-DATABASE-INTEGRATION.md** - Complete guide
- **COMPANY-LOGO-SETUP.md** - Logo setup steps
- **PREMIUM-PDF-SYSTEM.md** - System details

---

## ✅ Checklist

- [ ] Company info added in settings
- [ ] Logo uploaded to hosting service
- [ ] Logo URL added in settings
- [ ] Settings saved
- [ ] Test order bill download
- [ ] Test invoice download
- [ ] Verify logo appears
- [ ] ✅ All done!

---

**Quick Start**: `/admin/settings` → Add Info → Add Logo URL → Save → Test Download

**Status**: ✅ Ready to Use
**Updated**: October 10, 2025
