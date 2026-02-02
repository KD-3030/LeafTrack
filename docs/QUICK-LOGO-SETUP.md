# Company Name & Logo - Quick Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Access Settings
1. Login as Admin
2. Go to: **`/admin/settings`**

### Step 2: Fill Company Details
```
Company Name: Your Company Name
Address: Your Complete Address  
City: Your City
State: Your State
Pincode: 123456
Phone: +91 XXXXXXXXXX
Email: your@email.com
GSTIN: YOUR_GSTIN_NUMBER
PAN: YOUR_PAN_NUMBER
```

### Step 3: Add Logo (Choose One Method)

#### Method A: Use Cloudinary (Recommended)
1. Go to https://cloudinary.com (free sign up)
2. Upload your logo
3. Copy the URL (looks like: `https://res.cloudinary.com/...`)
4. Paste in "Logo URL" field

#### Method B: Use ImgBB (No Account Needed)
1. Go to https://imgbb.com
2. Upload logo
3. Copy "Direct link"
4. Paste in "Logo URL" field

#### Method C: Local Development
1. Put logo in: `public/images/logo.png`
2. Use URL: `/images/logo.png`

### Step 4: Save
Click the "Save Settings" button

### Step 5: Test
1. Go to Orders or Invoices
2. Click download button
3. Your logo should appear in the PDF! 🎉

---

## 📸 Logo Requirements

**Size**: 200-400px wide
**Format**: PNG (with transparent background)
**File Size**: Under 500KB
**Aspect Ratio**: 3:1 or 4:1 (wide logo)

---

## 🎨 Current Setup

### Your Company Details
The settings page has sections for:
- ✅ Company Information (name, address, contact)
- ✅ Tax Information (GSTIN, PAN)
- ✅ Banking Information (account details)
- ✅ **Branding & Logo** (logo and signature URLs) ← NEW!
- ✅ Invoice Settings (prefix, terms)

### Logo Fields Added
1. **Logo URL**: Main company logo for PDFs
2. **Signature URL**: Authorized signature (optional)
3. **Logo Preview**: Shows your logo in real-time

---

## 📋 Where Logo Appears

Your logo will automatically appear on:
- ✅ Order Bills (when downloaded as PDF)
- ✅ Invoices (when downloaded as PDF)
- ✅ Future: Other reports and documents

**Position**: Top-right corner of PDF header
**Style**: Professional, scaled to fit

---

## 🔍 Example Company Details

For Sohagtea Trading Company:

```json
{
  "company_name": "Sohagtea Trading Company",
  "address": "Tea Estate Road, Bagdogra",
  "city": "Siliguri",
  "state": "West Bengal",
  "pincode": "734421",
  "phone": "+91 98765 43210",
  "email": "info@sohagtea.com",
  "gstin": "19ABCDE1234F1Z5",
  "pan": "ABCDE1234F",
  "logo_url": "https://your-logo-url.com/logo.png"
}
```

---

## ✅ Quick Checklist

- [ ] Access `/admin/settings`
- [ ] Fill company name
- [ ] Add address and contact
- [ ] Enter GSTIN and PAN
- [ ] Upload logo to hosting service
- [ ] Paste logo URL
- [ ] Click Save
- [ ] Test PDF download
- [ ] ✅ Done!

---

## 🆘 Troubleshooting

**Logo not showing?**
- ✅ Check URL is accessible (open in browser)
- ✅ Ensure it's a direct image link (.png, .jpg)
- ✅ Verify settings are saved
- ✅ Try a different hosting service

**Image broken in preview?**
- ✅ URL must start with `https://`
- ✅ Must be a direct link to image file
- ✅ Check if image is publicly accessible

---

## 📱 Logo Upload Services

### Best Options:
1. **Cloudinary** ⭐ (Recommended)
   - Free tier available
   - Reliable CDN
   - https://cloudinary.com

2. **ImgBB** 
   - No account needed
   - Simple upload
   - https://imgbb.com

3. **Imgur**
   - Popular service
   - Easy to use
   - https://imgur.com

---

## 💡 Pro Tips

1. **Use PNG format** with transparent background
2. **Keep logo simple** - it will be small in PDF
3. **Test in grayscale** - check readability
4. **Optimize file size** - under 500KB
5. **Use high resolution** - 2x for sharp display

---

## 📚 Full Documentation

For complete details, see:
- `COMPANY-LOGO-SETUP.md` - Full setup guide
- `PREMIUM-PDF-SYSTEM.md` - PDF system documentation
- `/admin/settings` - Settings page

---

## 🎯 Next Steps

After setup:
1. Download an order bill to see your logo
2. Download an invoice to verify branding
3. Share with your team
4. Update logo anytime from settings

---

**Status**: ✅ Ready to Use
**Location**: `/admin/settings`
**Support**: See COMPANY-LOGO-SETUP.md for detailed help

---

## 🎉 That's It!

Your company branding is now set up and will appear on all PDF documents!

Questions? Check the full documentation in `COMPANY-LOGO-SETUP.md`
