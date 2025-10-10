# 🎨 PDF System - Visual Guide

## 📊 Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER CLICKS DOWNLOAD                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              generateOrderBillPDF() or                      │
│              generateInvoicePDF()                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           fetchCompanySettings()                            │
│           ├─ GET /api/settings/company                      │
│           └─ Returns: name, address, logo_url, etc.         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           If logo_url exists:                               │
│           loadImageAsBase64(logo_url)                       │
│           ├─ Fetch image from URL                           │
│           ├─ Convert to blob                                │
│           └─ Convert to base64 data URI                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Generate PDF with jsPDF                           │
│           ├─ Create blue header                             │
│           ├─ Add company name (from settings)               │
│           ├─ Add logo (if loaded)                           │
│           ├─ Add company details (from settings)            │
│           ├─ Add order/invoice items                        │
│           └─ Add footer                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              pdf.save('filename.pdf')                       │
│              PDF downloads to user's device                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Before vs After Comparison

### Before (Hardcoded)

```typescript
// ❌ OLD WAY - Hardcoded values
const handleDownloadPDF = (order: Order) => {
  const companyDetails = {
    name: 'LeafTrack Tea Company',      // Hardcoded
    address: 'Tea Estate Road...',      // Hardcoded
    phone: '+91 98765 43210',          // Hardcoded
    email: 'info@leaftrack.com',       // Hardcoded
    gstin: '19XXXXX1234X1ZX',          // Hardcoded
  };
  
  generateOrderBillPDF(order, companyDetails);
};
```

**Problems:**
- ❌ Need to update code to change company info
- ❌ No logo support
- ❌ Different values might be in different places
- ❌ Need deployment to change details

---

### After (Database-Driven)

```typescript
// ✅ NEW WAY - Fetches from database
const handleDownloadPDF = async (order: Order) => {
  await generateOrderBillPDF(order);
  // ✅ Automatically fetches:
  //    - Company name
  //    - Address, city, state, pincode
  //    - Phone, email, GSTIN
  //    - Logo URL (loads and embeds)
};
```

**Benefits:**
- ✅ Update via UI (/admin/settings)
- ✅ Logo automatically loads and displays
- ✅ Single source of truth
- ✅ No code changes needed
- ✅ No deployment for info updates

---

## 📐 PDF Header Layout (Detailed)

```
  0px                                              210px (Page Width)
  ┌──────────────────────────────────────────────────────┐
  │ ████████████████ BLUE HEADER (40px) ████████████████ │ ← 0-40px
  │                                          [LOGO]       │
  │ Company Name (White, 22pt, Bold)        50×20px      │
  │                                        @ 145,10       │
  │ Address, City, State Pincode (White, 8pt)            │ ← 25px
  │ Tel: Phone • Email • GSTIN (White, 8pt)              │ ← 29px
  │ ▂▂▂▂▂▂▂▂▂▂▂▂▂ TEAL ACCENT (2px) ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂   │ ← 40-42px
  └──────────────────────────────────────────────────────┘
```

