# Design

## Context

See proposal.md for the motivation and specs/ for the required behaviour. Current state that shapes the approach:

- **Routing and auth.** `apps/web` is a static Vite SPA (TanStack Router). Login, sign-up and the verify pages are routes outside `Shell`. `Shell` (`src/layout.tsx`) is the guard: `GET /owners/me` fails → `/login`, `!is_active` → `/verify-pending`. Login, sign-up and verify-pending hard-code their destination (`routes.meshes` / `routes.verifyPending`). `/verify-email` reads only `token` and links to `/login`.
- **Backend `next`.** sensical-coop/mesh-things#74 is merged. `POST /owners` and resend verification accept `next`, the backend validates it against `REGISTRY__FRONTEND_RETURN_PATHS` (default `/start`), and the email links to `/verify-email?next=%2Fstart&token=…`. The API mock already honours `next` (`MOCK_FRONTEND_RETURN_PATHS`).
- **Existing forms.** Mesh creation lives in `CreateMeshDialog` (`pages/meshes/list/page.tsx`), behind `MeshOriginDialog` → `TermsDialog`. Gateway registration lives in `RegisterDeviceDialog` (`pages/meshes/detail/page.tsx`), with `NodeIdField` and `parseNodeId` / `formatNodeId` in `features/device`. Lite detection uses `useTermsEnforced` (`GET /terms` 404 → off).
- **Motion.** `MeasuredSteps` is documented in the OA skill (`.agents/skills/oa-design/06-multi-step-dialog.md`) but is not exported from `@mtt/ui`.
- **Mock.** Every created device gets `lastSeen: now` (`apps/api-mock/src/features/device/repository.ts`), so a new gateway looks connected immediately.
- **Broker.** The default EMQX (`sensical-coop/meshtastic-things-mqtt`) authenticates every gateway with one shared login that may publish to `#`. Only admin, `demos` and the API's IPs may subscribe.
- **API runtime.** Registry and readings run on synchronous gunicorn with 2 workers each.
- **Contract client.** The working tree is mid-migration from Hey API to orval (`packages/contracts`, `openapi:generate`). Repositories and generated imports will move under this change.

## Goals / Non-Goals

**Goals:**
- One onboarding SPA (`apps/onboarding`) that shares the console's forms through `packages/ui`, with no second validation convention.
- No broker secret in the web bundle.
- A flow that survives reloads and the back button without client-side persistence.

**Non-Goals:**
- Real-time push (WebSocket or SSE) and any frontend MQTT connection.
- Telling "nothing arrives" apart from "arrives but does not decrypt". That needs a backend `last_heard_at` and is a follow-up issue.
- Per-gateway EMQX credentials (follow-up issue).
- Operator sources, gateway discovery and multi-gateway setup inside `/start`. The console keeps those.

## Decisions

### 1. Separate SPA with polling, not a TanStack Start BFF with MQTT
`/start` is its own Vite SPA, `apps/onboarding` (base `/start/`), served on the same host as web, the way `apps/docs` is served under `/docs`: Caddy routes `@start path /start /start/*` to an `onboarding` container (static build behind Caddy `file_server` with SPA fallback; `/start` redirects to `/start/`), and in dev web's Vite proxy forwards `/start` to the onboarding dev server (`ONBOARDING_DEV_URL`, default `:5176`). Same origin keeps the Django session cookie and the backend `next=/start` link working. "Gateway seen" comes from polling `GET /meshes/{id}/devices` (React Query `refetchInterval: 5000`, which pauses in background tabs).
*Alternatives:*
- **A TanStack Start server that subscribes to `msh/+/2/e/<channel>/!<node>`.** Rejected:
  - It needs a new subscribe-capable broker credential, and a compromise of that service exposes all mesh traffic.
  - It has to re-implement ownership checks against Django.
  - It is a new deployable service.
  - It breaks the workspace rule that the frontend does not talk to MQTT.
  - It duplicates what the bridge already observes (`server/bridge/discovery.py`).
