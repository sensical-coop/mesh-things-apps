# Design

## Context

See proposal.md for motivation. Today: pnpm workspace, `@mtt/ui`, Vite shell with no HTTP. Contract: `docs/openapi.yaml`. Domain rules live in taller-style packages, not React. Phase 1 ignores `/owners/*`.

## Goals / Non-Goals

**Goals:**

- One generated client package consumed by web and mock.
- Domain slices with ports; in-memory repos only in `api-mock`.
- Mock implements the operations listed in `docs/ui-stories.md` phase 1.
- Web QueryProvider + env base URL; enough UI to prove meshes list against the mock.

**Non-Goals:**

- Login, CSRF, rotate-key, blueprints, quality, map, superuser catalog writes.
- Persisting mock data.
- Editing generated contract files.

## Decisions

1. **Package names `@mtt/contracts` and `@mtt/domain`**  
   Matches existing `@mtt/ui`. Alternative: `@meshtastic-things/*` — longer, no benefit.

2. **Hey API output inside `packages/contracts` (gitignored generated tree or committed)**  
   Commit generated output so CI and clones work without running codegen first. Alternative: gitignore and generate in `prepare` — slower onboarding, easier drift. Commit, plus `pnpm openapi-ts` for updates.

3. **Plugins:** `@hey-api/typescript`, `@hey-api/client-fetch`, `@hey-api/sdk` (`validator: true`), `@hey-api/zod`, `@tanstack/react-query`.  
   Alternative: SDK without Zod — rejected; web and mock share Zod.

4. **Mock HTTP: Hono on a dedicated port (e.g. 8787)**  
   Tiny, TypeScript, CORS helper. Alternative: MSW in the browser — would skip a real HTTP boundary the generated client needs.

5. **Domain does not import contracts.** Mock maps Mesh/Device/Reading ↔ OpenAPI JSON.  
   Alternative: domain types = generated types — couples domain to YAML naming and regen churn.

6. **Implicit single owner.** Seed meshes belong to that actor; no `owner` slice.

7. **Web proof:** TanStack Query + `meshesListOptions` on `/meshes` (replace or sit beside the design-check plate). Full US-11–31 screens can follow in later tasks of the same change if timeboxed; tasks.md will sequence contracts → domain tests → mock routes → web list.

## Risks / Trade-offs

- **[Risk] Hey API plugin names/options shift** → Pin exact `openapi-ts` version; document config in `packages/contracts`.
- **[Risk] YAML snake_case vs UI camelCase** → Use generated names only; no rename layer.
- **[Risk] Mock 501 on unused paths surprises later screens** → Document the allowlist next to ui-stories; add routes when stories land.
- **[Trade-off] Committing generated SDK** → Larger diffs on YAML change; worth it for install-and-run.

## Migration Plan

Greenfield packages. Rollback: delete the packages and revert web Query wiring.

## Open Questions

None that block this change. Mock port and `VITE_API_URL` default to `http://localhost:8787`.
