# Spec Delta

## Purpose

Lets an operator list, create, and inspect LoRa meshes they own, keeping the channel PSK off list views and treating it as a secret.

## ADDED Requirements

### Requirement: List meshes without PSK in the list
The system SHALL return the operator's meshes with identity and label suitable for choosing a mesh. List representations MUST NOT include the pre-shared key.

#### Scenario: Operator opens the meshes list
- **WHEN** the operator requests the mesh list
- **THEN** each item includes a mesh id and label
- **AND** the pre-shared key is absent from that list payload as shown in the product list

### Requirement: Create a mesh
The system SHALL create a mesh owned by the implicit phase-1 operator from a label and PSK, and return the created mesh including id.

#### Scenario: Successful create
- **WHEN** the operator submits a valid label and PSK
- **THEN** a new mesh exists and its id is returned
- **AND** subsequent lists include that mesh

### Requirement: Retrieve one mesh including PSK for the owner
The system SHALL return a single mesh by id. The owner representation MAY include the PSK so it can be copied from the detail surface only.

#### Scenario: Open mesh detail
- **WHEN** the operator requests a mesh they own by id
- **THEN** the response includes identity, label, and the PSK for copy
- **AND** requesting an unknown id fails as not found
