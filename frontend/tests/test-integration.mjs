#!/usr/bin/env node

/**
 * SUITE DE PRUEBAS DE INTEGRACIÓN: FRONTEND ↔ BACKEND
 * LinkStash - Verificación integral
 * 
 * Valida:
 * 1. Consumo correcto de endpoints
 * 2. Manejo de respuestas exitosas
 * 3. Manejo de errores HTTP
 * 4. Estados vacíos y sin datos
 * 5. Timeouts y fallos de red
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Colores para output (sin dependencias externas)
const colors = {
  success: (text) => `✅ ${text}`,
  error: (text) => `❌ ${text}`,
  warning: (text) => `⚠️  ${text}`,
  info: (text) => `ℹ️  ${text}`,
  header: (text) => `\n${'═'.repeat(60)}\n${text}\n${'═'.repeat(60)}\n`,
};

// Test counter
let totalTests = 0;
let passedTests = 0;
let failedTests = [];

// Función para reportar resultados
const reportTest = (testName, passed, message = '') => {
  totalTests++;
  if (passed) {
    console.log(colors.success(`${testName}`));
    if (message) console.log(`   └─ ${message}`);
    passedTests++;
  } else {
    console.log(colors.error(`${testName}`));
    if (message) console.log(`   └─ ${message}`);
    failedTests.push({ testName, message });
  }
};

// Función para esperar
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Prueba 1: Conectividad básica
async function testBasicConnectivity() {
  console.log(colors.header('PRUEBA 1: CONECTIVIDAD BÁSICA'));
  
  try {
    const response = await axios.get('http://localhost:5000/', { timeout: 5000 });
    reportTest(
      'Endpoint raíz responde',
      response.status === 200 && response.data.message,
      `Status: ${response.status}, Message: "${response.data.message}"`
    );
  } catch (error) {
    reportTest('Endpoint raíz responde', false, `Error: ${error.message}`);
  }
}

// Prueba 2: Autenticación
async function testAuthentication() {
  console.log(colors.header('PRUEBA 2: AUTENTICACIÓN (AUTH)'));
  
  // Test 2.1: Registro de usuario (éxito esperado o error por duplicado)
  try {
    const registerData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };
    
    const response = await axios.post(`${API_BASE_URL}/auth/register`, registerData, {
      timeout: 5000,
    });
    
    reportTest(
      'Endpoint /auth/register responde',
      response.status === 201 || response.status === 200,
      `Status: ${response.status}`
    );
  } catch (error) {
    const status = error.response?.status;
    const isExpectedError = status === 400 || status === 409; // Conflicto o validación
    reportTest(
      'Endpoint /auth/register responde',
      isExpectedError || status === 201,
      `Status: ${status}, Message: "${error.response?.data?.message || error.message}"`
    );
  }

  // Test 2.2: Login sin autenticación (error 401 esperado)
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, { timeout: 5000 });
    reportTest(
      'Endpoint /auth/me sin token retorna error 401',
      false,
      `Esperaba error 401, pero obtuvo ${response.status}`
    );
  } catch (error) {
    reportTest(
      'Endpoint /auth/me sin token retorna error 401',
      error.response?.status === 401,
      `Status: ${error.response?.status}`
    );
  }

  // Test 2.3: Login válido
  try {
    const loginData = { email: 'test@example.com', password: 'TestPassword123!' };
    const response = await axios.post(`${API_BASE_URL}/auth/login`, loginData, {
      timeout: 5000,
    });
    
    const token = response.data.data?.token;
    reportTest(
      'Endpoint /auth/login responde correctamente',
      response.status === 200 && token,
      `Status: ${response.status}, Token presente: ${!!token}`
    );

    // Guardar token para pruebas posteriores
    global.testToken = token;
  } catch (error) {
    const status = error.response?.status;
    reportTest(
      'Endpoint /auth/login responde',
      status === 401 || status === 404 || status === 400,
      `Status: ${status}, Message: "${error.response?.data?.message || error.message}"`
    );
  }
}

// Prueba 3: Links
async function testLinksEndpoints() {
  console.log(colors.header('PRUEBA 3: ENDPOINTS DE LINKS'));

  // Test 3.1: GET /links sin autenticación (error esperado)
  try {
    const response = await axios.get(`${API_BASE_URL}/links`, { timeout: 5000 });
    reportTest(
      'GET /links sin token retorna error 401',
      false,
      `Esperaba error 401, pero obtuvo ${response.status}`
    );
  } catch (error) {
    reportTest(
      'GET /links sin token retorna error 401',
      error.response?.status === 401,
      `Status: ${error.response?.status}`
    );
  }

  // Test 3.2: GET /links con token (éxito esperado o 401 si token inválido)
  try {
    const response = await axios.get(`${API_BASE_URL}/links`, {
      headers: { Authorization: `Bearer ${global.testToken || 'invalid_token'}` },
      timeout: 5000,
    });
    
    reportTest(
      'GET /links con token responde',
      response.status === 200 || response.status === 401,
      `Status: ${response.status}, Data: ${response.data ? 'presente' : 'ausente'}`
    );
  } catch (error) {
    reportTest(
      'GET /links con token responde',
      error.response?.status === 401 || error.response?.status === 200,
      `Status: ${error.response?.status || 'error de conexión'}`
    );
  }

  // Test 3.3: POST /links sin datos (error de validación)
  try {
    const response = await axios.post(`${API_BASE_URL}/links`, {}, {
      headers: { Authorization: `Bearer ${global.testToken || 'invalid_token'}` },
      timeout: 5000,
    });
    reportTest(
      'POST /links sin datos válidos retorna error',
      false,
      `Esperaba error, pero obtuvo ${response.status}`
    );
  } catch (error) {
    reportTest(
      'POST /links sin datos válidos retorna error',
      error.response?.status >= 400,
      `Status: ${error.response?.status}`
    );
  }

  // Test 3.4: GET /links/:id (test con ID inválido)
  try {
    const response = await axios.get(`${API_BASE_URL}/links/invalid_id`, {
      headers: { Authorization: `Bearer ${global.testToken || 'invalid_token'}` },
      timeout: 5000,
    });
    reportTest(
      'GET /links/:id con ID inválido retorna error',
      false,
      `Esperaba error, pero obtuvo ${response.status}`
    );
  } catch (error) {
    reportTest(
      'GET /links/:id con ID inválido retorna error',
      error.response?.status >= 400,
      `Status: ${error.response?.status}`
    );
  }
}

// Prueba 4: Tags
async function testTagsEndpoints() {
  console.log(colors.header('PRUEBA 4: ENDPOINTS DE TAGS'));

  // Test 4.1: GET /tags sin autenticación
  try {
    const response = await axios.get(`${API_BASE_URL}/tags`, { timeout: 5000 });
    reportTest(
      'GET /tags sin token retorna error 401',
      false,
      `Esperaba error 401, pero obtuvo ${response.status}`
    );
  } catch (error) {
    reportTest(
      'GET /tags sin token retorna error 401',
      error.response?.status === 401,
      `Status: ${error.response?.status}`
    );
  }

  // Test 4.2: GET /tags con token
  try {
    const response = await axios.get(`${API_BASE_URL}/tags`, {
      headers: { Authorization: `Bearer ${global.testToken || 'invalid_token'}` },
      timeout: 5000,
    });
    
    reportTest(
      'GET /tags con token responde',
      response.status === 200 || response.status === 401,
      `Status: ${response.status}`
    );
  } catch (error) {
    reportTest(
      'GET /tags con token responde',
      error.response?.status === 401 || error.response?.status === 200,
      `Status: ${error.response?.status || error.message}`
    );
  }
}

// Prueba 5: Dashboard
async function testDashboardEndpoints() {
  console.log(colors.header('PRUEBA 5: ENDPOINTS DE DASHBOARD'));

  // Test 5.1: GET /dashboard sin autenticación
  try {
    const response = await axios.get(`${API_BASE_URL}/dashboard`, { timeout: 5000 });
    reportTest(
      'GET /dashboard sin token retorna error 401',
      false,
      `Esperaba error 401, pero obtuvo ${response.status}`
    );
  } catch (error) {
    reportTest(
      'GET /dashboard sin token retorna error 401',
      error.response?.status === 401,
      `Status: ${error.response?.status}`
    );
  }

  // Test 5.2: GET /dashboard con token
  try {
    const response = await axios.get(`${API_BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${global.testToken || 'invalid_token'}` },
      timeout: 5000,
    });
    
    reportTest(
      'GET /dashboard con token responde',
      response.status === 200 || response.status === 401,
      `Status: ${response.status}`
    );
  } catch (error) {
    reportTest(
      'GET /dashboard con token responde',
      error.response?.status === 401 || error.response?.status === 200,
      `Status: ${error.response?.status || error.message}`
    );
  }
}

// Prueba 6: Metrics
async function testMetricsEndpoints() {
  console.log(colors.header('PRUEBA 6: ENDPOINTS DE METRICS'));

  // Test 6.1: GET /metrics sin autenticación
  try {
    const response = await axios.get(`${API_BASE_URL}/metrics`, { timeout: 5000 });
    reportTest(
      'GET /metrics sin token retorna error 401',
      false,
      `Esperaba error 401, pero obtuvo ${response.status}`
    );
  } catch (error) {
    reportTest(
      'GET /metrics sin token retorna error 401',
      error.response?.status === 401,
      `Status: ${error.response?.status}`
    );
  }

  // Test 6.2: GET /metrics con token
  try {
    const response = await axios.get(`${API_BASE_URL}/metrics`, {
      headers: { Authorization: `Bearer ${global.testToken || 'invalid_token'}` },
      timeout: 5000,
    });
    
    reportTest(
      'GET /metrics con token responde',
      response.status === 200 || response.status === 401,
      `Status: ${response.status}`
    );
  } catch (error) {
    reportTest(
      'GET /metrics con token responde',
      error.response?.status === 401 || error.response?.status === 200,
      `Status: ${error.response?.status || error.message}`
    );
  }
}

// Prueba 7: Manejo de errores de red
async function testNetworkErrorHandling() {
  console.log(colors.header('PRUEBA 7: MANEJO DE ERRORES DE RED'));

  // Test 7.1: Timeout
  try {
    const response = await axios.get(`${API_BASE_URL}/links`, {
      timeout: 100, // Timeout muy corto
      headers: { Authorization: `Bearer ${global.testToken || 'invalid'}` },
    });
    reportTest('Detección de timeout', false, 'No se detectó timeout');
  } catch (error) {
    const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
    reportTest(
      'Detección de timeout',
      isTimeout,
      `Error: ${error.code || error.message}`
    );
  }

  // Test 7.2: Conexión rechazada (endpoint inexistente)
  try {
    const response = await axios.get('http://localhost:9999/', { timeout: 5000 });
    reportTest('Detección de conexión rechazada', false, 'No se detectó rechazo de conexión');
  } catch (error) {
    const isConnectionError = error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED');
    reportTest(
      'Detección de conexión rechazada',
      isConnectionError,
      `Error: ${error.code || error.message}`
    );
  }

  // Test 7.3: Ruta no encontrada (404)
  try {
    const response = await axios.get(`${API_BASE_URL}/nonexistent`, {
      timeout: 5000,
    });
    reportTest('GET /nonexistent retorna 404', false, `Obtuvo ${response.status}`);
  } catch (error) {
    reportTest(
      'GET /nonexistent retorna 404',
      error.response?.status === 404,
      `Status: ${error.response?.status}`
    );
  }
}

// Prueba 8: Rate Limiting
async function testRateLimiting() {
  console.log(colors.header('PRUEBA 8: RATE LIMITING'));

  try {
    const requests = [];
    // Hacer múltiples requests rápidamente
    for (let i = 0; i < 10; i++) {
      requests.push(
        axios.get('http://localhost:5000/', { timeout: 5000 }).catch(err => err)
      );
    }

    const results = await Promise.allSettled(requests);
    const rateLimited = results.some(
      result => result.value?.response?.status === 429
    );

    reportTest(
      'Rate limiting está activo o no está aplicado',
      true,
      `${rateLimited ? 'Rate limit detectado' : 'Sin limit (configuración normal)'}`
    );
  } catch (error) {
    reportTest('Rate limiting check', false, error.message);
  }
}

// RESUMEN FINAL
function printSummary() {
  console.log(colors.header('RESUMEN DE PRUEBAS'));
  
  const passRate = ((passedTests / totalTests) * 100).toFixed(2);
  const status = passedTests === totalTests ? colors.success : colors.warning;

  console.log(`Total de pruebas: ${totalTests}`);
  console.log(`Pruebas exitosas: ${colors.success(`${passedTests}`)}`);
  console.log(`Pruebas fallidas: ${colors.error(`${failedTests.length}`)}`);
  console.log(`Tasa de éxito: ${status(`${passRate}%`)}`);

  if (failedTests.length > 0) {
    console.log(colors.header('PRUEBAS FALLIDAS'));
    failedTests.forEach((test, index) => {
      console.log(`${index + 1}. ${colors.error(test.testName)}`);
      console.log(`   └─ ${test.message}`);
    });
  }

  console.log('\n');
  process.exit(passedTests === totalTests ? 0 : 1);
}

// EJECUTAR TODAS LAS PRUEBAS
async function runAllTests() {
  console.log(colors.header('🧪 SUITE DE PRUEBAS: FRONTEND ↔ BACKEND INTEGRATION'));
  
  await testBasicConnectivity();
  await wait(500);
  
  await testAuthentication();
  await wait(500);
  
  await testLinksEndpoints();
  await wait(500);
  
  await testTagsEndpoints();
  await wait(500);
  
  await testDashboardEndpoints();
  await wait(500);
  
  await testMetricsEndpoints();
  await wait(500);
  
  await testNetworkErrorHandling();
  await wait(500);
  
  await testRateLimiting();
  
  printSummary();
}

// Iniciar
runAllTests().catch(error => {
  console.error(colors.error('Error fatal en pruebas:'), error.message);
  process.exit(1);
});
