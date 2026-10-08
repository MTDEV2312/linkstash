import assert from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import express from 'express';

// Ensure background workers and Redis connections are suppressed in tests
process.env.ENABLE_BULLMQ = 'false';
process.env.NODE_ENV = 'test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeExpressPath(expressPath) {
  // Convert Express parameters (:param) to OpenAPI parameters ({param})
  return expressPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
}

function extractRouterOperations(router, prefix = '') {
  const operations = [];
  if (!router || !router.stack) return operations;

  for (const layer of router.stack) {
    if (layer.route) {
      const subPath = layer.route.path === '/' ? '' : layer.route.path;
      const fullPath = (prefix + subPath).replace(/\/+/g, '/') || '/';
      const normalizedPath = normalizeExpressPath(fullPath);
      for (const method of Object.keys(layer.route.methods)) {
        operations.push({
          method: method.toUpperCase(),
          path: normalizedPath
        });
      }
    }
  }
  return operations;
}

// ---------------------------------------------------------------------------
// Task 3.1: Route and Method Parity Validation
// ---------------------------------------------------------------------------
export async function testRouteParity() {
  console.log('[Test 3.1] Verifying route and method parity against OpenAPI spec...');

  const openapiPath = path.join(backendRoot, 'docs', 'openapi', 'openapi.yaml');
  assert.ok(fs.existsSync(openapiPath), `OpenAPI spec must exist at ${openapiPath}`);

  const openapiContent = fs.readFileSync(openapiPath, 'utf8');
  const spec = YAML.parse(openapiContent);

  assert.ok(spec.paths, 'OpenAPI spec must define a "paths" object');

  // Load Express route modules
  const authRoutes = (await import('../src/routes/authRoutes.js')).default;
  const linkRoutes = (await import('../src/routes/linkRoutes.js')).default;
  const tagRoutes = (await import('../src/routes/tagRoutes.js')).default;
  const dashboardRoutes = (await import('../src/routes/dashboardRoutes.js')).default;

  const mountedRouters = [
    { prefix: '/api/auth', router: authRoutes },
    { prefix: '/api/links', router: linkRoutes },
    { prefix: '/api/tags', router: tagRoutes },
    { prefix: '/api/dashboard', router: dashboardRoutes }
  ];

  const expressOperations = [];
  for (const { prefix, router } of mountedRouters) {
    expressOperations.push(...extractRouterOperations(router, prefix));
  }

  // Add top-level routes from app.js
  expressOperations.push({ method: 'GET', path: '/' });
  expressOperations.push({ method: 'GET', path: '/health' });

  // Extract operations defined in OpenAPI spec
  const specOperations = [];
  for (const [routePath, methods] of Object.entries(spec.paths)) {
    for (const [method, opDef] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
        specOperations.push({
          method: method.toUpperCase(),
          path: routePath,
          operationId: opDef.operationId
        });
      }
    }
  }

  // Create lookup sets
  const specSet = new Set(specOperations.map(o => `${o.method} ${o.path}`));
  const expressSet = new Set(expressOperations.map(o => `${o.method} ${o.path}`));

  // Assert every mounted Express operation is present in OpenAPI spec
  const missingInSpec = expressOperations.filter(o => !specSet.has(`${o.method} ${o.path}`));
  assert.strictEqual(
    missingInSpec.length,
    0,
    `Mounted Express routes missing in OpenAPI spec: ${JSON.stringify(missingInSpec)}`
  );

  // Assert every OpenAPI operation is actually mounted in Express
  const phantomInSpec = specOperations.filter(o => !expressSet.has(`${o.method} ${o.path}`));
  assert.strictEqual(
    phantomInSpec.length,
    0,
    `OpenAPI spec contains phantom operations not in Express: ${JSON.stringify(phantomInSpec)}`
  );

  // Assert required health and root endpoints exist
  assert.ok(specSet.has('GET /health'), 'Spec must contain GET /health');
  assert.ok(specSet.has('GET /'), 'Spec must contain GET /');

  // Assert banned phantom endpoints are absent
  assert.ok(!spec.paths['/api/metrics'], 'Spec must NOT contain phantom endpoint /api/metrics');
  assert.ok(!spec.paths['/api/dashboard/summary'], 'Spec must NOT contain phantom endpoint /api/dashboard/summary');

  // Assert exact counts match
  assert.strictEqual(
    specOperations.length,
    expressOperations.length,
    `Operation count mismatch: spec has ${specOperations.length}, Express has ${expressOperations.length}`
  );

  console.log(`[Test 3.1] Passed: 1:1 route parity verified (${specOperations.length} operations).`);
}

