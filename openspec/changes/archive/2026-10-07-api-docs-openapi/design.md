# Design: Accurate, Bilingual OpenAPI Docs for LinkStash API

## Technical Approach

Replace the outdated static documentation (`backend/public/api-docs/*`) with a modular router (`backend/src/routes/docsRoutes.js`) mounted at `/api-docs`. The router serves a self-hosted, version-pinned Scalar renderer without CDN dependencies. An OpenAPI 3.1 canonical English specification (`backend/docs/openapi/openapi.yaml`) is augmented with a Spanish translation overlay (`backend/docs/openapi/openapi.es.yaml`), deep-merged in memory at startup. Both global rate limiting and route-scoped Content Security Policy (CSP) are enforced. Automated parity tests (`backend/test/openapi_parity.mjs`) inspect Express route definitions directly (bypassing `app.listen`) to guarantee route coverage, translation synchronization, and try-it UI suppression.

## Architecture Decisions

### Decision: Documentation Renderer & Hosting
| Option | Tradeoffs | Decision |
|---|---|---|
| CDN-hosted Scalar / Swagger UI | External network dependency, CDN downtime risk, relaxed CSP required | Rejected |
| Standalone Redoc bundle | Clean read-only rendering, but slower multi-tag navigation and limited dark-mode toggling | Rejected |
| Pinned `@scalar/api-reference` standalone bundle | Self-hosted, offline-capable, highly responsive, configurable read-only mode | **Adopted**: Vendor pinned standalone bundle at `backend/public/scalar/scalar.standalone.js`. Explicitly configure `hideTestRequestButton: true`, `hideClientButton: true`, and `authentication: false`. |

### Decision: Bilingual Spec Architecture & Route Toggling
| Option | Tradeoffs | Decision |
|---|---|---|
| Duplicate full YAML specs per locale | Risk of structural schema drift and double maintenance burden | Rejected |
| Inline localization keys in single YAML | Non-standard OpenAPI 3.1 syntax; breaks standard tooling and linters | Rejected |
| Sparse translation overlay (`openapi.es.yaml`) | Zero structural duplication; overlay only translates `title`, `summary`, and `description` | **Adopted**: Deep-merge overlay into canonical EN spec in memory. Serve EN at `/api-docs` (with `?lang=es` toggle) and alias `/api-docs/es`. Spec endpoint `/api-docs/openapi.json?lang=es|en` outputs localized JSON. |

### Decision: Rate Limiting & Caching Headers
| Option | Tradeoffs | Decision |
|---|---|---|
| Bypass rate limiter for docs | High exposure to DoS and resource starvation | Rejected |
| Dedicated restrictive limiter without caching | Legitimate browsing exceeds token budget quickly | Rejected |
| Global rate limiter + HTTP caching headers | Protects against DDoS while preventing rate-limit exhaustion for legitimate visits | **Adopted**: Keep `/api-docs` under the global rate limiter (60 req/min). Apply `Cache-Control: public, max-age=86400, immutable` + `ETag` for static assets; `Cache-Control: public, max-age=3600, must-revalidate` + `ETag` for spec JSON. |

### Decision: Route-Scoped Security Headers (CSP)
| Option | Tradeoffs | Decision |
|---|---|---|
| Relax CSP globally in `backend/app.js` | Weakens application-wide security posture | Rejected |
| Scoped `helmet.contentSecurityPolicy` on docs router | Isolates relaxations strictly to `/api-docs`; preserves strict global security | **Adopted**: Restrict `scriptSrc: ['self']` (no `'unsafe-eval'`, no CDN). Relax `styleSrc: ['self', 'unsafe-inline']` and `fontSrc: ['self', 'data:']` solely on `docsRouter`. |

## Data Flow

```
Client ──[GET /api-docs?lang=es]──→ app.js (Global Rate Limiter)
                                         │
                                         ▼
                                  docsRouter (Scoped CSP)
                                         │
               ┌─────────────────────────┴─────────────────────────┐
               ▼                                                   ▼
       [GET /api-docs]                                [GET /api-docs/openapi.json?lang=es]
       Renders HTML shell referencing                 Serves pre-merged in-memory spec
       vendored /api-docs/scalar.standalone.js        (canonical openapi.yaml +
       with read-only configuration                   overlay openapi.es.yaml)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/docs/openapi/openapi.yaml` | Create | Canonical OpenAPI 3.1 specification (English) covering all real mounted endpoints. |
