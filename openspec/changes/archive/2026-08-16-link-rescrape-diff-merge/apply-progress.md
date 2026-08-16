# Apply Progress: Link Re-Scrape with Diff Comparison & Merge

## Status Overview
- **Change Name**: `link-rescrape-diff-merge`
- **State**: Completed
- **Applied Phases**: Phase 1 through Phase 5

---

## Completed Phases & Details

### Phase 1: Backend Scrape Preview Endpoint (TDD)
- **1.1 [RED] Write Backend Preview Integration Tests**:
  - Created [`backend/test/scrape_preview_test.mjs`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/test/scrape_preview_test.mjs) testing authenticated in-memory metadata extraction (`title`, `description`, `image`, `siteName`, `favicon`), 404 for unowned links, 502 on remote scraping failure, and database immutability verification.
- **1.2 [GREEN] Implement `scrapeLinkPreview` & Register Route**:
  - Added `scrapeLinkPreview` handler in [`backend/src/controllers/linkController.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/controllers/linkController.js) using `Link.findOne({ _id: id, userId })` and `scraperService.scrapeUrl(link.url)`.
  - Registered `POST /:id/scrape-preview` with `authMiddleware` and `scraperRateLimiter` in [`backend/src/routes/linkRoutes.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/routes/linkRoutes.js).
- **1.3 [REFACTOR] Clean Controller & Error Mapping**:
  - Enforced structured error responses with HTTP 502/404 status codes and clean exception logging.

### Phase 2: Frontend Service & Store Integration
- **2.1 Implement Client API Endpoint**:
  - Added `scrapePreview(id)` method to [`frontend/src/services/linkService.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/services/linkService.js) calling `POST /links/${id}/scrape-preview`.
- **2.2 Verify Store Integration**:
  - Verified [`frontend/src/stores/linkStore.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/stores/linkStore.js) `updateLink` cleanly handles selective field patching payloads and invalidates cache/refreshes state smoothly.

### Phase 3: Diff Comparison & Merge Modal (TDD)
- **3.1 [RED] Write `ReScrapeModal` Component Tests**:
  - Created [`frontend/tests/unit/ReScrapeModal.test.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/tests/unit/ReScrapeModal.test.jsx) testing skeleton loading, side-by-side diff table, auto-selecting changed non-empty fields, disabling empty scraped fields, select/deselect all toggles, applying changes via `updateLink`, and dismiss/cancellation logic.
- **3.2 [GREEN] Implement `ReScrapeModal.jsx`**:
  - Created [`frontend/src/components/ReScrapeModal.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/ReScrapeModal.jsx) with fetching state, side-by-side diff comparison for Title, Description, and Image thumbnails.
  - Implemented anti-erasure safeguards disabling checkboxes for empty/null scraped values, bulk toggle actions ("Seleccionar cambios" / "Deseleccionar todo"), and atomic merge confirmation.
- **3.3 [REFACTOR] UI Polish & Accessibility**:
  - Added smooth transitions, Escape key navigation, backdrop dismiss, ARIA labels (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`), and full dark mode styling.

### Phase 4: UI Triggers Integration
- **4.1 Add Re-Scrape Action to LinkCard**:
  - Updated [`frontend/src/components/LinkCard.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/LinkCard.jsx) to add "Re-escanear enlace" in `CardMenu` dropdown for both List and Grid views and wired `ReScrapeModal`.
- **4.2 Add Re-Scrape Action to Link Detail Sheet**:
  - Updated [`frontend/src/pages/myLinks.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/myLinks.jsx) to add "Re-escanear" button in `LinkDetailSheet`, managed `reScrapeLink` state, and rendered `ReScrapeModal`.

---

## Changed Files Summary
| File | Summary of Changes |
| :--- | :--- |
| [`backend/test/scrape_preview_test.mjs`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/test/scrape_preview_test.mjs) | Integration test suite for in-memory preview, 404 validation, error handling, and DB immutability. |
| [`backend/src/routes/linkRoutes.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/routes/linkRoutes.js) | Registered `POST /:id/scrape-preview` with rate limiting and controller handler. |
| [`backend/src/controllers/linkController.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/controllers/linkController.js) | Implemented `scrapeLinkPreview` in-memory scraper preview endpoint. |
| [`frontend/src/services/linkService.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/services/linkService.js) | Added `scrapePreview(id)` helper. |
| [`frontend/tests/unit/ReScrapeModal.test.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/tests/unit/ReScrapeModal.test.jsx) | Unit tests for `ReScrapeModal`. |
| [`frontend/src/components/ReScrapeModal.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/ReScrapeModal.jsx) | Diff comparison & merge modal component. |
| [`frontend/src/components/LinkCard.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/LinkCard.jsx) | Added "Re-escanear enlace" action in card dropdown menu. |
| [`frontend/src/pages/myLinks.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/myLinks.jsx) | Added "Re-escanear" button to `LinkDetailSheet` and integrated modal state. |
| [`openspec/changes/link-rescrape-diff-merge/tasks.md`](file:///C:/Users/agusm/Videos/DEV/LinkStash/openspec/changes/link-rescrape-diff-merge/tasks.md) | Marked tasks completed `[x]`. |
