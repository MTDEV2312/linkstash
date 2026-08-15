# Auth System Specification

## Purpose
The `auth-system` domain governs user identity, authentication, session state management, and authorization across the application. This specification defines the migration from legacy custom JWT and bcrypt authentication to self-hosted Supabase GoTrue Auth, local JWT token verification middleware, zero-password-reset hash migration, and frontend state synchronization while retaining MongoDB as the application user profile database.

## Requirements

### Requirement: Supabase GoTrue Auth Integration
The system MUST authenticate user credentials via Supabase GoTrue Auth using `@supabase/supabase-js`. 

On successful user registration or login, the backend auth controller SHALL map the Supabase user UUID (`supabaseId`) to the corresponding MongoDB `User` document. If a new user registers through Supabase Auth, the backend MUST create a corresponding MongoDB `User` document containing `supabaseId`, `email`, and profile metadata.

#### Scenario: Authenticating Existing User via Supabase GoTrue
- GIVEN a registered user with valid email and password credentials
- WHEN the client sends an authentication request to Supabase GoTrue Auth
- THEN Supabase GoTrue MUST validate the credentials and issue a valid JWT access token and refresh token
- AND the application SHALL map the token's `sub` claim (Supabase UUID) to the user's MongoDB record

#### Scenario: Provisioning MongoDB User Profile on New Registration
- GIVEN a new user submitting registration credentials (email and password)
- WHEN Supabase GoTrue creates a new identity record and returns the assigned user UUID
- THEN the system MUST insert a new `User` document into MongoDB containing `supabaseId` set to the Supabase UUID and `email` set to the user email

---

### Requirement: Zero-Reset Bcrypt Password Hash Migration
The user migration utility MUST read legacy user records from MongoDB and ingest existing bcrypt password hashes directly into the Supabase PostgreSQL `auth.users` table without modifying original user passwords or requiring password resets.

The migration script MUST update the MongoDB `User` document with the generated Supabase `supabaseId` UUID and update `userId` references across `Link` and `Tag` collections from ObjectId to the Supabase UUID string.

The migration script MUST support a `--dry-run` flag that validates user records, checks hash compatibility, and previews database updates without performing mutations.

#### Scenario: Ingesting Legacy Password Hash into GoTrue
- GIVEN legacy MongoDB `User` records containing bcrypt password hashes and no `supabaseId`
- WHEN the migration script `migrate-users-to-supabase.js` executes
- THEN it MUST write the legacy user email and bcrypt password hash directly into Supabase `auth.users`
- AND it SHALL update the MongoDB `User` document with `supabaseId` set to the created Supabase UUID
- AND it SHALL update all `Link` and `Tag` documents matching the user's legacy `_id` with the new `userId` Supabase UUID string

#### Scenario: Dry-Run User Migration Validation
- GIVEN a populated MongoDB user collection
- WHEN the migration script executes with the `--dry-run` flag
- THEN it MUST simulate the migration process, count target users, and log proposed database updates
- AND it MUST NOT execute any write operations on Supabase PostgreSQL or MongoDB

---

### Requirement: Local JWT Verification Middleware
The Express backend authorization middleware (`authMiddleware`) MUST perform local cryptographic signature verification on incoming `Authorization: Bearer <token>` HTTP headers using `SUPABASE_JWT_SECRET`.

The middleware MUST NOT execute per-request HTTP calls to Supabase GoTrue or Kong Gateway for token verification.

On successful token verification, the middleware SHALL attach decoded user claim information (including `supabaseId` and `email`) to `req.user`. If the token header is missing, expired, malformed, or fails signature validation, the middleware MUST immediately reject the request with HTTP status `401 Unauthorized`.

#### Scenario: Authorized Request with Valid Local JWT Signature
- GIVEN an incoming HTTP request to a protected backend route with header `Authorization: Bearer <valid_supabase_jwt>`
- WHEN `authMiddleware` processes the request
- THEN it MUST verify the JWT signature locally using `SUPABASE_JWT_SECRET`
- AND it SHALL populate `req.user` with `{ id: decoded.sub, email: decoded.email }` and call `next()`

#### Scenario: Rejection of Expired or Invalid Bearer Token
- GIVEN an incoming HTTP request containing an expired or tampered Supabase JWT
- WHEN `authMiddleware` processes the request
- THEN it MUST fail signature or expiration verification locally without external network requests
- AND it MUST respond with HTTP status `401 Unauthorized` and an appropriate JSON error payload

---

### Requirement: Frontend Session and State Synchronization
The frontend application MUST use `@supabase/supabase-js` within `authService.js` and `authStore.js` to manage active session tokens and subscribe to auth state changes (`onAuthStateChange`).

The Axios API client (`api.js`) MUST intercept outgoing HTTP requests and automatically attach the active Supabase JWT access token to the `Authorization` header.

#### Scenario: Subscription to Auth State Changes
- GIVEN a React client initialized with `@supabase/supabase-js`
- WHEN a user signs in, signs out, or token refresh occurs
- THEN `onAuthStateChange` MUST fire and update Zustand `authStore` with the current session state and user details

#### Scenario: Automatic Bearer Header Injection in Axios Interceptor
- GIVEN an active Supabase user session in the frontend application
- WHEN an API request is initiated via Axios (`api.js`)
- THEN the request interceptor MUST retrieve the active access token from Supabase session storage
- AND it SHALL inject header `Authorization: Bearer <access_token>` into the request configuration