| `backend/docs/openapi/openapi.es.yaml` | Create | Spanish translation overlay (summaries, descriptions, info metadata only). |
| `backend/src/routes/docsRoutes.js` | Create | Express router: route-scoped CSP, spec merger, caching headers, and Scalar HTML endpoint. |
| `backend/public/scalar/scalar.standalone.js` | Create | Pinned, self-hosted Scalar browser bundle vendored from `@scalar/api-reference`. |
| `backend/test/openapi_parity.mjs` | Create | Unit test verifying Express router parity, translation sync, and try-it UI absence. |
| `backend/app.js` | Modify | Mount `docsRoutes` at `/api-docs`; remove static docs mount; preserve `GET /` link. |
| `backend/package.json` | Modify | Add `yaml` dependency and `@scalar/api-reference`; add `openapi_parity.mjs` to `test:unit`. |
| `backend/public/api-docs/index.html` | Delete | Remove obsolete static documentation HTML. |
| `backend/public/api-docs/styles.css` | Delete | Remove obsolete static documentation CSS. |

## Interfaces / Contracts

```javascript
// backend/src/routes/docsRoutes.js contract
export function mergeSpec(canonicalYaml, overlayYaml) {
  // Clones canonical spec; traverses overlay to replace info, summaries, and descriptions only.
}

// Scalar HTML configuration contract (read-only, no CDN, no auth tokens)
const scalarConfiguration = {
  spec: { url: '/api-docs/openapi.json' }, // Appends ?lang=es when requested
  hideTestRequestButton: true,
  hideClientButton: true,
  hideModels: false,
  authentication: false
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (`test/openapi_parity.mjs`) | Route parity | Imports `authRoutes.js`, `linkRoutes.js`, `tagRoutes.js`, `dashboardRoutes.js`; verifies exact match against `openapi.yaml`. |
| Unit (`test/openapi_parity.mjs`) | Translation sync | Validates every operation in `openapi.yaml` has a corresponding Spanish entry in `openapi.es.yaml` with zero orphan keys. |
| Unit (`test/openapi_parity.mjs`) | Try-it & CDN absence | Inspects rendered HTML & config; asserts `hideTestRequestButton: true`, absence of try-it/auth elements, and no CDN links. |
| Integration | Headers & Rate limiting | Validates `/api-docs` returns route-scoped CSP, `ETag`, and `Cache-Control` while remaining throttled under global limiter. |

## Threat Matrix

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` | Applicable | Router restricts endpoints strictly to `/api-docs`, `/api-docs/es`, `/api-docs/openapi.json`, and `/api-docs/scalar.standalone.js`. Non-allowed file extensions or directory traversals return 404 without execution. | Request `/api-docs/../.env` and `/api-docs/test.sh`; assert 404 response. |
| Git repository selection | `git -C`, relative paths, absolute paths | N/A | Documentation router serves static spec data without invoking Git commands. | None |
| Commit state | staged, `commit -a`, empty index | N/A | No VCS automation or commit state handling exists in documentation endpoints. | None |
| Push state | tracking branch, first push, explicit refspec | N/A | No remote push operations or ref resolutions exist in the documentation boundary. | None |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A | No PR command generation or CLI shell invocation exists in documentation routes. | None |

## Migration / Rollout

1. Install `yaml` and pinned `@scalar/api-reference` into `backend/package.json`. Vendor bundle to `backend/public/scalar/scalar.standalone.js`.
2. Author `backend/docs/openapi/openapi.yaml` and translation overlay `backend/docs/openapi/openapi.es.yaml`.
3. Implement `backend/src/routes/docsRoutes.js` and mount in `backend/app.js`, replacing `backend/public/api-docs/*`.
4. Add `backend/test/openapi_parity.mjs` and register in `backend/package.json` `test:unit` script.
5. No database migration or data alteration required. Rollback reverts git commit to restore static files.

## Open Questions

None. All architectural constraints and user decisions are fully specified.
