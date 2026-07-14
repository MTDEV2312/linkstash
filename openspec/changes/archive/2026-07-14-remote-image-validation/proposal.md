# Proposal: Remote Image Validation
## Intent
Implement a robust, unified client-side remote image validation and fallback mechanism in LinkStash. This ensures that any broken or invalid image URLs (such as user-submitted links, missing favicons, or broken third-party hosting) gracefully fall back to default placeholders without causing broken image icons, layout shifts, or infinite error loops in the console.

## Scope
### In Scope
- Refactoring `OptimizedImage.jsx` to serve as the unified component for all remote and local images.
- Implementing a multi-tier fallback mechanism in the component:
  1. Primary: Attempt loading the provided image URL (which may be a remote link or an InsForge Storage URL).
  2. Secondary: Fallback to the backend placeholder (`VITE_BACK_URL + '/defaults/default-image.png'`).
  3. Tertiary: Fallback to an inline local base64/SVG placeholder to prevent network-dependent errors and infinite loops.
- Replacing all raw `<img>` tags rendering user/external content across the codebase with the refactored `OptimizedImage` component.
- Displaying a simple loading skeleton or spinner with pre-defined height/width bounds while the image is validating/loading to minimize Cumulative Layout Shift (CLS).
- Guarding against infinite retry loops if fallback image URLs fail.

### Out of Scope
- Creating backend endpoints for image verification or URL validation.
- Setting up proxy servers for scraping remote images.

## Capabilities
### New Capabilities
- **Local Fallback Autonomy**: The application will display a placeholder image even if the backend is down or unreachable, using a bundled base64 SVG fallback.
- **Visual Stability (CLS Prevention)**: Image elements will show skeletons with container-matching size constraints while loading or resolving fallback states.

### Modified Capabilities
- **Robust Error Handling**: Standardized, centralized error handling for all image resources instead of fragmented `onError` handlers across multiple views.
- **Optimized Favicon & Preview Loading**: Forms and detail views will utilize image optimization (where possible) and error fallback.

## Approach
1. **Extend `OptimizedImage`**:
   - Add state tracking for current load phase: `'loading'`, `'loaded'`, `'fallback-backend'`, and `'fallback-local'`.
   - Prevent infinite loops by restricting transitions (e.g., once `'fallback-local'` is reached, no more state transitions will occur on error).
   - Use InsForge Storage endpoints/URLs for uploaded images instead of legacy Cloudinary paths.
   - Dynamically load the backend placeholder using `import.meta.env.VITE_BACK_URL + '/defaults/default-image.png'`.
   - Bundle a lightweight base64 SVG placeholder for local fallback when backend assets fail.
   - Render a loading skeleton when state is `'loading'`, styled using tailwind classes matching the layout constraints passed as props (e.g., `className`).
2. **Replace `<img>` Tags**:
   - Replace direct `<img>` tags in `LinkForm.jsx` (favicon preview) and `myLinks.jsx` (detail preview, form upload preview).
   - Standardize styling rules to ensure proper sizing propagates down to the skeleton loaders inside `OptimizedImage`.
3. **Clean Up Fragmented Error Handlers**:
   - Remove inline style modifications (like `e.target.style.display = 'none'`) and replace them with standard options from the updated `OptimizedImage` component.

## Affected Areas
- [OptimizedImage.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/OptimizedImage.jsx)
- [LinkForm.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/LinkForm.jsx)
- [myLinks.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/pages/myLinks.jsx)
- [LinkCard.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/LinkCard.jsx)
- [DescriptionModal.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/DescriptionModal.jsx)
- [EditLinkModal.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/EditLinkModal.jsx)

## Risks
- **Cumulative Layout Shift (CLS)**: Skeletons without precise dimension boundaries could disrupt the layout.
  - *Mitigation*: Ensure the skeleton spans the exact dimensions of the image wrapper and respect `width` and `height` properties or Tailwind CSS classes.
- **Infinite Loop on Failure**: A broken fallback image path trigger recursive error loops.
  - *Mitigation*: Implement a state machine or explicit step transition history (`fallbackAttempted`) to stop reloading once the final local fallback has failed.

## Rollback Plan
- Revert the changes to the frontend using git commands: `git checkout HEAD -- frontend/src/` or `git revert <commit>`.

## Dependencies
- Backend running and serving public assets (mitigated by the local base64/SVG fallback in case the backend is down).

## Success Criteria
- Broken image icon is never shown in the UI, regardless of URL validity.
- UI elements do not shift layout significantly during image load (validated visually).
- No infinite loops or console error cascades during image load failures.
- Verification passes through existing Vitest and Playwright test suites.
