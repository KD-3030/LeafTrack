# LeafTrack Authentication & Order System Fixes

## Issues Fixed

### 1. **Role Case-Sensitivity Issue** ✅
- **Problem**: Database had `"Admin"` and `"Salesman"` with capital letters, but code expected lowercase
- **Solution**: 
  - Normalized all database roles to lowercase: `"admin"`, `"salesman"`
  - Made all role checks case-insensitive across the application

### 2. **Login 401 Error** ✅
- **Problem**: Login was failing because role matching was case-sensitive
- **Solution**: Updated login API to convert role to lowercase before database query

### 3. **Redirect Loop After Login** ✅
- **Problem**: After login, salesman was being redirected back to login page
- **Solution**: 
  - Updated `ProtectedRoute` to do case-insensitive role checking
  - Updated `AuthContext` to use actual user role from API response
  - Updated layout files to use lowercase role names

### 4. **403 Error Creating Orders** ✅
- **Problem**: Order creation was failing with "Only salesmen can create orders"
- **Solution**: Updated order API to do case-insensitive role checking

### 5. **Field Name Mismatches** ✅
- **Problem**: Frontend was using wrong database field names
- **Solution**: 
  - Customer: Changed `customer_name` → `name`, `contact_number` → `phone`
  - Product: Changed `product_name` → `name`, added `manufacturingCost` calculation

### 6. **JWT Token Missing Name** ✅
- **Problem**: Token didn't include user name needed for orders
- **Solution**: Updated `generateToken` and both auth routes to include name

## Files Modified

### Authentication & Authorization
- ✅ `lib/auth.ts` - Added name to JWT token
- ✅ `app/api/auth/login/route.ts` - Case-insensitive role check, include name in token
- ✅ `app/api/auth/signup/route.ts` - Store role in lowercase, include name in token
- ✅ `contexts/AuthContext.tsx` - Use user.role from API response for redirect
- ✅ `components/ProtectedRoute.tsx` - Case-insensitive role checking
- ✅ `app/admin/layout.tsx` - Updated to use lowercase 'admin'
- ✅ `app/salesman/layout.tsx` - Updated to use lowercase 'salesman'

### Order System
- ✅ `app/api/orders/route.ts` - Case-insensitive role check for order creation
- ✅ `app/salesman/orders/new/page.tsx` - Fixed field name mappings and price calculation

### Database
- ✅ All user roles normalized to lowercase in database

## How to Test

### Step 1: Clear Browser Storage
```javascript
// In browser console (F12)
localStorage.clear()
```

### Step 2: Test Login

#### Salesman Accounts:
- **Email**: john.smith@leaftrack.com (or test.salesman@leaftrack.com)
- **Role**: Select "Salesman"
- **Expected**: Redirect to `/salesman/dashboard`

#### Admin Accounts:
- **Email**: kinjaldutta005@gmail.com (or admin@leaftrack.com)
- **Role**: Select "Admin"
- **Expected**: Redirect to `/admin/dashboard`

### Step 3: Test Order Creation (Salesman)
1. Navigate to Orders → New Order
2. Select a customer from dropdown (should show: Name - Phone)
3. Select a product from dropdown (should show: Name - ₹Price (Stock: X))
4. Enter quantity and submit
5. **Expected**: Order created successfully, no 403 error

### Step 4: Verify Token (Optional)
```javascript
// In browser console
const token = localStorage.getItem('leaftrack_token');
console.log(JSON.parse(atob(token.split('.')[1])));
// Should show: { userId, role: 'salesman', name: 'Your Name', iat, exp }
```

## Available Accounts

### Salesman Accounts:
1. John Smith - john.smith@leaftrack.com
2. Subrata Bagui - sarah.johnson@leaftrack.com
3. Apurbo Roy - mike.wilson@leaftrack.com
4. Raju Podder - test.salesman@leaftrack.com
5. Raju Podder - rajupodder@gmail.com

### Admin Accounts:
1. Kinjal - kinjaldutta005@gmail.com
2. Administrator - admin@leaftrack.com
3. Deb Dutta - sohagteacompany@gmail.com

## Troubleshooting

### Still getting 401 on login?
- Check password is correct
- Make sure you selected the right role from dropdown
- Run: `node test-login-credentials.js <email> <password>` to verify

### Still getting redirected to login after successful login?
- Clear localStorage and cookies
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors

### Still getting 403 on order creation?
- Log out and log back in to get new token with name field
- Check token has correct role: `localStorage.getItem('leaftrack_token')`

## Next Steps

✅ All authentication issues resolved
✅ All order creation issues resolved
✅ All database field mismatches resolved

You can now:
1. Log in as salesman and create orders
2. Log in as admin and approve/reject orders
3. View order statistics and reports
4. Manage customers, products, and payments

The system is now fully functional! 🎉
