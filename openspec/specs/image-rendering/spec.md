# Image Rendering Specification

## Purpose
The `image-rendering` domain is responsible for displaying images (favicons, website previews, and user-uploaded media) in a unified, visually stable, and fault-tolerant manner. It prevents layout shifts (CLS), guards against infinite image reload/retry error loops, and guarantees fallback placeholder rendering even when external sources or the application backend are unavailable.

## Requirements

### Requirement: Unified Image Component Usage
The system MUST render all user-submitted, external, and dynamic image resources using a unified rendering component. This component SHALL handle loading states, success states, and fallback states dynamically.

#### Scenario: Rendering an Image with the Unified Component
- GIVEN a user interface displaying an external image URL
- WHEN the unified image component renders
- THEN it SHALL mount and initialize loading states before attempting to fetch the resource

---

### Requirement: Multi-Tier Fallback Mechanism
The system MUST support a three-tier fallback mechanism to resolve image source failures:
1. **Primary Tier**: The system SHALL first attempt to load the target image URL.
2. **Secondary Tier**: If the primary source fails, the system SHALL attempt to load the backend-provided placeholder image path (`VITE_BACK_URL + '/defaults/default-image.png'`).
3. **Tertiary Tier**: If both primary and backend sources fail (or if the backend is offline), the system MUST render a local, inline base64-encoded SVG placeholder.

#### Scenario: Fallback to Backend Placeholder on Primary Load Failure
- GIVEN a unified image component configured with a broken primary URL and a functioning backend URL
- WHEN the primary URL fails to load
- THEN the component MUST transition to the backend fallback state and attempt to load the backend placeholder

#### Scenario: Fallback to Local Base64 SVG on Backend Placeholder Failure
- GIVEN a unified image component where both the primary URL and the backend placeholder URL fail to load
- WHEN the backend placeholder fails to load (e.g., due to network issues or offline backend)
- THEN the component MUST transition to the local fallback state and display the inline base64 SVG asset

---

### Requirement: Visual Stability and Loading States (CLS Prevention)
The system MUST display a skeleton loading state or spinner while the image source is resolving (loading or validating). The skeleton or spinner MUST respect and adapt to the width, height, and style dimensions passed to the image component to minimize Cumulative Layout Shift (CLS).

#### Scenario: Skeleton Loading state during Image Resolution
- GIVEN an image component with specified dimensions (e.g., width 48px, height 48px)
- WHEN the component starts loading the image source
- THEN it MUST display a skeleton loader conforming to the 48px by 48px dimensions
- AND it MUST hide the skeleton once the image source successfully loads

---

### Requirement: Infinite Retry Loop Guard
The system MUST implement a guard mechanism to prevent infinite retry loops. Once the system reaches the tertiary local fallback tier, further state transitions resulting from error events MUST be blocked.

#### Scenario: Preventing Infinite Reload Loops on Final Fallback Failure
- GIVEN an image component that has reached the local fallback state
- WHEN the local fallback image triggers an error event (e.g., due to an inline rendering issue)
- THEN the system MUST NOT trigger any further reload or fallback transitions
- AND it MUST log a terminal error to the console
