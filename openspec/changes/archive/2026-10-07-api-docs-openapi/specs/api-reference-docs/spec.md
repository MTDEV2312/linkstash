# API Reference Documentation Specification

## Purpose
Provides an accurate, bilingual (EN/neutral ES), read-only API reference at `/api-docs` using self-hosted Scalar without CDN assets, masking infrastructure details and enforcing DDoS rate limits.

## Requirements

### Requirement: Read-Only Self-Hosted Scalar UI
The system MUST serve a pinned Scalar UI at `/api-docs` using local bundles without CDN dependencies. The UI MUST operate in read-only mode: interactive consoles, test runners, and token inputs MUST NOT be rendered. A route-scoped CSP MUST permit `/api-docs` assets without relaxing the global CSP.

#### Scenario: Rendering Read-Only UI
- GIVEN a request to `/api-docs`
- WHEN the server delivers the page
- THEN the UI MUST render via self-hosted Scalar bundles without CDN requests
- AND interactive try-it consoles and token inputs MUST NOT be rendered

#### Scenario: Route-Scoped CSP
- GIVEN requests to `/api-docs` and `/api/links`
- WHEN inspecting `Content-Security-Policy` headers
- THEN `/api-docs` MUST permit local documentation scripts
- AND `/api/links` MUST retain the global Helmet policy

### Requirement: Rate Limiting for Documentation Endpoints
Requests to `/api-docs` and its assets MUST remain subject to API rate limiting, returning HTTP 429 when exceeded.

#### Scenario: Exceeding Rate Limits on Documentation
- GIVEN client requests to `/api-docs` exceeding the rate limit threshold
- WHEN a subsequent request to `/api-docs` arrives
- THEN the server MUST return HTTP 429 Too Many Requests
- AND the response MUST include error code `RATE_LIMIT_EXCEEDED`

#### Scenario: Requests Within Rate Limits
- GIVEN a client within rate limit quota
- WHEN requesting `/api-docs`
- THEN the server MUST return HTTP 200 and increment the client request counter

### Requirement: Bilingual Content and Masking
The OpenAPI 3.1 spec MUST document all mounted routes without phantom endpoints. The UI MUST support switching between English and neutral Spanish in-place. The spec MUST NOT expose Supabase hosts, production origins, or runtime internals. Configurable limits MUST be documented as "default X, configurable".

#### Scenario: Switching UI Language
- GIVEN a user at `/api-docs`
- WHEN toggling language between English and Spanish
- THEN endpoint descriptions and guides MUST update in neutral Spanish
- AND active scroll and navigation state MUST be preserved

#### Scenario: Masking Infrastructure Details
- GIVEN the published OpenAPI spec at `/api-docs`
- WHEN inspecting servers and endpoint schemas
- THEN servers MUST use variable hosts without Supabase or production origins
- AND `/health` MUST describe fields generically without runtime internals
