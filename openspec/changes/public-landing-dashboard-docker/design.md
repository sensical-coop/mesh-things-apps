# Design

## Context

See proposal.md for motivation. Today `RootLayout` wraps every route except `/login` in `Shell`, which calls `GET /owners/me` and redirects failures to `/login`. `/` redirects to `/meshes`. mapcn is already installed: `apps/web/src/components/ui/map.tsx` plus `maplibre-gl`. `@mapcn/logistics-network` is a US-hubs dashboard block (sidebar + mercator arcs + lucide + raw hex). OA landing recipes live in `.cursor/skills/oa-design/_landing.md`. Vite build is `pnpm --filter web build`; API base is `import.meta.env.VITE_API_URL ?? "http://localhost:8787"`. No Docker files exist.

## Goals / Non-Goals

**Goals:**

- Split public chrome (landing, login) from authenticated chrome (dashboard shell).
- Nest inventory under a TanStack parent route `/console`.
- Hero globe that looks like Open Analytics' live globe: rotating, untouchable, mesh hops instead of visitors.
- One frontend container from `docker/`, build context = repo root.

**Non-Goals:**

- Dockerizing `api-mock` or a compose stack (can follow later).
- Pricing, comparison tables, public docs, or a second marketing locale.
- Live devices on the globe (no public unauthenticated mesh API).
- Installing shadcn `sidebar` / `separator` or the logistics-network page files.
- Runtime API URL injection after the image is built (`VITE_*` is compile-time).

## Decisions

### 1. Route tree: public siblings + dashboard parent

```
root
  /                 LandingPage          (no Shell, no /owners/me)
  /login            LoginPage
  /console          Shell + Outlet      (auth gate)
    index           redirect /console/meshes
    meshes
    meshes/$meshId
    devices
    devices/$deviceUuid
    blueprints
```

Paths are declared once in `apps/web/src/routes.ts` (`Object.freeze`). No aliases for `/meshes`, `/devices`, or `/blueprints`.

`RootLayout` only chooses chrome by path prefix: landing and login skip Shell. Shell's `Navigate to="/login"` stays. Login success and nav `Link` targets update to `/console/...`. Detail pages that use `useParams({ from: "..." })` must use the new route ids.

Alternative: keep `/meshes` and only add `/` as landing — rejected; the user asked for a dashboard parent.

Alternative: move login to `/console/login` — rejected; login is public and OA already treats it as a full-bleed page.

### 2. Do not add `@mapcn/logistics-network`

The block's useful idea is `Map` + `MapArc` + markers. We already have those. Globe needs `projection={{ type: "globe" }}`, not the block's US mercator + sidebar.

Landing globe component (fewest files): `landing-page.tsx` + `landing-globe.tsx` + `landing-mesh.ts` (nodes + hops). Tokens only (OA ink / accent via CSS variables for line paint, not `#3b82f6`).

Lock interaction: MapLibre `dragPan`, `scrollZoom`, `dragRotate`, `doubleClickZoom`, `keyboard`, `touchZoomRotate`, `touchPitch` all false. Overlay `pointer-events-none` so wheel scroll belongs to the page. Auto-rotate: `easeTo` / increment `bearing` on an interval; skip when `matchMedia('(prefers-reduced-motion: reduce)')`.

Mock nodes: Iberian / nearby EU points (Sensical), mix of gateway vs node. Arcs = RF hops, not air/ground freight.

Alternative: cobe / three.js globe like some marketing sites — extra dependency; MapLibre globe is already in the lockfile.

### 3. OA landing, cut unused OA sections

Header morph via `data-scrolled` + CSS (700ms curve from `_landing.md`). Reveals: IntersectionObserver once, 80ms stagger, max three siblings. Plates `oa-squircle` + `shadow-card` on `bg-background-full`; grey stage only inside plates. Buttons: BoardUI pills. Copy in English to match the existing app chrome.

Sections: hero (headline + two CTAs + globe as product proof) → 01/02/03 how it works → feature plates → FAQ disclosures → closing CTA. No pricing.

### 4. Frontend-only Docker

Vite is build/dev only. Production is Nitro's Node listener (`node .output/server/index.mjs`). Nginx, if used later, sits in front as a reverse proxy — not as the HTML origin.

`apps/web` stays a client TanStack Router SPA. We add the `nitro()` Vite plugin so `vite build` emits a Node server, not a Fetch handler and not a static-only `dist/`. TanStack Start (`tanstackStart()`) is not required for that listener.

`docker/Dockerfile` multi-stage:

1. `node:22-bookworm-slim`, `corepack enable`, copy workspace manifests + `apps/web` + `packages/*` needed by web, `pnpm install --frozen-lockfile`, `ARG VITE_API_URL`, `pnpm --filter web build`.
2. `node:22-alpine`, copy `apps/web/.output`, `CMD ["node", ".output/server/index.mjs"]` with `PORT=80` and `HOST=0.0.0.0`.

Build: `docker build -f docker/Dockerfile --build-arg VITE_API_URL=... .` from repo root.

## Risks / Trade-offs

- [Globe WebGL cost on low-end phones] → Keep one Map instance, modest arc count (~12 nodes), `prefers-reduced-motion` skips animation; if load is still heavy, swap to a static SVG later.
- [Carto tiles licence on a commercial landing] → Prefer `blank` + a simple globe/atmosphere, or a style URL we can ship; do not assume default Carto is OK for production. Decision at apply: try globe with a free/OSM or blank+GeoJSON land if Carto terms block commercial use.
- [Broken bookmarks to `/meshes`] → Redirects in the router cover in-app and SPA fallback; nginx does not need per-path 301s if `index.html` always loads and the client redirects.
- [VITE_API_URL baked in] → Document rebuild to retarget API; no runtime config file in this change.
- [Auth flash on public `/`] → Landing MUST NOT wait on `owners/me`. Optional signed-in CTA can be a non-blocking query.

## Migration Plan

Ship router redirects with the landing. Owners with old tabs get client redirects. Docker is additive; local `pnpm dev` unchanged. Rollback: revert the change; no data migration.

## Open Questions

None that block apply. Product name in the header stays Sensical branding already on the shell unless marketing asks otherwise later.
