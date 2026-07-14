# Exploration: Remote Image Validation

## Current State

Image rendering is currently split between direct `<img>` tags and the `OptimizedImage` component. 

1. Direct `<img>` tags are used in:
   - [LinkForm.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/LinkForm.jsx) (for the favicon preview)
   - [myLinks.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/pages/myLinks.jsx) (in the link detail view and the image upload preview)

2. `OptimizedImage` is used in:
   - [LinkCard.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/LinkCard.jsx) (for list view and grid view)
   - [DescriptionModal.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/DescriptionModal.jsx)
   - [EditLinkModal.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/EditLinkModal.jsx)

### Current Error Handling Patterns
- **Localized/Inconsistent Handling**:
  - `LinkForm.jsx`, `DescriptionModal.jsx`, and `EditLinkModal.jsx` hide the image inline on error: `onError={(e) => e.target.style.display = 'none'}`.
  - `LinkCard.jsx` uses a local `imageError` state: `onError={() => setImageError(true)}` to replace the card thumbnail with a "Sin imagen" or "N/A" div placeholder.
  - `OptimizedImage` itself has retry/fallback logic: if the optimized source (Cloudinary) fails, it tries fallback to `normalizedSrc` (raw URL), and then bubbles up the error via `onError`.
- **Placeholder Assets**:
  - The fallback placeholder image `/defaults/default-image.png` is hosted on the backend server (`backend/public/defaults/default-image.png`), but is not present in the frontend assets. If the frontend requests `/defaults/default-image.png` without prefixing the backend base URL, the Vite dev server returns a 404 since it is not in the frontend's `public` folder.

## Affected Areas

- [LinkForm.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/LinkForm.jsx) — renders the favicon preview.
- [myLinks.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/pages/myLinks.jsx) — renders the detail preview image and the form edit preview image.
- [LinkCard.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/LinkCard.jsx) — renders grid/list card thumbnails.
- [DescriptionModal.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/DescriptionModal.jsx) — renders modal description image preview.
- [EditLinkModal.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/EditLinkModal.jsx) — renders edit link modal preview.
- [OptimizedImage.jsx](file:///C:/Users/agusm/Videos/prueba/LinkStash/frontend/src/components/OptimizedImage.jsx) — provides image optimization.

## Approaches

### 1. Introduce a separate `SafeImage` component and replace all `<img>` tags and `OptimizedImage` references.
- **Description**: Implement a brand new `SafeImage` component that accepts standard image properties, manages loading state (shows a skeleton/spinner), and listens for `onError` to swap the source with the default placeholder.
- **Pros**:
  - Complete separation of concerns: error correction is handled by a new dedicated component.
  - Simple, isolated implementation.
- **Cons**:
  - Splitting image concerns results in having two custom components (`OptimizedImage` for optimization/lazy loading and `SafeImage` for validation) or needing one to wrap the other.
  - Duplication of features if we don't integrate `OptimizedImage` with `SafeImage`.
- **Effort**: Medium

### 2. Refactor the existing `OptimizedImage` to act as the single centralized `SafeImage`.
- **Description**: Rename or extend `OptimizedImage` to contain both the lazy loading/responsive/Cloudinary features and the error recovery/fallback placeholder logic. Direct `<img>` tags in other files will be replaced with this component.
- **Pros**:
  - Single component to maintain for all image needs (DRY principle).
  - All existing optimizations (lazy loading, blur placeholders, format selection) are automatically preserved.
  - Centralized place to implement infinite-loop protection and fallback placeholder URLs.
- **Cons**:
  - Changes the API of a core component that is widely used, which requires updating all references (which is also required by the spec).
- **Effort**: Low-Medium

### 3. Wrap `OptimizedImage` with a new `SafeImage` component.
- **Description**: Create a new `SafeImage` component that internally wraps `OptimizedImage` (or standard `<img>` if optimization is not desired). It manages the loading/error state and redirects the source on failure to the default placeholder.
- **Pros**:
  - Clean separation: `OptimizedImage` is unchanged, preserving its specific features.
  - Flexibility to choose between optimized/unoptimized images using a simple prop.
- **Cons**:
  - Double wrappers introduce extra properties forwarding and React render cycles.
- **Effort**: Medium

## Recommendation

We recommend **Approach 2** (Refactoring and extending `OptimizedImage` to act as a unified `SafeImage` component, or creating `SafeImage` as the new unified component and replacing `OptimizedImage`'s contents). It guarantees that all images in the application benefit from both the validation/fallback logic and the performance optimizations (lazy-loading, WebP, etc.) without code duplication. The new component will:
1. Track whether a fallback source has already been applied using a state variable (e.g., `fallbackAttempted`) to prevent infinite loading loops.
2. Resolve the placeholder image by either pointing to a base64 encoded SVG/PNG placeholder (avoiding network dependency) or constructing a URL via `import.meta.env.VITE_BACK_URL + '/defaults/default-image.png'`.
3. Accept custom class names, sizing, and styling to adapt to all contexts (cards, modals, detail panels).

## Risks

- **Infinite Loop**: If the placeholder URL fails to load, it can cause an infinite loop in the `onError` handler.
  - *Mitigation*: Track the error count or a boolean `fallbackApplied` in the local component state and do not attempt to reload the placeholder if it has already failed.
- **Placeholder Accessibility**: If the placeholder image is loaded remotely from the backend and the backend is down, the placeholder will fail to render.
  - *Mitigation*: Bundle a local fallback placeholder image in the frontend asset folder, or embed a tiny inline SVG/base64 placeholder inside the code.
- **Layout Shift (CLS)**: Showing skeleton loaders during validation might trigger cumulative layout shifts if sizing is not strictly defined.
  - *Mitigation*: Require `width` and `height` properties or establish strict aspect ratio wrappers.

## Ready for Proposal
Yes. The orchestrator should proceed with proposing the change to the user by creating `spec-propose.md` in `openspec/changes/remote-image-validation/` directory.
