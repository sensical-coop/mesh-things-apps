# Spec Delta

## Purpose

Serves phase-1 OpenAPI operations from in-memory data so the Vite app can run without the real backend, cookies, or owner registration.

## ADDED Requirements

### Requirement: Unauthenticated phase-1 surface
The mock HTTP process SHALL accept the phase-1 mesh, device, measurement, and readings operations without CSRF, session cookie, or bearer token. Operations outside that set MAY return 501.

#### Scenario: List meshes without login
- **WHEN** a browser client calls `GET /meshes` with no auth headers
- **THEN** the call succeeds with JSON for the seeded operator

### Requirement: Seeded world
On process start the mock MUST load a deterministic in-memory world: at least two meshes, a mix of gateways and nodes, catalog measurements, and synthetic readings sufficient for latest and series queries.

#### Scenario: Fresh process
- **WHEN** the mock starts
- **THEN** `GET /meshes` returns at least two meshes
- **AND** at least one device has latest readings

### Requirement: CORS for the Vite origin
The mock SHALL allow the local Vite origin to call it with credentialed or simple XHR/fetch as used by the generated client.

#### Scenario: Browser preflight
- **WHEN** the web app origin requests a phase-1 GET
- **THEN** the browser is not blocked by CORS for that call

### Requirement: Invalid bodies are rejected
When a generated request schema exists for a write, the mock MUST reject bodies that fail that schema with a client error.

#### Scenario: Empty create mesh
- **WHEN** `POST /meshes` is sent with a body that fails the generated schema
- **THEN** the mock does not create a mesh
- **AND** the status is 4xx
