# 🎯 Quick Reference - Company Name Change

## ✅ What Was Done

Changed company name from **"LeafTrack Tea Company"** to **"Sohagtea Trading Company"**

---

## 📋 Summary

### Database Updated ✅
```
Company Name: Sohagtea Trading Company
Address: Tea Estate Road, Bagdogra
City: Siliguri
State: West Bengal
Phone: +91 98765 43210
Email: info@sohagtea.com
```

### Files Updated ✅
1. **lib/pdfGenerator.ts** - Updated fallback company name (2 places)
2. **app/api/settings/company/route.ts** - Updated default settings
3. **MongoDB Database** - Company settings collection updated

---

## 🧪 Test Now

1. Go to `/admin/orders`
2. Click download on any order
3. Open PDF
4. ✅ Should show "Sohagtea Trading Company"

---

## 📱 Where Company Name Appears

- ✅ Order Bill PDFs (header)
- ✅ Invoice PDFs (header)
- ✅ Admin Settings page
- ✅ All future documents

---

## 🔄 To Change Again

1. Go to `/admin/settings`
2. Edit "Company Name" field
3. Click Save
4. Done! All PDFs updated instantly

---

**Status**: ✅ Complete
**Date**: October 11, 2025
