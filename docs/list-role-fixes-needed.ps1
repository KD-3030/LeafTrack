# Script to fix all hardcoded role checks in API routes
# This will list all files that need manual review for role checks

Write-Host "=== FILES WITH HARDCODED ROLE CHECKS ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "The following files have hardcoded 'Admin' or 'Salesman' checks:" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "app/api/products/[id]/route.ts",
    "app/api/assignments/route.ts",
    "app/api/assignments/[id]/route.ts",
    "app/api/customers/[id]/route.ts",
    "app/api/invoices/[id]/route.ts",
    "app/api/invoices/route.ts",
    "app/api/settings/company/route.ts",
    "app/api/sale-returns/route.ts",
    "app/api/payments/[id]/route.ts",
    "app/api/reports/business/route.ts",
    "app/api/reports/gst/route.ts",
    "app/api/sales/route.ts",
    "app/api/users/[id]/route.ts",
    "app/api/test-users/route.ts",
    "app/api/test-locations/route.ts"
)

foreach ($file in $files) {
    Write-Host "  - $file" -ForegroundColor White
}

Write-Host ""
Write-Host "=== WHAT NEEDS TO BE FIXED ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Change all instances of:" -ForegroundColor Cyan
Write-Host "  decoded.role !== 'Admin'          →  decoded.role?.toLowerCase() !== 'admin'" -ForegroundColor Green
Write-Host "  decoded.role === 'Admin'          →  decoded.role?.toLowerCase() === 'admin'" -ForegroundColor Green
Write-Host "  decoded.role !== 'Salesman'       →  decoded.role?.toLowerCase() !== 'salesman'" -ForegroundColor Green
Write-Host "  decoded.role === 'Salesman'       →  decoded.role?.toLowerCase() === 'salesman'" -ForegroundColor Green
Write-Host "  role: 'Admin'                     →  role: 'admin'" -ForegroundColor Green
Write-Host "  role: 'Salesman'                  →  role: 'salesman'" -ForegroundColor Green
Write-Host "  { role: 'Salesman' }              →  { role: 'salesman' }" -ForegroundColor Green
Write-Host ""
Write-Host "✅ ALREADY FIXED:" -ForegroundColor Green
Write-Host "  - lib/authMiddleware.ts (case-insensitive permission checking)" -ForegroundColor White
Write-Host "  - app/api/auth/login/route.ts (case-insensitive role matching)" -ForegroundColor White
Write-Host "  - app/api/auth/signup/route.ts (stores role in lowercase)" -ForegroundColor White
Write-Host "  - components/ProtectedRoute.tsx (case-insensitive role checking)" -ForegroundColor White
Write-Host "  - contexts/AuthContext.tsx (uses user.role from API)" -ForegroundColor White
Write-Host "  - app/api/orders/route.ts (case-insensitive role check)" -ForegroundColor White
Write-Host ""
