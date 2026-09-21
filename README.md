# Meshtastic Things apps

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

```bash
docker compose up -d --build web
```

Don't run the full `docker compose up` locally, because `caddy` publishes host
ports `80`/`443`, which will collide if you already have your API's own Caddy (or anything
else) locally. `web` itself only publishes to `127.0.0.1`, on the port set in
`docker-compose.yml`, so it won't collide with other local services either.

