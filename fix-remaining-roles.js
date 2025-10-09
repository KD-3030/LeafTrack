// Comprehensive script to fix ALL remaining role mismatches
const fs = require('fs');
const path = require('path');

const filesToFix = [
  // Frontend components
  'lib/authMiddleware.ts',
  'app/admin/salesmen/page.tsx',
  'app/admin/dashboard/page.tsx',
  'app/admin/locations/page.tsx',
  'components/admin/SalesmanLocationMap.tsx',
  'components/SalesmanLocationMap.tsx',
  'hooks/useLocationTracking.ts',
  'lib/leafletIcons.ts',
  // API routes
  'app/api/locations/route.ts',
  'app/api/clear-locations/route.ts',
];

const replacements = [
  // Frontend role checks (user.role comparisons)
  { from: /user\.role === ['"]Salesman['"]/g, to: "user.role?.toLowerCase() === 'salesman'" },
  { from: /user\.role !== ['"]Salesman['"]/g, to: "user.role?.toLowerCase() !== 'salesman'" },
  { from: /user\.role === ['"]Admin['"]/g, to: "user.role?.toLowerCase() === 'admin'" },
  { from: /user\.role !== ['"]Admin['"]/g, to: "user.role?.toLowerCase() !== 'admin'" },
  
  // authResult role checks
  { from: /authResult\.role === ['"]Salesman['"]/g, to: "authResult.role?.toLowerCase() === 'salesman'" },
  { from: /authResult\.role !== ['"]Salesman['"]/g, to: "authResult.role?.toLowerCase() !== 'salesman'" },
  
  // role variable checks
  { from: /role === ['"]Admin['"]/g, to: "role?.toLowerCase() === 'admin'" },
  { from: /role === ['"]Salesman['"]/g, to: "role?.toLowerCase() === 'salesman'" },
  
  // API decoded.role checks (already lowercase, keep as is or make consistent)
  // These are already correct from previous fixes
];

let totalReplacements = 0;
let filesModified = 0;

console.log('=== FIXING ALL REMAINING ROLE MISMATCHES ===\n');

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
console.log(`\n✅ All remaining role checks have been updated!`);
