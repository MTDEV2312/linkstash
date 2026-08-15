# Image Storage Specification

## Purpose
The `image-storage` domain manages binary asset persistence for link preview thumbnails, website favicons, and user profile avatars. This specification defines the migration from legacy InsForge Storage BaaS to self-hosted Supabase Storage API, including S3/API integration, bucket object key formatting, idempotent asset migration, public URL generation, and lifecycle deletion triggers.

## Requirements

### Requirement: Supabase Storage API Integration
The backend service `StorageService.js` MUST use `@supabase/supabase-js` to handle all binary object upload, retrieval, and deletion operations, completely replacing `@insforge/sdk`.

All binary image assets SHALL be persisted within the public Supabase Storage bucket named `images`.

#### Scenario: Uploading Binary Asset to Supabase Storage
- GIVEN a valid image Buffer or ReadableStream (e.g. website preview thumbnail or user avatar)
- WHEN `StorageService.uploadImage` is invoked with object key and file metadata
- THEN the system MUST upload the payload to the `images` bucket using Supabase Storage API
- AND it SHALL return the relative path or storage response metadata upon completion

#### Scenario: Handling Upload Failure Gracefully
- GIVEN a network error or invalid payload submitted to `StorageService`
- WHEN the Supabase Storage upload operation fails
- THEN the system MUST throw or log a structured error without corrupting application database state
- AND website scraping or user update flows MUST fall back to default assets

---

### Requirement: Deterministic Bucket Object Key Format
The system MUST construct deterministic bucket object keys within the `images` bucket using standardized URI path structures:
- Link Previews: `previews/{userId}/{linkId}-{timestamp}.{ext}`
- User Avatars: `avatars/{userId}-{timestamp}.{ext}`

Object keys MUST NOT contain spaces, unencoded URI characters, or trailing slashes.

#### Scenario: Generating Object Key for Link Preview
- GIVEN a `userId` string, `linkId` string, and file extension (e.g. `png`)
- WHEN `StorageService` formats the bucket object key
- THEN the key MUST match pattern `previews/{userId}/{linkId}-{timestamp}.png`

#### Scenario: Generating Object Key for User Avatar
- GIVEN a `userId` string and image MIME type `image/jpeg`
- WHEN `StorageService` formats the avatar key
- THEN the key MUST match pattern `avatars/{userId}-{timestamp}.jpg`

---

### Requirement: Public URL Generation and Reference Storage
The backend MUST resolve publicly accessible HTTP URLs for assets stored in Supabase Storage using `supabase.storage.from('images').getPublicUrl(objectKey)` or the configured public storage endpoint (`SUPABASE_URL/storage/v1/object/public/images/{objectKey}`).

The resulting public URL string MUST be saved to the `image` field in MongoDB `Link` documents and `avatar` field in MongoDB `User` documents.

#### Scenario: Resolving Public Storage URL for Link Previews
- GIVEN a successfully uploaded image object key in `images` bucket
- WHEN `StorageService` requests the public URL
- THEN the system MUST construct a valid public URL pointing to the self-hosted Supabase Storage endpoint
- AND the backend SHALL save this absolute URL string to the target `Link.image` field in MongoDB

---

### Requirement: Idempotent InsForge to Supabase Asset Migration
The migration script `migrate-images-to-supabase.js` MUST download legacy binary images from InsForge Storage URLs, upload them to Supabase Storage `images` bucket using equivalent object keys, and update the MongoDB document image URL fields.

The migration utility MUST support a `--dry-run` flag to inspect legacy image URLs and report planned operations without writing to Supabase Storage or updating MongoDB.

Legacy InsForge assets MUST remain unmodified during migration.

#### Scenario: Migrating InsForge Image Asset to Supabase Storage
- GIVEN a MongoDB `Link` document containing an InsForge image URL (`https://...insforge...`)
- WHEN `migrate-images-to-supabase.js` runs
- THEN it MUST fetch the binary image from InsForge
- AND it MUST upload the binary to Supabase Storage `images` bucket
- AND it SHALL update `Link.image` in MongoDB with the new Supabase Storage public URL

#### Scenario: Executing Dry-Run Image Asset Migration
- GIVEN MongoDB records with legacy InsForge storage references
- WHEN `migrate-images-to-supabase.js` is executed with `--dry-run`
- THEN it MUST scan records, verify image accessibility, and output a summary of assets to be migrated
- AND it MUST NOT upload files to Supabase Storage or mutate MongoDB records

---

### Requirement: Cascading Asset Deletion on Model Cleanup
When a `Link` document containing a Supabase Storage asset URL is deleted, or when a user avatar is replaced/removed, `StorageService` MUST remove the corresponding binary object from the `images` bucket.

#### Scenario: Deleting Bucket Object on Link Deletion
- GIVEN an existing `Link` document referencing image URL `.../images/previews/usr1/lnk1-12345.png`
- WHEN the user deletes the link document
- THEN the system MUST invoke `StorageService.deleteImage` with key `previews/usr1/lnk1-12345.png`
- AND Supabase Storage MUST delete the corresponding object from the `images` bucket
