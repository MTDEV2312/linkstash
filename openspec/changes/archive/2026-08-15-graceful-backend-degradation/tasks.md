# Implementation Tasks: Graceful Backend Degradation & Passive Wakeup UX

## Review Workload Forecast
<!-- id: forecast -->
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: Hook and Store Refactoring

- [x] **1.1 Refactor [`useBackendWakeup.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/hooks/useBackendWakeup.js)**
  - Ensure background health polling to `${backendUrl}/health` runs passively without UI side-effects.
  - Maintain bounded attempts (max 30), dev/test interval (1.5s), and prod interval (10s).
  - Expose reactive status `{ isReady, isChecking, error, attempts }`.

- [x] **1.2 Harden `checkAuth` in [`authStore.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/stores/authStore.js)**
  - Differentiate HTTP errors in `checkAuth`:
    - **401/403**: Explicit session invalidation — call `authService.removeAuthToken()` and clear store auth state (`user: null`, `token: null`, `session: null`, `isAuthenticated: false`).
    - **502/503/504/timeout/network errors**: Transient cold start — preserve `token`, `user`, and `session`; only reset `isLoading: false`.

---

## Phase 2: Status Indicator Component

- [x] **2.1 Implement [`BackendStatusIndicator.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/BackendStatusIndicator.jsx)**
  - Create reusable status component consuming `useBackendWakeup` or status props.
  - Render visual states:
    - **Ready**: Green dot with tooltip `"Backend listo"`.
    - **Waking**: Amber pulsing dot (`animate-pulse`) with tooltip `"Iniciando servidor (Render free-tier). Puede demorar unos segundos."`.
    - **Offline**: Red dot with tooltip `"Servidor no disponible"`.
  - Include accessible attributes (`role="status"`, `aria-label`).

---

## Phase 3: Page Enhancements

- [x] **3.1 Update [`Landing.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Landing.jsx)**
  - Remove `ServerWakeupModal` and backdrop blur overlay to enable immediate unblocked browsing.
  - Remove disabling classes (`opacity-50`, `pointer-events-none`) and `aria-disabled` from navigation links and CTA buttons.
  - Mount [`BackendStatusIndicator`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/BackendStatusIndicator.jsx) inside `LandingNavbar`.

- [x] **3.2 Enhance [`Login.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Login.jsx) and [`Register.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Register.jsx)**
  - Render contextual warm-up callouts upon 502/503/504/timeout responses explaining free-tier spin-up latency.
  - Preserve user-entered form field values across submission retries.

---

## Phase 4: Verification and Automated Testing

- [x] **4.1 Unit Tests for Hook and Store**
  - Create [`frontend/tests/unit/useBackendWakeup.test.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/tests/unit/useBackendWakeup.test.js) covering state transitions and bounded retries.
  - Create [`frontend/tests/unit/authStore.test.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/tests/unit/authStore.test.js) verifying 503 token preservation vs 401 token erasure.

- [x] **4.2 Unit Tests for UI Components and Pages**
  - Create [`frontend/tests/unit/BackendStatusIndicator.test.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/tests/unit/BackendStatusIndicator.test.jsx) validating ready, waking, and offline states.
  - Verify unblocked rendering on `Landing.jsx` and warm-up messages on auth forms.

- [x] **4.3 End-to-End & Lint Verification**
  - Run `npm run lint` and `npm run test` in `frontend/` to confirm zero regressions.
