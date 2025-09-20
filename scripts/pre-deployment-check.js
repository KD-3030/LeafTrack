#!/usr/bin/env node

/**
 * Pre-deployment checklist script
 * Runs comprehensive checks before production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Checklist results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
  console.log(`${colors.blue}Checking environment variables...${colors.reset}`);
  
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'NODE_ENV'
  ];
  
  const envFile = '.env.production';
  if (!fileExists(envFile)) {
    results.failed.push('Missing .env.production file');
    return;
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  const missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (!envContent.includes(`${varName}=`)) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    results.failed.push(`Missing environment variables: ${missingVars.join(', ')}`);
  } else {
    results.passed.push('All required environment variables present');
  }
  
  // Check for secure values
  if (envContent.includes('admin123') || envContent.includes('password123')) {
    results.failed.push('Default passwords found in environment file');
  }
  
  if (envContent.includes('mongodb://') && !envContent.includes('ssl=true')) {
    results.warnings.push('MongoDB connection should use SSL in production');
  }
}

/**
 * Check for security issues
 */
function checkSecurity() {
  console.log(`${colors.blue}Checking security issues...${colors.reset}`);
  
  // Check for console.log statements
  const jsFiles = findFiles(['app', 'components', 'lib'], ['.ts', '.tsx', '.js', '.jsx']);
  let consoleLogCount = 0;
  let hardcodedSecrets = [];
  
  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Count console.log occurrences
    const matches = content.match(/console\.(log|debug|info)/g);
    if (matches) {
      consoleLogCount += matches.length;
    }
    
    // Check for hardcoded secrets
    if (content.includes('mongodb+srv://') && !file.includes('.example')) {
      hardcodedSecrets.push(file);
    }
    
    // Check for exposed API keys
    const apiKeyPatterns = [
      /sk_live_[a-zA-Z0-9]+/,
      /AIza[a-zA-Z0-9_-]+/,
      /ghp_[a-zA-Z0-9]+/
    ];
    
    apiKeyPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        hardcodedSecrets.push(file);
      }
    });
  });
  
  if (consoleLogCount > 0) {
    results.warnings.push(`Found ${consoleLogCount} console.log statements`);
  } else {
    results.passed.push('No console.log statements found');
  }
  
  if (hardcodedSecrets.length > 0) {
    results.failed.push(`Hardcoded secrets found in: ${hardcodedSecrets.join(', ')}`);
  } else {
    results.passed.push('No hardcoded secrets detected');
  }
}

/**
 * Check TypeScript compilation
 */
function checkTypeScript() {
  console.log(`${colors.blue}Checking TypeScript compilation...${colors.reset}`);
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    results.passed.push('TypeScript compilation successful');
  } catch (error) {
    results.failed.push('TypeScript compilation errors found');
  }
}

/**
 * Check ESLint
 */
function checkESLint() {
  console.log(`${colors.blue}Running ESLint...${colors.reset}`);
  
  try {
    execSync('npx next lint', { stdio: 'pipe' });
    results.passed.push('ESLint checks passed');
  } catch (error) {
    results.warnings.push('ESLint warnings or errors found');
  }
}

/**
 * Check dependencies
 */
function checkDependencies() {
  console.log(`${colors.blue}Checking dependencies...${colors.reset}`);
  
  // Check for security vulnerabilities
  try {
    const auditResult = execSync('npm audit --json', { stdio: 'pipe' }).toString();
    const audit = JSON.parse(auditResult);
    
    if (audit.metadata.vulnerabilities.high > 0 || audit.metadata.vulnerabilities.critical > 0) {
      results.failed.push(`Found ${audit.metadata.vulnerabilities.high} high and ${audit.metadata.vulnerabilities.critical} critical vulnerabilities`);
    } else if (audit.metadata.vulnerabilities.moderate > 0) {
      results.warnings.push(`Found ${audit.metadata.vulnerabilities.moderate} moderate vulnerabilities`);
    } else {
      results.passed.push('No security vulnerabilities found');
    }
  } catch (error) {
    results.warnings.push('Could not run npm audit');
  }
  
  // Check package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.engines) {
    results.warnings.push('No Node.js version specified in package.json');
  }
  
  // Check for dev dependencies in production
  const devDeps = Object.keys(packageJson.devDependencies || {});
  const prodDeps = Object.keys(packageJson.dependencies || {});
  
  const misplacedDeps = devDeps.filter(dep => 
    prodDeps.some(prodDep => prodDep === dep)
  );
  
  if (misplacedDeps.length > 0) {
    results.warnings.push(`Dependencies in both dev and prod: ${misplacedDeps.join(', ')}`);
  }
}

