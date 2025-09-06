# SohagTea Logo Instructions

## Current Status ✅
- Text-based logo is now working and displays properly
- Beautiful green gradient design with tea leaf emoji
- Consistent SohagTea branding throughout the app

## To Add Your Actual Logo Image (Optional)

If you want to replace the text logo with your actual SohagTea logo image:

1. **Save your logo file as:** `logo.png` in the `public` folder
2. **Update the homepage code** in `app/page.tsx`:

Replace this section:
```tsx
{/* Text-based SohagTea Logo */}
<div className="flex flex-col items-center justify-center text-center bg-gradient-to-r from-green-600 to-green-800 text-white rounded-lg p-6 shadow-lg w-[200px] h-[120px]">
  <div className="flex items-center space-x-2 mb-2">
    <span className="text-3xl">🍃</span>
    <span className="text-2xl font-bold">Sohag</span>
    <span className="text-2xl font-light text-green-200">Tea</span>
  </div>
  <div className="text-sm font-medium text-green-100 tracking-wider">
    MANAGE
  </div>
</div>
```

With this:
```tsx
<Image
  src="/logo.png"
  alt="SohagTea Manage Logo"
  width={200}
  height={120}
  className="object-contain"
  priority
/>
```

3. **Add the Image import** at the top:
```tsx
import Image from 'next/image';
```

## Logo Specifications
- **Size**: 400x240 pixels (displays at 200x120)
- **Format**: PNG with transparent background preferred
- **File location**: `public/logo.png`

The current text-based logo looks professional and matches your branding perfectly!
