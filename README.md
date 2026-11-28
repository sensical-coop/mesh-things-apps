<div align="center">

<img src=".github/assets/mesh_things_logo.png" alt="Mesh Things logo" width="320"/>
<h1>Mesh Things Apps</h1>

[![PR checks](https://img.shields.io/github/actions/workflow/status/sensical-coop/mesh-things-apps/pr-checks.yml?label=checks&logo=github)](https://github.com/sensical-coop/mesh-things-apps/actions/workflows/pr-checks.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.6.1-F69220?logo=pnpm&logoColor=white)

</div>

<div align="center">
	<a href="https://github.com/sensical-coop/mesh-things">Backend</a>
	-
	<a href="https://things.sensical.es/docs">Documentation</a>
	-
	<a href="CONTRIBUTING.md">Contributing</a>
</div>

## Overview

This repository contains the frontend for Mesh Things, a platform for monitoring sensors that report over LoRa mesh networks. It works with [Meshtastic](https://meshtastic.org) nodes and with any LoRa mesh-based sensor that publishes telemetry through a Meshtastic gateway: environmental probes, power and battery monitors, air quality sensors, trackers.

Gateways forward the mesh traffic over MQTT. The [mesh-things](https://github.com/sensical-coop/mesh-things) backend decrypts, decodes and stores it. The apps in this repo turn it into a fleet you can manage: meshes, devices, live readings and history, data quality checks, alarms and exports.

It is a pnpm + Turborepo monorepo:

| Package | Purpose |
| --- | --- |
| `apps/web` | React dashboard (Vite, React 19, TanStack Router/Query). Console at `/console` |
| `apps/docs` | Documentation site (TanStack Start + Fumadocs) |
| `packages/contracts` | API client, types and Zod schemas generated from `docs/openapi.json` |
| `packages/domain` | Shared domain entities |
| `packages/ui` | Design tokens and UI primitives |

### Get started

- 🔌 **[Local development](#local-development)** - Point the dashboard at a running backend.
- 🐳 **[Docker](#running-via-docker-locally)** - Run the web container locally.

## Local development

The web app runs against [mesh-things](https://github.com/sensical-coop/mesh-things), started on the same machine or reachable over the network.

Copy `apps/web/.env.example` to `apps/web/.env` and set:

```bash
VITE_API_URL=http://localhost      # or wherever your API is
```

Then:

```bash
pnpm install
pnpm dev
```

The web app runs on `5173`. `pnpm dev` reads `apps/web/.env` automatically and Vite picks up
`VITE_API_URL` for the browser build. `VITE_API_URL` is baked in at build time, so changing
it later needs a restart of `pnpm dev` (or a rebuild, for Docker).

### Remote API

```bash
pnpm dev:remote
```

Runs web and docs in Vite mode `remote`, so each app also reads its `.env.remote`.
`apps/web/.env.remote` points the web app at https://api.sensical.es through a
`/remote-api` proxy on the dev server: the deployed API neither allows `localhost` in CORS
nor sends its cookies to it. Personal overrides go in `.env.remote.local` (gitignored).

### Running via Docker locally

The app will run on `5174` (note the port difference).

For development, add this to `.env` so `web` runs the Vite dev server on the mounted
source instead of the production image. Edits then reload in the browser, with no rebuild:

```bash
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml
```

```bash
docker compose up -d web          # dev server, hot reload (with COMPOSE_FILE set)
docker compose logs -f web        # wait for "ready"
```

It uses the host's `node_modules`, so run `pnpm install` on the host first. Restart it
(`docker compose restart web`) only after changing `apps/web/.env` or dependencies.
Without `COMPOSE_FILE`, the same command builds and runs the production image; add
`--build` to pick up changes.

Don't run the full `docker compose up` locally, because `caddy` publishes host
ports `80`/`443`, which will collide if you already have your API's own Caddy (or anything
else) locally. `web` itself only publishes to `127.0.0.1`, on the port set in
`docker-compose.yml`, so it won't collide with other local services either.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Web app and docs site |
| `pnpm dev:remote` | Same, against the deployed API (see [Remote API](#remote-api)) |
| `pnpm build` | Build every app and package |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm lint` | Stylelint and ESLint |
| `pnpm test` | Run the tests |
| `pnpm openapi:sync` | Fetch the API schema and regenerate `packages/contracts` |

## License

[AGPL-3.0](LICENSE).
