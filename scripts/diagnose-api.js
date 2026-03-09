/**
 * Script de diagnóstico da API Salada Soul - Com Login
 */
const https = require('https');

const API_URL = 'api.saladasoul.com';

// Credenciais para teste
const TEST_CREDENTIALS = {
  email: 'henrique@saladasoul.com',
  password: 'admin123'
};

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m'
};

let authToken = null;

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'SaladaSoul-Diagnose/2.1',
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
      
      res.on('data', (chunk) => { data += chunk; });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`   Body: ${colors.dim}${JSON.stringify(json).substring(0, 300)}${colors.reset}`);
          resolve({ statusCode: res.statusCode, body: json });
        } catch {
          console.log(`   Body: ${colors.dim}${data.substring(0, 200)}${colors.reset}`);
          resolve({ statusCode: res.statusCode, body: data });
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

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function diagnose() {
  console.log('\n🔍 ==========================================');
  console.log('   Diagnóstico da API Salada Soul v2.1');
  console.log('   ==========================================\n');

  const results = { passed: 0, failed: 0, total: 0 };

  async function test(name, path, method = 'GET', body = null, token = null, expectSuccess = true) {
    results.total++;
    console.log(`\n${colors.yellow}▶ ${name}${colors.reset}`);
    try {
      const res = await makeRequest(path, method, body, token);
      const success = expectSuccess ? res.statusCode < 400 : res.statusCode >= 400;
      if (success) {
        results.passed++;
        console.log(`   ${colors.green}✅ OK${colors.reset}`);
      } else {
        results.failed++;
        console.log(`   ${colors.red}❌ Falhou (esperava ${expectSuccess ? 'sucesso' : 'erro'})${colors.reset}`);
      }
      return res;
    } catch (e) {
      results.failed++;
      console.log(`   ${colors.red}❌ Erro: ${e.message}${colors.reset}`);
      return null;
    }
  }

  // HEALTH
  console.log(`\n${colors.magenta}══════════════ HEALTH CHECKS ══════════════${colors.reset}`);
  await test('Health Check', '/health');
  await test('Database Health', '/health/db');

  // PÚBLICOS
  console.log(`\n${colors.magenta}══════════════ ENDPOINTS PÚBLICOS ══════════════${colors.reset}`);
  await test('Listar Produtos', '/api/products');
  await test('Listar Categorias', '/api/categories');
  await test('Listar Menus', '/api/menus');
  await test('Listar Complementos', '/api/complements');
  await test('Listar Banners', '/api/banners');
  await test('Listar Combos', '/api/combos');
  await test('Delivery Settings', '/api/delivery-settings');
  await test('PIX Settings', '/api/pix-settings');

  // LOGIN
  console.log(`\n${colors.magenta}══════════════ AUTENTICAÇÃO ══════════════${colors.reset}`);
  console.log(`\n   ${colors.cyan}Testando login: ${TEST_CREDENTIALS.email}${colors.reset}`);
  
  const loginRes = await test('Login Admin', '/api/auth/login', 'POST', TEST_CREDENTIALS);
  
  if (loginRes && loginRes.body && loginRes.body.token) {
    authToken = loginRes.body.token;
    console.log(`\n   ${colors.green}🎉 LOGIN BEM-SUCEDIDO!${colors.reset}`);
    console.log(`   Token: ${colors.dim}${authToken.substring(0, 50)}...${colors.reset}`);
    console.log(`   User: ${colors.cyan}${JSON.stringify(loginRes.body.user)}${colors.reset}`);
  } else {
    console.log(`\n   ${colors.red}❌ LOGIN FALHOU!${colors.reset}`);
    console.log(`   Verifique se a senha está correta no banco.`);
    console.log(`   Hash esperado para 'admin123': $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G`);
  }

  // AUTENTICAÇÃO COM TOKEN
  if (authToken) {
    console.log(`\n${colors.magenta}══════════════ ROTAS AUTENTICADAS ══════════════${colors.reset}`);
    
    await test('Meus Dados', '/api/auth/me', 'GET', null, authToken);
    await test('Listar Pedidos Admin', '/api/admin/orders', 'GET', null, authToken);
    await test('Listar Produtos Admin', '/api/admin/products', 'GET', null, authToken);
    await test('Listar Categorias Admin', '/api/admin/categories', 'GET', null, authToken);
    await test('Listar Menus Admin', '/api/admin/menus', 'GET', null, authToken);
    await test('Listar Complementos Admin', '/api/admin/complements', 'GET', null, authToken);
    await test('Listar Banners Admin', '/api/admin/banners', 'GET', null, authToken);
    await test('Listar Combos Admin', '/api/admin/combos', 'GET', null, authToken);
    await test('Listar Clientes', '/api/admin/customers', 'GET', null, authToken);
    await test('Relatório de Vendas', '/api/admin/reports/sales', 'GET', null, authToken);
    await test('Delivery Settings Admin', '/api/admin/delivery-settings', 'GET', null, authToken);
    await test('PIX Settings Admin', '/api/admin/pix-settings', 'GET', null, authToken);

    // LOGOUT
    await test('Logout', '/api/auth/logout', 'POST', null, authToken);
  }

  // SEM TOKEN (deve falhar)
  console.log(`\n${colors.magenta}══════════════ SEGURANÇA (sem token) ══════════════${colors.reset}`);
  await test('Admin sem token (deve falhar)', '/api/admin/orders', 'GET', null, null, false);
  await test('Me sem token (deve falhar)', '/api/auth/me', 'GET', null, null, false);

  // RESUMO
  console.log('\n' + '═'.repeat(50));
  console.log('📊 RESUMO');
  console.log('═'.repeat(50));
  console.log(`   ${colors.green}✅ Passou: ${results.passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ Falhou: ${results.failed}${colors.reset}`);
  console.log(`   📝 Total: ${results.total}`);
  console.log(`   📈 Taxa: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('═'.repeat(50) + '\n');
}

diagnose();