// ---------------------------------------------------------------------------
// Task 3.2: Translation Key Parity & Security Checks
// ---------------------------------------------------------------------------
export async function testTranslationAndSecurity() {
  console.log('[Test 3.2] Verifying translation key parity and security constraints...');

  const enPath = path.join(backendRoot, 'docs', 'openapi', 'openapi.yaml');
  const esPath = path.join(backendRoot, 'docs', 'openapi', 'openapi.es.yaml');

  assert.ok(fs.existsSync(enPath), 'Canonical openapi.yaml must exist');
  assert.ok(fs.existsSync(esPath), 'Spanish overlay openapi.es.yaml must exist');

  const enSpec = YAML.parse(fs.readFileSync(enPath, 'utf8'));
  const esSpec = YAML.parse(fs.readFileSync(esPath, 'utf8'));

  // 1. OperationId synchronization between EN and ES
  const enOps = new Map();
  for (const [p, methods] of Object.entries(enSpec.paths || {})) {
    for (const [m, op] of Object.entries(methods)) {
      if (op.operationId) enOps.set(op.operationId, { path: p, method: m });
    }
  }

  const esOps = new Map();
  for (const [p, methods] of Object.entries(esSpec.paths || {})) {
    for (const [m, op] of Object.entries(methods)) {
      if (op.operationId) esOps.set(op.operationId, { path: p, method: m, summary: op.summary, description: op.description });
    }
  }

  const missingInEs = [];
  for (const [opId] of enOps) {
    if (!esOps.has(opId)) missingInEs.push(opId);
  }
  assert.strictEqual(
    missingInEs.length,
    0,
    `Spanish overlay is missing translations for operationIds: ${missingInEs.join(', ')}`
  );

  const orphanInEs = [];
  for (const [opId] of esOps) {
    if (!enOps.has(opId)) orphanInEs.push(opId);
  }
  assert.strictEqual(
    orphanInEs.length,
    0,
    `Spanish overlay contains orphan operationIds not in canonical spec: ${orphanInEs.join(', ')}`
  );

  // 2. Security leak checks on specs
  const rawEn = fs.readFileSync(enPath, 'utf8');
  const rawEs = fs.readFileSync(esPath, 'utf8');

  // Supabase project URLs
  assert.strictEqual(/https?:\/\/[a-zA-Z0-9-]+\.supabase\.co/i.test(rawEn), false, 'Canonical spec must not leak Supabase URLs');
  assert.strictEqual(/https?:\/\/[a-zA-Z0-9-]+\.supabase\.co/i.test(rawEs), false, 'Spanish overlay must not leak Supabase URLs');

  // Production domain leaks
  assert.strictEqual(/mathiast\.me/i.test(rawEn), false, 'Canonical spec must not leak production domain mathiast.me');
  assert.strictEqual(/mathiast\.me/i.test(rawEs), false, 'Spanish overlay must not leak production domain mathiast.me');
  assert.strictEqual(/onrender\.com/i.test(rawEn), false, 'Canonical spec must not leak onrender.com');

  // Localhost server leaks (servers must use variables or generic templates)
  assert.strictEqual(/url:\s*["']?https?:\/\/localhost/i.test(rawEn), false, 'Spec servers must not hardcode localhost URL');

  // Health endpoint schema check (must be generic, no runtime leak)
  const healthSchema = enSpec.components?.schemas?.HealthResponse;
  assert.ok(healthSchema, 'HealthResponse schema must exist');
  assert.ok(!healthSchema.properties?.databaseUri, 'HealthResponse must not expose databaseUri');
  assert.ok(!healthSchema.properties?.internalConfig, 'HealthResponse must not expose internalConfig');

  // 3. docsRoutes mergeSpec and rendered Scalar HTML verification
  // This requires docsRoutes.js module
  const docsRoutesModule = await import('../src/routes/docsRoutes.js');
  assert.ok(docsRoutesModule.mergeSpec, 'docsRoutes must export mergeSpec function');
  assert.ok(typeof docsRoutesModule.mergeSpec === 'function', 'mergeSpec must be a function');

  // Test mergeSpec behavior
  const merged = docsRoutesModule.mergeSpec(enSpec, esSpec);
  assert.strictEqual(merged.info.title, esSpec.info.title, 'Merged spec info.title must match Spanish overlay');
  assert.strictEqual(
    merged.paths['/api/links'].get.summary,
    esSpec.paths['/api/links'].get.summary,
    'Merged spec endpoint summary must match Spanish overlay'
  );
  // Unmodified properties from canonical must remain intact
  assert.strictEqual(
    merged.paths['/api/links'].get.operationId,
    enSpec.paths['/api/links'].get.operationId,
    'Canonical operationId must be preserved in merged spec'
  );

  // Test rendered Scalar HTML via HTTP request on docs router
  const testApp = express();
  testApp.use('/api-docs', docsRoutesModule.default);

  const server = http.createServer(testApp);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api-docs`);
    assert.strictEqual(res.status, 200, 'GET /api-docs should return 200');
    const html = await res.text();

    // Assert try-it button disabled
    assert.ok(
      html.includes('hideTestRequestButton') && html.includes('true'),
      'Rendered HTML must configure hideTestRequestButton: true'
    );

    // Assert authentication disabled / read-only
    assert.ok(
      html.includes('authentication') && (html.includes('false') || html.includes('null')),
      'Rendered HTML must configure authentication disabled'
    );

    // Assert no external CDNs in rendered HTML
    assert.ok(!html.includes('cdn.jsdelivr.net'), 'Rendered HTML must not reference cdn.jsdelivr.net');
    assert.ok(!html.includes('unpkg.com'), 'Rendered HTML must not reference unpkg.com');
    assert.ok(!html.includes('cdnjs.cloudflare.com'), 'Rendered HTML must not reference cdnjs.cloudflare.com');

    // Assert local standalone script is referenced
    assert.ok(
      html.includes('/api-docs/scalar.standalone.js') || html.includes('/scalar.standalone.js'),
      'Rendered HTML must reference local scalar.standalone.js'
    );

    // Assert data-url points to openapi.json
    assert.ok(
      html.includes('openapi.json'),
      'Rendered HTML must reference openapi.json endpoint'
    );
  } finally {
    server.close();
  }

  console.log('[Test 3.2] Passed: translation parity and security checks confirmed.');
}

// ---------------------------------------------------------------------------
// Task 3.3: Threat Matrix & Endpoint Guard Testing
// ---------------------------------------------------------------------------
export async function testThreatMatrix() {
  console.log('[Test 3.3] Verifying threat matrix and endpoint guard...');

  const docsRoutesModule = await import('../src/routes/docsRoutes.js');
  const docsRouter = docsRoutesModule.default;

  const testApp = express();
  testApp.use('/api-docs', docsRouter);

  // Fallback 404 handler mimicking LinkStash app.js
  testApp.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Ruta no encontrada',
      errorCode: 'NOT_FOUND',
      path: req.originalUrl || req.baseUrl + req.path
    });
  });

  const server = http.createServer(testApp);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // 1. Path traversal attempts
    // Using raw http.request to preserve traversal sequences without client normalization
    const traversalPaths = [
      '/api-docs/../.env',
      '/api-docs/..%2f.env',
      '/api-docs/%2e%2e/.env',
      '/api-docs/..\\package.json'
    ];

    for (const p of traversalPaths) {
      const res = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: p,
          method: 'GET'
        }, resolve);
        req.on('error', reject);
        req.end();
      });
      assert.strictEqual(
        res.statusCode,
        404,
        `Path traversal attempt ${p} must return 404 (got ${res.statusCode})`
      );
    }

    // 2. Script and unallowed file extensions
    const blockedFiles = [
      '/api-docs/test.sh',
      '/api-docs/README.sh',
      '/api-docs/CMakeLists.txt',
      '/api-docs/requirements.txt',
      '/api-docs/config.json',
      '/api-docs/index.php'
    ];

    for (const p of blockedFiles) {
      const res = await fetch(`http://127.0.0.1:${port}${p}`);
      assert.strictEqual(
        res.status,
        404,
        `Request to ${p} must return 404 (got ${res.status})`
      );
    }

    // 3. Allowed endpoints must succeed
    const allowed = [
      { path: '/api-docs', expectedStatus: 200, contentType: 'text/html' },
      { path: '/api-docs/es', expectedStatus: 200, contentType: 'text/html' },
      { path: '/api-docs/openapi.json', expectedStatus: 200, contentType: 'application/json' },
      { path: '/api-docs/openapi.json?lang=es', expectedStatus: 200, contentType: 'application/json' },
      { path: '/api-docs/scalar.standalone.js', expectedStatus: 200, contentType: 'application/javascript' }
    ];

    for (const item of allowed) {
      const res = await fetch(`http://127.0.0.1:${port}${item.path}`);
      assert.strictEqual(
        res.status,
        item.expectedStatus,
        `Allowed endpoint ${item.path} should return ${item.expectedStatus} (got ${res.status})`
      );
      const ct = res.headers.get('content-type') || '';
      assert.ok(
        ct.includes(item.contentType),
        `Endpoint ${item.path} content-type should contain ${item.contentType} (got ${ct})`
      );
    }

    // 4. Content Security Policy on /api-docs
    const rootRes = await fetch(`http://127.0.0.1:${port}/api-docs`);
    const csp = rootRes.headers.get('content-security-policy') || '';
    assert.ok(csp.length > 0, 'Content-Security-Policy header must be present on /api-docs');
    assert.ok(csp.includes("script-src"), 'CSP must define script-src');
    assert.ok(!csp.includes("'unsafe-eval'"), 'CSP must NOT allow unsafe-eval');
    assert.ok(!csp.includes('cdn.jsdelivr.net'), 'CSP must NOT allow external CDNs');

    // 5. Caching headers & ETag revalidation (Triangulation)
    const jsRes = await fetch(`http://127.0.0.1:${port}/api-docs/scalar.standalone.js`);
    const jsCache = jsRes.headers.get('cache-control') || '';
    const jsEtag = jsRes.headers.get('etag');
    assert.ok(
      jsCache.includes('immutable') && jsCache.includes('86400'),
      `scalar.standalone.js must have Cache-Control: public, max-age=86400, immutable (got ${jsCache})`
    );
    assert.ok(jsEtag, 'scalar.standalone.js must have an ETag header');

    // 304 Not Modified when ETag matches
    const js304Res = await fetch(`http://127.0.0.1:${port}/api-docs/scalar.standalone.js`, {
      headers: { 'if-none-match': jsEtag }
    });
    assert.strictEqual(js304Res.status, 304, 'scalar.standalone.js with matching ETag must return 304');

    const jsonRes = await fetch(`http://127.0.0.1:${port}/api-docs/openapi.json`);
    const jsonCache = jsonRes.headers.get('cache-control') || '';
    const jsonEtag = jsonRes.headers.get('etag');
    assert.ok(
      jsonCache.includes('must-revalidate') && jsonCache.includes('3600'),
      `openapi.json must have Cache-Control: public, max-age=3600, must-revalidate (got ${jsonCache})`
    );
    assert.ok(jsonEtag, 'openapi.json must have an ETag header');

    const json304Res = await fetch(`http://127.0.0.1:${port}/api-docs/openapi.json`, {
      headers: { 'if-none-match': jsonEtag }
    });
    assert.strictEqual(json304Res.status, 304, 'openapi.json with matching ETag must return 304');

    // 6. Spanish HTML view and method restrictions (Triangulation)
    const esHtmlRes = await fetch(`http://127.0.0.1:${port}/api-docs/es`);
    const esHtml = await esHtmlRes.text();
    assert.ok(
      esHtml.includes('data-url="/api-docs/openapi.json?lang=es"'),
      'Spanish HTML view must reference localized spec endpoint'
    );
    assert.ok(
      esHtml.includes('lang="es"'),
      'Spanish HTML view must have lang="es"'
    );

    const postRes = await fetch(`http://127.0.0.1:${port}/api-docs`, { method: 'POST' });
    assert.strictEqual(postRes.status, 404, 'POST /api-docs should return 404');

  } finally {
    server.close();
  }

  console.log('[Test 3.3] Passed: threat matrix and endpoint guard verified.');
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------
async function runAll() {
  console.log('=== Starting OpenAPI Parity & Threat Matrix Tests ===\n');

  await testRouteParity();
  await testTranslationAndSecurity();
  await testThreatMatrix();

  console.log('\n=== All OpenAPI Parity & Threat Matrix Tests Passed! ===');
}

runAll().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
