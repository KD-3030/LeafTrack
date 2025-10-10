# Company Logo & Branding Setup Guide

## 📋 Overview

Your LeafTrack application has a complete company settings system that includes logo and branding support. This guide will help you set up your company name, logo, and other branding elements for PDF bills.

---

## 🏢 Company Settings Location

**Admin Panel**: `/admin/settings`

Access this page to configure all company details including:
- Company name and address
- Contact information
- Tax details (GSTIN, PAN)
- Banking information
- Logo and signature images

---

## 📸 Logo Setup

### Method 1: Using Logo URL (Recommended)

1. **Upload your logo to a hosting service:**
   - **Cloudinary** (Free tier available): https://cloudinary.com
   - **ImgBB** (Free): https://imgbb.com
   - **AWS S3** (Paid, professional)
   - **Your own server**

2. **Get the direct image URL**
   - Example: `https://res.cloudinary.com/yourname/image/upload/v1234567890/logo.png`

3. **Add to settings page:**
   - Go to `/admin/settings`
   - Enter the logo URL in the "Logo URL" field
   - Click Save

### Method 2: Local Storage (For Development)

1. **Place logo in public folder:**
   ```
   public/
   └── images/
       ├── company-logo.png
       └── signature.png
   ```

2. **Use relative URL in settings:**
   ```
   Logo URL: /images/company-logo.png
   Signature URL: /images/signature.png
   ```

---

## 🎨 Logo Specifications

### Recommended Dimensions
- **Width**: 200-400 pixels
- **Height**: 60-100 pixels
- **Aspect Ratio**: 3:1 or 4:1 (wide logo works best)

### File Format
- ✅ **PNG** (Recommended - supports transparency)
- ✅ **JPG/JPEG** (Good for photographs)
- ⚠️ **SVG** (Not directly supported in jsPDF, convert to PNG)

### File Size
- Keep under 500 KB for fast loading
- Optimize images before uploading

### Design Tips
- Use transparent background (PNG)
- Ensure logo is readable at small sizes
- Use high resolution (2x for retina displays)
- Test in both color and grayscale

---

## 🔧 Current Company Settings Structure

```typescript
interface CompanySettings {
  // Basic Information
  company_name: string;          // "Your Tea Company Pvt Ltd"
  address: string;               // "123 Tea Garden Road"
  city: string;                  // "Siliguri"
  state: string;                 // "West Bengal"
  pincode: string;               // "734001"
  country: string;               // "India"
  
  // Contact
  phone: string;                 // "+91 98765 43210"
  email: string;                 // "info@yourcompany.com"
  website: string;               // "www.yourcompany.com"
  
  // Tax Details
  gstin: string;                 // "19XXXXX1234X1ZX"
  pan: string;                   // "ABCDE1234F"
  cin?: string;                  // "U15491WB2020PTC123456"
  
  // Banking
  bank_name?: string;            // "State Bank of India"
  account_number?: string;       // "1234567890"
  ifsc_code?: string;            // "SBIN0001234"
  account_holder_name?: string;  // "Your Tea Company Pvt Ltd"
  
  // Branding
  logo_url?: string;             // "https://example.com/logo.png"
  signature_url?: string;        // "https://example.com/signature.png"
  
  // Invoice Settings
  invoice_prefix: string;        // "INV"
  invoice_counter: number;       // 1001
  invoice_terms: string;         // "Payment due within 30 days"
}
```

---

## 📝 Step-by-Step Setup

### Step 1: Access Settings
1. Login as Admin
2. Navigate to `/admin/settings`
3. You'll see three sections:
   - Company Information
   - Tax & Banking Details
   - Invoice Settings

### Step 2: Fill Company Information
```
Company Name: Sohagtea Trading Company
Address: 123 Tea Estate Road, Tea Garden
City: Siliguri
State: West Bengal
Pincode: 734001
Country: India
Phone: +91 98765 43210
Email: info@sohagtea.com
Website: www.sohagtea.com (optional)
```

### Step 3: Add Tax Details
```
GSTIN: 19ABCDE1234F1Z5
PAN: ABCDE1234F
CIN: (optional for private limited companies)
```

### Step 4: Add Banking Details (Optional)
```
Bank Name: State Bank of India
Account Number: 1234567890
IFSC Code: SBIN0001234
Account Holder: Sohagtea Trading Company
```

### Step 5: Upload Logo
1. Upload your logo to Cloudinary or similar service
2. Copy the direct image URL
3. Paste in "Logo URL" field
4. Click Save

### Step 6: Test PDF Generation
1. Go to Orders or Invoices page
2. Click the download button on any record
3. Check if logo appears in PDF

---

## 🖼️ Logo Display in PDFs

### Current Implementation
The PDF header will show:
- Company name (large, bold)
- Company address and contact info
- Logo (if URL is provided)

### Logo Position
- **Location**: Top-right corner of PDF header
- **Size**: Automatically scaled to fit
- **Background**: Works best with transparent PNG

---

## 🚀 Quick Logo Upload Services

### 1. Cloudinary (Recommended)
```
1. Sign up at: https://cloudinary.com
2. Upload image
3. Copy URL from dashboard
4. Use in settings
```

**Pros**: Free tier, CDN, image optimization, reliable
**Cons**: Requires account

### 2. ImgBB
```
1. Go to: https://imgbb.com
2. Upload image (no account needed)
3. Copy direct link
4. Use in settings
```

**Pros**: No account needed, simple
**Cons**: May have limits, less reliable for business

### 3. AWS S3 (Professional)
```
1. Create S3 bucket
2. Upload image
3. Make public or use CloudFront
4. Use URL in settings
```

**Pros**: Professional, reliable, scalable
**Cons**: Paid service, requires AWS account

---

