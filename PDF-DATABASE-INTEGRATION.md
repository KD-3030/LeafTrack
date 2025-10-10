# PDF Database Integration - Complete Guide

## 🎯 Overview

The PDF generators now **automatically fetch company details from the database** including company name, address, contact info, and **logo**. No more hardcoded values!

---

## ✅ What Changed

### Before (Hardcoded)
```typescript
const companyDetails = {
  name: 'LeafTrack Tea Company',
  address: 'Tea Estate Road, Siliguri...',
  phone: '+91 98765 43210',
  // ... hardcoded values
};

generateOrderBillPDF(order, companyDetails);
```

### After (Database Integration)
```typescript
// Just call the function - it fetches everything automatically!
await generateOrderBillPDF(order);
```

---

## 🔄 How It Works

### 1. **Automatic Database Fetch**
When you download a PDF, the system:
1. Fetches company settings from `/api/settings/company`
2. Retrieves: name, address, phone, email, GSTIN, logo URL
3. Uses these values in the PDF header

### 2. **Logo Integration**
- Logo URL from settings is loaded as base64
- Displayed in top-right corner of PDF header
- Size: 50x20 (automatically scaled)
- Fallback: No logo if URL is invalid or empty

### 3. **Smart Fallbacks**
If database fetch fails, the system uses:
- Invoice's company details (if available)
- Default values as last resort

---

## 📁 Files Updated

### 1. **lib/pdfGenerator.ts**
**New Functions:**
```typescript
// Fetches company settings from database
async function fetchCompanySettings()

// Loads logo image as base64 for PDF
async function loadImageAsBase64(url: string)
```

**Updated Functions:**
```typescript
// Now async and fetches from database
export async function generateInvoicePDF(invoice: Invoice)
export async function generateOrderBillPDF(order: Order)
```

**Key Changes:**
- Both PDF generators are now `async` functions
- Auto-fetch company settings at start
- Load and embed logo if URL exists
- Use database values with smart fallbacks

---

### 2. **app/admin/orders/page.tsx**
**Before:**
```typescript
const handleDownloadPDF = (order: Order) => {
  const companyDetails = { /* hardcoded */ };
  generateOrderBillPDF(order, companyDetails);
};
```

**After:**
```typescript
const handleDownloadPDF = async (order: Order) => {
  await generateOrderBillPDF(order);
  toast.success('Order bill downloaded successfully!');
};
```

---

### 3. **app/salesman/orders/page.tsx**
Same changes as admin page - now async with no hardcoded values.

---

### 4. **app/admin/invoicing/page.tsx**
**Before:**
```typescript
const success = generateInvoicePDF(data.invoice);
```

**After:**
```typescript
const success = await generateInvoicePDF(data.invoice);
```

---

## 🖼️ Logo Display

