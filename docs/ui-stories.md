# UI stories — Meshtastic Things (dashboard)

Historias para **implementar interfaces**. El contrato HTTP es `docs/openapi.yaml`. Fase 1 no incluye cuenta, login ni API keys.

Personas: **owner** (operador de malla). Superuser queda fuera de fase 1.

Formato: job → pantalla → contrato (operación OpenAPI). Los formularios y el parseo de respuestas en la web usan **schemas Zod generados** en `packages/contracts` (Hey API), no Zod a mano.

---

## Fase 1 — inventario y telemetría

Shell autenticado bajo `/console`: cookie Better Auth contra `api-mock`. `/login` es email/password (look OA). `/` es landing pública. No hay register ni API keys.

### Mallas

**US-10 · Ver mis mallas**  
Como owner, veo mis mallas (etiqueta, identificador, recuento de devices) para elegir dónde trabajar.

- **Ruta:** `/console/meshes`
- **Estados:** loading, vacío (“Aún no hay mallas”), error de red, lista
- **Secretos:** no mostrar `psk_b64` en la lista
- **Contrato:** `GET /meshes` → schema de respuesta generado

**US-11 · Crear una malla**  
Como owner, creo una malla con etiqueta y PSK para que los gateways se unan a esa red.

- **Ruta:** diálogo o `/console/meshes/new` desde la lista
- **Campos:** label, PSK (tratado como secreto; no loguear)
- **Validación:** schema Zod de request `POST /meshes`
- **Tras éxito:** ir al detalle de la malla creada
- **Contrato:** `POST /meshes`

**US-12 · Detalle de malla**  
Como owner, abro una malla y veo nodos y gateways juntos.

- **Ruta:** `/console/meshes/$meshId`
- **UI:** cabecera (label) + tabla de devices (gateway sí/no, `is_allowed`, `last_seen`, label/name)
- **PSK:** visible solo aquí, copiable, no en querystring
- **Estados:** 404, loading, lista vacía de devices
- **Contrato:** `GET /meshes/{mesh_id}`, `GET /meshes/{mesh_id}/devices`

### Dispositivos

**US-20 · Registrar nodo o gateway**  
Como owner, registro `node_id` + `mesh_id` y marco si es gateway.

- **Ruta:** acción desde el detalle de malla
- **Campos:** `node_id`, `is_gateway`; `mesh_id` viene de la ruta; label opcional
- **Validación:** schema Zod `POST /devices`
- **Copy:** un gateway registrado autoriza que se decodifique su tráfico
- **Contrato:** `POST /devices`

**US-21 · Inventario filtrable**  
Como owner, listo todos mis devices y filtro por malla, gateway, permitido, con/sin blueprint.

- **Ruta:** `/console/devices`
- **Tabla:** label/name, mesh, gateway, allowed, last_seen → click a ficha
- **Contrato:** `GET /devices` (`mesh_id`, `is_gateway`, `is_allowed`, `has_postprocessing`)

**US-22 · Ficha de dispositivo**  
Como owner, veo identidad, rol de gateway, `last_seen`, coords y si ubicación/nodeinfo están overridden.

- **Ruta:** `/console/devices/$deviceUuid`
- **Bloques:** identidad (`DeviceRead`) · canales vistos (`GET .../measurements`) · variantes de telemetría (`GET .../telemetry-variants`)
- **Unidades y nombres de canal:** `GET /measurements` (no hardcodear °C)
- **Contrato:** `GET /devices/{device_uuid}` y nested lists

### Lecturas

**US-30 · Últimos valores**  
Como owner, en la ficha veo KPIs de todos los canales (valor, unidad, `quantity_kind`, hora).

- **UI:** cards, no chart
- **Vacío:** “Sin lecturas en el lookback”
- **Contrato:** `GET /readings/devices/{device_uuid}/latest` · parsear con Zod de respuesta

**US-31 · Serie de un canal**  
Como owner, elijo canal, rango y agregación y veo la serie.

- **Defaults:** canal sugerido si existe `environmentmetrics.temperature`; si no, el primer canal de latest; `start=-24h`; `window=1h`; `agg=mean`
- **UI:** line/area (EvilCharts cuando se añada el registry)
- **Contrato:** `GET /readings/devices/{device_uuid}` query `channel`, `start`, `stop`, `window`, `agg`

---

## Mapa de rutas (fase 1)

| Ruta | Historias |
|---|---|
| `/` | landing pública |
| `/login` | sesión |
| `/console` | redirect a `/console/meshes` |
| `/console/meshes` | US-10, US-11 |
| `/console/meshes/$meshId` | US-12, US-20 |
| `/console/devices` | US-21 |
| `/console/devices/$deviceUuid` | US-22, US-30, US-31 |
| `/console/blueprints` | US-42 (parcial) |

Fuera de fase 1: `/register`, `/settings`, `/map`, catálogo superuser.

---

## Backlog (no implementar ahora)

| ID | Job | Notas |
|---|---|---|
| US-01–03 | Registro, login, reset, logout | Cookie + CSRF; API key nunca en `localStorage` |
| US-13 | Rotar PSK / rename mesh | Redistribuye a gateways allowed; rollback si falla |
| US-23 | Allow/disallow gateway | Copy: “deja de decodificarse”, no “borrar” |
| US-24 | Override ubicación / identidad | Flags `location_overridden` / `nodeinfo_overridden` |
| US-40 | Mapa | Solo puntos con coords |
| US-41 | Calidad | Barras completeness / gaps |
| US-42 | Blueprints | Steps + `GET /algorithms` |
| US-43 | Cuenta y rotate-key | Key una sola vez en pantalla |
| US-44 | Borrar mesh/device | No borrar si el deregister del decoder falla |
| US-50–52 | Superuser | Catálogo measurements / telemetry-variants / metrics |

Lecturas por `mesh_id` + `node_id`: la API las tiene; el dashboard usa `device_uuid`.
