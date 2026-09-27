# Link Re-Scrape Diff and Merge Specification Delta

## Purpose
Specifies modifications to the `link-rescrape-diff-merge` capability under the Tailwind CSS v4 "Living Archive" redesign. It integrates the re-scrape preview trigger, side-by-side diff comparison, and selective merge controls seamlessly into the slide-over detail inspector while adopting Living Archive typography (Space Grotesk, IBM Plex Mono) and preserving 100% of data safeguards (empty/null protection, selective field merging, atomic updates).

## MODIFIED Requirements

### Requirement: Side-by-Side Diff Presentation
The system MUST render the metadata diff comparison view directly within or layered over the slide-over detail inspector using Living Archive design tokens.

The diff interface MUST:
- Use `Space Grotesk` for section headers and modal titles.
- Use `IBM Plex Mono` for field labels, character counters, and differential status indicators (`MODIFICADO`, `SIN CAMBIOS`, `VACÍO`).
- Highlight incoming changes with high-contrast borders and acid signal badges.
- Display side-by-side or stacked comparative views for Title, Description, and Preview Image, including visual image thumbnails for both current and incoming sources.

#### Scenario: Visual Diff Presentation in Slide-Over Context
- GIVEN an active slide-over detail inspector for a link whose remote URL has updated metadata
- WHEN the user initiates a re-scrape preview and the scraper completes
- THEN the diff interface MUST display the current values alongside the new scraped values
- AND incoming changed fields MUST be visually highlighted with acid accent indicators
- AND identical fields MUST be labeled as unchanged

---

### Requirement: Independence of Manual Editing Flow
The slide-over detail inspector MUST maintain strict isolation between manual editing workflows and automated re-scrape diff merge workflows.

Triggering a re-scrape MUST NOT overwrite pending uncommitted manual form inputs without explicit user confirmation. Canceling or dismissing a re-scrape diff MUST return the user to the slide-over inspector in its prior state without navigating away or closing the inspector.

#### Scenario: Canceling Re-Scrape Returns to Inspector
- GIVEN a slide-over inspector open for a link
- WHEN the user opens the re-scrape diff view and clicks Cancel or dismisses the view
- THEN the scraped diff preview MUST be discarded
- AND the slide-over inspector MUST remain open displaying the original link details
- AND no mutations SHALL be sent to the backend

---

## ADDED Requirements

### Requirement: Slide-Over Inspector Re-Scrape Action and In-Place Refresh
The slide-over detail inspector MUST include a direct re-scrape action button (`Re-escanear` with `RefreshCw` icon) in its primary action toolbar.

When the re-scrape action is triggered:
- The inspector MUST display an inline loading indicator while `POST /api/links/:id/scrape-preview` is pending.
- On successful preview resolution, the diff comparison UI MUST activate immediately.
- On confirming the merge, the application MUST dispatch `PUT /api/links/:id` with only the selected fields, update the active `linkStore` state, and immediately refresh the metadata displayed in the slide-over inspector without unmounting the inspector drawer or navigating away.

#### Scenario: Triggering Re-Scrape from Slide-Over Toolbar
- GIVEN an authenticated user viewing a link in the slide-over detail inspector
- WHEN the user clicks the "Re-escanear" button
- THEN the button MUST show a loading spinner and enter a disabled state
- AND the backend scrape preview endpoint MUST be queried in memory

#### Scenario: In-Place Refresh After Successful Diff Merge
- GIVEN a user who confirmed a selective merge from the re-scrape diff view
- WHEN the update request completes successfully
- THEN the slide-over inspector MUST immediately update its displayed title, description, and image
- AND the catalog background view MUST reflect the updated link data
- AND the inspector MUST remain open in read-only inspection mode
- AND a success toast notification MUST be presented
