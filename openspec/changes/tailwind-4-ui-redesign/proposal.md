# Proposal: Tailwind CSS v4 Migration & "Living Archive" UI Redesign

## Intent
Modernize LinkStash's front-end styling infrastructure by upgrading to Tailwind CSS v4 with `@tailwindcss/vite`, and overhaul the UI into the editorial "Living Archive" design language (Space Grotesk + IBM Plex Mono, acid green accents, persistent 232px sidebar, contextual ⌘K command bar, slide-over inspector, and dual masonry/list views) while strictly maintaining 100% functional parity with existing backend services, stores, and error handling.

## Scope
### In Scope
- **Tailwind CSS v4 Migration**: Replace Tailwind v3 / PostCSS toolchain in `frontend` with `@tailwindcss/vite` and CSS-first `@theme` configuration.
- **Design System & Typography**: Integrate Space Grotesk (headings/display) and IBM Plex Mono (metadata/codes/labels), CSS color tokens (dark catalog default, paper light mode), and high-contrast acid green signals.
- **Navigation & Layout Architecture**: Refactor `Layout.jsx` into a persistent 232px desktop sidebar, contextual topbar with keyboard-driven command palette (⌘K / Ctrl+K), and mobile bottom navigation.
- **Archive Views**: Support interactive Masonry Grid and dense List catalog views with responsive cards.
- **Slide-Over Detail Inspector**: Replace/enhance modal flows with a slide-over sheet containing link editing, metadata inspection, and inline rescrape diff/merge.
- **Parity Guarantee**: Retain all Zustand state stores (`linkStore`, `tagStore`, `authStore`), debounced search with Axios cancellation, scraping polling (`status === 'processing'`), tag CRUD, `react-hook-form` validations, and Sentry telemetry.

### Out of Scope
- Backend API, database schemas, or scraping logic modifications.
- Introducing external UI component libraries (maintaining lightweight custom primitives).
- Altering existing authentication routing guards or Supabase auth workflows.

## Capabilities
### New Capabilities
- `tailwind-4-ui-system`: Tailwind v4 `@theme` design tokens, editorial catalog shell, ⌘K command palette, and responsive masonry/list layout toggle.

### Modified Capabilities
- `landing-page-presentation`: Editorial visual overhaul preserving health check alerts.
- `link-rescrape-diff-merge`: Seamless integration into the new slide-over detail inspector.

## Approach
1. **Toolchain Upgrade**: Install `@tailwindcss/vite` and `tailwindcss@^4`, remove deprecated `tailwind.config.js` and `postcss.config.js`, configure `vite.config.js` and `src/index.css`.
2. **Design Tokens & Primitives**: Define typography, color tokens, and reusable primitives (buttons, badges, inputs, skeletons) reflecting the `UI-Redisign` aesthetic.
3. **Shell & Navigation**: Build the 232px sidebar, command palette modal, and responsive mobile bar in `Layout.jsx`.
4. **View & Inspector Overhaul**: Implement masonry/list toggle in `myLinks.jsx` and embed edit/rescrape diff actions into the slide-over inspector.
5. **Verification**: Validate functional parity across all search, filter, polling, form validation, and error handling flows.

## Affected Areas
| File / Directory | Changes |
| :--- | :--- |
| [`frontend/package.json`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/package.json) | Upgrade to Tailwind v4 & `@tailwindcss/vite` |
| [`frontend/vite.config.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/vite.config.js) | Add `@tailwindcss/vite` plugin |
| [`frontend/src/index.css`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/index.css) | Configure `@import "tailwindcss";` and `@theme` tokens |
| [`frontend/src/components/Layout.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/Layout.jsx) | Implement 232px sidebar, topbar with ⌘K, and mobile bottom bar |
| [`frontend/src/components/LinkCard.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/LinkCard.jsx) | Redesign for masonry grid and dense list row modes |
| [`frontend/src/pages/myLinks.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/myLinks.jsx) | Integrate view toggles and slide-over detail inspector |
| [`frontend/src/pages/Landing.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Landing.jsx) | Refresh landing page with editorial typography and cards |
| [`frontend/src/pages/tags.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/tags.jsx) | Update tag catalog view to editorial visual tokens |

## Risks & Mitigations
- **CSS Utility Divergence in Tailwind v4**: v4 removes or alters certain v3 utility classes. *Mitigation*: Audit custom utilities, verify `@theme` mappings, and run smoke tests.
- **Form/Validation Regressions**: Restyling inputs could disrupt `react-hook-form` bindings. *Mitigation*: Keep form hooks unchanged, wrapping controls with style-only classes.
- **Zustand / Polling Interruption**: Layout refactoring might remount state prematurely. *Mitigation*: Retain hook hierarchy and verify scraper polling across view mode changes.

## Rollback Plan
- Revert Git commit to previous revision before Tailwind v4 branch.
- Re-run `pnpm install` in `frontend` to restore Tailwind v3 and PostCSS dependencies.

## Dependencies
- `@tailwindcss/vite` (^4.x), `tailwindcss` (^4.x).
- Google Fonts: Space Grotesk and IBM Plex Mono.

## Success Criteria
- [ ] Tailwind CSS v4 builds cleanly with `@tailwindcss/vite` without PostCSS/v3 config files.
- [ ] "Living Archive" visual styling renders Space Grotesk, IBM Plex Mono, and acid green accents.
- [ ] Persistent 232px sidebar, topbar with ⌘K palette, and mobile bottom navigation operate smoothly.
- [ ] Masonry grid and list row catalog view toggles function seamlessly without state resets.
- [ ] Slide-over inspector allows viewing, editing, and rescrape diff/merge.
- [ ] 100% parity verified: search debouncing/cancellation, scraper polling, tag CRUD, and Sentry/toast error handling remain intact.
