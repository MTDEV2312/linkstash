# Technical Design: Link Re-Scrape with Diff & Merge

## 1. Technical Approach & Architecture Decisions

- **In-Memory Preview Endpoint**: `POST /api/links/:id/scrape-preview` fetches and parses target URLs in real-time via `scraperService.scrapeUrl()` without writing to MongoDB. Guarantees zero dirty database state if the user cancels or encounters errors.
- **Dedicated Diff Modal (`ReScrapeModal.jsx`)**: Independent modal displaying side-by-side diffs (Current vs. Scraped) with thumbnails and per-field checkboxes. Keeps manual editing (`EditLinkModal`) uncoupled and simple.
- **Anti-Erasure Safeguards**: Scraped fields that are null, empty, or whitespace-only are disabled from selection in the UI to prevent overwriting existing data.
- **Selective Merge Dispatch**: Submits only user-selected fields via existing `linkService.updateLink` (`PUT /api/links/:id`), reusing existing storage uploads, validation, and cache invalidation.

---

## 2. Data Flow

```
[User Trigger] (LinkCard menu / LinkDetailSheet)
       │
       ▼
[ReScrapeModal Opens] (Renders loading skeleton)
       │
       ▼
[linkService.scrapePreview(id)] ──► [POST /api/links/:id/scrape-preview]
                                              │
                                              ▼ (authMiddleware + scraperRateLimiter)
                                      [scraperService.scrapeUrl(link.url)]
                                              │
                                              ▼ (SSRF & DNS checks)
[Diff Rendered in UI] ◄────────────── [In-Memory Metadata Response]
  (Auto-selects valid changed fields; disables empty scraped fields)
       │
       ▼
[User Adjusts Checkboxes & Clicks "Aplicar cambios"]
       │
       ▼
[linkStore.updateLink(id, selectedDiffFields)] ──► [PUT /api/links/:id]
                                                          │
                                                          ▼
[UI / Store Refreshed] ◄─────────────────────────── [MongoDB Updated]
```

---

## 3. API Contract & Frontend Interfaces

### Backend Endpoint: `POST /api/links/:id/scrape-preview`
- **Auth**: Bearer JWT (Private). Rate-limited via `scraperRateLimiter`.
- **Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "title": "Clean Scraped Title",
    "description": "Scraped page description...",
    "image": "https://cdn.example.com/og-image.jpg",
    "siteName": "Example Site",
    "favicon": "https://example.com/favicon.ico",
    "url": "https://example.com/article"
  }
}
```
- **Error Responses**: `404 Not Found` (invalid ID/unauthorized), `429 Too Many Requests`, `502/422` (target unreachable/scraping failure).

### Frontend Component Interface (`ReScrapeModal.jsx`)
```typescript
interface ReScrapeModalProps {
  link: LinkRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface ScrapePreviewState {
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
}

interface SelectedFieldsState {
  title: boolean;
  description: boolean;
  image: boolean;
}
```

---

## 4. File Changes

| File | Scope of Changes |
| :--- | :--- |
| [`backend/src/routes/linkRoutes.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/routes/linkRoutes.js) | Register `POST /:id/scrape-preview` with `scraperRateLimiter` and `scrapePreview`. |
| [`backend/src/controllers/linkController.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/controllers/linkController.js) | Implement `scrapePreview` handler calling `scraperService.scrapeUrl()`. |
| [`frontend/src/services/linkService.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/services/linkService.js) | Add `scrapePreview(id)` helper calling `api.post('/links/:id/scrape-preview')`. |
| [`frontend/src/components/ReScrapeModal.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/ReScrapeModal.jsx) | New component: fetching state, side-by-side diff table, field toggles, merge payload generator. |
| [`frontend/src/components/LinkCard.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/LinkCard.jsx) | Add "Re-escanear enlace" item in `CardMenu` and modal trigger. |
| [`frontend/src/pages/myLinks.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/myLinks.jsx) | Add "Re-escanear" button in `LinkDetailSheet` and state for opening `ReScrapeModal`. |

---

## 5. Threat Matrix

| Threat | Impact | Mitigation |
| :--- | :--- | :--- |
| **SSRF / Internal Scan** | Attacker probes private subnet / metadata IP via re-scrape | `scraperService.isSafeUrl()` / DNS resolution checks reject private, loopback, and obfuscated IPs. |
| **Scraper Abuse / DoS** | Excessive scrape requests overload scraper/remote target | `scraperRateLimiter` (10 req/min per IP) applied on route; request timeout enforced. |
| **Unauthorized Access** | User inspects/re-scrapes links belonging to others | `Link.findOne({ _id: id, userId })` validates ownership before executing scrape. |
| **Data Corruption / Blank Overwrite** | Scraper returns blank values, wiping existing title/image | UI disables checkboxes for blank/null scraped values; merge sends only selected non-empty fields. |

---

## 6. Testing Strategy

- **Backend Integration Tests**:
  - `POST /api/links/:id/scrape-preview` returns 200 with metadata without mutating database record.
  - Returns 404 for non-existent or unowned `linkId`.
  - Returns 429 when `scraperRateLimiter` threshold exceeded.
  - Returns graceful error status (502/422) when target URL fails or times out.
- **Frontend Component Tests (`ReScrapeModal.test.jsx`)**:
  - Displays loading skeleton while preview is being fetched.
  - Renders side-by-side diff highlighting differences between current and scraped data.
  - Auto-selects modified, non-empty fields on initial render.
  - Disables checkbox when scraped field is empty/null/whitespace.
  - "Select all changes" and "Deselect all" toggles update checkbox states correctly.
  - "Aplicar cambios" calls `updateLink` with only selected field patches and closes modal.
  - "Cancelar" / backdrop click dismisses modal without modifying state.
