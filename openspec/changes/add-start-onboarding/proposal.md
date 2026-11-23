# Proposal

## Why

A new owner today lands on `/login`, gets an empty console and has to work out on their own what a mesh, a gateway and a channel key are, which values go in the Meshtastic app and whether anything is arriving. Issue sensical-coop/mesh-things-apps#61 asks for a guided setup that takes them from no account to a mesh with a gateway that is sending, and then hands them to the console. The backend dependency (`next` on the verification link, sensical-coop/mesh-things#74) is merged, so the frontend can now return a newly verified owner to the flow.

## What Changes

- New SPA `apps/onboarding`, served at `/start` on the same host as the web app (like `apps/docs` at `/docs`), with its own header and a five-part progress bar (Account, Basics, Mesh, Gateway, Next steps) plus a Welcome screen before it and a Done screen after it. The visual reference is the Claude artifact linked in the issue.
- The flow detects the session on load: signed out shows the account step (sign in or sign up on one screen), signed in but unverified shows "Check your email" and polls until verified, signed in and verified skips straight to Basics. The header shows who is signed in, with a way to sign out.
- Mesh creation (`POST /meshes`) with channel name, key, mesh terms and an inline warning for the default key `AQ==`. Gateway registration (`POST /devices`, `is_gateway: true`) with node ID in hex or decimal.
- A Connect step that shows the broker values to enter in the Meshtastic app and polls the mesh's devices every 5 seconds until the gateway has a `last_seen`, listing other nodes as they appear. The owner can skip it.
- Broker details come from an authenticated registry endpoint for verified owners, not from build-time `VITE_MQTT_*` variables, so the shared gateway password is not published in the JavaScript bundle. When the endpoint is not configured, the step tells the owner to ask their administrator. This replaces the `VITE_MQTT_*` note in the issue.
- An optional "Email me if the gateway stops sending" toggle (`absence_detection_enabled` + `publish_interval_seconds`) next to a short explanation of alarms and blueprints.
- The URL carries the flow (`/start?mesh=<id>&step=<key>`). After a reload the flow resumes from the mesh's server state and does not store progress anywhere else.
- `/signup` and `/verify-email` send the owner back to `/start` when sign-up began there. They only accept allow-listed return paths.
- Entry points: "Set up your first mesh" in the landing hero, and as the primary action of the console's empty mesh list ("Create mesh" becomes secondary).
- The mesh-create, gateway-register, login and sign-up forms become presentational components in `packages/ui/src/forms`, shared by the console and `/start`; each app keeps its own HTTP, validation against the contract and translations.
- The API mock creates gateways with `last_seen: null` and marks them seen after a configurable delay, so the Connect step can be exercised without hardware. It also serves the broker endpoint.
- Copy in English and Spanish. The implementation is guided by the OA Design skill and by the **ui-skills MCP** (see design.md).

## Capabilities

### New Capabilities
- `start-onboarding`: the `/start` guided setup. Session detection, steps, resume from the URL, broker details, gateway polling, optional absence alarm, hand-off to the console.
- `auth-return-path`: sign-up, resend verification and email verification carry an allow-listed return path, so an owner who signs up from `/start` comes back to it.
- `onboarding-entry-points`: where owners find the guided setup (landing hero, empty mesh list).

### Modified Capabilities
None. `openspec/specs/` has no capabilities yet.

## Impact

- **Onboarding (`apps/onboarding`)**: new app with the flow, its repositories and en/es locales. Docker image, Caddy route `/start`, compose services and a dev proxy from web.
- **Web (`apps/web`)**: login, sign-up and verify-email accept `next`; the landing hero and the mesh list empty state link to `/start`; the console wraps the shared forms.
- **UI (`packages/ui`)**: exports `MeasuredSteps` and the shared forms under `@mtt/ui/forms/*`, plus pure helpers both apps need (locale, session, terms, resend cooldown). `@mtt/contracts/errors` takes the API error helpers.
- **Mock (`apps/api-mock`)**: device creation `last_seen`, a simulated first packet, and the broker endpoint.
- **Contract**: one new registry endpoint for broker details (backend `meshtastic-things`, its own issue and pull request). It is then synced into `docs/openapi.json` and regenerated in `packages/contracts`.
- **Backend config**: the broker host, port and gateway credentials move to the registry `.env`. Nothing is added to the web `Dockerfile`.
- **Out of scope** (follow-up issue): a `last_heard_at` on devices so Connect can tell "nothing arrives" apart from "arrives but does not decrypt"; per-gateway EMQX credentials.
