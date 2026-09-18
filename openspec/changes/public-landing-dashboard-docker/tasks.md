# Tasks

## 1. Dashboard routing

- [ ] 1.1 Nest inventory under `/console` in `apps/web/src/router.tsx` (parent layout = `Shell`; `/` and `/login` skip Shell) and verify `pnpm --filter web typecheck` passes
- [ ] 1.2 Update Shell nav/footer, login success, logout, and `useParams({ from })` / `Link` / `ButtonLink` hrefs to `/console/...` and verify each inventory page still loads after a mock login
- [ ] 1.3 `/console` redirects to `/console/meshes`; inventory paths live only under `/console` (no `/meshes` aliases). Verify with `routes` from `apps/web/src/routes.ts`
- [ ] 1.4 Update `docs/ui-stories.md` and `docs/architecture.md` route tables to `/console/...` and verify the listed paths match the router

## 2. Marketing landing

- [ ] 2.1 Add public `/` `LandingPage` (no `/owners/me` gate) with OA morphing header, hero headline "The world's first storage and data solution for Meshtastic", primary CTA to `/login`, how-it-works / features / FAQ / closing CTA plates, and verify an unauthenticated visit to `/` never redirects to `/login`
- [ ] 2.2 Add `landing-mesh.ts` mock nodes/hops (Iberian/EU, gateway vs node) and `landing-globe.tsx` using existing `Map` / `MapArc` / `MapMarker` with globe projection, interactions off, `pointer-events-none`, auto-rotate unless reduced motion, `aria-hidden`, token colors only — verify drag/scroll does not move the camera and the page still scrolls
- [ ] 2.3 Show a dashboard entry on the landing when `owners/me` succeeds without blocking first paint, and verify a signed-in visit to `/` still shows the landing

## 3. Frontend Docker

- [x] 3.1 Add `nitro()` to `apps/web` Vite, `start` = `node .output/server/index.mjs`, and `docker/Dockerfile` (multi-stage pnpm web build, `ARG VITE_API_URL`, Node runtime of `.output`) and verify `docker build -f docker/Dockerfile .` succeeds
- [x] 3.2 Run the image and verify `GET /` is 200 HTML and `GET /console/meshes` returns the app HTML (not a 404)

## 4. Check

- [ ] 4.1 Run `pnpm --filter web typecheck` (and existing web tests if they import routes) and verify they pass after the route moves
