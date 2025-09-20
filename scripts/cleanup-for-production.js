#!/usr/bin/env node

/**
 * Production cleanup script
 * Removes console.log statements, adds missing error handling, and prepares code for production
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  directories: ['app', 'components', 'lib', 'models'],
  excludePatterns: [
    'node_modules',
    '.next',
    '.git',
    'scripts',
    'test-',
    'debug-',
    '.test.',
    '.spec.'
  ]
};

// Statistics
const stats = {
  filesProcessed: 0,
  consoleLogsRemoved: 0,
  debugCodeRemoved: 0,
  todosFound: 0,
  issues: []
};

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  // Check if it's excluded
  for (const pattern of config.excludePatterns) {
    if (filePath.includes(pattern)) {
      return false;
    }
  }
  
  // Check extension
  const ext = path.extname(filePath);
  return config.extensions.includes(ext);
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove console.log statements (but keep console.error for production logging)
    const consoleLogPattern = /console\.(log|debug|info|warn)\([^)]*\);?/g;
    const consoleMatches = content.match(consoleLogPattern);
    if (consoleMatches) {
      stats.consoleLogsRemoved += consoleMatches.length;
      content = content.replace(consoleLogPattern, '// [REMOVED_FOR_PRODUCTION]');
    }
    
    // Remove debug code blocks
    const debugPattern = /\/\/ DEBUG START[\s\S]*?\/\/ DEBUG END/g;
    const debugMatches = content.match(debugPattern);
    if (debugMatches) {
      stats.debugCodeRemoved += debugMatches.length;
      content = content.replace(debugPattern, '');
    }
    
    // Find TODOs and FIXMEs
    const todoPattern = /\/\/\s*(TODO|FIXME|HACK|XXX|NOTE):\s*.+/g;
    const todoMatches = content.match(todoPattern);
    if (todoMatches) {
      stats.todosFound += todoMatches.length;
      todoMatches.forEach(match => {
        stats.issues.push({
          file: filePath,
          issue: match.trim()
        });
      });
    }
    
    // Add error boundaries where missing (React components)
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      // Check if it's a page component without error handling
      if (content.includes('export default function') && !content.includes('try') && !content.includes('catch')) {
        // Flag for manual review
        stats.issues.push({
          file: filePath,
          issue: 'Component lacks error handling - manual review needed'
        });
      }
    }
    
    // Check for hardcoded sensitive data
    const sensitivePatterns = [
      /mongodb\+srv:\/\/[^'"\s]+/gi,  // MongoDB URLs
      /sk_live_[a-zA-Z0-9]+/g,         // Stripe keys
      /AIza[a-zA-Z0-9_-]+/g,           // Google API keys
      /[a-f0-9]{64}/g,                 // Potential secrets (64 char hex)
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        stats.issues.push({
          file: filePath,
          issue: 'CRITICAL: Potential hardcoded sensitive data detected'
        });
      }
    }
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesProcessed++;
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

/**
 * Process directory recursively
 */
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!config.excludePatterns.some(pattern => item.includes(pattern))) {
        processDirectory(fullPath);
      }
    } else if (stat.isFile()) {
      if (shouldProcessFile(fullPath)) {
        processFile(fullPath);
      }
    }
  }
}

/**
 * Generate production readiness report
 */
function generateReport() {
  const reportPath = path.join(process.cwd(), 'PRODUCTION_CLEANUP_REPORT.md');
  
  let report = `# Production Cleanup Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += `## Statistics\n\n`;
  report += `- Files Processed: ${stats.filesProcessed}\n`;
  report += `- Console.log Statements Removed: ${stats.consoleLogsRemoved}\n`;
  report += `- Debug Code Blocks Removed: ${stats.debugCodeRemoved}\n`;
  report += `- TODOs/FIXMEs Found: ${stats.todosFound}\n\n`;
  
  if (stats.issues.length > 0) {
    report += `## Issues Requiring Attention\n\n`;
    
    // Group issues by severity
    const critical = stats.issues.filter(i => i.issue.includes('CRITICAL'));
    const warnings = stats.issues.filter(i => !i.issue.includes('CRITICAL'));
    
    if (critical.length > 0) {
      report += `### 🔴 Critical Issues\n\n`;
      critical.forEach(issue => {
        report += `- **${path.relative(process.cwd(), issue.file)}**\n  ${issue.issue}\n\n`;
      });
    }
    
    if (warnings.length > 0) {
      report += `### ⚠️ Warnings\n\n`;
      warnings.forEach(issue => {
        report += `- **${path.relative(process.cwd(), issue.file)}**\n  ${issue.issue}\n\n`;
      });
    }
  }
  
  report += `## Next Steps\n\n`;
  report += `1. Review and fix all critical issues\n`;
  report += `2. Address TODO/FIXME comments\n`;
  report += `3. Add error boundaries to React components\n`;
  report += `4. Run comprehensive testing\n`;
  report += `5. Update environment variables for production\n`;
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n📄 Report generated: ${reportPath}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🧹 Starting production cleanup...\n');
  
  // Process each configured directory
  for (const dir of config.directories) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      console.log(`Processing ${dir}...`);
      processDirectory(dirPath);
    }
  }
  
  // Generate report
  generateReport();
  
  // Display summary
  console.log('\n✅ Cleanup Complete!\n');
  console.log('Summary:');
  console.log(`  Files Modified: ${stats.filesProcessed}`);
  console.log(`  Console Logs Removed: ${stats.consoleLogsRemoved}`);
  console.log(`  Debug Code Removed: ${stats.debugCodeRemoved}`);
  console.log(`  Issues Found: ${stats.issues.length}`);
  
  if (stats.issues.some(i => i.issue.includes('CRITICAL'))) {
    console.log('\n⚠️  CRITICAL ISSUES FOUND - Review the report immediately!');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
