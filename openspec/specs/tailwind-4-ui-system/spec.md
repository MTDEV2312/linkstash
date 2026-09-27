# Tailwind v4 UI System Specification

## Purpose
The `tailwind-4-ui-system` capability establishes the core design language, theme token architecture, and layout shell for LinkStash ("Living Archive"). It defines the migration to Tailwind CSS v4 CSS-first `@theme` tokens (Space Grotesk, IBM Plex Mono, acid green signals, dark catalog and paper light palettes), a persistent 232px sidebar navigation shell with mobile bottom bar, a global ⌘K command palette, dual catalog view modes (masonry grid and dense list), and a responsive slide-over detail inspector.

## Requirements

### Requirement: CSS-First Design Tokens and Typography
The frontend application MUST declare all design tokens using Tailwind CSS v4 `@theme` block in `src/index.css` without requiring legacy `tailwind.config.js` or `postcss.config.js` configuration files.

The design token system MUST define:
- `font-sans` and `font-display` tokens mapped to the `Space Grotesk` font family for headings, navigation labels, and display elements.
- `font-mono` token mapped to the `IBM Plex Mono` font family for metadata, URLs, dates, counters, tag badges, and code snippets.
- Dark Catalog color tokens for dark mode: background (`#0b0c0e`), card surface (`#13151a`), elevated surface (`#1a1d24`), and border (`#242832`).
- Paper Light color tokens for light mode: background (`#fbfbfa`), card surface (`#ffffff`), elevated surface (`#f4f4f0`), and border (`#e6e6e0`).
- Signal Accent color tokens: high-contrast acid green (`#a3e635` / `#84cc16`) for primary CTA highlights, active indicators, and focus outlines.

The system MUST support toggling between dark catalog and paper light themes by toggling the `dark` class on the root `<html>` element, persisting the user preference in local storage.

#### Scenario: Rendering Living Archive Typography and Theme Tokens
- GIVEN an application configured with Tailwind CSS v4
- WHEN the user views any rendered page in the application
- THEN all headings and display titles MUST use `Space Grotesk`
- AND all tags, timestamps, URLs, and counter badges MUST use `IBM Plex Mono`
- AND interactive focus outlines and active badges MUST use the acid signal accent tokens

#### Scenario: Switching Between Dark Catalog and Paper Light Themes
- GIVEN the application rendered in Dark Catalog mode
- WHEN the user triggers the theme toggle action
- THEN the system MUST remove the `dark` class from the `<html>` root element
- AND the background and surface colors MUST immediately transition to the Paper Light palette
- AND the chosen theme preference MUST be saved to `localStorage`

---

### Requirement: Persistent Editorial Navigation Shell
The application layout (`Layout.jsx`) MUST provide a persistent, fixed desktop sidebar with a fixed width of exactly 232 pixels (`w-[232px]`) on screens with viewport width ≥ 1024px (`lg` breakpoint).

The desktop sidebar MUST include:
- A top-anchored LinkStash brand identifier featuring Space Grotesk typography.
- Primary navigation links: Dashboard (`/dashboard`), Mis Enlaces (`/mylinks`), Etiquetas (`/tags`), and Configuración (`/settings`).
- Visual active state indicator for the currently active route featuring an acid accent mark and monospace badge counter where applicable.
- A bottom-anchored user profile card with user username and a Logout button.

The main content container on desktop screens MUST have a left padding of exactly 232 pixels (`lg:pl-[232px]`) to prevent overlap with the fixed sidebar.

On mobile screens (< 1024px), the shell MUST provide a persistent bottom navigation bar or slide-out drawer providing immediate touch access to primary sections without concealing active page content.

#### Scenario: Desktop Navigation Shell Sizing and Offsets
- GIVEN an authenticated user viewing any protected route on a desktop screen (width ≥ 1024px)
- WHEN the layout shell mounts
- THEN the desktop sidebar MUST be fixed to the left viewport edge with width equal to 232px
- AND the main scrollable content area MUST have a left padding offset of 232px (`lg:pl-[232px]`)
- AND the active navigation item MUST display the high-contrast acid indicator

#### Scenario: Mobile Viewport Navigation Adaptation
- GIVEN an authenticated user on a mobile device (width < 1024px)
- WHEN the user navigates between application views
- THEN the desktop 232px sidebar MUST be hidden
- AND the mobile navigation controls MUST remain accessible at the bottom of the viewport
- AND tapping a section link MUST navigate to the target route and close any open mobile overlay

---

### Requirement: Contextual Topbar and Global ⌘K Command Palette
The desktop layout MUST render a sticky or fixed contextual topbar above the main content displaying the current section title, a trigger button for the command palette showing the `⌘K` / `Ctrl+K` shortcut hint, a theme toggle, and backend status.

The application MUST listen globally for the keyboard shortcuts `Meta+K` (macOS) and `Control+K` (Windows/Linux). When triggered, the system MUST open a centered, non-blocking modal Command Palette overlay.

The Command Palette MUST:
- Provide an auto-focused text search input with instant debounced filtering.
- Display quick-navigation actions to all primary application sections (`Dashboard`, `Mis Enlaces`, `Etiquetas`, `Configuración`).
- Support real-time search across saved links by title, url, or tag.
- Support instant keyboard navigation using `ArrowDown`, `ArrowUp`, and `Enter` to select an item.
- Close immediately upon pressing the `Escape` key or clicking the backdrop overlay.