/**
 * Check build
 */
function checkBuild() {
  console.log(`${colors.blue}Checking Next.js build...${colors.reset}`);
  
  const buildDir = '.next';
  if (!fileExists(buildDir)) {
    results.warnings.push('No build found. Run "npm run build" before deployment');
    return;
  }
  
  // Check build time
  const stats = fs.statSync(path.join(process.cwd(), buildDir));
  const hoursSinceBuild = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceBuild > 24) {
    results.warnings.push('Build is more than 24 hours old');
  } else {
    results.passed.push('Build is recent');
  }
}

/**
 * Check database indexes
 */
function checkDatabase() {
  console.log(`${colors.blue}Checking database configuration...${colors.reset}`);
  
  // Check for database optimization script
  if (!fileExists('lib/db-optimization.ts')) {
    results.warnings.push('Database optimization utilities not found');
  } else {
    results.passed.push('Database optimization utilities present');
  }
  
  // Check for backup strategy
  if (!fileExists('scripts/backup-database.js')) {
    results.warnings.push('No database backup script found');
  }
}

/**
 * Check monitoring
 */
function checkMonitoring() {
  console.log(`${colors.blue}Checking monitoring setup...${colors.reset}`);
  
  // Check for error tracking
  const hasErrorTracking = fileExists('sentry.client.config.ts') || 
                          fileExists('sentry.server.config.ts');
  
  if (!hasErrorTracking) {
    results.warnings.push('No error tracking configured (Sentry recommended)');
  } else {
    results.passed.push('Error tracking configured');
  }
  
  // Check for logging
  if (!fileExists('lib/logger.ts')) {
    results.warnings.push('No logging utility found');
  } else {
    results.passed.push('Logging utility present');
  }
}

/**
 * Find files recursively
 */
function findFiles(dirs, extensions) {
  const files = [];
  
  function traverse(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    });
  }
  
  dirs.forEach(dir => traverse(dir));
  return files;
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.magenta}PRODUCTION DEPLOYMENT CHECKLIST REPORT${colors.reset}`);
  console.log('='.repeat(60) + '\n');
  
  // Display results
  if (results.passed.length > 0) {
    console.log(`${colors.green}✅ PASSED (${results.passed.length})${colors.reset}`);
    results.passed.forEach(item => {
      console.log(`   ✓ ${item}`);
    });
    console.log();
  }
  
  if (results.warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  WARNINGS (${results.warnings.length})${colors.reset}`);
    results.warnings.forEach(item => {
      console.log(`   ⚠ ${item}`);
    });
    console.log();
  }
  
  if (results.failed.length > 0) {
    console.log(`${colors.red}❌ FAILED (${results.failed.length})${colors.reset}`);
    results.failed.forEach(item => {
      console.log(`   ✗ ${item}`);
    });
    console.log();
  }
  
  // Overall status
  console.log('='.repeat(60));
  if (results.failed.length === 0) {
    console.log(`${colors.green}✅ READY FOR DEPLOYMENT${colors.reset}`);
    console.log('All critical checks passed. Review warnings before proceeding.');
  } else {
    console.log(`${colors.red}❌ NOT READY FOR DEPLOYMENT${colors.reset}`);
    console.log('Fix all failed checks before deploying to production.');
  }
  console.log('='.repeat(60) + '\n');
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.magenta}Running Pre-Deployment Checks...${colors.reset}\n`);
  
  checkEnvironmentVariables();
  checkSecurity();
  checkTypeScript();
  checkESLint();
  checkDependencies();
  checkBuild();
  checkDatabase();
  checkMonitoring();
  
  generateReport();
}

// Run checks
main();
