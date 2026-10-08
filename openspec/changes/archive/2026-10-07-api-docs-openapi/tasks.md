# Tasks: Accurate, Bilingual OpenAPI Docs for LinkStash API

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~1,200 - 1,500 lines (+750 / -450, excluding vendored bundle) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Specs & Assets) → PR 2 (Router, Tests & Integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Dependencies, vendored bundle, and OpenAPI specs | PR 1 | `node -e "import('yaml')"` | N/A (Spec and asset authoring) | Revert `backend/docs/openapi/*`, `backend/public/scalar/*`, `package.json` |
| 2 | Parity & security tests, docs router, and app wiring | PR 2 | `pnpm run test:unit` | `curl -i http://localhost:5000/api-docs` | Revert `backend/src/routes/docsRoutes.js`, `backend/app.js`, restore `backend/public/api-docs/*` |

## Phase 1: Foundation & Vendoring

- [x] 1.1 Install `yaml` and pinned `@scalar/api-reference` in `backend/package.json`.
- [x] 1.2 Vendor standalone Scalar bundle to `backend/public/scalar/scalar.standalone.js` without external CDN references.

## Phase 2: OpenAPI Specifications

- [x] 2.1 Author canonical `backend/docs/openapi/openapi.yaml` covering all real mounted Express routes, schemas, and generic `/health` while omitting phantom endpoints (`/api/metrics`, `/api/dashboard/summary`).
- [x] 2.2 Author Spanish overlay `backend/docs/openapi/openapi.es.yaml` with localized titles, summaries, and descriptions mirroring English operationIds.

## Phase 3: Parity & Threat-Matrix Testing (TDD RED)

- [x] 3.1 Create failing RED test in `backend/test/openapi_parity.mjs` verifying path and method parity against mounted routes (`authRoutes.js`, `linkRoutes.js`, `tagRoutes.js`, `dashboardRoutes.js`).
- [x] 3.2 Add failing RED tests in `backend/test/openapi_parity.mjs` asserting EN/ES translation key parity, try-it UI absence (`hideTestRequestButton: true`), and zero leakage of Supabase or production hosts.
- [x] 3.3 Add failing RED tests in `backend/test/openapi_parity.mjs` asserting 404 on path traversal (`/api-docs/../.env`) and non-allowed file extensions (`/api-docs/test.sh`, `README.sh`).

## Phase 4: Docs Router & Integration (TDD GREEN)

- [x] 4.1 Implement `backend/src/routes/docsRoutes.js` with `mergeSpec()`, route-scoped CSP, caching headers (`Cache-Control`, `ETag`), and read-only Scalar HTML template.
- [x] 4.2 Restrict `backend/src/routes/docsRoutes.js` endpoints to allowed paths, returning 404 for traversals or non-allowed file extensions to turn Phase 3 tests green.
- [x] 4.3 Mount `docsRoutes` at `/api-docs` in `backend/app.js` under global rate limiter and update root `/` route doc pointer.
- [x] 4.4 Add `node test/openapi_parity.mjs` to `test:unit` in `backend/package.json`.

## Phase 5: Cleanup & Verification

- [x] 5.1 Delete obsolete static documentation files `backend/public/api-docs/index.html` and `backend/public/api-docs/styles.css`.
- [x] 5.2 Execute `pnpm run test:unit` to verify full test suite passes.
