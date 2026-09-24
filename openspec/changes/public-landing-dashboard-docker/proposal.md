# Proposal

## Why

The Vite app treats `/` as a redirect into the authenticated inventory. There is no public marketing surface, so a visitor cannot understand Mesh Things before signing in, and the product cannot be shipped as a static frontend image. We need a public home, a nested dashboard, and a Docker build that serves only the web app.

## What Changes

- **BREAKING**: Authenticated inventory no longer lives at `/meshes`, `/devices`, `/blueprints`. Those URLs move under `/console/...`.
- `/` becomes a public marketing landing (no session required). Headline: "The world's first storage and data solution for Meshtastic", in the Open Analytics landing language already documented in OA Design, with a locked globe mesh visualization.
- `/login` stays public. Successful login lands on `/console/meshes`. Unauthenticated visits to `/console/*` still go to `/login`.
- Add `docker/` with a frontend-only image: multi-stage pnpm build of `apps/web` (workspace `ui` + `contracts`) running Nitro (`node .output/server/index.mjs`).
- Do **not** vendor the full `@mapcn/logistics-network` block (US hubs, shadcn sidebar, lucide, raw hex paints). Reuse the already-installed mapcn `Map` / `MapArc` / `MapMarker` primitives with globe projection and mock Meshtastic nodes.

## Capabilities

### New Capabilities

- `marketing-landing`: Public `/` page, OA header morph, copy, CTAs, and a non-interactive globe showing a mocked Meshtastic mesh.
- `dashboard-routing`: Nested `/console` shell and a frozen `routes` map. No aliases for the old top-level inventory URLs.
- `web-docker`: Dockerfile that builds the Vite app with Nitro and runs the Node server.

### Modified Capabilities

- (none — `openspec/specs/` is empty)

## Impact

- `apps/web/src/router.tsx`, `shell.tsx`, `login-form.tsx`, and every `to="/meshes"` / `from: "/devices/$deviceUuid"` route id.
- New landing files under `apps/web/src/` (page + globe + mock mesh data). Existing `apps/web/src/components/ui/map.tsx` (already mapcn).
- Docs: `docs/ui-stories.md`, `docs/architecture.md` route table.
- New `docker/Dockerfile`. Build-time `VITE_API_URL`. No API container in this change.
- No OpenAPI / contracts / domain / api-mock changes. No new npm dependency if MapLibre globe projection already works via the installed `map` primitive.
