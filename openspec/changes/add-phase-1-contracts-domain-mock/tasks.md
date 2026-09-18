# Tasks

## 1. Generated contracts

- [x] 1.1 Add `packages/contracts` with pinned `@hey-api/openapi-ts`, Zod, fetch client, TanStack Query plugin, `openapi-ts.config.ts` pointing at `docs/openapi.yaml`, and a root `pnpm openapi-ts` script. Verify `pnpm openapi-ts` exits 0 and writes SDK/Zod/`*Options` under the package.
- [x] 1.2 Export the generated client from `@mtt/contracts` (no hand types). Verify `apps/web` can import `meshesListOptions` (or the generated list-meshes helper) after adding the workspace dependency.
- [x] 1.3 Add `src/api-runtime.ts` (or equivalent) setting `baseUrl` from `VITE_API_URL` / process env. Verify the client default base is `http://localhost:8787` in dev.

## 2. Domain slices

- [x] 2.1 Add `@mtt/domain` with `mesh` entity, create/list invariants, `IMeshRepository`, and a vitest file. Verify `pnpm --filter @mtt/domain test` covers create + PSK not used as a public list field.
- [x] 2.2 Add `device` entity (`node_id`/`mesh_id` immutable after create, gateway flag), `IDeviceRepository`, filters, tests. Verify tests fail if mesh/node id change after create.
- [x] 2.3 Add `measurement` catalog types + port and `readings` latest/series types + port with tests for empty latest vs points. Verify `pnpm --filter @mtt/domain test` still passes.

## 3. In-memory API

- [x] 3.1 Add `apps/api-mock` (Hono, port 8787, CORS) with in-memory repos implementing domain ports and a seed of ≥2 meshes, mixed devices, measurements, synthetic series. Verify `GET /meshes` without auth returns ≥2 meshes and list JSON has no PSK field.
- [x] 3.2 Implement phase-1 reads/writes: `POST /meshes`, `GET /meshes/{id}`, `GET /meshes/{id}/devices`, `GET|POST /devices`, `GET /devices/{uuid}`, device measurements and telemetry-variants, `GET /measurements`, readings latest + series. Verify with curl/http against the mock; unknown YAML routes return 501.
- [x] 3.3 Validate write bodies with generated Zod; invalid `POST /meshes` returns 4xx and does not insert. Verify with a failing body curl.

## 4. Web wiring

- [x] 4.1 Add QueryClientProvider, env `VITE_API_URL`, and generated `useQuery` for mesh list on the home/meshes shell. Verify `pnpm --filter web typecheck` and that with mock running the UI shows seeded mesh labels (not only the static design-check copy).
- [x] 4.2 Document `pnpm dev` (web + api-mock) in architecture.md. Verify the architecture “pendiente” list no longer claims contracts/domain/mock are missing after implement.

## 5. Checks

- [x] 5.1 Run `pnpm --filter @mtt/domain test`, `pnpm --filter web typecheck`, and `openspec validate --change add-phase-1-contracts-domain-mock`. Verify all three succeed.
