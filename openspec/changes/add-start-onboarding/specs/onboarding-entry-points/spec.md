# Spec Delta

## Purpose

Makes the guided setup at `/start` the obvious first action for someone who has no mesh yet, from the landing page and from the console.

## ADDED Requirements

### Requirement: Landing hero entry
The landing hero SHALL offer "Set up your first mesh", linking to `/start`, as its primary action. The existing sign-in action SHALL be kept as a secondary action.

#### Scenario: Visitor starts setup from the landing
- **WHEN** a visitor chooses "Set up your first mesh" on the landing page
- **THEN** the browser opens `/start`

### Requirement: Empty mesh list entry
When the console mesh list has no meshes, its primary action SHALL be "Set up your first mesh", linking to `/start`. "Create mesh" SHALL remain available as a secondary action that opens the existing dialog.

#### Scenario: Owner without meshes
- **WHEN** a verified owner with no meshes opens the console mesh list
- **THEN** the empty state shows "Set up your first mesh" as the primary action and "Create mesh" as the secondary one

#### Scenario: Owner with meshes
- **WHEN** the owner has at least one mesh
- **THEN** the mesh list is unchanged