### Measurements
- **Header Height**: 40px
- **Accent Stripe**: 2px (teal #009688)
- **Logo Position**: X: pageWidth-65, Y: 10
- **Logo Size**: 50px wide × 20px tall
- **Company Name**: X: 15, Y: 18
- **Address Line 1**: X: 15, Y: 25
- **Address Line 2**: X: 15, Y: 29

---

## 🎨 Color Palette

```typescript
// Primary Colors
const primaryColor = [26, 82, 118];      // #1A5276 - Deep Blue
const accentColor = [0, 150, 136];       // #009688 - Teal

// Text Colors
const textDark = [33, 33, 33];           // #212121 - Dark Gray
const textMedium = [88, 88, 88];         // #585858 - Medium Gray
const textLight = [117, 117, 117];       // #757575 - Light Gray

// UI Colors
const borderColor = [224, 224, 224];     // #E0E0E0 - Light Border
const bgLight = [250, 250, 250];         // #FAFAFA - Light Background

// Status Colors
const successGreen = [39, 174, 96];      // #27AE60 - Success
const warningOrange = [243, 156, 18];    // #F39C12 - Warning
const dangerRed = [192, 57, 43];         // #C0392B - Danger
```

---

## 🖼️ Logo Integration Details

### Logo Loading Process

```typescript
// Step 1: Check if logo URL exists
if (companySettings?.logo_url) {
  
  // Step 2: Load image as base64
  const logoBase64 = await loadImageAsBase64(companySettings.logo_url);
  
  // Step 3: Add to PDF if loaded successfully
  if (logoBase64) {
    pdf.addImage(
      logoBase64,        // base64 data URI
      'PNG',             // format (auto-detected)
      pageWidth - 65,    // X position (top-right)
      10,                // Y position
      50,                // width
      20                 // height
    );
  }
}
```

### Logo Error Handling

```typescript
try {
  // Try to load logo
  const logoBase64 = await loadImageAsBase64(url);
  if (logoBase64) {
    pdf.addImage(...);
  }
} catch (error) {
  // Log error but continue PDF generation
  console.error('Error loading logo:', error);
  // PDF continues without logo
}
```

---

## 📋 Company Settings Flow

### Settings Page → Database → PDF

```
┌──────────────────────┐
│  /admin/settings     │
│  User fills form:    │
│  - Company Name      │
│  - Address, City     │
│  - Phone, Email      │
│  - Logo URL          │
│  [Save Settings]     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  MongoDB Database    │
│  CompanySettings:    │
│  {                   │
│    company_name: "", │
│    address: "",      │
│    logo_url: "",     │
│    ...               │
│  }                   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  API Endpoint        │
│  GET /api/settings/  │
│      company         │
│  Returns settings    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  PDF Generator       │
│  - Fetches settings  │
│  - Loads logo        │
│  - Creates PDF       │
│  - Downloads         │
└──────────────────────┘
```

---

## 🔍 Data Flow Example

### Real Example: Order Bill Download

```typescript
// 1. USER ACTION
User clicks download icon on Order #ORD-2025-001

// 2. CALL PDF GENERATOR
await generateOrderBillPDF(order);

// 3. FETCH SETTINGS
const settings = await fetchCompanySettings();
// Returns:
{
  company_name: "Sohagtea Trading Company",
  address: "Tea Estate Road, Bagdogra",
  city: "Siliguri",
  state: "West Bengal",
  pincode: "734421",
  phone: "+91 98765 43210",
  email: "info@sohagtea.com",
  gstin: "19ABCDE1234F1Z5",
  logo_url: "https://res.cloudinary.com/demo/logo.png"
}

// 4. LOAD LOGO
const logoBase64 = await loadImageAsBase64(settings.logo_url);
// Returns: "data:image/png;base64,iVBORw0KGgoAAAA..."

// 5. BUILD PDF
pdf.setFillColor(26, 82, 118);              // Blue header
pdf.rect(0, 0, 210, 40, 'F');               // Header rectangle
pdf.addImage(logoBase64, 'PNG', 145, 10, 50, 20);  // Logo
pdf.text("Sohagtea Trading Company", 15, 18);      // Company name
pdf.text("Tea Estate Road, Bagdogra...", 15, 25);  // Address
// ... rest of PDF content

// 6. DOWNLOAD
pdf.save('Order-ORD-2025-001.pdf');

// 7. SUCCESS
toast.success('Order bill downloaded!');
```

---

## 🎯 Component Interaction Map

```
┌────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                         │
│                                                            │
│  ┌─────────────────┐         ┌─────────────────┐          │
│  │  Orders Page    │         │  Invoicing Page │          │
│  │                 │         │                 │          │
│  │  [Download] ────┼─────────┼─→ PDF Generator │          │
│  └─────────────────┘         └─────────────────┘          │
│                                       │                    │
│                                       │                    │
│  ┌─────────────────┐                 │                    │
│  │ Settings Page   │                 │                    │
│  │                 │                 │                    │
│  │ Company Info ───┼─────────────────┘                    │
│  │ Logo URL        │      Fetches from database           │
│  │ [Save]          │                                      │
│  └────────┬────────┘                                      │
│           │                                               │
└───────────┼───────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────┐
│   MongoDB Database    │
│   CompanySettings     │
│   Collection          │
└───────────────────────┘
```

---

## 📊 Function Call Stack

### Order Bill Generation

```
handleDownloadPDF(order)
  ├─→ generateOrderBillPDF(order)
  │     ├─→ fetchCompanySettings()
  │     │     ├─→ fetch('/api/settings/company')
  │     │     ├─→ GET request with auth token
  │     │     └─→ Returns settings object
  │     │
  │     ├─→ if (settings.logo_url)
  │     │     └─→ loadImageAsBase64(logo_url)
  │     │           ├─→ fetch(url)
  │     │           ├─→ response.blob()
  │     │           ├─→ FileReader.readAsDataURL()
  │     │           └─→ Returns base64 string
  │     │
  │     ├─→ Create jsPDF instance
  │     ├─→ Draw header (blue rectangle)
  │     ├─→ Add logo (if loaded)
  │     ├─→ Add company name
  │     ├─→ Add company details
  │     ├─→ Add order information
  │     ├─→ Add items table
  │     ├─→ Add totals
  │     ├─→ Add footer
  │     └─→ pdf.save()
  │
  └─→ toast.success()
```

---

## 🎨 PDF Sections Breakdown

### Section 1: Header (Y: 0-42)
```
┌──────────────────────────────────────────┐
│ ███████████████████████████████████████  │ ← Blue fill
│ Company Name              [Logo Image]   │ ← White text
│ Address line 1                           │ ← White text
│ Address line 2 (phone, email, GSTIN)     │ ← White text
│ ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂  │ ← Teal accent
└──────────────────────────────────────────┘
```

### Section 2: Order Details (Y: 48-80)
```
┌────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐  │
│ │ ORDER INFO      │  │ CUSTOMER INFO   │  │
│ │ ──────────────  │  │ ──────────────  │  │
│ │ No: ORD-001     │  │ Name: John Doe  │  │
│ │ Date: 10 Oct    │  │ Phone: +91 XXX  │  │
│ │ Salesman: ABC   │  │ Address: ...    │  │
│ └─────────────────┘  └─────────────────┘  │
└────────────────────────────────────────────┘
```

### Section 3: Items Table (Y: 90+)
```
┌──────────────────────────────────────────────┐
│ ███ DESCRIPTION │ QTY │ RATE │ AMOUNT ████  │ ← Header
│ ──────────────────────────────────────────── │
│ Tea Product 1   │  10 │ 100  │ 1000        │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │ ← Alt row
│ Tea Product 2   │   5 │ 200  │ 1000        │
│ ──────────────────────────────────────────── │
└──────────────────────────────────────────────┘
```

### Section 4: Totals (Bottom Right)
```
┌────────────────────────────┐
│            Subtotal: 2000  │
│            Tax (5%):  100  │
│            Discount:  -50  │
│            ─────────────── │
│ ████████   TOTAL:   2050   │ ← Blue box
│ █▎                         │ ← Teal accent
└────────────────────────────┘
```

### Section 5: Footer (Bottom)
```
┌──────────────────────────────────────────────┐
│ ───────────────────────────────────────────  │
│ Generated: 10 Oct 2025  │  Thank you!  │    │
│                         │              │ ___ │
│                         │              │ Sig │
└──────────────────────────────────────────────┘
```

---

## 🔧 Technical Specifications

### PDF Settings
- **Library**: jsPDF
- **Page Size**: A4 (210mm × 297mm)
- **Orientation**: Portrait
- **Unit**: Millimeters
- **Font**: Helvetica (built-in)

### Typography Scale
- **Title**: 26pt (Bold)
- **Company Name**: 22pt (Bold)
- **Section Headers**: 9pt (Bold)
- **Body Text**: 8-9pt (Normal)
- **Footer**: 7-8pt (Normal)

### Spacing
- **Page Margins**: 15mm (all sides)
- **Line Height**: 6-9mm (varies by section)
- **Section Spacing**: 8-12mm
- **Table Row Height**: 9mm

---

## ✅ Complete Feature Set

### Current Features
- ✅ Auto-fetch company settings
- ✅ Load logo from URL
- ✅ Embed logo in PDF header
- ✅ Display company name, address, contact
- ✅ Professional color scheme
- ✅ Rounded corners and accents
- ✅ Status badges (Approved/Pending/Rejected)
- ✅ Alternating table rows
- ✅ Clean footer with signature line
- ✅ Error handling and fallbacks
- ✅ Async/await pattern
- ✅ Toast notifications

### Future Enhancements
- [ ] Signature image in footer
- [ ] Watermark support
- [ ] Multiple logo positions
- [ ] Custom color themes
- [ ] QR code generation
- [ ] Barcode support
- [ ] Multi-page support
- [ ] Template system

---

**Last Updated**: October 10, 2025
**Version**: 2.0 (Database Integration)
**Status**: Production Ready ✅
