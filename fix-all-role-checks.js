// Script to fix all role checks in API routes
const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/api/products/[id]/route.ts',
  'app/api/assignments/route.ts',
  'app/api/assignments/[id]/route.ts',
  'app/api/customers/[id]/route.ts',
  'app/api/invoices/[id]/route.ts',
  'app/api/invoices/route.ts',
  'app/api/settings/company/route.ts',
  'app/api/sale-returns/route.ts',
  'app/api/payments/[id]/route.ts',
  'app/api/reports/business/route.ts',
  'app/api/reports/gst/route.ts',
  'app/api/sales/route.ts',
  'app/api/users/[id]/route.ts',
  'app/api/test-users/route.ts',
  'app/api/test-locations/route.ts',
];

const replacements = [
  // Role comparisons
  { from: /decoded\.role !== 'Admin'/g, to: "decoded.role?.toLowerCase() !== 'admin'" },
  { from: /decoded\.role === 'Admin'/g, to: "decoded.role?.toLowerCase() === 'admin'" },
  { from: /decoded\.role !== 'Salesman'/g, to: "decoded.role?.toLowerCase() !== 'salesman'" },
  { from: /decoded\.role === 'Salesman'/g, to: "decoded.role?.toLowerCase() === 'salesman'" },
  { from: /adminUser\.role !== 'Admin'/g, to: "adminUser.role?.toLowerCase() !== 'admin'" },
  { from: /user\.role !== 'Admin'/g, to: "user.role?.toLowerCase() !== 'admin'" },
  // Role find queries
  { from: /\{ role: 'Admin' \}/g, to: "{ role: 'admin' }" },
  { from: /\{ role: 'Salesman' \}/g, to: "{ role: 'salesman' }" },
  { from: /role: 'Admin'/g, to: "role: 'admin'" },
  { from: /role: 'Salesman'/g, to: "role: 'salesman'" },
];

let totalReplacements = 0;
let filesModified = 0;

filesToFix.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${relPath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fileReplacements = 0;
  
  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      fileReplacements += matches.length;
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${relPath} (${fileReplacements} replacements)`);
    totalReplacements += fileReplacements;
    filesModified++;
  } else {
    console.log(`ℹ️  No changes needed: ${relPath}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log(`\n✅ All role checks have been updated to lowercase!`);
