# Auth Resilience Specification

## Purpose
The `auth-resilience` domain ensures robust session token retention during backend cold starts and delivers clear, contextual user feedback on auth submissions during Render free-tier spin-up periods. It prevents premature token erasure on transient network or 5xx errors while maintaining strict invalidation on authentic 401/403 responses.

## Requirements

### Requirement: Cold-Start Resilient Session Validation (`checkAuth`)
The Zustand auth store (`useAuthStore.checkAuth`) MUST validate persisted authentication tokens against the backend profile endpoint without discarding tokens on transient server errors.

When `checkAuth` encounters an explicit HTTP `401 Unauthorized` or `403 Forbidden` response from the backend, it MUST clear the stored token, session, user state, and remove storage tokens.

When `checkAuth` encounters a network error (`ERR_NETWORK`, `ECONNABORTED`), request timeout, or server error (HTTP 502, 503, 504), it MUST NOT erase stored tokens or reset `isAuthenticated`. It SHALL preserve the persisted session to allow the user to remain logged in once the server completes its wake-up cycle.

#### Scenario: Preserving Session on Cold-Start 503 or Network Timeout
- GIVEN a user with a valid stored session and token in `localStorage`
- WHEN `checkAuth` runs during application initialization and the backend returns HTTP 503 or times out
- THEN `useAuthStore` MUST retain `token`, `user`, and `isAuthenticated` in state and storage
- AND `useAuthStore` SHALL set `isLoading` to `false` without invoking `removeAuthToken`

#### Scenario: Purging Session on Explicit 401 Unauthorized Response
- GIVEN a user with an expired or revoked session token
- WHEN `checkAuth` receives an HTTP 401 Unauthorized response from the backend
- THEN `useAuthStore` MUST purge `token`, `user`, and `session` from state and storage
- AND it MUST call `authService.removeAuthToken()` and set `isAuthenticated` to `false`

---

### Requirement: Contextual Submission Feedback during Cold Start
The authentication pages (`Login.jsx` and `Register.jsx`) MUST provide informative, non-blocking feedback when credentials are submitted while the backend is in a cold-start state.

If an authentication request takes longer than standard latency or returns a cold-start error code (502/503/504/timeout), the form MUST display a contextual message explaining the Render free-tier spin-up delay (e.g. "El servidor se está iniciando. Por favor espera unos momentos.").

The form MUST preserve user-entered form field values across retry attempts.

#### Scenario: Informative Feedback on Auth Submission during Server Spin-Up
- GIVEN a user submitting credentials on the `/login` or `/register` page while backend is waking up
- WHEN the backend request encounters a 503 status or timeout
- THEN the form MUST display an informative warm-up callout to the user
- AND all entered input values (email, username) MUST remain preserved in the form fields

#### Scenario: Successful Authentication After Backend Becomes Available
- GIVEN a user on `/login` with credentials entered
- WHEN the backend becomes ready and the login request returns HTTP 200 with tokens
- THEN `useAuthStore` MUST store the session, set `isAuthenticated: true`, and navigate to `/dashboard`
