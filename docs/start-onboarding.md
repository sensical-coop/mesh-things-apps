# `/start` onboarding: diagrams

Proposal for issue #61. The detail is in the OpenSpec change `openspec/changes/add-start-onboarding/`. Implemented in `apps/onboarding` (`/start`); the open verification items are in that change's `tasks.md`.

## Pieces

```mermaid
flowchart LR
  subgraph Field["Field"]
    N["Nodes with sensors"] -- LoRa --> G["Meshtastic gateway"]
  end

  subgraph Broker["meshtastic-things-mqtt"]
    E["EMQX :8883<br/>shared gateway login"]
  end

  subgraph Web["apps/web (SPA)"]
    L["Landing<br/>Set up your first mesh"]
    S["/start<br/>apps/onboarding<br/>MeasuredSteps + resolveStartStep"]
    C["/console/meshes/$meshId"]
    F["mesh-form · gateway-form<br/>shared with the console dialogs"]
    A["/login · /verify-email<br/>safeReturnPath(next)"]
  end

  subgraph API["meshtastic-things (Caddy :80)"]
    R["registry_api<br/>/owners/me · /meshes · /devices<br/>NEW: /owners/me/gateway-broker"]
    B["bridge → Kafka → decode"]
    DB[("Postgres<br/>device.last_seen")]
  end

  M["api-mock :8787<br/>gateway seen after MOCK_GATEWAY_SEEN_AFTER_MS<br/>broker from MOCK_GATEWAY_BROKER_*"]

  L --> S
  S --> F
  S <-->|"session cookie<br/>poll every 5 s"| R
  A -->|"next=/start"| S
  S -->|"Open in the console"| C
  R -->|"email /verify-email?next=/start"| A
  G -- "MQTT with the credentials<br/>shown in Connect" --> E
  E --> B --> DB
  R --- DB
  S -. "in development" .-> M
```

## Steps and resume

```mermaid
stateDiagram-v2
  [*] --> Session: GET /owners/me
  Session --> Welcome: no session
  Session --> CheckEmail: is_active false
  Session --> Basics: verified, no ?mesh
  Session --> Resume: verified, ?mesh=id

  Welcome --> Account
  Account --> CheckEmail: sign up (next=/start)
  Account --> Basics: sign in
  CheckEmail --> Basics: is_active (poll 5 s / focus)

  Basics --> Mesh
  Mesh --> Register: POST /meshes → ?mesh=id
  Register --> Connect: POST /devices is_gateway
  Connect --> NextSteps: last_seen (poll 5 s)
  Connect --> NextSteps: I'll do this later
  NextSteps --> Done: optional absence alarm
  Done --> [*]: /console/meshes/id

  state Resume {
    [*] --> check
    check --> Register_: no gateway
    check --> Connect_: gateway with no last_seen
    check --> NextSteps_: gateway seen
  }
```

## Sequence

```mermaid
sequenceDiagram
  actor O as Owner
  participant S as /start
  participant R as registry_api
  participant G as Gateway

  O->>S: opens /start
  S->>R: GET /owners/me
  alt no session
    S->>O: Welcome → Account
    O->>S: sign up
    S->>R: POST /owners (next=/start)
    loop every 5 s and on focus
      S->>R: GET /owners/me
    end
    Note over O,R: the /verify-email?next=/start link comes back here
  else verified
    S->>O: Basics
  end
  O->>S: name, channel and key (warning if AQ==)
  S->>R: POST /meshes → URL ?mesh=id
  O->>S: node ID (hex or decimal)
  S->>R: POST /devices (is_gateway)
  S->>R: GET /owners/me/gateway-broker
  S->>O: MQTT values + turn on uplink
  O->>G: configures the Meshtastic app
  loop every 5 s until last_seen (or "I'll do this later")
    S->>R: GET /meshes/{id}/devices
  end
  opt absence alarm
    S->>R: PUT /devices/{uuid} (absence + publish_interval)
  end
  S->>O: Done → /console/meshes/{id}
```
