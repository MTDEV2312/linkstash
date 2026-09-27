# Landing Page Presentation Specification Delta

## Purpose
Specifies modifications to the `landing-page-presentation` capability under the Tailwind CSS v4 "Living Archive" redesign. It overhauls the visual styling with Space Grotesk display typography, IBM Plex Mono metadata badges, high-contrast dark catalog / paper light themes, and acid green signals, while strictly preserving zero-delay initial rendering, unblocked CTA navigation, and non-blocking backend wakeup polling.

## MODIFIED Requirements

### Requirement: Unblocked Zero-Delay Initial Render
The system MUST render the landing page view immediately upon component mount using the editorial Living Archive design system (Space Grotesk typography, IBM Plex Mono metadata badges, acid green signals, and dark catalog / paper light themes) without full-screen modal overlays, backdrops, or blur filters.

The system MUST NOT render blocking components such as `ServerWakeupModal` on the landing page.

#### Scenario: Immediate Landing Page Exploration with Editorial Aesthetic
- GIVEN a visitor navigating to the landing page root URL (`/`) while the backend is spinning up
- WHEN the landing page component mounts
- THEN all marketing sections (Navbar, Hero, Living Archive Demo Card, Features, Benefits, Footer) MUST be immediately visible and scrollable
- AND typography MUST render with Space Grotesk headings and IBM Plex Mono metadata chips
- AND no backdrop blur or modal overlay SHALL be displayed

---

### Requirement: Interactive Navigation and CTA Availability
The system MUST keep all navigation links, buttons, and call-to-action (CTA) controls enabled and interactive at all times on the landing page, regardless of backend availability state.

Navigation links (`Iniciar sesión`, `Registrarse`, `Comenzar gratis`) and interactive demo cards MUST use the Living Archive editorial button and badge primitives (`btn-primary` with acid accents, `btn-outline`) and MUST NOT apply disabling CSS classes (`opacity-50`, `pointer-events-none`, `cursor-not-allowed`) or `aria-disabled="true"` based on backend status.

#### Scenario: Navigating to Auth Routes during Backend Cold Start
- GIVEN an editorial landing page loaded while backend `isReady` is `false`
- WHEN the user clicks "Iniciar sesión", "Registrarse", or "Comenzar gratis"
- THEN the browser MUST navigate immediately to `/login` or `/register` without being blocked, throttled, or delayed

#### Scenario: Interacting with Living Archive Demo Elements
- GIVEN a visitor exploring the redesigned landing page while backend is not yet ready
- WHEN the visitor inspects the interactive demo cards, tag pills, or dark mode toggle
- THEN all UI controls MUST respond immediately without delay or error modals

---

## ADDED Requirements

### Requirement: Editorial Backend Status Alert Presentation
The landing page MUST display non-intrusive backend status indicators (`BackendStatusIndicator`) in the navigation bar and subtle notification banners (`ConnectionErrorBanner`) if health checks fail, without interrupting user exploration.

The status indicator MUST:
- Use IBM Plex Mono typography for status labels.
- Display an acid green indicator dot when backend `isReady` is `true`.
- Display a subtle animated amber pulsing dot when backend is checking or waking up (`isChecking === true`).
- Display an error badge only if health check requests fail, remaining non-modal and dismissable.

#### Scenario: Passive Wakeup Status Display
- GIVEN a visitor on the landing page during a backend cold start
- WHEN `useBackendWakeup` initiates background polling
- THEN the navbar status indicator MUST display a non-blocking amber status badge
- AND the visitor MUST be able to freely scroll and interact with the page

#### Scenario: Backend Ready Transition
- GIVEN a visitor viewing the landing page while the backend completes wakeup
- WHEN health check polling succeeds with `isReady === true`
- THEN the navbar indicator MUST smoothly transition to an acid green ready badge without disruptive re-rendering