### Logo Placement
- **Position**: Top-right corner of PDF header
- **Size**: 50px width × 20px height
- **Background**: Blue header (#1A5276)
- **Format**: PNG, JPG, or any image format

### Logo Requirements
- **URL**: Must be publicly accessible
- **Size**: Recommended 200-400px wide
- **Format**: PNG with transparent background (best)
- **Hosting**: Cloudinary, ImgBB, AWS S3, etc.

### Logo Loading Process
1. Fetch logo URL from company settings
2. Download image as blob
3. Convert to base64 data URI
4. Embed in PDF using `pdf.addImage()`
5. On error: Skip logo, continue with PDF

---

## 🔧 Company Settings Structure

### Database Schema (CompanySettings)
```typescript
{
  company_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin?: string;
  pan?: string;
  logo_url?: string;        // ← NEW: Logo for PDFs
  signature_url?: string;   // ← NEW: Signature (future use)
}
```

### How Settings Are Used in PDF

**Company Name:**
- Large, bold text in header
- Example: "Sohagtea Trading Company"

**Address:**
- Combined: `${address}, ${city}, ${state} ${pincode}`
- Example: "Tea Estate Road, Bagdogra, Siliguri, West Bengal 734421"

**Contact Info:**
- Phone: `Tel: ${phone}`
- Email: Displayed directly
- GSTIN: `GSTIN: ${gstin}`

**Logo:**
- Loaded from `logo_url`
- Displayed in header (top-right)

---

## 🚀 Usage Examples

### Example 1: Download Order Bill (Admin)
```typescript
// In admin orders page
const handleDownloadPDF = async (order: Order) => {
  try {
    await generateOrderBillPDF(order);
    toast.success('Order bill downloaded successfully!');
  } catch (error) {
    toast.error('Failed to download order bill');
  }
};
```

### Example 2: Download Invoice
```typescript
// In invoicing page
const downloadInvoice = async (invoiceId: string) => {
  const response = await fetch(`/api/invoices/${invoiceId}`);
  const data = await response.json();
  
  if (data.success) {
    await generateInvoicePDF(data.invoice);
    toast({ title: "Invoice PDF downloaded" });
  }
};
```

### Example 3: With Error Handling
```typescript
const handleDownloadPDF = async (order: Order) => {
  try {
    // Automatically fetches company settings and logo
    await generateOrderBillPDF(order);
    toast.success('PDF generated successfully!');
  } catch (error) {
    console.error('PDF generation failed:', error);
    
    // Still generates PDF, just without logo/settings
    toast.warning('PDF generated with default settings');
  }
};
```

---

## 🎨 PDF Header Design

### Without Logo
```
┌─────────────────────────────────────────────┐
│ ████████████████████ (Blue Header)          │
│ SOHAGTEA TRADING COMPANY                    │
│ Tea Estate Road, Bagdogra, Siliguri, WB...  │
│ Tel: +91 98765 43210 • info@sohagtea.com    │
│ ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂ (Teal Accent)          │
└─────────────────────────────────────────────┘
```

### With Logo
```
┌─────────────────────────────────────────────┐
│ ████████████████████ (Blue Header)  [LOGO] │
│ SOHAGTEA TRADING COMPANY                    │
│ Tea Estate Road, Bagdogra, Siliguri, WB...  │
│ Tel: +91 98765 43210 • info@sohagtea.com    │
│ ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂ (Teal Accent)          │
└─────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Issue: Logo Not Showing in PDF

**Possible Causes:**
1. ❌ Logo URL not saved in settings
2. ❌ Logo URL not publicly accessible
3. ❌ Invalid image format
4. ❌ CORS issues with image hosting

**Solutions:**
✅ Check `/admin/settings` - verify logo URL is saved
✅ Test logo URL in browser (should open directly)
✅ Use Cloudinary or ImgBB (CORS-friendly)
✅ Check browser console for errors

### Issue: Company Details Not Showing

**Possible Causes:**
1. ❌ Company settings not saved
2. ❌ API endpoint not responding
3. ❌ Authentication token missing/invalid

**Solutions:**
✅ Go to `/admin/settings` and save company info
✅ Check browser console for API errors
✅ Verify you're logged in (token in localStorage)

### Issue: PDF Download Fails

**Possible Causes:**
1. ❌ Network error fetching settings
2. ❌ Invalid order/invoice data
3. ❌ Browser blocking download

**Solutions:**
✅ Check internet connection
✅ Check browser console for errors
✅ Try different browser
✅ Check popup blocker settings

---

## 🧪 Testing

### Test Checklist

1. **Setup Company Settings**
   - [ ] Go to `/admin/settings`
   - [ ] Fill all company information
   - [ ] Add logo URL
   - [ ] Save settings

2. **Test Order Bill**
   - [ ] Go to `/admin/orders`
   - [ ] Click download icon on any order
   - [ ] Verify PDF opens with company name
   - [ ] Verify logo appears in header
   - [ ] Verify address and contact info

3. **Test Invoice PDF**
   - [ ] Go to `/admin/invoicing`
   - [ ] Click "Download PDF" on any invoice
   - [ ] Verify company details appear
   - [ ] Verify logo displays correctly

4. **Test Without Logo**
   - [ ] Remove logo URL from settings
   - [ ] Download PDF
   - [ ] Should work without errors
   - [ ] No logo, but company name/details show

---

## 📊 API Endpoint

### GET /api/settings/company

**Request:**
```typescript
fetch('/api/settings/company', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "company_name": "Sohagtea Trading Company",
    "address": "Tea Estate Road, Bagdogra",
    "city": "Siliguri",
    "state": "West Bengal",
    "pincode": "734421",
    "phone": "+91 98765 43210",
    "email": "info@sohagtea.com",
    "gstin": "19ABCDE1234F1Z5",
    "pan": "ABCDE1234F",
    "logo_url": "https://res.cloudinary.com/.../logo.png",
    "signature_url": ""
  }
}
```

---

## 🎯 Benefits

### 1. **Single Source of Truth**
- Update settings once in `/admin/settings`
- All PDFs automatically use latest info
- No need to update code for company changes

### 2. **Professional Branding**
- Company logo on all documents
- Consistent information across PDFs
- Easy to update for rebranding

### 3. **No Hardcoded Values**
- All company info from database
- Easy to deploy for different clients
- Configuration through UI, not code

### 4. **Automatic Updates**
- Change logo → All PDFs updated instantly
- Update address → Reflects in all documents
- No deployment needed for info changes

---

## 🔮 Future Enhancements

### Planned Features:
1. **Signature Image**
   - Display signature from `signature_url`
   - In footer "Authorized Signature" section
   
2. **Multiple Logos**
   - Company logo (header)
   - Watermark (background)
   - Footer logo
   
3. **PDF Templates**
   - Different templates for different document types
   - Customizable colors from settings
   - Layout preferences

4. **Caching**
   - Cache company settings in memory
   - Reduce API calls
   - Faster PDF generation

---

## 📝 Code Reference

### Fetch Company Settings
```typescript
async function fetchCompanySettings() {
  try {
    const response = await fetch('/api/settings/company', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.settings;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return null;
  }
}
```

### Load Logo as Base64
```typescript
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
}
```

### Add Logo to PDF
```typescript
if (companySettings?.logo_url) {
  try {
    const logoBase64 = await loadImageAsBase64(companySettings.logo_url);
    if (logoBase64) {
      const logoWidth = 50;
      const logoHeight = 20;
      pdf.addImage(logoBase64, 'PNG', pageWidth - 65, 10, logoWidth, logoHeight);
    }
  } catch (error) {
    console.error('Error loading logo:', error);
  }
}
```

---

## ✅ Migration Complete

**Status**: ✅ **COMPLETE**

All PDF generators now:
- ✅ Fetch company details from database
- ✅ Load and display logo automatically
- ✅ Use smart fallbacks
- ✅ Handle errors gracefully
- ✅ Support async operations
- ✅ No hardcoded company values

**Next Steps:**
1. Add logo URL in `/admin/settings`
2. Test PDF downloads
3. Enjoy automatic branding! 🎉

---

## 📚 Related Documentation

- **COMPANY-LOGO-SETUP.md** - Logo setup instructions
- **PREMIUM-PDF-SYSTEM.md** - Complete PDF system guide
- **QUICK-LOGO-SETUP.md** - 5-minute quick start
- **PDF-DESIGN-OPTIMIZATION.md** - Design details

---

**Last Updated**: October 10, 2025
**Version**: 2.0 (Database Integration)
**Status**: Production Ready ✅
