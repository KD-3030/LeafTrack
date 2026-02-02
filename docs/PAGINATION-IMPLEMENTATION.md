# Pagination Implementation Guide

## ✅ Completed Pages

### 1. **Invoices** (`app/admin/invoicing/page.tsx`)
- ✅ API already supports pagination
- ✅ Frontend pagination added
- ✅ Shows all invoice entries from database
- Default: 10 items per page

### 2. **Products** (`app/admin/products/page.tsx`)
- ✅ API pagination added (`app/api/products/route.ts`)
- ✅ Frontend pagination added
- ✅ Shows all product entries from database
- Default: 10 items per page

## 📋 Remaining Pages to Implement

### High Priority

#### 3. **Financial Dashboard - Payments Tab** (`app/admin/financial/page.tsx`)
- API: `/api/payments/route.ts` - ✅ Already supports pagination
- Frontend: ❌ Needs pagination controls
- Steps:
  1. Add pagination state (currentPage, totalPages, totalCount, itemsPerPage)
  2. Update payments fetch to include `?page=${page}&limit=${limit}`
  3. Add `<PaginationControls />` component after payments table
  4. Import: `import { PaginationControls } from '@/components/ui/pagination-controls';`

#### 4. **Purchases** (`app/admin/purchases/page.tsx`)
- API: Needs checking and potential pagination support
- Frontend: ❌ Needs pagination controls

#### 5. **Customers** (`app/admin/customers/page.tsx`)
- API: Needs checking and potential pagination support
- Frontend: ❌ Needs pagination controls

#### 6. **Salesmen** (`app/admin/salesmen/page.tsx`)
- API: Needs checking and potential pagination support
- Frontend: ❌ Needs pagination controls

### Medium Priority

#### 7. **Orders** (`app/admin/orders/page.tsx`)
- API: Needs checking and potential pagination support
- Frontend: ❌ Needs pagination controls

#### 8. **Sale Returns** (in Invoicing page)
- API: Needs checking
- Frontend: ❌ Needs pagination controls

#### 9. **BOMs** (`app/admin/boms/page.tsx`)
- API: Needs checking and potential pagination support
- Frontend: ❌ Needs pagination controls

#### 10. **Raw Materials** (`app/admin/raw-materials/page.tsx`)
- API: Needs checking and potential pagination support
- Frontend: ❌ Needs pagination controls

### Lower Priority

#### 11. **Purchase Returns** (`app/admin/purchase-returns/page.tsx`)
- API: Needs checking
- Frontend: ❌ Needs pagination controls

#### 12. **Reports** (`app/admin/reports/page.tsx`)
- May not need pagination depending on report type

---

## 🔧 Implementation Pattern

### Step 1: Update API (if needed)

```typescript
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    // Build filter
    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        // Add other searchable fields
      ];
    }
    
    // Get total count
    const total = await Model.countDocuments(filter);
    
    // Get paginated data
    const items = await Model.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    return NextResponse.json({
      success: true,
      items, // or products, payments, etc.
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 2: Update Frontend Component

```typescript
// 1. Add pagination state
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [totalCount, setTotalCount] = useState(0);
const [itemsPerPage, setItemsPerPage] = useState(10);

// 2. Update useEffect dependencies
useEffect(() => {
  loadData();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentPage, itemsPerPage]);

// 3. Update loadData function
const loadData = async () => {
  try {
    setIsLoading(true);
    const response = await fetch(`/api/endpoint?page=${currentPage}&limit=${itemsPerPage}`);
    const data = await response.json();
    
    if (data.success) {
      setItems(data.items);
      if (data.pagination) {
        setCurrentPage(data.pagination.currentPage);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setIsLoading(false);
  }
};

// 4. Import PaginationControls
import { PaginationControls } from '@/components/ui/pagination-controls';

// 5. Add after table (before closing </CardContent>)
{!isLoading && items.length > 0 && (
  <PaginationControls
    currentPage={currentPage}
    totalPages={totalPages}
    totalCount={totalCount}
    itemsPerPage={itemsPerPage}
    onPageChange={setCurrentPage}
    onItemsPerPageChange={setItemsPerPage}
    itemName="items" // Change to "products", "payments", etc.
  />
)}
```

---

## 🎨 Reusable Component

Created: `components/ui/pagination-controls.tsx`

**Props:**
- `currentPage`: number
- `totalPages`: number
- `totalCount`: number
- `itemsPerPage`: number
- `onPageChange`: (page: number) => void
- `onItemsPerPageChange`: (itemsPerPage: number) => void
- `itemName`: string (optional, defaults to "items")

**Features:**
- ✅ Shows current range (e.g., "Showing 1 to 10 of 50 products")
- ✅ Dropdown to select items per page (5, 10, 20, 50, 100)
- ✅ First, Previous, Next, Last buttons
- ✅ Page indicator (e.g., "Page 1 of 5")
- ✅ Disabled states at boundaries
- ✅ Responsive design

---

## 📊 Benefits

1. **Performance**: Load only necessary data per page
2. **User Experience**: Easy navigation through large datasets
3. **Database Efficiency**: Reduces query load
4. **Scalability**: Handles growing data without frontend slowdown
5. **Consistency**: Same pagination UI across all pages

---

## 🚀 Next Steps

1. **Financial Page**: Add pagination to payments tab
2. **Purchases Page**: Check API and add pagination
3. **Customers Page**: Check API and add pagination
4. **Salesmen Page**: Check API and add pagination
5. **Continue** with remaining pages from the list above

---

## 📝 Testing Checklist

For each paginated page, verify:
- [ ] API returns pagination metadata
- [ ] First page loads correctly
- [ ] Next/Previous buttons work
- [ ] Last page navigation works
- [ ] Items per page dropdown works
- [ ] Page resets to 1 when changing items per page
- [ ] Search/filters work with pagination
- [ ] Total count is accurate
- [ ] No duplicate items across pages
- [ ] Loading states work correctly

---

## 💡 API Endpoints Status

| Endpoint | Pagination Support | Status |
|----------|-------------------|--------|
| `/api/invoices` | ✅ Yes | Complete |
| `/api/products` | ✅ Yes | Complete |
| `/api/payments` | ✅ Yes | Frontend needed |
| `/api/purchases` | ❓ Unknown | Need to check |
| `/api/customers` | ❓ Unknown | Need to check |
| `/api/users` | ❓ Unknown | Need to check |
| `/api/sales` | ❓ Unknown | Need to check |
| `/api/boms` | ❓ Unknown | Need to check |

