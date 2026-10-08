import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

/**
 * Deep merge Spanish overlay into canonical OpenAPI specification.
 * Replaces info metadata, endpoint summaries, descriptions, and component schema titles/descriptions.
 *
 * @param {string|object} canonical - Canonical English specification
 * @param {string|object} overlay - Spanish translation overlay
 * @returns {object} Merged specification
 */
export function mergeSpec(canonical, overlay) {
  const base = typeof canonical === 'string' ? YAML.parse(canonical) : structuredClone(canonical);
  const over = typeof overlay === 'string' ? YAML.parse(overlay) : structuredClone(overlay);

  function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        deepMerge(target[key], source[key]);
      } else {
        target[key] = structuredClone(source[key]);
      }
    }
    return target;
  }

  return deepMerge(base, over);
}

// ---------------------------------------------------------------------------
// In-Memory Preloaded Specs & Bundle
// ---------------------------------------------------------------------------

const canonicalPath = path.join(backendRoot, 'docs', 'openapi', 'openapi.yaml');
const overlayPath = path.join(backendRoot, 'docs', 'openapi', 'openapi.es.yaml');
const scalarBundlePath = path.join(backendRoot, 'public', 'scalar', 'scalar.standalone.js');

let canonicalSpec = {};
let overlaySpec = {};
let mergedSpec = {};
let canonicalJson = '{}';
let mergedJson = '{}';
let etagCanonical = '';
let etagMerged = '';
let scalarBundle = '';
let etagScalar = '';

function computeEtag(content) {
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}

try {
  if (fs.existsSync(canonicalPath)) {
    const rawCanonical = fs.readFileSync(canonicalPath, 'utf8');
    canonicalSpec = YAML.parse(rawCanonical);
    canonicalJson = JSON.stringify(canonicalSpec);
    etagCanonical = computeEtag(canonicalJson);
  }

  if (fs.existsSync(overlayPath)) {
    const rawOverlay = fs.readFileSync(overlayPath, 'utf8');
    overlaySpec = YAML.parse(rawOverlay);
    mergedSpec = mergeSpec(canonicalSpec, overlaySpec);
    mergedJson = JSON.stringify(mergedSpec);
    etagMerged = computeEtag(mergedJson);
  }

  if (fs.existsSync(scalarBundlePath)) {
    scalarBundle = fs.readFileSync(scalarBundlePath, 'utf8');
    etagScalar = computeEtag(scalarBundle);
  }
} catch (err) {
  console.error('Error preloading OpenAPI documentation artifacts:', err);
}

// ---------------------------------------------------------------------------
// HTML Template Renderer
// ---------------------------------------------------------------------------

function renderDocsHtml({ lang = 'en' } = {}) {
  const isEs = lang === 'es';
  const pageTitle = isEs ? 'LinkStash Referencia de API' : 'LinkStash API Reference';
  const subtitle = isEs ? 'Documentación interactiva de la API' : 'Interactive REST API Reference';
  const specUrl = isEs ? '/api-docs/openapi.json?lang=es' : '/api-docs/openapi.json';

  const config = JSON.stringify({
    theme: 'default',
    hideTestRequestButton: true,
    hideClientButton: true,
    hideModels: false,
    authentication: false
  });

  return `<!doctype html>
<html lang="${isEs ? 'es' : 'en'}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pageTitle}</title>
    <link rel="icon" type="image/svg+xml" href="/defaults/default-image.svg" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .docs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        background: #1e293b;
        border-bottom: 1px solid #334155;
        font-size: 14px;
      }
      .docs-title strong {
        color: #38bdf8;
      }
      .docs-title span {
        color: #94a3b8;
        margin-left: 6px;
      }
      .lang-switcher a {
        color: #38bdf8;
        text-decoration: none;
        padding: 4px 10px;
        border-radius: 4px;
        border: 1px solid transparent;
        transition: all 0.2s;
        margin-left: 8px;
        font-size: 13px;
      }
      .lang-switcher a:hover {
        border-color: #38bdf8;
      }
      .lang-switcher a[aria-current="page"] {
        color: #f8fafc;
        background: #334155;
        border-color: #475569;
        font-weight: 600;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <header class="docs-header" role="banner">
      <div class="docs-title">
        <strong>LinkStash API</strong>
        <span>&bull; ${subtitle}</span>
      </div>
      <nav class="lang-switcher" aria-label="Language selection">
        <a href="/api-docs" ${!isEs ? 'aria-current="page"' : ''}>English</a>
        <a href="/api-docs/es" ${isEs ? 'aria-current="page"' : ''}>Español</a>
      </nav>
    </header>
    <script
      id="api-reference"
      type="application/json"
      data-url="${specUrl}"
      data-configuration='${config}'>
    </script>
    <script src="/api-docs/scalar.standalone.js"></script>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Docs Router
// ---------------------------------------------------------------------------

const router = express.Router();

// Route-scoped Content Security Policy
// Restricts scripts strictly to self (no unsafe-eval, no CDNs)
// Relaxes styles to self + unsafe-inline and fonts to self + data: solely for documentation rendering
router.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self';"
  );
  next();
});

// Guard: Restrict router strictly to allowed endpoints and block path traversal / unauthorized files
router.use((req, res, next) => {
  const normPath = req.path.replace(/\/$/, '') || '/';
  const allowed = ['/', '/es', '/openapi.json', '/scalar.standalone.js'];

  // Check traversal patterns or unallowed paths
  if (
    !allowed.includes(normPath) ||
    req.path.includes('..') ||
    (req.originalUrl && req.originalUrl.includes('..')) ||
    req.url.includes('..')
  ) {
    return res.status(404).json({
      success: false,
      message: 'Ruta no encontrada',
      errorCode: 'NOT_FOUND',
      path: req.originalUrl || req.baseUrl + req.path,
      method: req.method
    });
  }
  next();
});

// GET /api-docs/scalar.standalone.js (Vendored standalone bundle with immutable caching)
router.get('/scalar.standalone.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('ETag', etagScalar);

  if (req.headers['if-none-match'] === etagScalar) {
    return res.status(304).end();
  }

  res.status(200).send(scalarBundle);
});

// GET /api-docs/openapi.json (In-memory canonical or Spanish OpenAPI spec with revalidation caching)
router.get('/openapi.json', (req, res) => {
  const isEs = req.query.lang === 'es';
  const content = isEs ? mergedJson : canonicalJson;
  const etag = isEs ? etagMerged : etagCanonical;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
  res.setHeader('ETag', etag);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.status(200).send(content);
});

// GET /api-docs/es (Spanish documentation view)
router.get('/es', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderDocsHtml({ lang: 'es' }));
});

// GET /api-docs / (Canonical documentation view, query ?lang=es supported)
router.get('/', (req, res) => {
  const lang = req.query.lang === 'es' ? 'es' : 'en';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderDocsHtml({ lang }));
});

export default router;
