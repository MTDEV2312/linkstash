# Technical Design: Tailwind CSS v4 & Living Archive UI Redesign

## Technical Approach
Migrate LinkStash from Tailwind v3/PostCSS to Tailwind CSS v4 using `@tailwindcss/vite`. Declare design tokens via CSS-first `@theme` in `src/index.css` featuring Space Grotesk, IBM Plex Mono, Dark Catalog / Paper Light themes, and acid green (`#a3e635` / `#c7ff4a`) accents. Refactor the shell into a persistent 232px fixed desktop sidebar (`w-[232px]`, `lg:pl-[232px]`), topbar with global ⌘K Command Palette, and mobile bottom bar. Provide dual catalog views (CSS masonry grid and dense list) in `myLinks.jsx` and consolidate inspection, editing, and rescrape diff/merge into a slide-over drawer (`LinkDetailSheet.jsx`). Maintain 100% parity with existing Zustand stores, Axios cancelation, and scraper polling.

## Architecture Decisions

| Area | Options | Tradeoffs | Decision |
| :--- | :--- | :--- | :--- |
| **Toolchain** | A) Tailwind v3 + PostCSS<br>B) Tailwind v4 + `@tailwindcss/vite` | Option A retains legacy configs. Option B simplifies tooling, compiles faster in Vite, and uses `@theme` tokens. | **Option B**: Adopt Tailwind v4 with `@tailwindcss/vite`; delete `tailwind.config.js` and `postcss.config.js`. |
| **Command Palette** | A) Library (`cmdk`)<br>B) Custom modal (`CommandPalette.jsx`) | Option A adds bundle weight. Option B integrates directly with `useLinkStore` without extra dependencies. | **Option B**: Custom accessible `CommandPalette.jsx` with keyboard navigation. |
| **Detail & Rescrape** | A) Separate dialogs<br>B) Unified slide-over drawer | Option A stacks modals. Option B keeps archive context visible and cleanly layers rescrape diff comparison. | **Option B**: Unified `LinkDetailSheet.jsx` with layered rescrape diff view. |
| **Masonry View** | A) JS masonry library<br>B) Native CSS columns | Option A adds layout jank and bundle cost. Option B uses CSS multi-columns at zero runtime cost. | **Option B**: Native CSS multi-columns with instant grid/list toggle. |

## Data Flow

```
[ User Interaction ]
   │
   ├─► Keyboard [⌘K / Ctrl+K] ──► CommandPalette ──► Filter / Navigate
   │
   ├─► View Toggle ──► myLinks.jsx [viewMode: 'grid' | 'list'] (Instant)
   │
   ├─► Select Link ──► LinkDetailSheet (Slide-Over Drawer)
   │     ├─► Inline Edit ──► updateLink() ──► PUT /api/links/:id
   │     └─► Re-escanear ──► scrapePreview() ──► POST /api/links/:id/scrape-preview
   │           └─► Diff View ──► Selective Merge ──► PUT /api/links/:id
   │
   └─► Polling (links.status === 'processing') ──► fetchLinks(filters) [4s delay]
         │
         ▼
[ Zustand Stores: linkStore / tagStore / authStore ] ◄──► Axios API Client (AbortController)
```

## File Changes

| File Path | Description |
| :--- | :--- |
| `frontend/package.json` | Upgrade to `tailwindcss@^4.0.0`, add `@tailwindcss/vite`, prune `postcss`/`autoprefixer`. |
| `frontend/vite.config.js` | Add `@tailwindcss/vite` plugin. |
| `frontend/tailwind.config.js` | Delete deprecated v3 configuration. |
| `frontend/postcss.config.js` | Delete deprecated PostCSS configuration. |
| `frontend/src/index.css` | Add `@import "tailwindcss";`, `@theme` tokens, typography, and base primitives. |
| `frontend/src/components/Layout.jsx` | Implement 232px sidebar, contextual topbar with ⌘K, and mobile bottom bar. |
| `frontend/src/components/CommandPalette.jsx` | Global search modal with keyboard navigation (⌘K / Ctrl+K). |
| `frontend/src/components/LinkCard.jsx` | Redesign cards for masonry grid and dense list row modes. |
| `frontend/src/components/LinkDetailSheet.jsx` | Slide-over inspector drawer with inline edit and rescrape trigger. |
| `frontend/src/components/ReScrapeModal.jsx` | Restyle diff comparison with Space Grotesk and IBM Plex Mono tokens. |
| `frontend/src/pages/myLinks.jsx` | Wire view toggles, slide-over drawer, and preserve search/filter/polling logic. |
| `frontend/src/pages/Landing.jsx` | Editorial typography, preserving unblocked zero-delay backend wakeup check. |
| `frontend/src/pages/tags.jsx` | Update tag catalog view to Living Archive tokens and monospace badges. |

## Interfaces / Contracts

- **CSS Theme Tokens**:
  - Fonts: `--font-sans: "Space Grotesk"`, `--font-mono: "IBM Plex Mono"`.
  - Colors: `--bg`, `--surface`, `--surface-2`, `--border`, `--accent` (`#c7ff4a`). Light palette via `[data-theme="light"]` / `.dark`.
- **CommandPalette**: `interface { isOpen: boolean, onClose: () => void }`
- **LinkDetailSheet**: `interface { link: LinkItem | null, allTags: Tag[], isOpen: boolean, onClose: () => void, onUpdate: () => Promise<void> }`
- **API Contracts**: Retain existing `GET /api/links`, `POST /api/links/:id/scrape-preview`, `PUT /api/links/:id`, and `DELETE /api/links/:id` contracts without change.

## Testing Strategy
- **Unit & Component Testing (Vitest)**:
  - Test `LinkCard` rendering in `'grid'` and `'list'` modes.
  - Test `CommandPalette` shortcuts, query filtering, and Escape dismissal.
  - Test `LinkDetailSheet` edit form validation and tag selector bindings.
- **Build Verification**:
  - Run `pnpm run build` in `frontend` verifying `@tailwindcss/vite` compiles cleanly without CSS warnings.
- **End-to-End Testing (Playwright)**:
  - Validate desktop `232px` sidebar offset vs mobile bottom bar.
  - Verify theme persistence in `localStorage` across page reloads.

## Threat Matrix
N/A — Client-side UI presentation refactor. No shell, process, or security boundary modifications.

## Migration / Rollout
1. **Toolchain**: Install `@tailwindcss/vite` and `tailwindcss@^4`; delete v3 configs.
2. **Tokens**: Configure `src/index.css` with `@theme` values and typography.
3. **Shell**: Update `Layout.jsx` and create `CommandPalette.jsx`.
4. **Archive & Drawer**: Overhaul `LinkCard.jsx`, `LinkDetailSheet.jsx`, and `myLinks.jsx`.
5. **Views**: Restyle `Landing.jsx` and `tags.jsx`.
6. **Validation**: Execute `pnpm run build` and test suites.

## Open Questions
None. Specs and prototypes fully resolve all visual and behavioral requirements.
