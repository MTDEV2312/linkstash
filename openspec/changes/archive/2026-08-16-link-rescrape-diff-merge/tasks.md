# Tasks: Link Re-Scrape with Diff & Merge

## Review Workload Forecast
<!-- id: forecast -->
Estimated changed lines: ~250-350 lines
400-line budget risk: Low
Chained PRs recommended: No
Decision needed before apply: No
Delivery strategy: ask-on-risk
Chain strategy: pending

---

## Phase 1: Backend Scrape Preview Endpoint (TDD)

- [x] **1.1 [RED] Write Backend Preview Integration Tests**
  - Create [`backend/test/scrape_preview_test.mjs`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/test/scrape_preview_test.mjs).
  - Test `POST /api/links/:id/scrape-preview` authenticated response with extracted in-memory metadata (`title`, `description`, `image`, `siteName`, `favicon`).
  - Test validation: 404 for unowned/non-existent link, 429 for rate limit violations, error handling for target scrape failure without mutating MongoDB record.
- [x] **1.2 [GREEN] Implement `scrapeLinkPreview` & Register Route**
  - Add `scrapeLinkPreview` in [`backend/src/controllers/linkController.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/controllers/linkController.js) using `Link.findOne` and `scraperService.scrapeUrl`.
  - Register `POST /:id/scrape-preview` with `scraperRateLimiter` in [`backend/src/routes/linkRoutes.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/routes/linkRoutes.js).
- [x] **1.3 [REFACTOR] Clean Controller & Error Mapping**
  - Ensure error responses return descriptive messages (502/422/404) and clean async error handling.

---

## Phase 2: Frontend Service & Store Integration

- [x] **2.1 Implement Client API Endpoint**
  - Add `scrapePreview(id)` method in [`frontend/src/services/linkService.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/services/linkService.js) calling `POST /links/${id}/scrape-preview`.
- [x] **2.2 Verify Store Integration**
  - Verify [`frontend/src/stores/linkStore.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/stores/linkStore.js) `updateLink` handles selective field patching and refreshes state smoothly.

---

## Phase 3: Diff Comparison & Merge Modal (TDD)

- [x] **3.1 [RED] Write `ReScrapeModal` Component Tests**
  - Create [`frontend/tests/unit/ReScrapeModal.test.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/tests/unit/ReScrapeModal.test.jsx).
  - Test skeleton loading, side-by-side diff display, auto-selecting changed non-empty fields, disabling empty scraped fields, select/deselect all toggles, and merge payload dispatch.
- [x] **3.2 [GREEN] Implement `ReScrapeModal.jsx`**
  - Create [`frontend/src/components/ReScrapeModal.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/ReScrapeModal.jsx) with fetching state, side-by-side diff table for Title, Description, and Image thumbnails.
  - Implement per-field checkboxes, disable empty/null scraper values, "Select all changes" / "Deselect all" actions, and merge confirmation calling `updateLink`.
- [x] **3.3 [REFACTOR] UI Polish & Accessibility**
  - Add smooth transitions, keyboard navigation (Escape to close), ARIA labels, and responsive layout styling.

---

## Phase 4: UI Triggers Integration

- [x] **4.1 Add Re-Scrape Action to LinkCard**
  - In [`frontend/src/components/LinkCard.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/LinkCard.jsx), add `"Re-escanear enlace"` to `CardMenu` dropdown to launch `ReScrapeModal`.
- [x] **4.2 Add Re-Scrape Action to Link Detail Sheet**
  - In [`frontend/src/pages/myLinks.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/myLinks.jsx), add `"Re-escanear"` action button in `LinkDetailSheet` and manage modal open state.

---

## Phase 5: Verification & End-to-End Validation

- [x] **5.1 Execute Backend Test Suite**
  - Run `node backend/test/scrape_preview_test.mjs` and existing backend tests.
- [x] **5.2 Execute Frontend Test & Lint Suites**
  - Run `npm run test` and `npm run lint` in `frontend/` to confirm zero regressions.
- [x] **5.3 End-to-End Flow Verification**
  - Verify complete flow: trigger re-scrape -> view diff -> selectively merge -> verify MongoDB & UI update without data loss.
