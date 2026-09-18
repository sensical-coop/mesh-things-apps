# Spec Delta

## Purpose

Packages the Vite frontend as a container image that runs the Nitro Node server (`node .output/server/index.mjs`), so the marketing site and dashboard can be deployed without the Vite dev server.

## ADDED Requirements

### Requirement: Frontend image from repo Docker folder
The repository MUST include a `docker/` directory with a Dockerfile that builds `apps/web` from the monorepo (workspace packages required by web) and runs the Nitro production server. The image MUST listen on port 80. The API mock MUST NOT be bundled into this image. The image MUST NOT use `vite` as the production process and MUST NOT use Nginx as the HTML origin.

#### Scenario: Image serves the SPA
- **WHEN** the frontend image is run and a client requests `/`
- **THEN** the landing HTML is returned with status 200

### Requirement: SPA deep links
The Node server MUST serve the app HTML for unknown frontend paths so `/console/meshes` and `/login` work on refresh.

#### Scenario: Refresh on a dashboard URL
- **WHEN** a client requests `/console/meshes` as a document navigation against the container
- **THEN** the server returns the app HTML rather than a 404

### Requirement: API origin at build time
The frontend bundle MUST take its HTTP API base URL from the `VITE_API_URL` build argument (same contract as `apps/web` today). If the argument is omitted, the image build MUST still succeed using the existing default documented for local development.

#### Scenario: Custom API URL
- **WHEN** the image is built with `VITE_API_URL=https://api.example`
- **THEN** the served bundle uses that origin for API calls
