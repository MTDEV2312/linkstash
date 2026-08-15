# Proposal: Supabase Auth & Storage Migration

## Intent
Migrate **Authentication** (from legacy custom JWT / bcrypt) and **Image Storage** (from InsForge Storage BaaS) to a **Self-Hosted Supabase** stack (GoTrue Auth, Supabase Storage API, Kong API Gateway, Internal PostgreSQL), while keeping **MongoDB** strictly as the primary application database for domain models (`Link`, `Tag`, `User`).

## Primary Constraints & Core Principles
> [!IMPORTANT]
> **MongoDB MUST remain the primary application database.**
> Supabase PostgreSQL will only be used internally by Supabase Self-Hosted system schemas (`auth` and `storage`). All business logic, link metadata, tag counts, scraping statuses, and user profiles remain in MongoDB.

## Scope

### In Scope
- **Infrastructure**: Docker Compose configuration for local/self-hosted Supabase services (Kong Gateway, GoTrue Auth, Supabase Storage API, internal PostgreSQL).
- **Backend Auth Migration**: Refactoring Express authentication middleware (`authMiddleware.js`) to verify Supabase JWTs locally using `SUPABASE_JWT_SECRET` without per-request auth HTTP calls.
- **Backend Storage Migration**: Refactoring `StorageService.js` to replace `@insforge/sdk` with `@supabase/supabase-js` storage API targeting a public `images` bucket.
- **MongoDB Schema Adjustments**:
  - `User`: Add `supabaseId` field (indexed, unique string UUID) and make `password` optional.
  - `Link` & `Tag`: Update `userId` field type from MongoDB ObjectId reference to String (storing Supabase UUID string).
- **Data Migration Utilities**:
  - `migrate-users-to-supabase.js`: CLI script migrating existing MongoDB user accounts and bcrypt password hashes directly to Supabase `auth.users` with zero password reset required. Supports `--dry-run`.
  - `migrate-images-to-supabase.js`: CLI script downloading existing InsForge binaries and re-uploading them to Supabase Storage, updating MongoDB references. Supports `--dry-run`.
- **Frontend Integration**:
  - Refactoring frontend auth client (`authService.js`), Zustand state management (`authStore.js`), and Axios interceptors (`api.js`) to consume `@supabase/supabase-js`.
- **Cleanup**: Complete removal of `@insforge/sdk` dependency and InsForge environment variable bindings.

### Out of Scope
- Migrating MongoDB domain data (`links`, `tags`, background scraping queues) to Supabase PostgreSQL.
- Modifying core application features, web scraping scrapers (BullMQ/Redis), or full-text search pipelines beyond updating `userId` references.
- Adding third-party OAuth providers (Google, GitHub, etc.) in this iteration.

## Capabilities

### New Capabilities
- **Supabase Authentication**: Standardized authentication system via GoTrue supporting JWT issuance, session refreshes, and native bcrypt password hash ingestion.
- **Self-Hosted Supabase Image Storage**: S3-compatible object storage for link previews, scraped thumbnails, and user avatar uploads managed via Supabase Storage API.
- **CLI Migration Utilities**: Idempotent data migration tools with dry-run capabilities for safely transferring user credentials and binary assets.

### Modified Capabilities
- **Express Backend Authorization**: High-performance local JWT signature verification via `SUPABASE_JWT_SECRET` eliminating external HTTP requests on protected routes.
- **Frontend Session Management**: Persistent React session state backed by `@supabase/supabase-js` event listeners and Zustand state store.
- **Image Upload Service**: Refactored backend storage service utilizing `@supabase/supabase-js` bucket operations.

## Approach

1. **Phase 1: Environment & Self-Hosted Supabase Setup**
   - Configure local Docker Compose stack (`Kong`, `GoTrue`, `Storage`, `Internal Postgres`).
   - Provision default public storage bucket (`images`).
2. **Phase 2: Backend Supabase Client & Storage Integration**
   - Install `@supabase/supabase-js` in backend `package.json`.
   - Create `backend/src/config/supabase.js` initializing service-role admin and standard clients.
   - Refactor `backend/src/services/StorageService.js` to upload/delete assets via Supabase Storage API.
3. **Phase 3: Backend Auth Middleware & Controller Migration**
   - Refactor `backend/src/middlewares/authMiddleware.js` to decode and locally verify Supabase JWT signatures using `SUPABASE_JWT_SECRET`.
   - Update `backend/src/controllers/authController.js` for GoTrue registration/login proxying or session sync.
4. **Phase 4: Schema Adjustments in MongoDB**
   - Update `User` schema: add `supabaseId: { type: String, unique: true, sparse: true, index: true }`.
   - Update `Link` & `Tag` schemas: set `userId: { type: String, required: true, index: true }`.
