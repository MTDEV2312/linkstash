# Proposal: Graceful Backend Degradation & Passive Wakeup UX

## Intent
Transform the cold-start and backend health-check UX so portfolio visitors can instantly explore and interact with the landing page without intrusive blocking modals, while providing seamless background wake-up polling, clear status visibility, and robust auth token preservation during Render free-tier spin-ups.

## Scope

### In Scope
- **Modal Overlay Removal**: Remove blocking `ServerWakeupModal` and backdrop blur from [`Landing.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Landing.jsx), enabling immediate browsing.
- **Passive Background Wakeup**: Update [`useBackendWakeup`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/hooks/useBackendWakeup.js) to run polling health checks without locking UI interaction or disabling navigation links.
- **Subtle Status Indicator**: Add an elegant, non-intrusive backend status indicator in the header/navbar explaining free-tier (Render) spin-up state with tooltips/visual cues.
- **Contextual Auth Feedback**: Enhance login and registration forms with informative warm-up banners or button states when the backend is spinning up.
- **Resilient Auth Store**: Update `checkAuth` in [`authStore.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/stores/authStore.js) to distinguish network/timeout/5xx cold-start errors from 401/403 unauthorized responses, preventing accidental session token erasure.

### Out of Scope
- Backend infrastructure changes or upgrading to paid Render tiers.
- Modifying Supabase Auth architecture or MongoDB domain collections.
- Full offline PWA data synchronization for authenticated dashboard features.

## Capabilities

### New Capabilities
- **`BackendStatusIndicator`**: Lightweight Navbar component rendering operational state (`Ready`, `Waking up...`, `Offline`) with explanatory Render free-tier tooltip.
- **Contextual Auth Warm-up Notices**: Informative callouts in [`Login.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Login.jsx) and [`Register.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Register.jsx) when submission coincides with backend cold start.

### Modified Capabilities
- **`useBackendWakeup`**: Decoupled from full-screen blocking UI; provides global reactive status (`isReady`, `isChecking`, `attempts`, `error`).
- **`useAuthStore.checkAuth`**: Resilient token validation preserving persisted JWT on timeout/network failure and only clearing on explicit 401/403 status.
- **`Landing` Viewport**: Completely unblocked zero-delay initial render.

## Approach
1. **Remove Blocking UI**: Strip `ServerWakeupModal` and disabled link classes (`aria-disabled`) from [`Landing.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Landing.jsx).
2. **Implement Status Indicator**: Create `BackendStatusIndicator.jsx` in Navbar displaying real-time backend health with pulse animations.
3. **Harden `useBackendWakeup`**: Refactor polling logic with exponential backoff and timeout handling.
4. **Harden `authStore.js`**: Update error handling in `checkAuth` to retain `token` and `session` on cold-start/network errors (`ERR_NETWORK`, `ECONNABORTED`, 502/503/504).
5. **Contextual Form Handling**: Add status-aware feedback in [`Login.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Login.jsx) and [`Register.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Register.jsx) to guide users during server wake-ups.

## Affected Areas
- [`frontend/src/pages/Landing.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Landing.jsx)
- [`frontend/src/hooks/useBackendWakeup.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/hooks/useBackendWakeup.js)
- [`frontend/src/stores/authStore.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/stores/authStore.js)
- [`frontend/src/components/BackendStatusIndicator.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/BackendStatusIndicator.jsx) *(New)*
- [`frontend/src/pages/Login.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Login.jsx)
- [`frontend/src/pages/Register.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Register.jsx)

## Risks
1. **Unaware User Submissions**: Users attempting login while server is cold may experience delay. *Mitigation*: Display clear spinning-up indicators on auth action triggers.
2. **Stale Token Persistence**: Retaining tokens during temporary outages might delay detecting genuinely revoked tokens. *Mitigation*: Next successful backend request or 401 interceptor will handle invalidation.

## Rollback Plan
1. Revert [`Landing.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/pages/Landing.jsx), [`useBackendWakeup.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/hooks/useBackendWakeup.js), and [`authStore.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/stores/authStore.js) via Git.
2. Remove [`BackendStatusIndicator.jsx`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/components/BackendStatusIndicator.jsx).

## Dependencies
- `@supabase/supabase-js`, `zustand`, `lucide-react`, `axios`.

## Success Criteria
- [ ] Landing page renders immediately without modal backdrop or blocked navigation.
- [ ] Backend status indicator displays current health state with explanatory tooltip.
- [ ] Network timeout or 503 during cold start does not clear valid stored auth tokens in [`authStore.js`](file:///C:/Users/agusm/Videos/DEV/LinkStash/frontend/src/stores/authStore.js).
- [ ] Auth pages show informative status if submitted during server wake-up.
- [ ] All frontend unit/e2e tests pass.
