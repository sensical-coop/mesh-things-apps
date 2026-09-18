# Proposal

## Why

The dashboard shell exists (`apps/web`, BoardUI/OA) but it cannot talk to Meshtastic Things: there is no generated HTTP client, no domain package for mesh/device/reading rules, and no in-memory API. Phase 1 stories (US-10–12, US-20–22, US-30–31) need that stack before more UI. Auth stays out.

## What Changes

- Add `packages/contracts`: Hey API (`openapi-ts`) from `docs/openapi.yaml` — types, fetch SDK, Zod (request + response), TanStack Query `*Options` / `*Mutation`. Generated files are not edited by hand.
- Add `packages/domain`: vertical slices `mesh`, `device`, `readings`, `measurement` (entities, invariants, repository ports, unit tests). Domain does not import contracts or React.
- Add `apps/api-mock`: HTTP server implementing **only** phase-1 OpenAPI operations against in-memory repos; CORS for Vite; no cookie/CSRF/owners.
- Wire `apps/web` to `VITE_API_URL` + generated Query options so the existing shell can load real (mocked) meshes/devices/readings.
- Root script `openapi-ts` to regenerate contracts.

## Capabilities

### New Capabilities

- `generated-openapi-client`: OpenAPI YAML is compiled into a shared TypeScript/Zod/Query client used by web and the mock HTTP boundary.
- `mesh-registry`: An operator can list, create, and open meshes; PSK is owner-only and not shown in list views.
- `device-registry`: An operator can list, filter, register, and inspect devices on a mesh; `node_id`/`mesh_id` are fixed after create.
- `device-telemetry`: An operator can read latest values and downsampled series for a device by `device_uuid`; units come from the measurement catalog.
- `in-memory-api`: A process serves those phase-1 routes from RAM with a seeded owner, without authentication.

### Modified Capabilities

- (none)

## Impact

- New packages: `@mtt/contracts`, `@mtt/domain`; new app `api-mock`.
- `apps/web` depends on contracts + Query; still not on domain.
- `docs/openapi.yaml` remains the HTTP source of truth; unused YAML paths may 501 on the mock.
- No `/owners/*`, login, or API keys.
