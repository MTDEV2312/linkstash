# Backend Health and Wakeup Specification

## Purpose
The `backend-health-and-wakeup` domain provides non-blocking, background health probing and passive status observability for Render free-tier cold-starts. It decouples server readiness polling from UI blocking, providing real-time backend state to consumers and lightweight status indicators.

## Requirements

### Requirement: Non-Blocking Background Health Polling
The system MUST perform background health verification via the `useBackendWakeup` hook by issuing non-blocking HTTP GET requests to `${VITE_BACK_URL}/health`.

The polling mechanism MUST NOT block UI rendering or disable user interactions. The hook SHALL poll at intervals configured by environment (1.5s in development/test, 10s in production) up to a bounded maximum (30 attempts).

The hook MUST expose reactive status values: `isReady`, `isChecking`, `error`, and `attempts`.

#### Scenario: Backend Becomes Ready on First Attempt
- GIVEN a client mounting `useBackendWakeup`
- WHEN the initial health check request returns HTTP 200 OK
- THEN `isReady` MUST be set to `true`
- AND `isChecking` MUST be set to `false`
- AND the polling interval MUST be terminated immediately

#### Scenario: Backend Cold-Start with Subsequent Recovery
- GIVEN a cold backend returning 503 Service Unavailable or connection timeout on initial attempts
- WHEN `useBackendWakeup` performs consecutive health checks
- THEN `isChecking` MUST remain `true` and `attempts` counter MUST increment on each cycle
- AND WHEN a subsequent health check returns HTTP 200 OK
- THEN `isReady` MUST transition to `true` and active intervals MUST be cleared

#### Scenario: Polling Timeout After Maximum Attempts Exceeded
- GIVEN a backend service that remains unreachable across 30 consecutive attempts
- WHEN the attempt threshold is reached
- THEN `isChecking` MUST be set to `false`
- AND `error` MUST contain an informative failure message
- AND further polling MUST halt

---

### Requirement: Passive Backend Status Indicator
The system MUST provide a lightweight `BackendStatusIndicator` component in the application header/navbar showing real-time backend operational status.

The component MUST render the following visual states:
1. **Ready**: A subtle green indicator dot or badge with tooltip "Backend listo".
2. **Waking**: An amber/yellow pulsing indicator with tooltip explaining Render free-tier spin-up ("Iniciando servidor (Render free-tier). Puede demorar unos segundos.").
3. **Offline**: A red indicator with tooltip ("Servidor no disponible").

The component MUST be fully accessible, including appropriate `aria-live` or `aria-label` attributes.

#### Scenario: Displaying Spin-up Status during Cold Start
- GIVEN `useBackendWakeup` reporting `isReady: false` and `isChecking: true`
- WHEN `BackendStatusIndicator` renders in the navigation bar
- THEN it MUST display an amber pulsing status indicator
- AND it MUST provide a tooltip explaining the Render free-tier cold-start latency

#### Scenario: Transitioning to Ready State
- GIVEN `BackendStatusIndicator` currently displaying the waking state
- WHEN `useBackendWakeup` transitions `isReady` to `true`
- THEN the indicator MUST smoothly update to the green ready state without causing layout shifts
