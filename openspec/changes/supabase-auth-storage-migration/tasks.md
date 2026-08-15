# Tasks: Supabase Auth & Storage Migration

## Review Workload Forecast

| Phase | Files | Line Delta Est. | Complexity |
|---|---|---|---|
| Phase 1: Environment & Config | `docker-compose.yml`, `.env`, `.env.example`, `backend/src/config/supabase.js`, `backend/src/config/defaults.js` | +120 / -30 | Low |
| Phase 2: Storage Service Migration | `backend/src/services/StorageService.js` | +80 / -60 | Medium |
| Phase 3: Auth Middleware & Controller Migration | `backend/src/middlewares/authMiddleware.js`, `backend/src/controllers/authController.js` | +110 / -70 | Medium |
| Phase 4: MongoDB Schema Updates | `backend/src/models/User.js`, `backend/src/models/Link.js`, `backend/src/models/Tag.js` | +35 / -20 | Low |
| Phase 5: Migration Scripts | `backend/src/scripts/migrate-users-to-supabase.js`, `backend/src/scripts/migrate-images-to-supabase.js` | +280 / -0 | High |
| Phase 6: Frontend Integration | `frontend/src/services/authService.js`, `frontend/src/stores/authStore.js`, `frontend/src/services/api.js` | +140 / -90 | Medium |
| Phase 7: Verification & Package Cleanup | `backend/package.json`, `frontend/package.json` | +10 / -25 | Low |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

---

## Task Breakdown

### Phase 1: Environment & Config
- [x] **1.1 Update Environment Files**
  - Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET` to `.env` and `.env.example`.
  - Mark `INSFORGE_URL` and `INSFORGE_ANON_KEY` as deprecated.
- [x] **1.2 Configure Docker Compose Services**
  - Update `docker-compose.yml` to declare self-hosted Supabase services: Kong API Gateway, GoTrue Auth server, Supabase Storage API service, and internal PostgreSQL database (`auth` and `storage` schemas).
- [x] **1.3 Create Backend Supabase Config Client**
  - Create `backend/src/config/supabase.js` initializing standard Supabase client (`anonKey`) and administrative service client (`serviceRoleKey`).
  - Update `backend/src/config/defaults.js` to expose Supabase config values.

### Phase 2: Storage Service Migration
- [x] **2.1 Replace InsForge SDK in StorageService**
  - Refactor `backend/src/services/StorageService.js` to replace `@insforge/sdk` calls with `@supabase/supabase-js` storage API targeting the public `images` bucket.
- [x] **2.2 Implement Deterministic Bucket Key Generators**
  - Implement key format for link preview thumbnails: `previews/{userId}/{linkId}-{timestamp}.{ext}`.
  - Implement key format for user avatars: `avatars/{userId}-{timestamp}.{ext}`.
  - Ensure URI formatting contains no unencoded special characters or spaces.
- [x] **2.3 Implement Public URL Resolution & Lifecycle Deletion**
  - Implement public URL retrieval using `supabase.storage.from('images').getPublicUrl(objectKey)`.
  - Implement `deleteImage(objectKey)` to purge deleted link thumbnails and obsolete avatars from the `images` bucket.
  - Add fallback handling and error logging to prevent storage errors from breaking MongoDB domain operations.

### Phase 3: Auth Middleware & Controller Migration
- [x] **3.1 Implement Local JWT Verification Middleware**
  - Refactor `backend/src/middlewares/authMiddleware.js` to extract Bearer token from `Authorization` header.
  - Verify token signature locally using `SUPABASE_JWT_SECRET` (without external HTTP requests per request).
  - Populate `req.user` with decoded claim payload (`id` / `supabaseId`, `email`).
  - Return HTTP 401 JSON error payload for missing, expired, or invalid tokens.
- [x] **3.2 Refactor Backend Auth Controller**
  - Update `backend/src/controllers/authController.js` to integrate GoTrue authentication flows (sign up, sign in, sign out, token refresh).
  - Ensure user registration provisions or updates corresponding MongoDB `User` document containing `supabaseId`.

### Phase 4: MongoDB Schema Updates
- [x] **4.1 Update User Schema**
  - Modify `backend/src/models/User.js` to add `supabaseId` field (`String`, `unique`, `sparse`, `index`).
  - Make legacy `password` field optional.
- [x] **4.2 Update Link Schema**
  - Modify `backend/src/models/Link.js` to update `userId` field type from `Schema.Types.ObjectId` reference to `String` (storing Supabase UUID string).
- [x] **4.3 Update Tag Schema**
  - Modify `backend/src/models/Tag.js` to update `userId` field type from `Schema.Types.ObjectId` reference to `String` (storing Supabase UUID string).

### Phase 5: Migration Scripts
- [x] **5.1 Create User Data & Password Hash Migration Script**
  - Create `backend/src/scripts/migrate-users-to-supabase.js`.
  - Fetch existing MongoDB users lacking `supabaseId`.
  - Ingest bcrypt password hashes directly into Supabase PostgreSQL `auth.users`.
  - Update `User.supabaseId` and update `userId` string in matching `Link` and `Tag` documents.
  - Implement `--dry-run` flag support for previewing migration without mutations.
- [x] **5.2 Create Image Asset Migration Script**
  - Create `backend/src/scripts/migrate-images-to-supabase.js`.
  - Locate `Link` and `User` documents referencing legacy InsForge storage URLs.
  - Download binary assets from InsForge, re-upload to Supabase Storage `images` bucket using deterministic keys, and update document image/avatar URLs in MongoDB.
  - Implement `--dry-run` flag support.

### Phase 6: Frontend Refactor
- [x] **6.1 Refactor Frontend Auth Service**
  - Refactor `frontend/src/services/authService.js` to invoke Supabase Auth methods via `@supabase/supabase-js`.
- [x] **6.2 Update Zustand Auth Store**
  - Update `frontend/src/stores/authStore.js` to manage active session state and subscribe to Supabase `onAuthStateChange` events.
- [x] **6.3 Update Axios Request Interceptor**
  - Modify `frontend/src/services/api.js` interceptor to attach active Supabase JWT session token to outgoing HTTP `Authorization: Bearer <token>` headers.

### Phase 7: Verification & Package Cleanup
- [x] **7.1 Clean Up Dependencies**
  - Install `@supabase/supabase-js` in `backend/package.json` and `frontend/package.json`.
  - Uninstall `@insforge/sdk` and remove all legacy InsForge dependencies and code references.
- [x] **7.2 End-to-End & Integration Testing**
  - Verify existing user login with original passwords (zero password reset).
  - Verify new user registration & MongoDB profile sync.
  - Verify protected backend routes with local JWT signature check.
  - Verify link preview scraping, image upload, public URL resolution, and image deletion.
  - Run `--dry-run` and full execution of migration scripts in staging test environment.

