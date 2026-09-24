# Spec Delta

## Purpose

Gives unauthenticated visitors a public home page that states what Mesh Things is, shows a decorative mesh globe, and sends them to sign in.

## ADDED Requirements

### Requirement: Public home is unauthenticated
The system SHALL serve `/` without requiring a session. Visiting `/` while signed in MUST still show the landing, not redirect into the dashboard.

#### Scenario: Visitor opens the site
- **WHEN** an unauthenticated browser requests `/`
- **THEN** the marketing landing renders and no login wall appears

#### Scenario: Signed-in owner opens the site
- **WHEN** an authenticated browser requests `/`
- **THEN** the same landing renders and a control is available to enter the dashboard

### Requirement: Hero states the product outcome
The landing hero MUST display the headline "The world's first storage and data solution for Meshtastic" in sentence-case surrounding copy (buttons and secondary lines stay sentence case). The primary CTA MUST navigate to `/login`. A secondary CTA MUST exist only if it goes to a real in-app destination (the dashboard for signed-in users, or `/login` otherwise). The landing MUST NOT use filler ("lorem") or "supercharge" language.

#### Scenario: Primary CTA
- **WHEN** the visitor activates the primary hero action
- **THEN** the app navigates to `/login`

### Requirement: Locked globe shows a mocked mesh
The landing MUST include a globe visualization of mock Meshtastic nodes and hop links. The globe MUST auto-rotate when the visitor has not requested reduced motion. Pointer, scroll, pinch, and keyboard MUST NOT pan, zoom, or tilt the globe. Under `prefers-reduced-motion: reduce`, rotation MUST stop and the globe MUST remain visible. Node and hop data MUST be static mock fixtures in the frontend, not live API devices. Decorative map chrome MUST be `aria-hidden`.

#### Scenario: Globe cannot be dragged
- **WHEN** the visitor attempts to drag, scroll-zoom, or pinch the globe
- **THEN** the camera does not follow the pointer and the page continues to scroll normally

#### Scenario: Reduced motion
- **WHEN** the visitor has `prefers-reduced-motion: reduce`
- **THEN** the globe does not auto-rotate

### Requirement: Landing follows OA marketing anatomy
The page MUST use the documented OA landing shape: morphing header on scroll, stacked plates (not full-bleed grey), scroll reveals that play once, at most two hero CTAs, and section order hero → product proof (the globe) → how it works → features → FAQ → closing CTA. Pricing and competitor comparison tables MUST NOT appear in this change.

#### Scenario: Header morphs on scroll
- **WHEN** the visitor scrolls past the top of the landing
- **THEN** the header becomes a floating glass pill without reflowing the page height
