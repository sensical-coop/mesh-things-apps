# Spec Delta

## Purpose

Guides a new or returning owner through the guided setup at `/start`: account, the concepts, a mesh, a gateway that is sending data, and an optional absence alarm. It ends by opening that mesh in the console.

## ADDED Requirements

### Requirement: Public route outside the console
The system SHALL serve the guided setup at `/start` to anyone, signed in or not, including owners who already have meshes. It SHALL NOT render the console header, footer or terms banner. It SHALL render its own header with the product mark, a progress bar of five parts (Account, Basics, Mesh, Gateway, Next steps) and a "Finish later" action.

#### Scenario: Visitor opens /start
- **WHEN** a visitor without a session opens `/start`
- **THEN** the Welcome screen is shown with the steps ahead, the time it takes (about 10 minutes) and what they need (the Meshtastic app and a radio with Wi-Fi or Ethernet)

#### Scenario: Owner with meshes opens /start
- **WHEN** a verified owner who already has meshes opens `/start` without a `mesh` parameter
- **THEN** the flow starts at Basics and creates a new mesh. It does not redirect to the console.

#### Scenario: Progress bar reflects the step
- **WHEN** the owner is on any step
- **THEN** earlier parts show as done, the current part is marked as current for assistive technology, and later parts show as pending

### Requirement: Session detection on load
The system SHALL check the session when `/start` loads, before it shows any step that depends on it. While the check is pending, it SHALL show a placeholder with the same layout and SHALL NOT flash the account step.

#### Scenario: No session
- **WHEN** the session check answers that there is no session
- **THEN** after Welcome the flow shows the Account step

#### Scenario: Signed in but not verified
- **WHEN** the session check returns an owner whose email is not verified
- **THEN** the flow shows "Check your email" with the owner's address, a resend action and a way to change account

#### Scenario: Signed in and verified
- **WHEN** the session check returns a verified owner and the URL has no `mesh`
- **THEN** the flow skips Welcome and Account and shows Basics. The header shows the signed-in name or email with a "Not you? Sign out" action.

#### Scenario: Sign out from the header
- **WHEN** a signed-in owner chooses sign out in the `/start` header
- **THEN** the session ends and the flow returns to the Account step without leaving `/start`

### Requirement: Account step
The Account step SHALL offer sign in and sign up on the same screen. Sign up SHALL collect the same fields and account terms as `/signup`. When the instance has no terms, it SHALL hide the terms block.

#### Scenario: Sign in with a verified account
- **WHEN** the owner signs in with a verified account
- **THEN** the flow continues to Basics without leaving `/start`

#### Scenario: Sign in with an unverified account
- **WHEN** the owner signs in with an account whose email is not verified
- **THEN** the flow shows "Check your email"

#### Scenario: Sign up
- **WHEN** the owner creates an account from the Account step
- **THEN** the verification email links back to `/start` and the flow shows "Check your email"

#### Scenario: Lite instance
- **WHEN** the instance answers 404 to the terms endpoint
- **THEN** no terms checkboxes or links are shown in Account or Mesh

### Requirement: Wait for email verification
While "Check your email" is shown, the system SHALL check the session at least every 5 seconds while the page is visible, and again when the window regains focus. It SHALL continue on its own once the owner is verified. It SHALL also offer an "I've confirmed my email" action that checks right away.

#### Scenario: Verified in another tab
- **WHEN** the owner opens the verification link in another tab and then comes back
- **THEN** the flow moves to Basics without a manual reload

#### Scenario: Still unverified on manual check
- **WHEN** the owner chooses "I've confirmed my email" before verifying
- **THEN** the flow stays on the step and says the email is not confirmed yet

### Requirement: Basics step
The Basics step SHALL explain mesh, gateway, node and reading with one diagram (nodes and gateway → MQTT → Mesh Things → readings) and one short card per concept. Selecting a card SHALL highlight its part of the diagram. It SHALL link to the concepts page in the product docs.

#### Scenario: Select a concept
- **WHEN** the owner selects the Gateway card
- **THEN** the gateway in the diagram is highlighted and the other parts are de-emphasised

### Requirement: Mesh step
The Mesh step SHALL create a mesh on the default broker from a mesh name, a channel name and a channel key, with the mesh terms when the instance has terms. It SHALL use the same validation as the console's mesh creation. It SHALL warn inline, before submit, when the key is the default `AQ==`. It SHALL NOT offer operator sources.

#### Scenario: Default key warning
- **WHEN** the owner enters `AQ==` as the channel key
- **THEN** a warning next to the field explains that every Meshtastic radio knows this key and recommends creating a new one, and submit stays allowed

#### Scenario: Mesh created
- **WHEN** the mesh is created
- **THEN** the URL becomes `/start?mesh=<id>` and the flow shows the Gateway register step

#### Scenario: Validation error from the server
- **WHEN** creating the mesh is rejected with field errors
- **THEN** each error is shown next to its field, the entered values are kept and the submit action is enabled again

#### Scenario: Double submit
- **WHEN** the owner activates the submit action twice quickly
- **THEN** only one mesh is created

### Requirement: Gateway register step
The Gateway step SHALL register one gateway on the mesh from a node ID entered in hex (with or without the leading `!`) or in decimal, and an optional name. It SHALL use the same parsing and validation as the console's device registration.

