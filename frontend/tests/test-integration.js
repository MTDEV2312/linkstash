const http = require('http');

const API_BASE_URL = 'http://localhost:5000';
const tests = [];

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const method = options.method || 'GET';
    const timeout = options.timeout || 5000;
    
    const req = http.request(url, {
      method,
      timeout,
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function test(name, fn) {
  try {
    const result = await fn();
    tests.push({
      name,
      passed: result,
      error: result ? null : 'Test falló'
    });
    console.log(`${result ? '✅' : '❌'} ${name}`);
  } catch (error) {
    tests.push({
      name,
      passed: false,
      error: error.message
    });
    console.log(`❌ ${name} - ${error.message}`);
  }
}

async function runTests() {
  console.log('\n═════════════════════════════════════════════════════════\n');
  console.log('PRUEBAS DE INTEGRACIÓN: FRONTEND ↔ BACKEND');
  console.log('\n═════════════════════════════════════════════════════════\n');
  
  // Test 1: Conectividad básica
  console.log('📡 Conectividad:\n');
  await test('GET / responde 200', async () => {
    const res = await makeRequest(API_BASE_URL);
    return res.status === 200;
  });
  
  // Test 2: Endpoints de auth
  console.log('\n🔐 Autenticación:\n');
  
  await test('POST /api/auth/register existe (no 404)', async () => {
    try {
      const res = await makeRequest(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: { email: 'test@test.com', password: 'test' }
      });
      return res.status !== 404;
    } catch {
      return false;
    }
  });
  
  await test('GET /api/auth/me sin token retorna 401', async () => {
    try {
      const res = await makeRequest(`${API_BASE_URL}/api/auth/me`);
      return res.status === 401;
    } catch {
      return false;
    }
  });
  
  // Test 3: Endpoints de links
  console.log('\n🔗 Links:\n');
  
  await test('GET /api/links sin token retorna 401', async () => {
    try {
      const res = await makeRequest(`${API_BASE_URL}/api/links`);
      return res.status === 401;
    } catch {
      return false;
    }
  });
  
  // Test 4: Endpoints de tags
  console.log('\n🏷️  Tags:\n');
  
  await test('GET /api/tags sin token retorna 401', async () => {
    try {
      const res = await makeRequest(`${API_BASE_URL}/api/tags`);
      return res.status === 401;
    } catch {
      return false;
    }
  });
  
  // Test 5: Endpoints de dashboard
  console.log('\n📊 Dashboard:\n');
  
  await test('GET /api/dashboard sin token retorna 401', async () => {
    try {
      const res = await makeRequest(`${API_BASE_URL}/api/dashboard`);
      return res.status === 401;
    } catch {
      return false;
    }
  });
  
  // Test 6: Endpoints de metrics
  console.log('\n📈 Metrics:\n');
  
  await test('GET /api/metrics sin token retorna 401', async () => {
    try {
      const res = await makeRequest(`${API_BASE_URL}/api/metrics`);
      return res.status === 401;
    } catch {
      return false;
    }
  });
  
  // Test 7: Errores de red
  console.log('\n🔴 Manejo de errores:\n');
  
  await test('Ruta inexistente retorna 404', async () => {
    try {
      const res = await makeRequest(`${API_BASE_URL}/api/nonexistent`);
      return res.status === 404;
    } catch {
      return false;
    }
  });
  
  // Resumen
  console.log('\n═════════════════════════════════════════════════════════\n');
  console.log('RESUMEN:\n');
  
  const passed = tests.filter(t => t.passed).length;
  const total = tests.length;
  const percentage = ((passed / total) * 100).toFixed(0);
  
  console.log(`Total: ${total} pruebas`);
  console.log(`Exitosas: ${passed}`);
  console.log(`Fallidas: ${total - passed}`);
  console.log(`Porcentaje: ${percentage}%\n`);
  
  if (passed === total) {
    console.log('✅ TODAS LAS PRUEBAS PASARON\n');
  } else {
    console.log('⚠️  ALGUNAS PRUEBAS FALLARON:\n');
    tests.filter(t => !t.passed).forEach(t => {
      console.log(`  ❌ ${t.name}: ${t.error}`);
    });
    console.log();
  }
}

runTests().catch(console.error);