5. **Phase 5: Data Migration Execution**
   - Run `backend/src/scripts/migrate-users-to-supabase.js` to import legacy bcrypt password hashes and update MongoDB `supabaseId` & `userId` references.
   - Run `backend/src/scripts/migrate-images-to-supabase.js` to transfer InsForge storage binaries to Supabase Storage.
6. **Phase 6: Frontend Integration**
   - Install `@supabase/supabase-js` in frontend `package.json`.
   - Update `frontend/src/services/authService.js` and `frontend/src/stores/authStore.js` to manage Supabase auth state.
   - Update `frontend/src/services/api.js` Axios interceptor to attach Supabase session tokens.
7. **Phase 7: Final Validation & Cleanup**
   - Execute integration test suite and perform E2E validation.
   - Uninstall `@insforge/sdk` and remove legacy InsForge environment variables.

## Affected Areas

- [backend/package.json](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/package.json)
- [frontend/package.json](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/package.json)
- [backend/src/config/supabase.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/config/supabase.js) *(New)*
- [backend/src/config/defaults.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/config/defaults.js)
- [backend/src/services/StorageService.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/services/StorageService.js)
- [backend/src/middlewares/authMiddleware.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/middlewares/authMiddleware.js)
- [backend/src/controllers/authController.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/controllers/authController.js)
- [backend/src/models/User.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/models/User.js)
- [backend/src/models/Link.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/models/Link.js)
- [backend/src/models/Tag.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/models/Tag.js)
- [backend/src/scripts/migrate-users-to-supabase.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/scripts/migrate-users-to-supabase.js) *(New)*
- [backend/src/scripts/migrate-images-to-supabase.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/scripts/migrate-images-to-supabase.js) *(New)*
- [frontend/src/services/authService.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/services/authService.js)
- [frontend/src/stores/authStore.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/stores/authStore.js)
- [frontend/src/services/api.js](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/services/api.js)
- [.env](file:///C:/Users/agusm/Videos/DEV/LinkStash/.env) / [.env.example](file:///C:/Users/agusm/Videos/DEV/LinkStash/.env.example)
- [docker-compose.yml](file:///C:/Users/agusm/Videos/DEV/LinkStash/docker-compose.yml)

## Risks

1. **Authentication Latency Overhead**:
   - *Risk*: Verifying JWTs against Supabase over HTTP on every request adds external network latency.
   - *Mitigation*: Perform local JWT signature decoding and verification in `authMiddleware.js` using `SUPABASE_JWT_SECRET` (zero network overhead per request).
2. **User Login Disruption during Migration**:
   - *Risk*: Password format incompatibilities forcing user password resets.
   - *Mitigation*: Supabase GoTrue natively supports standard `bcrypt` password hashes. Migration script inserts existing bcrypt hashes directly into `auth.users`, requiring zero password resets.
3. **Broken Image Links**:
   - *Risk*: Interrupted migration or missing assets resulting in broken image URLs.
   - *Mitigation*: The image migration script is idempotent, supports `--dry-run`, and leaves original InsForge files untouched until migration is fully verified.
4. **User ID Inconsistency across MongoDB Collections**:
   - *Risk*: Mismatch between user IDs stored in `Link` and `Tag` documents and Supabase Auth UUIDs.
   - *Mitigation*: Migration script updates `User.supabaseId`, `Link.userId`, and `Tag.userId` atomically per user batch.

## Rollback Plan

If a critical failure occurs during cutover:
1. **Restore Primary Database**: Restore MongoDB from pre-migration backup (`mongodump`).
2. **Revert Application Code**: Roll back git branch to restore `authMiddleware.js`, `StorageService.js`, and `@insforge/sdk` package dependencies.
3. **Revert Environment Variables**: Re-enable `INSFORGE_URL` and `INSFORGE_ANON_KEY`.
4. **Data Integrity Guarantee**: Legacy InsForge assets and original MongoDB password hashes remain unmodified throughout the migration.

## Dependencies
- `@supabase/supabase-js` package (backend & frontend).
- Self-Hosted Docker Compose stack containing Kong Gateway, GoTrue Auth, Supabase Storage API, and PostgreSQL internal DB.

## Success Criteria
- [ ] Existing users log in seamlessly using original credentials without requiring password reset.
- [ ] New user registration creates Supabase Auth user and corresponding MongoDB `User` document.
- [ ] Express backend protected routes verify Bearer tokens locally using `SUPABASE_JWT_SECRET`.
- [ ] Automatic image scraping and manual file uploads save binaries to Supabase Storage `images` bucket and update MongoDB.
- [ ] Deletion of links removes associated binary assets from Supabase Storage.
- [ ] Complete test suite passes with zero `@insforge/sdk` references remaining.
