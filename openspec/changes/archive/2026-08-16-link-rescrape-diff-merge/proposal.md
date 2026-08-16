# Proposal: Individual Link Re-Scrape with Diff Comparison & Merge

## Intent
Enable users to re-scrape individual bookmarks on demand, inspect differences against existing metadata in a visual side-by-side diff modal, and selectively merge changes without destructive overwrites.

## Scope

### In Scope
- **Scrape Preview Endpoint**: Add `POST /api/links/:id/scrape-preview` with authentication and rate limiting to run the scraper in-memory and return extracted metadata (`title`, `description`, `image`, `siteName`, `favicon`) without database mutations.
- **Diff & Merge Modal (`ReScrapeModal.jsx`)**: Side-by-side comparison (Current vs. Scraped) for title, description, and image thumbnail with per-field checkboxes.
- **Selective Merge & Safeguards**: Auto-select detected differences; disable selection for empty/null scraped values to prevent accidental data erasure; provide "Select all changes" / "Deselect all" bulk toggles.
- **Contextual Triggers**: Add "Re-escanear enlace" actions in [`LinkCard.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/LinkCard.jsx) menu and [`myLinks.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/myLinks.jsx) detail sheet.
- **Persistence via Standard API**: Commit selected fields using existing `updateLink` / `PUT /api/links/:id`.

### Out of Scope
- Automated background batch re-scraping of all user links.
- Tag re-generation or automated categorization during re-scraping.
- Modifications to direct manual editing flows in [`EditLinkModal.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/EditLinkModal.jsx).

## Capabilities

### New Capabilities
- `link-rescrape-diff-merge`: On-demand single-link scraper preview, side-by-side field diffing, and selective field merging with empty-value overwrite protection.

### Modified Capabilities
- *None* (Existing specifications remain unaffected).

## Approach
1. **Backend**: Register `POST /:id/scrape-preview` in [`linkRoutes.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/routes/linkRoutes.js) with `authMiddleware` and `scraperRateLimiter`. Implement handler in [`linkController.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/controllers/linkController.js) calling [`scraperService.scrapeUrl`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/services/scraperService.js).
2. **Frontend API**: Add `scrapePreview(id)` helper to [`linkService.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/services/linkService.js).
3. **UI Component**: Build [`ReScrapeModal.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/ReScrapeModal.jsx) with loading skeletons, diff previews, checkbox state logic, and merge dispatch.
4. **Integration**: Wire modal trigger into [`CardMenu`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/LinkCard.jsx) and [`LinkDetailSheet`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/myLinks.jsx).

## Affected Areas
| File | Changes |
| :--- | :--- |
| [`backend/src/routes/linkRoutes.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/routes/linkRoutes.js) | Add `POST /:id/scrape-preview` route |
| [`backend/src/controllers/linkController.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/backend/src/controllers/linkController.js) | Implement preview controller handler |
| [`frontend/src/services/linkService.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/services/linkService.js) | Add `scrapePreview` client method |
| [`frontend/src/components/ReScrapeModal.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/ReScrapeModal.jsx) | New diff comparison & merge modal |
| [`frontend/src/components/LinkCard.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/LinkCard.jsx) | Add re-scrape menu option & trigger |
| [`frontend/src/pages/myLinks.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/myLinks.jsx) | Add re-scrape button in detail sheet & modal state |

## Risks & Mitigations
- **Target Site Blocking**: Target site may rate limit or block scraping. *Mitigation*: Graceful error toast with informative message in modal.
- **Empty Scraper Overwrite**: Scraper may fail to extract a previously valid image/title. *Mitigation*: Enforce rule disabling merge for blank scraped fields.

## Rollback Plan
- Delete [`ReScrapeModal.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/ReScrapeModal.jsx).
- Revert route, controller, service, `LinkCard.jsx`, and `myLinks.jsx` changes via Git.

## Success Criteria
- [ ] `POST /api/links/:id/scrape-preview` returns fresh metadata without altering MongoDB link record.
- [ ] Diff modal displays side-by-side comparison for title, description, and preview image.
- [ ] Empty scraped fields cannot be selected for overwrite.
- [ ] Applying selected changes updates only chosen fields in database and refreshes UI.
- [ ] Existing manual link editing remains fully functional and unaffected.