#### Scenario: Invoking Command Palette via Keyboard Shortcut
- GIVEN an authenticated user on any application route
- WHEN the user presses `Cmd+K` on macOS or `Ctrl+K` on Windows/Linux
- THEN the Command Palette modal MUST open centered on screen with its search input auto-focused
- AND background page scrolling MUST be locked while the palette is open

#### Scenario: Searching and Navigating from Command Palette
- GIVEN an open Command Palette
- WHEN the user types a query matching saved links or section titles
- THEN the palette MUST filter matching items in real time
- AND pressing `Enter` on a selected item MUST navigate to the target route or link and close the palette

#### Scenario: Dismissing Command Palette
- GIVEN an open Command Palette
- WHEN the user presses the `Escape` key or clicks outside the modal dialog
- THEN the Command Palette MUST close immediately without navigating or modifying state

---

### Requirement: Dual Catalog View Modes (Masonry Grid & Dense List)
The `myLinks` view MUST provide an interactive view mode toggle allowing users to switch between a Masonry Grid view and a Dense List catalog view.

The view mode state MUST satisfy:
- Masonry Grid mode: displays responsive cards in a multi-column masonry-style grid (`columns-1 sm:columns-2 lg:columns-3 xl:columns-4`), preserving variable image heights, displaying full tag pills, preview domain, and quick action buttons.
- Dense List mode: displays compact horizontal rows formatted as an editorial ledger/table with columns for thumbnail/favicon, title, domain, tag badges in monospace, visit counters, and action triggers.
- Toggling between view modes MUST be instantaneous and MUST NOT trigger network re-fetching, reset active search queries, or clear applied tag filters.
- The user's preferred view mode (`grid` vs `list`) SHOULD be persisted in `localStorage`.

#### Scenario: Toggling from Grid to Dense List View
- GIVEN an authenticated user on `/mylinks` with an active search query and selected tag filter in Grid view
- WHEN the user clicks the List view toggle button
- THEN the layout MUST immediately transition to the Dense List tabular row layout
- AND the active search query, tag filters, and pagination offset MUST remain intact without network reload

#### Scenario: Responsive Masonry Card Rendering
- GIVEN `myLinks` configured in Masonry Grid mode with links of varying content lengths
- WHEN the grid renders on a desktop viewport
- THEN cards MUST be arranged in responsive columns without vertical gaps or layout breaking
- AND image thumbnails MUST render using `OptimizedImage` with fallback placeholders

---

### Requirement: Slide-Over Detail Inspector
The `myLinks` view MUST provide a slide-over sheet ("Detail Inspector") anchored to the right viewport edge (`fixed right-0 top-0 h-full w-full max-w-xl`) for inspecting and modifying a selected link.

The Slide-Over Detail Inspector MUST:
- Open smoothly when the user selects or clicks a link card/row from the catalog.
- Display the link's preview image, full title in Space Grotesk, formatted destination URL, full description, creation and last-visited timestamps in IBM Plex Mono, click count, and tag chips.
- Provide action buttons for `Editar` (inline manual edit), `Re-escanear` (metadata re-scrape diff), and `Eliminar` (delete link).
- Support inline form editing of `title`, `url`, `description`, `image`, and `tags` using existing `react-hook-form` / store validations without navigating away from the view.
- Dismiss smoothly when the user clicks the close button, presses `Escape`, or clicks the backdrop overlay.

#### Scenario: Opening Link Detail in Slide-Over Inspector
- GIVEN an authenticated user viewing their saved links
- WHEN the user clicks on a link card or table row
- THEN the slide-over inspector MUST slide in from the right viewport edge
- AND it MUST display complete link metadata, tags, and formatted timestamps
- AND the background catalog MUST remain visible beneath the backdrop

#### Scenario: Closing Slide-Over Inspector
- GIVEN an active slide-over detail inspector
- WHEN the user presses `Escape` or clicks the backdrop overlay
- THEN the slide-over inspector MUST close
- AND focus MUST return to the catalog without reloading link data

---

### Requirement: Editorial UI Component Primitives
The application MUST provide reusable, theme-consistent UI component primitives reflecting the Living Archive aesthetic:
- Buttons: `btn-primary` (acid accent background with high-contrast text and hover states), `btn-outline` (monochrome border with subtle hover fill), `btn-ghost` (borderless minimal interactive button).
- Badges: `badge-primary` (acid signal accent), `badge-secondary` (neutral tone with IBM Plex Mono font), and status indicator badges (`badge-success`, `badge-warning`, `badge-error`).
- Inputs: Form inputs and textareas featuring high-contrast borders, monospace placeholder styling option, and acid focus rings (`focus:ring-2 focus:ring-acid`).
- Skeleton Loaders: Loading state placeholders matching the typography hierarchy and card dimensions of both masonry cards and list rows.

#### Scenario: Accessible Focus and Interaction on Primitives
- GIVEN a user navigating the interface via keyboard
- WHEN a button, link, or input element receives keyboard focus
- THEN it MUST display a visible high-contrast focus ring with offset adhering to WCAG 2.1 AA accessibility guidelines
- AND disabled buttons MUST convey `disabled` state with `opacity-50` and `pointer-events-none`
