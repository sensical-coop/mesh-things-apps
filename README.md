# Mesh Things apps

## Local development

There are two options for local development: mock-api or with [meshtastic-things](https://github.com/sensical-coop/meshtastic-things) running on the same machine.

### Mock-api

Quick-start against a mock-api:

```bash
pnpm install
pnpm dev
```

The web app runs on `5173`, against a mock API in `8787`.

### Local API

Copy `.env.example` to `.env` at the repo root and set:

```bash
VITE_API_URL=http://localhost      # or wherever your API is
VITE_DISABLE_MOCK_API=true         # skip launching apps/api-mock
```

`pnpm dev` reads this file automatically (`turbo` skips `api-mock` when the flag is set, and
Vite picks up `VITE_API_URL` for the browser build). `VITE_API_URL` is baked in at build
time, so changing it later needs a restart of `pnpm dev` (or a rebuild, for Docker).

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
(`docker compose restart web`) only after changing `.env` or dependencies.
Without `COMPOSE_FILE`, the same command builds and runs the production image; add
`--build` to pick up changes.

Don't run the full `docker compose up` locally, because `caddy` publishes host
ports `80`/`443`, which will collide if you already have your API's own Caddy (or anything
else) locally. `web` itself only publishes to `127.0.0.1`, on the port set in
`docker-compose.yml`, so it won't collide with other local services either.

