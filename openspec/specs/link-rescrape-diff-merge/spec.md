# Link Re-Scrape Diff and Merge Specification

## Purpose
The `link-rescrape-diff-merge` capability enables users to refresh metadata for individual saved bookmarks on demand, inspect real-time scraper output side-by-side against current values, and selectively merge changes without overwriting existing data with empty values or altering records without user confirmation.

## Requirements

### Requirement: In-Memory Scrape Preview Execution
The backend MUST provide an authenticated, rate-limited endpoint `POST /api/links/:id/scrape-preview` that executes the metadata scraper on demand for a single link's URL in memory. The endpoint SHALL return extracted metadata (`title`, `description`, `image`, `siteName`, `favicon`) without mutating the database record or persisting scraped data.

#### Scenario: Successful In-Memory Scrape Preview
- GIVEN an authenticated user requesting a preview for an existing link
- WHEN the client sends `POST /api/links/:id/scrape-preview`
- THEN the backend MUST fetch and parse the link's target URL in memory
- AND it SHALL return HTTP 200 with extracted metadata without updating the MongoDB record

---

### Requirement: Scraper Error Handling
If the scraper fails due to network errors, timeouts, invalid target HTML, or remote server blocking, the system MUST handle the failure gracefully. The preview endpoint MUST return an informative error response, and the client SHALL display a descriptive notification without modifying or corrupting the existing link record.

#### Scenario: Remote URL Fetch Failure During Preview
- GIVEN a link whose target website is unreachable or blocking scrapers
- WHEN the user initiates a re-scrape preview
- THEN the backend MUST catch the error and return an error status
- AND the frontend SHALL display an error message while preserving the existing link data intact

---

### Requirement: Side-by-Side Diff Presentation
The frontend MUST present a visual modal dialog comparing current link metadata side-by-side with newly scraped metadata for Title, Description, and Preview Image. The modal SHALL highlight differences and display image thumbnail previews for both current and incoming sources.

#### Scenario: Visual Comparison of Changed Fields
- GIVEN a completed scrape preview with updated title and image
- WHEN the diff modal renders
- THEN it MUST display the current values alongside the new scraped values
- AND it SHALL visually distinguish identical fields from changed fields

---

### Requirement: Empty and Null Field Safeguards
The system MUST protect existing link metadata from erasure. If scraped fields are null, undefined, or whitespace-only, the UI MUST disable selection checkboxes for those fields and MUST NOT allow empty scraped values to replace populated existing data.

#### Scenario: Scraped Field Is Empty While Existing Field Has Value
- GIVEN an existing link with a valid description and a scrape result with an empty description
- WHEN the diff modal renders
- THEN the description selection checkbox MUST be disabled and deselected
- AND the user MUST NOT be able to overwrite the existing description with empty text

---

### Requirement: Field-by-Field Selection and Bulk Toggles
The diff modal MUST provide individual checkboxes for each diffable field (Title, Description, Image) and bulk toggle actions ("Select all changes" and "Deselect all"). The modal SHALL auto-select only fields that have changed and contain valid non-empty values upon initial load.

#### Scenario: Default Auto-Selection of Modified Valid Fields
- GIVEN a scrape preview where Title changed and Image remained identical
- WHEN the diff modal opens
- THEN the Title checkbox MUST be pre-selected
- AND the Image checkbox MUST remain unchecked

#### Scenario: Bulk Toggle Selection
- GIVEN multiple changed fields in the diff modal
- WHEN the user clicks "Select all changes"
- THEN all modified, non-empty fields MUST become checked

---

### Requirement: Atomic Merge Confirmation and Cancel
When the user confirms the merge, the client MUST dispatch an update containing ONLY the selected fields via `updateLink` (`PUT /api/links/:id`). If the user cancels or dismisses the modal, the system MUST discard all scraped metadata without modifying the database or local state.

#### Scenario: Applying Selected Merge Changes
- GIVEN a diff modal with only the scraped Title selected
- WHEN the user clicks the merge confirmation button
- THEN the client MUST call `updateLink` updating only the title
- AND the UI MUST refresh to display the updated link

#### Scenario: Dismissing Modal Without Changes
- GIVEN a completed scrape preview in the diff modal
- WHEN the user clicks Cancel or closes the modal
- THEN the system MUST NOT persist any changes to the link

---

### Requirement: Independence of Manual Editing Flow
The re-scrape and diff merge capability MUST operate independently of direct manual link editing (`EditLinkModal`). Existing manual edit workflows and capabilities SHALL remain unaffected.

#### Scenario: Manual Editing Remains Independent
- GIVEN a link opened in the standard edit modal
- WHEN the user edits title, tags, or description manually
- THEN the system MUST save changes via standard edit flows without invoking scrape preview logic