## 💡 Sample Company Details

For testing or as a template:

```json
{
  "company_name": "Sohagtea Trading Company",
  "address": "Tea Estate Road, Bagdogra Industrial Area",
  "city": "Siliguri",
  "state": "West Bengal",
  "pincode": "734421",
  "country": "India",
  "phone": "+91 98765 43210",
  "email": "info@sohagtea.com",
  "website": "www.sohagtea.com",
  "gstin": "19ABCDE1234F1Z5",
  "pan": "ABCDE1234F",
  "logo_url": "https://example.com/sohagtea-logo.png",
  "invoice_prefix": "INV",
  "invoice_terms": "Payment due within 30 days from invoice date. Please quote invoice number when making payment."
}
```

---

## 🔄 Updating PDF Generators

The PDF generators (`generateOrderBillPDF` and `generateInvoicePDF`) can be updated to fetch company details from the database instead of using hardcoded values.

### Current (Hardcoded):
```typescript
const companyDetails = {
  name: 'LeafTrack Tea Company',
  address: 'Tea Estate Road, Siliguri, West Bengal, India',
  phone: '+91 98765 43210',
  email: 'info@leaftrack.com',
  gstin: '19XXXXX1234X1ZX',
};
```

### Improved (From Database):
```typescript
// Fetch from settings API
const response = await fetch('/api/settings');
const data = await response.json();
const companyDetails = data.settings;
```

---

## 🎯 Logo Implementation Checklist

- [ ] Upload logo to hosting service
- [ ] Get direct image URL
- [ ] Add logo URL to settings
- [ ] Save settings
- [ ] Test PDF generation
- [ ] Verify logo appears correctly
- [ ] Check logo on mobile devices
- [ ] Test print quality

---

## 🛠️ Troubleshooting

### Logo Not Appearing in PDF
1. ✅ Check if URL is accessible (open in browser)
2. ✅ Ensure URL is direct image link (ends in .png, .jpg)
3. ✅ Verify settings are saved
4. ✅ Check if logo is too large (compress if needed)
5. ✅ Try a different hosting service

### Logo Quality Issues
1. ✅ Use higher resolution image (2x size)
2. ✅ Ensure transparent background (PNG)
3. ✅ Check image format (PNG preferred)
4. ✅ Optimize image size

### Settings Not Saving
1. ✅ Check browser console for errors
2. ✅ Verify all required fields are filled
3. ✅ Check database connection
4. ✅ Ensure admin permissions

---

## 📱 Mobile Considerations

When viewing PDFs on mobile:
- Logo should be clear at small sizes
- Use simple, clean design
- Avoid too much detail
- Test on actual mobile devices

---

## 🎨 Branding Best Practices

### Logo Design
1. **Simple**: Easy to recognize
2. **Scalable**: Works at any size
3. **Readable**: Clear even when small
4. **Professional**: Represents your brand
5. **Versatile**: Works in color and B&W

### Color Scheme
- Use your brand colors
- Ensure good contrast
- Test in grayscale
- Consider colorblind users

### Typography
- Use your brand fonts (if possible)
- Keep it consistent
- Ensure readability
- Professional appearance

---

## 🔐 Security Considerations

### Logo URLs
- Use HTTPS (not HTTP)
- Avoid hotlinking from other sites
- Use CDN for better performance
- Consider using signed URLs for S3

### Data Protection
- Don't expose sensitive URLs publicly
- Use environment variables for API keys
- Implement proper access controls
- Regular security audits

---

## 📊 Performance Tips

### Image Optimization
```
1. Compress images (use TinyPNG, ImageOptim)
2. Use appropriate dimensions
3. Choose right format (PNG for logos)
4. Enable CDN caching
```

### Loading Speed
- Cache company settings in application
- Use lazy loading for images
- Optimize API calls
- Implement proper caching strategies

---

## 🔮 Future Enhancements

### Planned Features
1. **Direct Upload**: Upload logo directly in settings page
2. **Image Editor**: Crop and resize within app
3. **Multiple Logos**: Different logos for different documents
4. **Watermarks**: Add watermarks to PDFs
5. **Custom Themes**: Multiple color schemes
6. **Template Library**: Pre-designed templates

---

## 📚 Related Files

```
Models:
- models/CompanySettings.ts

API Routes:
- app/api/settings/route.ts

Pages:
- app/admin/settings/page.tsx

PDF Generators:
- lib/pdfGenerator.ts

Documentation:
- COMPANY-LOGO-SETUP.md (this file)
- PREMIUM-PDF-SYSTEM.md
- PDF-DESIGN-OPTIMIZATION.md
```

---

## ✅ Quick Start Checklist

1. [ ] Access `/admin/settings`
2. [ ] Fill in company name and address
3. [ ] Add contact information
4. [ ] Enter GSTIN and PAN
5. [ ] Upload logo to hosting service
6. [ ] Add logo URL to settings
7. [ ] Save all changes
8. [ ] Test PDF download
9. [ ] Verify all details appear correctly
10. [ ] Share with team

---

## 💬 Support

If you need help:
1. Check troubleshooting section above
2. Verify settings are saved correctly
3. Test with different logo formats
4. Contact system administrator

---

**Status**: ✅ Ready to Use
**Version**: 1.0
**Last Updated**: January 2025

---

## 🎉 Quick Example

Want to test quickly? Use these sample URLs:

**Logo**: Use your actual company logo URL from Cloudinary
**Company**: "Sohagtea Trading Company"
**Address**: "Tea Estate Road, Siliguri, West Bengal 734421"
**Phone**: "+91 98765 43210"
**Email**: "info@sohagtea.com"
**GSTIN**: "19ABCDE1234F1Z5"

Then download any order bill or invoice to see your branding! 🎨
