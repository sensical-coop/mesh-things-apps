# Spec Delta

## Purpose

Keeps the authenticated inventory behind `/console` while leaving marketing and login on public URLs.

## ADDED Requirements

### Requirement: Dashboard is the authenticated parent
All owner inventory screens (meshes list and detail, devices list and detail, blueprints) MUST live under `/console`. The dashboard shell (primary nav, sign out, theme) MUST render only on those routes. Unauthenticated requests to any `/console` path MUST redirect to `/login`.

#### Scenario: Signed-out visit to inventory
- **WHEN** an unauthenticated browser requests `/console/meshes`
- **THEN** the app redirects to `/login`

#### Scenario: Signed-in inventory
- **WHEN** an authenticated owner requests `/console/meshes`
- **THEN** the meshes list renders inside the dashboard shell

### Requirement: Login remains public
`/login` MUST stay outside the dashboard shell. After a successful password login the app MUST navigate to `/console/meshes`. Sign out MUST navigate to `/login`.

#### Scenario: Successful sign in
- **WHEN** login succeeds
- **THEN** the owner lands on `/console/meshes`

### Requirement: Dashboard index
`/console` with no child path MUST redirect to `/console/meshes`.

#### Scenario: Bare dashboard URL
- **WHEN** an authenticated owner requests `/console`
- **THEN** the app redirects to `/console/meshes`
