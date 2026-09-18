# Spec Delta

## Purpose

Compiles the Meshtastic Things OpenAPI document into a shared typed client, Zod schemas, and query helpers so HTTP shapes are not duplicated by hand.

## ADDED Requirements

### Requirement: Generate from the published YAML
The system SHALL produce the HTTP client, TypeScript types, Zod schemas for requests and responses, and TanStack Query option helpers from `docs/openapi.yaml` via a documented regenerate command. Generated sources MUST NOT be the place humans patch types.

#### Scenario: Regeneration is the only type update
- **WHEN** the OpenAPI document gains or changes an operation used by the dashboard
- **THEN** running the regenerate command updates the shared client and schemas
- **AND** no hand-written duplicate of those request or response shapes is required

### Requirement: Shared use at the HTTP boundary
Web and the mock HTTP layer SHALL consume the generated Zod schemas for the same operations (request bodies inbound to the mock; responses inbound to the web client).

#### Scenario: Create mesh body
- **WHEN** a client submits `POST /meshes`
- **THEN** the body is accepted only if it matches the generated request schema
- **AND** a successful JSON response matches the generated mesh response schema