- **SSE or WebSocket in Django.** Rejected: on sync gunicorn with 2 workers, each open stream holds a worker.

The owner waits minutes for the radio to restart, so 5-second polling loses nothing they would notice.

### 2. Flow state lives in the URL, clamped by a pure resolver
`mesh` and `step` live in the query string of `/start/` (`start-search.ts`). A pure `resolveStartStep(requested, { session, mesh, devices })` in `apps/onboarding/src/start-step.ts` returns the step to render:
- no session → Account (after Welcome);
- unverified → Check email;
- no `mesh` → Basics (or the requested Basics/Mesh);
- no gateway → Register;
- gateway without `last_seen` → Connect, unless the owner skipped (`step=next` is allowed once a gateway exists);
- otherwise the requested step.

Moving between steps pushes a history entry, so back and forward work; clamping replaces it. The resolver is the only new branching logic and is unit-tested in `apps/onboarding/test/start-step.test.ts`.
*Alternative:* local state plus `localStorage`. Rejected by the issue ("without storing progress"), and it goes stale across devices.

### 3. Broker details from an authenticated registry endpoint
Proposed contract, final shape decided in the backend pull request: `GET /owners/me/gateway-broker`. It requires a verified owner session or API key and returns `{ host, port, tls, username, password }` from registry env (`REGISTRY__GATEWAY_BROKER_HOST`, `_PORT`, `_TLS`, `_USERNAME`, `_PASSWORD`). It answers 404 when not configured. Following the workspace API flow: view method docstring, `docs/features.md` row, `server/mesh_things` client bump, schema sync into `docs/openapi.json`, regeneration in `packages/contracts`, mock route. The web reads it through a `features/auth` (or new `features/broker`) repository, never `import.meta.env`.
*Alternatives:*
- **`VITE_MQTT_*` build args.** Rejected: they publish a shared publish-anywhere password to anyone who loads the site.
- **Per-gateway credentials.** Better isolation, but it changes the broker and the device contract. Follow-up.

### 4. Presentational forms in `packages/ui/src/forms`, HTTP in each app
`@mtt/ui/forms/*` holds the forms both apps render: `MeshForm` (with the inline `AQ==` warning), `GatewayForm` with `NodeIdField` and `parseNodeId` / `formatNodeId`, `LoginForm`, `SignupForm` with `TermsChecklist`, plus the field primitives (`FormField`, `FormSelect`, `FormCheckbox`, `FormNumber`, `SaveButton`). They own fields, local validation and error display; labels, pending state and errors come in as props, and submit is a callback with plain values. `packages/ui` imports neither `@mtt/contracts` nor `react-intl`. Each app wires them in its own `features/<name>` (repository, Zod parsing, server-error mapping, terms acceptance, react-intl labels). Pure helpers both apps need moved to shared packages instead of being copied: `readApiError` / `issueErrors` / `formLevelMessage` to `@mtt/contracts/errors`; locale storage, `isOwnerSession`, the resend cooldown and the terms helpers to `@mtt/ui`. In `/start`, mesh creation is fixed to the default broker (no `source_id`, no discovery toggle).
*Alternatives:* forms that call HTTP inside `packages/ui` (rejected: ui would depend on contracts and i18n); onboarding-only forms (rejected: two validations of the same contract drift).

### 5. `MeasuredSteps` goes into `packages/ui`
Add it, with `StepFrame` only if it is used, from the OA skill source to `packages/ui` (follow `packages/ui/AGENTS.md`). Export it, and import it in `apps/onboarding/src/steps/page.tsx`. Direction comes from navigation (forward `1`, back `-1`). Reduced motion swaps the slide for a fade.

