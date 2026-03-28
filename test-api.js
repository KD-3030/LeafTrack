// API Endpoint Test Script
const http = require('http');

const BASE = 'http://localhost:3000';
let TOKEN = '';
let results = [];

function request(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(body); } catch { parsed = body; }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
    if (data) req.write(data);
    req.end();
  });
}

function log(name, status, expected, detail = '') {
  const ok = Array.isArray(expected) ? expected.includes(status) : status === expected;
  const icon = ok ? 'PASS' : 'FAIL';
  results.push({ name, status, ok, detail });
  const extra = detail ? ` - ${detail}` : '';
  console.log(`[${icon}] ${name}: ${status}${extra}`);
}

async function run() {
  console.log('=== LeafTrack API Endpoint Tests ===\n');

  // 1. AUTH - Login
  console.log('--- AUTH ---');
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'sohagteacompany@gmail.com',
    password: 'Test@123',
  });
  log('POST /api/auth/login', loginRes.status, 200, loginRes.data.error || `token=${!!loginRes.data.token}`);
  TOKEN = loginRes.data.token || '';

  if (!TOKEN) {
    console.log('\nFATAL: No token obtained. Cannot test authenticated endpoints.');
    process.exit(1);
  }

  // 2. AUTH - Login with bad credentials
  const badLogin = await request('POST', '/api/auth/login', {
    email: 'bad@bad.com',
    password: 'wrong',
  });
  log('POST /api/auth/login (bad creds)', badLogin.status, 401);

  // 3. PRODUCTS
  console.log('\n--- PRODUCTS ---');
  const products = await request('GET', '/api/products', null, TOKEN);
  log('GET /api/products', products.status, 200,
    Array.isArray(products.data) ? `count=${products.data.length}` : products.data?.error);
  
  let productId = '';
  if (Array.isArray(products.data) && products.data.length > 0) {
    productId = products.data[0]._id || products.data[0].id;
  }

  if (productId) {
    const product = await request('GET', `/api/products/${productId}`, null, TOKEN);
    log(`GET /api/products/${productId}`, product.status, 200, product.data?.name || product.data?.error);
  }

  // 4. CUSTOMERS
  console.log('\n--- CUSTOMERS ---');
  const customers = await request('GET', '/api/customers', null, TOKEN);
  log('GET /api/customers', customers.status, 200,
    Array.isArray(customers.data) ? `count=${customers.data.length}` : 
    (customers.data?.customers ? `count=${customers.data.customers.length}` : customers.data?.error));
  
  let customerId = '';
  if (customers.data?.customers?.length > 0) {
    customerId = customers.data.customers[0]._id || customers.data.customers[0].id;
  } else if (Array.isArray(customers.data) && customers.data.length > 0) {
    customerId = customers.data[0]._id || customers.data[0].id;
  }

  if (customerId) {
    const customer = await request('GET', `/api/customers/${customerId}`, null, TOKEN);
    log(`GET /api/customers/${customerId}`, customer.status, 200, customer.data?.name || customer.data?.error);

    const txns = await request('GET', `/api/customers/${customerId}/transactions`, null, TOKEN);
    log(`GET /api/customers/${customerId}/transactions`, txns.status, 200, txns.data?.error || 'ok');
  }

  // 5. SELLERS
  console.log('\n--- SELLERS ---');
  const sellers = await request('GET', '/api/sellers', null, TOKEN);
  log('GET /api/sellers', sellers.status, 200,
    Array.isArray(sellers.data) ? `count=${sellers.data.length}` : sellers.data?.error);

  let sellerId = '';
  if (Array.isArray(sellers.data) && sellers.data.length > 0) {
    sellerId = sellers.data[0]._id || sellers.data[0].id;
  }

  if (sellerId) {
    const seller = await request('GET', `/api/sellers/${sellerId}`, null, TOKEN);
    log(`GET /api/sellers/${sellerId}`, seller.status, 200, seller.data?.name || seller.data?.error);
  }

  // 6. RAW MATERIALS
  console.log('\n--- RAW MATERIALS ---');
  const rawMats = await request('GET', '/api/raw-materials', null, TOKEN);
  log('GET /api/raw-materials', rawMats.status, 200,
    Array.isArray(rawMats.data) ? `count=${rawMats.data.length}` : rawMats.data?.error);

  let rawMatId = '';
  if (Array.isArray(rawMats.data) && rawMats.data.length > 0) {
    rawMatId = rawMats.data[0]._id || rawMats.data[0].id;
  }

  if (rawMatId) {
    const rawMat = await request('GET', `/api/raw-materials/${rawMatId}`, null, TOKEN);
    log(`GET /api/raw-materials/${rawMatId}`, rawMat.status, 200, rawMat.data?.name || rawMat.data?.error);
  }

  // 7. BOMS
  console.log('\n--- BOMs ---');
  const boms = await request('GET', '/api/boms', null, TOKEN);
  log('GET /api/boms', boms.status, 200,
    Array.isArray(boms.data) ? `count=${boms.data.length}` : boms.data?.error);

  let bomId = '';
  if (Array.isArray(boms.data) && boms.data.length > 0) {
    bomId = boms.data[0]._id || boms.data[0].id;
  }

  if (bomId) {
    const bom = await request('GET', `/api/boms/${bomId}`, null, TOKEN);
    log(`GET /api/boms/${bomId}`, bom.status, 200, bom.data?.name || bom.data?.product_name || bom.data?.error);
  }

  // 8. USERS
  console.log('\n--- USERS ---');
  const users = await request('GET', '/api/users', null, TOKEN);
  log('GET /api/users', users.status, 200,
    Array.isArray(users.data) ? `count=${users.data.length}` : users.data?.error);

  const team = await request('GET', '/api/users/team?managerId=' + (users.data && users.data.length > 0 ? users.data.find(u => u.role === 'PrimaryExecutive')?.id || users.data[0].id : ''), null, TOKEN);
  log('GET /api/users/team', team.status, [200, 400],
    Array.isArray(team.data?.team) ? `count=${team.data.team.length}` : team.data?.error);

  // 9. SETTINGS
  console.log('\n--- SETTINGS ---');
  const settings = await request('GET', '/api/settings/company', null, TOKEN);
  log('GET /api/settings/company', settings.status, 200, settings.data?.companyName || settings.data?.company_name || settings.data?.error);

  // 10. ORDERS
  console.log('\n--- ORDERS ---');
  const orders = await request('GET', '/api/orders', null, TOKEN);
  log('GET /api/orders', orders.status, 200,
    orders.data?.orders ? `count=${orders.data.orders.length}` :
    (Array.isArray(orders.data) ? `count=${orders.data.length}` : orders.data?.error));

  // 11. INVOICES
  console.log('\n--- INVOICES ---');
  const invoices = await request('GET', '/api/invoices', null, TOKEN);
  log('GET /api/invoices', invoices.status, 200,
    invoices.data?.invoices ? `count=${invoices.data.invoices.length}` :
    (Array.isArray(invoices.data) ? `count=${invoices.data.length}` : invoices.data?.error));
  
  let invoiceId = '';
  if (invoices.data?.invoices?.length > 0) {
    invoiceId = invoices.data.invoices[0]._id || invoices.data.invoices[0].id;
  } else if (Array.isArray(invoices.data) && invoices.data.length > 0) {
    invoiceId = invoices.data[0]._id || invoices.data[0].id;
  }

  if (invoiceId) {
    const inv = await request('GET', `/api/invoices/${invoiceId}`, null, TOKEN);
    log(`GET /api/invoices/${invoiceId}`, inv.status, 200, inv.data?.invoiceNumber || inv.data?.invoice_number || inv.data?.error);
  }

  const previewNum = await request('GET', '/api/invoices/preview-number', null, TOKEN);
  log('GET /api/invoices/preview-number', previewNum.status, 200, previewNum.data?.invoiceNumber || previewNum.data?.error);

  // 12. SALES
  console.log('\n--- SALES ---');
  const sales = await request('GET', '/api/sales', null, TOKEN);
  log('GET /api/sales', sales.status, 200,
    sales.data?.sales ? `count=${sales.data.sales.length}` :
    (Array.isArray(sales.data) ? `count=${sales.data.length}` : sales.data?.error));

  // 13. PAYMENTS
  console.log('\n--- PAYMENTS ---');
  const payments = await request('GET', '/api/payments', null, TOKEN);
  log('GET /api/payments', payments.status, 200, 
    payments.data?.payments ? `count=${payments.data.payments.length}` : payments.data?.error);

  // 14. PURCHASES
  console.log('\n--- PURCHASES ---');
  const purchases = await request('GET', '/api/purchases', null, TOKEN);
  log('GET /api/purchases', purchases.status, 200,
    purchases.data?.purchases ? `count=${purchases.data.purchases.length}` :
    (Array.isArray(purchases.data) ? `count=${purchases.data.length}` : purchases.data?.error));

  // 15. PURCHASE RETURNS
  console.log('\n--- PURCHASE RETURNS ---');
  const purchReturns = await request('GET', '/api/purchase-returns', null, TOKEN);
  log('GET /api/purchase-returns', purchReturns.status, 200,
    purchReturns.data?.purchaseReturns ? `count=${purchReturns.data.purchaseReturns.length}` :
    (Array.isArray(purchReturns.data) ? `count=${purchReturns.data.length}` : purchReturns.data?.error));

  const prPurchases = await request('GET', '/api/purchase-returns/purchases', null, TOKEN);
  log('GET /api/purchase-returns/purchases', prPurchases.status, 200,
    Array.isArray(prPurchases.data) ? `count=${prPurchases.data.length}` : prPurchases.data?.error);

  // 16. SALE RETURNS
  console.log('\n--- SALE RETURNS ---');
  const saleReturns = await request('GET', '/api/sale-returns', null, TOKEN);
  log('GET /api/sale-returns', saleReturns.status, 200,
    saleReturns.data?.saleReturns ? `count=${saleReturns.data.saleReturns.length}` :
    (Array.isArray(saleReturns.data) ? `count=${saleReturns.data.length}` : saleReturns.data?.error));

  // 17. ASSIGNMENTS
  console.log('\n--- ASSIGNMENTS ---');
  const assignments = await request('GET', '/api/assignments', null, TOKEN);
  log('GET /api/assignments', assignments.status, 200,
    assignments.data?.assignments ? `count=${assignments.data.assignments.length}` :
    (Array.isArray(assignments.data) ? `count=${assignments.data.length}` : assignments.data?.error));

  // 18. FINANCIAL
  console.log('\n--- FINANCIAL ---');
  const finStats = await request('GET', '/api/financial/stats', null, TOKEN);
  log('GET /api/financial/stats', finStats.status, 200, finStats.data?.error || `totalRevenue=${finStats.data?.totalRevenue}`);

  const finOutstanding = await request('GET', '/api/financial/outstanding', null, TOKEN);
  log('GET /api/financial/outstanding', finOutstanding.status, 200, finOutstanding.data?.error || 'ok');

  // 19. REPORTS
  console.log('\n--- REPORTS ---');
  const bizReport = await request('GET', '/api/reports/business?type=overview', null, TOKEN);
  log('GET /api/reports/business?type=overview', bizReport.status, 200, bizReport.data?.error || 'ok');

  const gstReport = await request('GET', '/api/reports/gst?type=summary', null, TOKEN);
  log('GET /api/reports/gst?type=summary', gstReport.status, 200, gstReport.data?.error || 'ok');

  // 20. INVITATIONS
  console.log('\n--- INVITATIONS ---');
  const validateInv = await request('POST', '/api/invitations/validate', { token: 'fake-token-123' });
  log('POST /api/invitations/validate (fake token)', validateInv.status, [400, 404], validateInv.data?.error);

  // Summary
  console.log('\n=== SUMMARY ===');
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter((r) => !r.ok).forEach((r) => {
      console.log(`  - ${r.name}: got ${r.status} ${r.detail}`);
    });
  }
}

run().catch(console.error);
