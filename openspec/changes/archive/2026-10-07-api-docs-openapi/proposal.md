# Proposal: Accurate, Bilingual OpenAPI Docs for LinkStash API

## Intent
The static docs (`backend/public/api-docs/index.html`, `styles.css`) are inaccurate: phantom endpoints (`/api/metrics`, `/api/dashboard/summary`), missing `POST /api/links/:id/scrape-preview`, wrong password/limit/status rules, hardcoded `localhost:5000`. Replace them with a spec-driven, read-only, bilingual (EN + neutral ES) reference that cannot silently drift from mounted routes.

## Scope
### In Scope
- Hand-written OpenAPI 3.1 spec as source of truth covering all real routes: auth, links, tags, `dashboard/overview`, `/health`, `/`.
- Spanish translation layer kept in sync with the English spec.
- Self-hosted, version-pinned renderer at `/api-docs` (no CDN), with search, copyable samples, light/dark, responsive, accessible UI.
- Short EN/ES guides: Quickstart, Authentication, Errors & Rate Limits.
- Route-scoped CSP for `/api-docs` only.
- Automated parity checks: spec ↔ Express routes, EN ↔ ES keys.

### Out of Scope
- Security fixes (SSRF, `$regex` injection, unwired Joi schemas, CORS, Redis password, Supabase fallbacks, error-shape unification) — separate change.
- Any try-it-out console or token handling in the page.
- Behavior changes to endpoints.

## Capabilities
### New Capabilities
- `api-reference-docs`: OpenAPI 3.1 spec, rendered read-only bilingual reference at `/api-docs`.
- `api-docs-parity-check`: test failing when spec paths/methods diverge from mounted routes or EN/ES keys diverge.

### Modified Capabilities
None

## Approach
- Spec at `backend/docs/openapi/openapi.yaml` (EN, canonical); ES via `openapi.es.yaml` overlay keyed by `operationId`/schema path (summaries, descriptions only).
- `servers` uses variables (no prod origins, no personal Supabase host). Env-driven values documented as "default X, configurable" (rate limit 60/60s, `MAX_BATCH_SIZE` 100, links 6, tags 5); token lifetime "set by auth provider".
- Image-from-URL internals described only at contract level; `/health` documents fields generically (no env/memory/version detail).
- Renderer vendored from `node_modules` (Scalar with request/test UI disabled, or Redoc); final pick in design.
- `helmet` CSP override mounted only on `/api-docs` router; global `helmet()` unchanged.
- New `backend/test/openapi_parity.mjs` imports `src/routes/*.js` (not `app.js`, which calls `listen`), added to `test:unit`.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `backend/public/api-docs/` | Removed/Replaced | Static HTML/CSS retired |
| `backend/docs/openapi/` | New | Spec, ES overlay, guides |
| `backend/app.js:143` | Modified | Docs router + scoped CSP |
| `backend/package.json` | Modified | Renderer, YAML parser, test script |
| `backend/test/` | New | Parity tests |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| EN/ES drift | Medium | Key-parity test in CI |
| Renderer exposes request UI | Low | Config disable + test asserting absence |
| CSP loosening leaks globally | Low | Router-scoped override; header test |
| Docs leak infra/insecure detail | Medium | Review checklist; grep test for hosts/env names |

## Rollback Plan
Revert the change commit: restores `express.static` mount and old static files; no data/schema impact.

## Dependencies
- Pinned renderer package, YAML parser (e.g. `yaml`).

## Success Criteria
- [ ] Every mounted route documented; no phantom paths (parity test green).
- [ ] EN/ES toggle works; key-parity test green.
- [ ] No try-it/console or token input rendered.
- [ ] Assets served locally; CSP relaxed only on `/api-docs`.
- [ ] No prod origins, Supabase host, or env/version internals in output.
- [ ] Lighthouse accessibility ≥ 90; usable at 360px width; dark mode works.
