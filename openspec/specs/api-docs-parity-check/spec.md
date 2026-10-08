# API Documentation Parity Check Specification

## Purpose
Automates parity, translation completeness, and security validation for the OpenAPI specification.

## Requirements

### Requirement: Route and Method Parity Validation
The test suite MUST verify 100% path and method parity between the OpenAPI spec and mounted Express routes. The test MUST fail if any mounted route is omitted or if nonexistent endpoints (`/api/metrics`, `/api/dashboard/summary`) are documented.

#### Scenario: Route Parity Verification Passes
- GIVEN an OpenAPI spec matching all mounted Express routes
- WHEN the parity test executes in `test:unit`
- THEN the test MUST pass with zero discrepancies

#### Scenario: Detecting Phantom or Omitted Routes
- GIVEN an OpenAPI spec containing phantom `/api/metrics` or missing `POST /api/links/:id/scrape-preview`
- WHEN the parity test executes
- THEN the test MUST fail with a route mismatch error

### Requirement: Translation Parity and Leak Prevention
The test suite MUST verify bidirectional key parity between English and Spanish specs. The test MUST assert no infrastructure leaks (Supabase hosts, production URLs) and that Scalar request consoles are disabled.

#### Scenario: Detecting Missing Spanish Keys
- GIVEN an English operation lacking a Spanish translation overlay
- WHEN the parity test executes
- THEN the test MUST fail and report the missing translation keys

#### Scenario: Enforcing Console Disabling and Leak Prevention
- GIVEN a spec or UI config containing a Supabase host or enabled try-it console
- WHEN the security test executes
- THEN the test MUST fail asserting prohibited URLs or interactive consoles
