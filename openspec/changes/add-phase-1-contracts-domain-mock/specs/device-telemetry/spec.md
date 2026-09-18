# Spec Delta

## Purpose

Lets an operator read the latest telemetry and a downsampled time series for a registered device, with channel units taken from the measurement catalog rather than hardcoded symbols.

## ADDED Requirements

### Requirement: Latest readings as a flat list
The system SHALL return the most recent reading per channel for a device addressed by registration uuid, including value, time, unit, and quantity kind when the catalog provides them.

#### Scenario: Device with temperature
- **WHEN** the operator requests latest readings for a device that has ingested environment temperature
- **THEN** the response includes a channel for that field with a unit from the catalog
- **AND** a device with no points in the lookback returns an empty readings list without failing the request

### Requirement: Series over a window
The system SHALL return aggregated points for a device uuid when given a channel, start, and optional window and aggregation. Default start MUST match the API contract (`-1h` unless overridden).

#### Scenario: Twenty-four hour mean
- **WHEN** the operator requests a series with `start=-24h`, `window=1h`, and `agg=mean` on a known channel
- **THEN** the response contains time/value points for that channel

### Requirement: Catalog supplies display metadata
The system SHALL expose measurement types so clients can resolve display name, native unit, and quantity kind for a channel without embedding °C or similar in UI code.

#### Scenario: List measurements
- **WHEN** the operator requests the measurement catalog
- **THEN** entries include channel or payload/field identity plus unit and quantity kind
