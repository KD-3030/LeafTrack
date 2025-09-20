#!/usr/bin/env node

/**
 * Verification script for financial dashboard fixes
 * Tests all financial endpoints and database integrity
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let testsPassed = 0;
let testsFailed = 0;

async function testEndpoint(name, url, token, expectedFields = []) {
  try {
    console.log(`\n${colors.blue}Testing ${name}...${colors.reset}`);
    
    const response = await fetch(`http://localhost:3000${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    
    if (response.ok && (data.success || response.status === 200)) {
      console.log(`${colors.green}✅ ${name} endpoint working${colors.reset}`);
      
      // Check for expected fields
      if (expectedFields.length > 0) {
        const missingFields = expectedFields.filter(field => {
          const parts = field.split('.');
          let current = data;
          for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
              current = current[part];
            } else {
              return true;
            }
          }
          return false;
        });
        
        if (missingFields.length > 0) {
          console.log(`${colors.yellow}⚠️  Missing fields: ${missingFields.join(', ')}${colors.reset}`);
        }
      }
      
      testsPassed++;
      return data;
    } else {
      console.log(`${colors.red}❌ ${name} endpoint failed: ${data.error || 'Unknown error'}${colors.reset}`);
      testsFailed++;
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}❌ ${name} endpoint error: ${error.message}${colors.reset}`);
    testsFailed++;
    return null;
  }
}

async function verifyFinancialDashboard() {
  try {
    // First, get an admin token
    console.log(`${colors.blue}Getting admin authentication token...${colors.reset}`);
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kinjaldutta005@gmail.com',
        password: 'admin123',
        role: 'Admin'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success || !loginData.token) {
      console.log(`${colors.red}❌ Failed to authenticate. Make sure the admin account exists.${colors.reset}`);
      return;
    }
    
    const token = loginData.token;
    console.log(`${colors.green}✅ Authentication successful${colors.reset}`);
    
    // Test financial endpoints
    console.log(`\n${colors.yellow}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}    TESTING FINANCIAL ENDPOINTS${colors.reset}`);
    console.log(`${colors.yellow}════════════════════════════════════════${colors.reset}`);
    
    // 1. Test payments endpoint
    const paymentsData = await testEndpoint(
      'Payments API', 
      '/api/payments?limit=10&sort=-payment_date',
      token,
      ['success', 'payments', 'pagination', 'summary']
    );
    
    if (paymentsData && paymentsData.payments) {
      console.log(`  - Found ${paymentsData.payments.length} payments`);
      console.log(`  - Total amount: ₹${paymentsData.summary?.total_amount || 0}`);
    }
    
    // 2. Test financial stats endpoint
    const statsData = await testEndpoint(
      'Financial Stats API',
      '/api/financial/stats',
      token,
      ['success', 'stats']
    );
    
    if (statsData && statsData.stats) {
      console.log(`  - Total revenue: ₹${statsData.stats.total_revenue || 0}`);
      console.log(`  - Total pending: ₹${statsData.stats.total_pending || 0}`);
    }
    
    // 3. Test outstanding invoices endpoint
    const outstandingData = await testEndpoint(
      'Outstanding Invoices API',
      '/api/financial/outstanding',
      token,
      ['success', 'invoices']
    );
    
    if (outstandingData && outstandingData.invoices) {
      console.log(`  - Outstanding invoices: ${outstandingData.invoices.length}`);
    }
    
    // Database integrity checks
    console.log(`\n${colors.yellow}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}    DATABASE INTEGRITY CHECKS${colors.reset}`);
    console.log(`${colors.yellow}════════════════════════════════════════${colors.reset}`);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}`);
    
    // Check Payment model
    const Payment = mongoose.models.Payment || require('../models/Payment').default;
    const paymentSchema = Payment.schema;
    
    console.log(`\n${colors.blue}Payment Model Structure:${colors.reset}`);
    const customerRef = paymentSchema.path('customer_id').options.ref;
    if (customerRef === 'User') {
      console.log(`${colors.green}✅ customer_id correctly references User model${colors.reset}`);
      testsPassed++;
    } else {
      console.log(`${colors.red}❌ customer_id references ${customerRef} instead of User${colors.reset}`);
      testsFailed++;
    }
    
    const hasCreatedBy = !!paymentSchema.path('created_by');
    if (hasCreatedBy) {
      console.log(`${colors.green}✅ created_by field exists in schema${colors.reset}`);
      testsPassed++;
    } else {
      console.log(`${colors.red}❌ created_by field missing from schema${colors.reset}`);
      testsFailed++;
    }
    
    // Test a sample query
    console.log(`\n${colors.blue}Testing database queries:${colors.reset}`);
    
    try {
      const samplePayments = await Payment.find({})
        .populate('invoice_id')
        .populate('customer_id')
        .limit(1)
        .lean();
      
      console.log(`${colors.green}✅ Payment query with population works${colors.reset}`);
      testsPassed++;
      
      if (samplePayments.length > 0) {
        console.log(`  - Sample payment found: ₹${samplePayments[0].amount_paid}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Payment query failed: ${error.message}${colors.reset}`);
      testsFailed++;
    }
    
    await mongoose.disconnect();
    
    // Summary
    console.log(`\n${colors.yellow}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}           TEST SUMMARY${colors.reset}`);
    console.log(`${colors.yellow}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${testsFailed}${colors.reset}`);
    
    if (testsFailed === 0) {
      console.log(`\n${colors.green}🎉 All tests passed! The financial dashboard should be working correctly.${colors.reset}`);
      console.log(`\n${colors.blue}Next steps:${colors.reset}`);
      console.log('1. Navigate to http://localhost:3000/login');
      console.log('2. Login with admin credentials');
      console.log('3. Go to Admin > Financial Dashboard');
      console.log('4. Verify all sections load without errors');
    } else {
      console.log(`\n${colors.red}⚠️  Some tests failed. Please review the errors above.${colors.reset}`);
      console.log(`\n${colors.yellow}Troubleshooting steps:${colors.reset}`);
      console.log('1. Restart the development server: npm run dev');
      console.log('2. Check MongoDB connection string in .env.local');
      console.log('3. Ensure all model files are saved');
      console.log('4. Check browser console for client-side errors');
    }
    
  } catch (error) {
    console.log(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

// Check if dev server is running
async function checkDevServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch {
    return false;
  }
}

// Main execution
async function main() {
  console.log(`${colors.yellow}════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}   FINANCIAL DASHBOARD VERIFICATION${colors.reset}`);
  console.log(`${colors.yellow}════════════════════════════════════════${colors.reset}`);
  
  // Check if dev server is running
  const serverRunning = await checkDevServer();
  if (!serverRunning) {
    console.log(`${colors.red}❌ Development server is not running${colors.reset}`);
    console.log(`${colors.yellow}Please start the server with: npm run dev${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Development server is running${colors.reset}`);
  
  await verifyFinancialDashboard();
}

main().catch(console.error);
