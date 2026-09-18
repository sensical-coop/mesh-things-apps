# Spec Delta

## Purpose

Lets an operator register, list, filter, and inspect Meshtastic nodes and gateways on a mesh, with node and mesh identity fixed after creation.

## ADDED Requirements

### Requirement: Register a device on an owned mesh
The system SHALL register a device with `node_id`, `mesh_id`, and `is_gateway`. After create, `node_id` and `mesh_id` MUST remain unchanged.

#### Scenario: Register a gateway
- **WHEN** the operator registers a device marked as gateway on an existing mesh
- **THEN** the device appears on that mesh's device list
- **AND** `is_gateway` is true on retrieve

### Requirement: List and filter devices
The system SHALL list the operator's devices and MUST honor filters for mesh, gateway vs node, allowed vs not, and whether a postprocessing blueprint is attached.

#### Scenario: Filter gateways on one mesh
- **WHEN** the operator lists devices with a mesh id and `is_gateway` true
- **THEN** every returned device belongs to that mesh and is a gateway

### Requirement: Retrieve device identity
The system SHALL return one device by registration uuid including identity fields, gateway flag, allowed flag, last seen, coordinates when present, and override flags for location and nodeinfo.

#### Scenario: Open device fiche
- **WHEN** the operator requests a known device uuid
- **THEN** the response includes uuid, node id, mesh id, and last seen
- **AND** an unknown uuid fails as not found

### Requirement: Mesh device listing
The system SHALL list every device registered on a given mesh (gateways and nodes).

#### Scenario: Mesh has mixed devices
- **WHEN** the operator requests devices for a mesh that has both a gateway and a node
- **THEN** both appear in that listing
