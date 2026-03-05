/**
 * Script de diagnóstico da API Salada Soul
 * Testa todas as rotas públicas e documenta as rotas admin
 */
const https = require('https');

const API_URL = 'api.saladasoul.com';

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'SaladaSoul-Diagnose/2.0',
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      
      const statusColor = res.statusCode < 400 ? colors.green : colors.red;
      console.log(`\n${colors.cyan}📡 ${method}${colors.reset} ${path}`);
      console.log(`   Status: ${statusColor}${res.statusCode}${colors.reset}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`   Body: ${colors.dim}${JSON.stringify(json).substring(0, 200)}${colors.reset}`);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json
          });
        } catch {
          console.log(`   Body: ${colors.dim}${data.substring(0, 200)}${colors.reset}`);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (e) => {
      console.log(`   ${colors.red}❌ Error: ${e.message}${colors.reset}`);
      reject(e);
    });

    req.setTimeout(15000, () => {
      console.log('   ⏱️  Timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function diagnose() {
  console.log('\n🔍 ==========================================');
  console.log('   Diagnóstico da API Salada Soul v2.0');
  console.log('   ==========================================\n');

  const results = { passed: 0, failed: 0, total: 0 };

  async function testEndpoint(path, method = 'GET', expectedStatus = 200) {
    results.total++;
    try {
      const res = await makeRequest(path, method);
      if (res.statusCode === expectedStatus) {
        results.passed++;
        return true;
      } else {
        results.failed++;
        return false;
      }
    } catch (e) {
      results.failed++;
      return false;
    }
  }

  // ===== HEALTH CHECKS =====
  console.log('\n📍 HEALTH CHECKS');
  console.log('─'.repeat(40));
  await testEndpoint('/health');
  await testEndpoint('/health/db');

  // ===== ENDPOINTS PÚBLICOS =====
  console.log('\n📍 ENDPOINTS PÚBLICOS');
  console.log('─'.repeat(40));
  await testEndpoint('/api/products');
  await testEndpoint('/api/categories');
  await testEndpoint('/api/menus');
  await testEndpoint('/api/complements');
  await testEndpoint('/api/banners');
  await testEndpoint('/api/combos');
  await testEndpoint('/api/delivery-settings');
  await testEndpoint('/api/pix-settings');

  // ===== DOCUMENTAÇÃO =====
  console.log('\n📍 DOCUMENTAÇÃO');
  console.log('─'.repeat(40));
  await testEndpoint('/docs');
  await testEndpoint('/redoc');

  // ===== AUTENTICAÇÃO (sem credenciais - deve retornar 401) =====
  console.log('\n📍 AUTENTICAÇÃO (sem token)');
  console.log('─'.repeat(40));
  await testEndpoint('/api/auth/me', 'GET', 401);

  // ===== LOGIN ADMIN (credenciais inválidas - deve retornar 401) =====
  console.log('\n📍 LOGIN ADMIN (teste com credenciais inválidas)');
  console.log('─'.repeat(40));
  await testEndpoint('/api/auth/login', 'POST', 401);

  // ===== PEDIDOS =====
  console.log('\n📍 PEDIDOS');
  console.log('─'.repeat(40));
  await testEndpoint('/api/orders/teste-123', 'GET', 404); // Deve retornar 404

  // ===== CLIENTES =====
  console.log('\n📍 CLIENTES');
  console.log('─'.repeat(40));
  await testEndpoint('/api/customers/11999999999/orders');
  await testEndpoint('/api/customers/11999999999/reorder-suggestions');

  // ===== ADMIN ENDPOINTS (sem auth - deve retornar 401) =====
  console.log('\n📍 ADMIN ENDPOINTS (sem autenticação)');
  console.log('─'.repeat(40));
  await testEndpoint('/api/admin/orders', 'GET', 401);
  await testEndpoint('/api/admin/products', 'GET', 401);
  await testEndpoint('/api/admin/categories', 'GET', 401);
  await testEndpoint('/api/admin/menus', 'GET', 401);
  await testEndpoint('/api/admin/complements', 'GET', 401);
  await testEndpoint('/api/admin/banners', 'GET', 401);
  await testEndpoint('/api/admin/combos', 'GET', 401);
  await testEndpoint('/api/admin/customers', 'GET', 401);
  await testEndpoint('/api/admin/reports/sales', 'GET', 401);

  // ===== RESUMO =====
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DO DIAGNÓSTICO');
  console.log('='.repeat(50));
  console.log(`   ${colors.green}✅ Passou: ${results.passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ Falhou: ${results.failed}${colors.reset}`);
  console.log(`   📝 Total: ${results.total}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  const rateColor = successRate >= 80 ? colors.green : successRate >= 50 ? colors.yellow : colors.red;
  console.log(`   ${rateColor}📈 Taxa de sucesso: ${successRate}%${colors.reset}`);
  
  console.log('\n' + '='.repeat(50));
  console.log('📚 ROTAS DISPONÍVEIS');
  console.log('='.repeat(50));
  console.log(`
${colors.cyan}Públicas:${colors.reset}`);
  console.log('  GET  /health');
  console.log('  GET  /health/db');
  console.log('  GET  /api/products');
  console.log('  GET  /api/products/{id}');
  console.log('  GET  /api/categories');
  console.log('  GET  /api/menus');
  console.log('  GET  /api/complements');
  console.log('  GET  /api/banners');
  console.log('  GET  /api/combos');
  console.log('  GET  /api/delivery-settings');
  console.log('  GET  /api/pix-settings');
  console.log('  POST /api/orders');
  console.log('  GET  /api/orders/{id}');
  console.log('  POST /api/orders/{id}/rate');
  console.log('  POST /api/customers/login');
  console.log('  GET  /api/customers/{phone}/orders');
  console.log('  GET  /api/customers/{phone}/reorder-suggestions');
  console.log('  PUT  /api/customers/{phone}');

  console.log(`\n${colors.cyan}Autenticação:${colors.reset}`);
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/auth/me');
  console.log('  POST /api/auth/logout');

  console.log(`\n${colors.cyan}Admin (requer token):${colors.reset}`);
  console.log('  GET/POST    /api/admin/orders');
  console.log('  PUT         /api/admin/orders/{id}/status');
  console.log('  PUT         /api/admin/orders/{id}/payment');
  console.log('  GET/POST    /api/admin/products');
  console.log('  PUT/DELETE  /api/admin/products/{id}');
  console.log('  GET/POST    /api/admin/categories');
  console.log('  PUT/DELETE  /api/admin/categories/{id}');
  console.log('  GET/POST    /api/admin/menus');
  console.log('  PUT/DELETE  /api/admin/menus/{id}');
  console.log('  GET/POST    /api/admin/complements');
  console.log('  PUT/DELETE  /api/admin/complements/{id}');
  console.log('  GET/POST    /api/admin/banners');
  console.log('  PUT/DELETE  /api/admin/banners/{id}');
  console.log('  GET/POST    /api/admin/combos');
  console.log('  PUT/DELETE  /api/admin/combos/{id}');
  console.log('  GET         /api/admin/customers');
  console.log('  GET         /api/admin/customers/{id}');
  console.log('  GET         /api/admin/reports/sales');
  console.log('  GET/PUT     /api/admin/delivery-settings');
  console.log('  GET/PUT     /api/admin/pix-settings');
  console.log('  POST        /api/admin/upload');

  console.log(`\n${colors.cyan}Documentação:${colors.reset}`);
  console.log('  GET  /docs (Swagger UI)');
  console.log('  GET  /redoc (ReDoc)');

  console.log('\n' + '='.repeat(50) + '\n');
}

diagnose();
