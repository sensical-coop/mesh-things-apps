# Tasks

## 0. Before coding

- [ ] 0.1 Load the UI skills through the **ui-skills MCP** (`get_skill`: `pbakaus/harden`, `mrstev3n/balise-ux-writing`, `ibelick/fixing-accessibility`, `ibelick/fixing-motion-performance`) and the OA skill (`.agents/skills/oa-design/`, especially `06-multi-step-dialog.md` and `_copy.md`). Verify by listing in the pull request description which skill shaped which step.
- [ ] 0.2 Cut `feat/61-start-onboarding` from `main` after the orval migration has merged. Verify that `pnpm openapi:generate` and `pnpm typecheck` pass on the clean branch.

## 1. Backend dependency (meshtastic-things, separate issue and pull request)

- [x] 1.1 Open a backend issue for `GET /owners/me/gateway-broker` (design.md §3) as graale-ws. Verify the issue is linked from #61. Done in sensical-coop/mesh-things#88.
- [x] 1.2 Implement the endpoint (verified owner only, 404 when unconfigured), the env vars in `env.example`, the docstring, the `docs/features.md` row and the client version bump. Verify with registry tests for 200, 403 (unverified) and 404 (unconfigured). Done on `feat/88-gateway-broker` (sensical-coop/mesh-things#88).

## 2. Contract and mock

- [x] 2.1 Sync `docs/openapi.json` (`pnpm openapi:sync`), regenerate `packages/contracts`, and check `MeshCreate` against `/schema`. Verify that the generated client exposes the broker operation and that `pnpm typecheck` passes. Client: `ownersMeGatewayBrokerRetrieve` / `GatewayBroker`.
- [x] 2.2 Mock: serve the broker endpoint from `MOCK_GATEWAY_BROKER_*` (404 when unset). Verify with `curl` against :8787 with and without the env.
- [ ] 2.3 Mock: new gateways start with `last_seen: null`, become seen after `MOCK_GATEWAY_SEEN_AFTER_MS`, and two nodes appear. Verify by creating a gateway and polling `GET /meshes/{id}/devices`.

## 3. Shared building blocks

- [x] 3.1 Add `MeasuredSteps` to `packages/ui` from the OA skill source (direction-aware, border-box measured, reduced-motion fade) and export it. Verify that `pnpm --filter @mtt/ui typecheck` passes.
- [x] 3.2 Move the mesh form into `@mtt/ui/forms/mesh-form` (presentational, inline `AQ==` warning) and wire it in web's `features/mesh/ui/mesh-form.tsx`. Verify that console mesh creation still works against the mock, and that the warning shows for `AQ==`.
- [x] 3.3 Move the gateway form, `NodeIdField` and `parseNodeId` / `formatNodeId` into `@mtt/ui/forms`, and wire them in web's `features/device/ui/gateway-form.tsx`. Verify that console gateway registration works against the mock.
- [x] 3.4 Move the login and sign-up forms (with `TermsChecklist`) into `@mtt/ui/forms`; web's `/login` and `/signup` keep their behaviour.
- [x] 3.5 Add `apps/web/src/lib/return-path.ts` (`safeReturnPath`) and `apps/onboarding/src/start-step.ts` (`resolveStartStep`). Verify with `apps/web/test/return-path.test.ts` (allows `/start`; rejects `//x`, `https://x`, `/start/../x`) and `apps/onboarding/test/start-step.test.ts` (every row of design.md §2, including clamping and skip).
- [ ] 3.6 Scaffold `apps/onboarding` (Vite, base `/start/`, port 5176), the web dev proxy for `/start`, `docker/Dockerfile.onboarding`, the Caddy `@start` route and the compose services. Verify `/start` and `/start?…` through the web dev server (done), and the image through Caddy (pending: Docker not running).

## 4. Auth return path

- [ ] 4.1 Make the sign-up and resend forms accept an optional `next` and an `onSuccess` override. Verify in the mock log that sign-up from `/start` sends `next: "/start"` and `/signup` does not.
- [ ] 4.2 `/verify-email` follows `safeReturnPath(next)` after success: it goes there directly with a session, otherwise to `/login?next=…`. Verify by opening the mock's logged link in a session tab and in a private window.
- [ ] 4.3 `/login` honours `safeReturnPath(next)` for verified owners. Verify that `/login?next=/start` lands on `/start` and `next=//evil.example` lands on the mesh list.

## 5. `/start` flow

- [ ] 5.1 `apps/onboarding/src/steps/page.tsx` with `MeasuredSteps`, `start-header.tsx` and `start-progress.tsx`, URL state for `mesh` and `step`. Verify that `/start` renders without console chrome and the progress bar exposes `aria-current="step"`.
- [ ] 5.2 Session detection: placeholder while `me` is pending, then the welcome, account, check-email and basics routing; header session chip with sign-out. Verify the three session states in the browser against the mock.
- [ ] 5.3 Welcome and Account steps (sign in and sign up on one screen, terms hidden on lite). Verify both paths with `MOCK_TERMS_ENFORCED` on and off.
- [ ] 5.4 Check-email step: 5 s polling while visible, refetch on focus, resend with `next`, and "I've confirmed my email". Verify that verifying in another tab moves the flow to Basics.
- [ ] 5.5 Basics step with `basics-diagram.tsx` and selectable concept cards. Verify keyboard selection highlights the matching diagram part.
- [ ] 5.6 Mesh step using `mesh-form` (default broker, mesh terms) that writes `?mesh=<id>`. Verify that a reload after creation resumes at Register.
- [ ] 5.7 Register-gateway step using `gateway-form`. Verify that reload resumes at Connect.
- [ ] 5.8 Connect step: broker values from the endpoint with copy buttons and a masked password, the "ask your administrator" fallback on 404, the uplink instruction with the mesh channel, 5 s device polling, the live region, the node list, the 10-minute checklist, "Check now" and "I'll do this later". Verify with `MOCK_GATEWAY_SEEN_AFTER_MS=20000` and `=0`. Verify that the production build contains no broker credentials (`grep` the `dist`).
- [ ] 5.9 Next steps: alarms and blueprints copy, plus the absence toggle (`PUT /devices/{uuid}`: `absence_detection_enabled`, `publish_interval_seconds` default 1800). Verify the device payload in the mock with the toggle on and off.
- [ ] 5.10 Done screen with the summary and "Open <mesh> in the console". "Finish later" follows the spec rules. Verify each destination.
- [ ] 5.11 Copy in `locales/en.json` and `locales/es.json`, reviewed against `balise-ux-writing`. Verify that no `/start` string falls back to `defaultMessage` in Spanish.

## 6. Entry points

- [ ] 6.1 Landing hero: "Set up your first mesh" as primary (→ `/start`), sign in as secondary. Verify on `/`.
- [ ] 6.2 Empty mesh list: "Set up your first mesh" as primary, "Create mesh" as secondary. Verify with a fresh mock owner.

## 7. Verification and docs

- [ ] 7.1 End-to-end in the browser against the mock: sign up from `/start`, verify through the logged link, create a mesh with `AQ==` (warning shown), register a gateway, wait for it to be seen, turn on the alarm, and open it in the console. Repeat keyboard-only and with reduced motion. Record a screenshot per step for the pull request.
- [ ] 7.2 Hardening pass with `pbakaus/harden`: offline during create and poll, a 100-character mesh name, double submit, and a foreign or missing `mesh` parameter. Verify each state shows a recoverable message.
- [ ] 7.3 Run `pnpm typecheck`, `pnpm lint` and `pnpm test`. Update `docs/architecture.md` (pages list) and add a "Set up your first mesh" page in `apps/docs`. Verify that the docs build passes.
