## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150-250 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | None |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

### Suggested Work Units
| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| Unit 1: Component Refactor & Unit Tests | Implement fallback state machine and loop guard in OptimizedImage, verify with unit tests | PR 1 | `npm run test` (vitest target: `frontend/tests/unit/OptimizedImage.test.jsx`) | Vitest | Revert OptimizedImage.jsx |
| Unit 2: Component Replacements | Update frontend components/pages to use OptimizedImage instead of raw image tags | PR 1 | `npm run test` | Frontend browser / E2E | Revert UI page modifications |

## Phase 1: Foundation
- [x] 1.1 Add `LOCAL_FALLBACK_SVG` base64 placeholder constant to [OptimizedImage.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/OptimizedImage.jsx).
- [x] 1.2 Implement the multi-tier fallback state machine (states: `'loading'`, `'loaded'`, `'fallback-backend'`, `'fallback-local'`, `'terminal-error'`) in [OptimizedImage.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/OptimizedImage.jsx).
- [x] 1.3 Add visual skeleton wrapper UI using Tailwind (`animate-pulse bg-gray-200 dark:bg-gray-700`) matching width/height constraints when loading or resolving fallbacks. Keep underlying `<img>` element in the DOM but hidden using `style={{ display: 'none' }}` to allow background resolution and error catching.
- [x] 1.4 Implement fallback source resolution logic targeting primary URL, backend fallback (`VITE_BACK_URL + '/defaults/default-image.png'`), and tertiary inline `LOCAL_FALLBACK_SVG` in [OptimizedImage.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/OptimizedImage.jsx).
- [x] 1.5 Add infinite loop guard: if `status` is already `'fallback-local'`, block any further transition/retry on error and log a console error message.
- [x] 1.6 Create Vitest unit tests in [frontend/tests/unit/OptimizedImage.test.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/tests/unit/OptimizedImage.test.jsx) verifying:
  - Initial loading skeleton matches dimensions.
  - Successful primary image load removes skeleton.
  - Primary error triggers backend fallback attempt.
  - Backend fallback failure triggers local base64 SVG fallback.
  - Tertiary failure triggers infinite loop guard, blocks retries, and logs console error.
- [x] 1.7 Run unit tests for [OptimizedImage.test.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/tests/unit/OptimizedImage.test.jsx) and verify all pass.

## Phase 2: Core Implementation
- [x] 2.1 Replace raw favicon `<img>` preview with `<OptimizedImage>` in [LinkForm.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/LinkForm.jsx) and remove manual inline `onError` styles.
- [x] 2.2 Replace raw `<img>` preview and edit preview with `<OptimizedImage>` in [myLinks.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/pages/myLinks.jsx).
- [x] 2.3 Remove manual `imageError` state and custom fallback logic from [LinkCard.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/LinkCard.jsx) and replace both list/grid preview fallback logic with standard `<OptimizedImage>` components.
- [x] 2.4 Remove manual `onError` inline display adjustments and rely on `<OptimizedImage>` fallbacks in [DescriptionModal.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/DescriptionModal.jsx).
- [x] 2.5 Remove manual `onError` inline display adjustments and rely on `<OptimizedImage>` fallbacks in [EditLinkModal.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/EditLinkModal.jsx).

## Phase 3: Testing & Verification
- [x] 3.1 Execute unit test suite with `npm run test` to verify no regressions in other tests.
- [x] 3.2 Verify visual stability and skeleton layout matching during mount and transitions in browser.
- [x] 3.3 Verify mock asset loads and failures fallback seamlessly to backend and local placeholders.
- [x] 3.4 Execute lint checks using `npm run lint` to guarantee code quality compliance.
