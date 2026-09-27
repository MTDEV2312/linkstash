# Tasks: Tailwind CSS v4 & Living Archive UI Redesign

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units
| Unit | Goal | PR | Test command | Runtime | Rollback boundary |
|---|---|---|---|---|---|
| Unit 1: Toolchain & Tokens | Upgrade Tailwind v4, set `@theme` tokens | PR 1 | `npm --prefix frontend run build` | Vite | `package.json`, `index.css` |
| Unit 2: Shell & Navigation | 232px sidebar, topbar, CommandPalette | PR 1 | `npm --prefix frontend test` | Vitest | `Layout.jsx`, `CommandPalette.jsx` |
| Unit 3: Archive & Inspector | Masonry/list toggle, LinkCard, slide-over drawer | PR 1 | `npm --prefix frontend test` | Vitest | `myLinks.jsx`, `LinkDetailSheet.jsx` |
| Unit 4: Secondary Views | Style Landing, tags, Dashboard, settings | PR 1 | `npm --prefix frontend test` | Vitest | Page components |
| Unit 5: Verification & Tests | Validate build, unit tests, and Playwright e2e | PR 1 | `npm --prefix frontend run test:e2e` | Playwright | Full changeset |

---

## Phase 1: Toolchain & Tokens
- [x] 1.1 Upgrade `frontend/package.json` to `@tailwindcss/vite` and `tailwindcss@^4.0.0`; remove `postcss` and `autoprefixer`.
- [x] 1.2 Add `@tailwindcss/vite` to `frontend/vite.config.js`; delete `tailwind.config.js` and `postcss.config.js`.
- [x] 1.3 Add `@import "tailwindcss";` and `@theme` tokens (Space Grotesk, IBM Plex Mono, dark catalog, paper light, acid green `#a3e635`) in `frontend/src/index.css`.
- [x] 1.4 Declare UI primitives in `frontend/src/index.css` (`btn-primary`, `btn-outline`, badges, inputs).

## Phase 2: Navigation & Shell
- [x] 2.1 Refactor `frontend/src/components/Layout.jsx` with fixed 232px sidebar (`w-[232px]`, `lg:pl-[232px]`), route badges, and mobile bottom bar.
- [x] 2.2 Add sticky topbar to `frontend/src/components/Layout.jsx` with section title, theme toggle, and `⌘K` trigger.
- [x] 2.3 Implement `frontend/src/components/CommandPalette.jsx` with global `⌘K` / `Ctrl+K` listener, search filter, and Escape dismissal.

## Phase 3: Archive & Inspector
- [x] 3.1 Refactor `frontend/src/components/LinkCard.jsx` for masonry columns and dense list rows with monospace badges.
- [x] 3.2 Build slide-over drawer `frontend/src/components/LinkDetailSheet.jsx` with metadata inspection, inline editing, and Re-escanear action.
- [x] 3.3 Restyle `frontend/src/components/ReScrapeModal.jsx` with Space Grotesk and diff view with acid highlights.
- [x] 3.4 Wire view toggle (`grid` / `list`), slide-over drawer, and scraper polling in `frontend/src/pages/myLinks.jsx`.

## Phase 4: Secondary Views
- [x] 4.1 Update `frontend/src/pages/Landing.jsx` with editorial typography, acid CTA signals, and non-blocking backend wakeup indicator.
- [x] 4.2 Restyle `frontend/src/pages/tags.jsx` with Living Archive color tokens, monospace counts, and tag CRUD modals.
- [x] 4.3 Refresh `frontend/src/pages/Dashboard.jsx` and `frontend/src/pages/settings.jsx` with editorial typography and high-contrast inputs.

## Phase 5: Verification & Tests
- [x] 5.1 Run `npm --prefix frontend run build` to verify clean Tailwind v4 Vite compilation.
- [x] 5.2 Add unit tests in `frontend/tests/unit/` for `CommandPalette.test.jsx`, `LinkDetailSheet.test.jsx`, and dual-mode `LinkCard.test.jsx`.
- [x] 5.3 Run `npm --prefix frontend test` to verify 100% pass across all unit and store tests.
- [x] 5.4 Run `npm --prefix frontend run test:e2e` to validate desktop 232px sidebar offset, mobile bar, and theme persistence.