#### Scenario: Hex and decimal are equivalent
- **WHEN** the owner enters `!7efeee00` in hex or `2130636288` in decimal
- **THEN** the same node is registered as a gateway of the mesh

#### Scenario: Gateway registered
- **WHEN** the gateway is registered
- **THEN** the flow shows the Connect step for that gateway

### Requirement: Broker details on Connect
The Connect step SHALL show the values to enter in the Meshtastic app: MQTT enabled, server address and port, username, password, TLS enabled, encryption enabled, and root topic left at the default. It SHALL also explain how to turn on uplink for the mesh's channel by its name. The broker values SHALL come from an authenticated API response for the verified owner, never from the web build. Each value SHALL have a copy action. The password SHALL be masked until revealed.

#### Scenario: Broker configured
- **WHEN** the API returns broker details
- **THEN** the step shows them with copy actions, and the channel name in the uplink instruction is the mesh's channel

#### Scenario: Broker not configured
- **WHEN** the API reports that broker details are not configured
- **THEN** the step tells the owner to ask their administrator for the broker details and still shows the uplink instruction

#### Scenario: Values absent from the bundle
- **WHEN** the production web build is inspected
- **THEN** it contains no broker username or password

### Requirement: Wait for the gateway
While the Connect step is shown, the system SHALL check the mesh's devices at least every 5 seconds while the page is visible. It SHALL announce, through a polite live region, when the gateway is first seen (it has a `last_seen`). It SHALL list other nodes of the mesh as they appear. After 10 minutes without the gateway it SHALL show a checklist: network connection, channel name with the same capitals, and uplink on. The owner SHALL be able to check now, or leave the step with "I'll do this later".

#### Scenario: Gateway seen
- **WHEN** the gateway gets a `last_seen`
- **THEN** the step shows it as connected, with text and not only colour, and the primary action continues to Next steps

#### Scenario: Skip
- **WHEN** the owner chooses "I'll do this later"
- **THEN** the flow continues to Next steps and the summary says the gateway has not been seen yet

#### Scenario: Background tab
- **WHEN** the tab is hidden
- **THEN** checking stops until the tab is visible again

### Requirement: Next steps with optional absence alarm
The Next steps step SHALL explain alarms and blueprints in a few lines each and say where to find them in the console. It SHALL offer an optional "Email me if <gateway> stops sending" toggle. Turning it on SHALL enable absence detection on the gateway and set its publish interval (default 1800 seconds). The copy SHALL say who gets the email and that the alarm fires after several missed intervals.

#### Scenario: Toggle on
- **WHEN** the owner turns the toggle on and finishes
- **THEN** the gateway is saved with absence detection enabled and the chosen publish interval

#### Scenario: Toggle off
- **WHEN** the owner finishes without turning the toggle on
- **THEN** the gateway's absence settings are not changed

### Requirement: Done and hand-off to the console
The Done screen SHALL summarise what was created: mesh name and channel, gateway name and node ID, whether it has been seen, how many nodes have appeared, and whether the absence alarm is on. It SHALL offer "Open <mesh> in the console", which goes to `/console/meshes/<id>`, and a link to the docs.

#### Scenario: Open in the console
- **WHEN** the owner chooses "Open <mesh> in the console"
- **THEN** the console opens that mesh's detail page

### Requirement: Resume from the URL
The flow SHALL keep its position only in the URL (`mesh` and `step`). It SHALL derive the furthest allowed step from server state, and SHALL clamp a requested step that the server state does not allow yet. Browser back and forward SHALL move between steps.

#### Scenario: Mesh without gateway
- **WHEN** a verified owner opens `/start?mesh=<id>` for their mesh that has no gateway
- **THEN** the flow shows the Gateway register step

#### Scenario: Gateway never seen
- **WHEN** the mesh has a gateway without `last_seen`
- **THEN** the flow shows the Connect step

#### Scenario: Requested step ahead of state
- **WHEN** the URL asks for Next steps on a mesh that has no gateway
- **THEN** the flow shows the Gateway register step

#### Scenario: Mesh not owned or missing
- **WHEN** the `mesh` parameter names a mesh the owner cannot read
- **THEN** the flow says the mesh was not found and offers to start a new mesh

### Requirement: Finish later
"Finish later" SHALL take a signed-in owner with a mesh in the URL to that mesh in the console. Otherwise it SHALL take a signed-in owner to the mesh list and a visitor without a session to the landing page.

#### Scenario: Finish later after creating a mesh
- **WHEN** the owner chooses "Finish later" on `/start?mesh=<id>`
- **THEN** the console opens `/console/meshes/<id>`

### Requirement: Accessible, motion-safe steps
Changing step SHALL move focus to the new step's heading. Steps SHALL slide in the direction of navigation (forward and back). With reduced motion preferred, steps SHALL only cross-fade. Every action SHALL work from the keyboard.

#### Scenario: Keyboard navigation
- **WHEN** the owner completes the flow using only the keyboard
- **THEN** every step can be completed and focus lands on each new step's heading

#### Scenario: Reduced motion
- **WHEN** the system prefers reduced motion
- **THEN** step changes do not translate content

### Requirement: Bilingual copy
All `/start` copy SHALL exist in English and Spanish and SHALL follow the current locale switch.

#### Scenario: Spanish locale
- **WHEN** the locale is Spanish
- **THEN** every `/start` string, including errors and the live-region announcements, is in Spanish