### 6. App structure
`apps/onboarding/src/`:
- `main.tsx`, `app-providers.tsx` (react-intl with the same locale preference as web), `start-search.ts`, `start-step.ts`;
- `features/{auth,mesh,device,terms}/` with `repository.ts` and the wrappers around the `@mtt/ui/forms` components;
- `steps/page.tsx`, `start-header.tsx` (mark, progress, session chip, Finish later), `start-progress.tsx`, `step-heading.tsx`;
- one file per step: `welcome-step`, `account-step`, `check-email-step`, `basics-step`, `basics-diagram`, `mesh-step`, `register-gateway-step`, `connect-step`, `next-steps-step`, `done-step`.

Each step owns its heading (`StepHeading`, focused on mount) and its help aside ("Where do I find these?"). Links into web (`/console/meshes…`, `/login`, `/terms`) are plain anchors: they cross apps.

### 7. Allow-listed return path
`apps/web/src/lib/return-path.ts` exports `RETURN_PATHS = ["/start"]` and `safeReturnPath(value): string | undefined`. It accepts only exact allow-listed same-origin paths. `/login` and `/verify-email` use it, and sign-up and resend send `next` only from `/start`. Unit-tested alongside the step resolver.

### 8. Mock simulates the first packet
Gateways created through `POST /devices` start with `lastSeen: null`. After `MOCK_GATEWAY_SEEN_AFTER_MS` (default 20000; `0` keeps them unseen) the mock sets `lastSeen` and adds two non-gateway nodes, so Connect and the node list can be demoed. The seeded data is unchanged. The mock also serves the broker endpoint from `MOCK_GATEWAY_BROKER_*` and returns 404 when unset.

### 9. UI guidance: OA skill plus the ui-skills MCP
OA Design wins on look (squircle plates, pill actions, weight ≤ 500, one coral accent). The implementer MUST load these skills through the **ui-skills MCP** (`get_skill`) and apply them to the matching steps:

| Skill (ui-skills MCP) | Applied to |
|---|---|
| `pbakaus/harden` | Server field errors, double submit, offline and timeout on create and poll, long mesh and gateway names, long Spanish strings |
| `mrstev3n/balise-ux-writing` | Every heading, button and help aside in en/es. Buttons say what happens ("Create mesh", "Register gateway", "Open <mesh> in the console") |
| `ibelick/fixing-accessibility` | Focus on step change, `aria-current="step"`, live region for "waiting / connected", labelled copy buttons, masked password reveal |
| `ibelick/fixing-motion-performance` | `MeasuredSteps` and the diagram highlight: transform and opacity only, reduced motion |

The artifact linked in issue #61 is the visual reference for layout and copy. Where it conflicts with the specs (fixed "90 minutes", a hard-coded `:8883`, terms always visible), the specs win.

## Risks / Trade-offs

- [The orval migration in the working tree changes repositories and generated imports] → Start implementation on a branch cut after that migration lands on `main`. Write against `@mtt/contracts` as it is then.
- [The absence alarm only fires where a detector runs: Flink on `full`, or `quality_worker` on `quality`] → The toggle still saves the settings. Its copy says "after several missed intervals" without promising a time. Recorded in the docs page for `/start`.
- [The shared gateway login is still shared among all verified owners] → Accepted for now. Per-gateway credentials are a follow-up.
- [Polling latency includes the decode pipeline] → The 10-minute checklist and "I'll do this later" keep the owner unblocked.
- [The OpenAPI `MeshCreate` (terms, source, discovery fields) may drift from the Django view] → Verify against `/schema` when syncing the contract, before task 2.
- [`next` allow-lists exist on both sides] → The frontend list must stay a subset of `REGISTRY__FRONTEND_RETURN_PATHS`. Both default to `/start`.

## Migration Plan

1. Backend pull request (`meshtastic-things`): broker endpoint, env vars in `env.example`, docs. Deploy with the env set.
2. Frontend: sync `docs/openapi.json`, regenerate contracts, mock route, then the web changes in this change.
3. Rollback: drop the Caddy `@start` route and the `onboarding` service, and point the two entry points elsewhere. The shared forms and `MeasuredSteps` stay, since the console uses them.
