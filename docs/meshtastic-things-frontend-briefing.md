# Mesh Things — briefing frontend

Documento de trabajo para el dashboard web sobre **Mesh Things API 1.0.0** (OpenAPI 3.0.3).

Contrato: `Meshtastic-Things-API-3.yaml` (~51 operaciones). No reescribir tipos a mano.

---

## 1. Decisión de stack

| Capa | Elección | Por qué |
|---|---|---|
| App | Vite + React + TypeScript | La API ya es el backend; no hace falta Next.js |
| Alternativa | TanStack Start | Si se quiere SSR ligero y cookies de sesión más limpias |
| Rutas | TanStack Router | Params `meshid` / `deviceuuid` / `nodeid` |
| Datos | TanStack Query v5 | Listas, series, invalidación tras mutaciones |
| Tablas / forms | TanStack Table + Form | Devices, measurements, blueprints |
| UI | shadcn/ui + Tailwind | Alineado con el resto de proyectos |
| Cliente HTTP | **Hey API** (`@hey-api/openapi-ts`) | SDK + tipos + hooks Query desde el YAML |
| Charts | **EvilCharts** (registry shadcn, motor Recharts) | Código en el repo, mismo look que shadcn |
| Mapa | MapLibre GL o Leaflet | `latitude` / `longitude` en `DeviceRead` |

No usar la API key del owner en `localStorage`. El UI va por **cookie de sesión**. La key es para gateways y scripts.

---

## 2. Auth (navegador)

1. `GET /owners/csrf-cookie` → cookie CSRF.
2. `POST /owners/login` (o el registro, `POST /owners`) → `OwnerProfile` + cookie de sesión. Un owner sin verificar también entra, con `is_active: false`, y solo ve `/verify-pending` hasta verificar. La app nunca envía `Authorization: Bearer`.
3. Resto de llamadas con `credentials: 'include'` y header CSRF en métodos no-GET.
4. Rutas públicas: login, registro, reset, verify-email.
5. Resto detrás de `GET /owners/me`.
6. Superuser ve más en `/owners` y puede escribir catálogo (`/measurements`, `/telemetry-variants`).

`POST /owners` y `POST /owners/me/rotate-key` devuelven `OwnerWithApiKey`. Mostrar la key **una vez** en settings y no persistirla en el cliente web.

---

## 3. Hey API

Pinear versión exacta: el codegen no sigue semver clásico.

```bash
pnpm add -D -E @hey-api/openapi-ts
pnpm add @tanstack/react-query
```

### `openapi-ts.config.ts`

```ts
import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi/Meshtastic-Things-API-3.yaml',
  output: 'src/api',
  plugins: [
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: './src/api-runtime.ts',
    },
    '@hey-api/typescript',
    '@hey-api/sdk',
    {
      name: '@tanstack/react-query',
      queryOptions: true,
      mutationOptions: true,
    },
  ],
})
```

Desde v0.73 el cliente fetch va **bundled** en el output. No hace falta `@hey-api/client-fetch` en runtime. No editar `src/api/` (tratarlo como generado).

Opcional: `@hey-api/vite-plugin` para regenerar al cambiar el YAML.

Script: `"openapi-ts": "openapi-ts"`.

### Runtime (cookies + CSRF)

```ts
// src/api-runtime.ts
import type { CreateClientConfig } from './api/client.gen'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: 'include',
})
```

Interceptor en bootstrap (fuera del gen):

```ts
import { client } from './api/client.gen'

let csrf = ''

export function setCsrf(token: string) {
  csrf = token
}

client.interceptors.request.use((request) => {
  if (csrf && request.method !== 'GET') {
    request.headers.set('X-CSRFToken', csrf)
  }
  return request
})
```

Flujo: `ownersCsrfCookieRetrieve` → `setCsrf` → `ownersLoginCreate`.

### Uso con TanStack Query

Usar las `*Options` / `*Mutation` generadas. No envolver cada endpoint a mano.

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  devicesListOptions,
  devicesListQueryKey,
  readingsDevicesRetrieveOptions,
  devicesUpdateMutation,
} from '@/api'

const { data } = useQuery(
  devicesListOptions({ query: { meshid, isgateway: true } }),
)

const { data: series } = useQuery(
  readingsDevicesRetrieveOptions({
    path: { deviceuuid },
    query: {
      channel: 'environmentmetrics.temperature',
      start: '-24h',
      window: '1h',
      agg: 'mean',
    },
  }),
)

const qc = useQueryClient()
const update = useMutation({
  ...devicesUpdateMutation(),
  onSuccess: () => qc.invalidateQueries({ queryKey: devicesListQueryKey() }),
})
```

Query keys recomendadas:

- `['readings', deviceUuid, { channel, start, stop, window, agg }]`
- Tras login/logout: invalidar `ownersMeRetrieveQueryKey()`

No generar Zod al inicio (el backend ya valida). No `asClass: true`.

---

## 4. EvilCharts

EvilCharts no es un paquete npm de charts: es un **registry shadcn**. Copia componentes `.tsx` a `components/evilcharts/`. Motor: **Recharts** (variante ECharts existe; para este dashboard usar Recharts).

Docs: [evilcharts.com](https://evilcharts.com) · repo: [legions-developer/evilcharts](https://github.com/legions-developer/evilcharts)

```bash
npx shadcn@latest add @evilcharts/recharts-line-chart
npx shadcn@latest add @evilcharts/recharts-area-chart
npx shadcn@latest add @evilcharts/recharts-bar-chart
```

Si el CLI no resuelve el namespace:

```json
{
  "registries": {
    "@evilcharts": "https://evilcharts.com/r/{name}.json"
  }
}
```

Tipos útiles para lecturas:

- **Line / area**: series de `/readings/...` (`window` + `agg`).
- **Bar**: calidad por canal (`completenessratio`, alarms).
- KPIs de `/latest`: cards, no chart.

Mapear `ReadingsResponse` → `{ time, value, channel, unit }`. Unidades y `quantitykind` salen de `GET /measurements`, no hardcodear °C.

Downsampling: `window` (ej. `1h`, `6h`) y `agg` (`mean` | `max` | `min` | `last` | `first` | `sum` | `count`). Con `window`, los campos texto (p. ej. `timestampquality`) no vienen.

`LatestReadingsResponse`: `meshid`, `nodeid`, `readings[]` con `payloadkind`, `fieldname`, `channel`, `value`, `time`, `unit`, `quantitykind`, `vocabularyuri`, `origin`.

`DeviceQualityResponse`: `pointsingested`, `plausibilityratio`, `alarmsbydetector`, `channels[]` (`completenessratio`, `observed`, `expected`, `largestgapseconds`).

---

## 5. Pantallas

| Área | API | UI |
|---|---|---|
| Meshes | `/meshes`, `/meshes/{id}/devices` | lista + detalle; PSK solo owner |
| Devices | `/devices`, measurements, telemetry-variants | tabla filtrable + ficha |
| Mapa | coords en `DeviceRead` | MapLibre / Leaflet |
| Lecturas | `/readings/devices/{uuid}` y `/latest` | EvilCharts line/area + KPIs |
| Calidad | `/quality` | barras completeness / gaps |
| Blueprints | `/postprocessing-blueprints` + `GET /algorithms` | editor de steps ordenados |
| Cuenta | `/owners/me`, password, rotate-key | settings |
| Catálogo (superuser) | `/measurements`, `/telemetry-variants` | CRUD rangos plausibles |

Ejemplo de ficha de nodo: `DeviceRead` + cards de `latest` + serie `environmentmetrics.temperature` con `start=-24h` y `window=1h`.

Lecturas se pueden pedir por `deviceuuid` **o** por `meshid` + `nodeid` entero Meshtastic. El dashboard de producto usa sobre todo `deviceuuid`.

---

## 6. Endpoints y respuestas

Auth salvo nota: `bearerAuth` o cookie. DELETE → **204**. Resto de éxito → JSON.

### Algorithms, health, metrics

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/algorithms` | **200** `Algorithm[]` (`name`, `inputs`, `outputs`, `params`, `optionalparams`, `mode`, `doc`, `outputunits`) |
| GET | `/health` | **200** vacío (OK) o **503** (DB caída). Sin auth |
| GET | `/metrics` | **200** `MetricsResponse` (totales owners, meshes, devices, gateways activos) |

### Devices

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/devices` | **200** `DeviceRead[]`. Query: `meshid`, `isgateway`, `isallowed`, `haspostprocessing` |
| POST | `/devices` | **201** `DeviceRead` |
| GET | `/devices/{deviceuuid}` | **200** `DeviceRead` |
| PUT | `/devices/{deviceuuid}` | **200** `DeviceRead` |
| DELETE | `/devices/{deviceuuid}` | **204** |
| GET | `/devices/{deviceuuid}/measurements` | **200** `DeviceMeasurement[]` |
| GET | `/devices/{deviceuuid}/telemetry-variants` | **200** `DeviceTelemetryVariant[]` |

`DeviceRead`: `uuid`, `nodeid`, `meshid`, `label`, `isgateway`, `isallowed`, `adminkeysb64` (solo dueño del mesh), coords, `name`/`shortname`, hardware, `role`, `postprocessingblueprintid`, intervalos, `lastseen`, timestamps. `locationoverridden` / `nodeinfooverridden` indican si el PUT pisa lo que reporta el nodo.

### Measurements y meshes

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/measurements` | **200** `MeasurementTypeRead[]`. Query: `kind` (`computed`\|`device`\|`telemetry`), `payloadkind`, `fieldname` |
| POST | `/measurements` | **201** `MeasurementTypeRead` (superuser) |
| GET | `/measurements/{measurementid}` | **200** `MeasurementTypeRead` |
| PUT | `/measurements/{measurementid}` | **200** `MeasurementTypeRead` (superuser; payload/field fijos) |
| DELETE | `/measurements/{measurementid}` | **204** (superuser) |
| GET | `/meshes` | **200** `Mesh[]` (PSK solo si eres owner) |
| POST | `/meshes` | **201** `Mesh` |
| GET | `/meshes/{meshid}` | **200** `Mesh` |
| PUT | `/meshes/{meshid}` | **200** `Mesh` (cambiar PSK redistribuye a gateways) |
| DELETE | `/meshes/{meshid}` | **204** |
| GET | `/meshes/{meshid}/devices` | **200** `DeviceRead[]` |

`MeasurementTypeRead`: `id`, `payloadkind`, `fieldname`, `channel`, `origin`, `displayname`, `description`, `nativeunit`, `quantitykind`, `vocabularyuri`, timestamps.

### Owners

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/owners` | **200** `OwnerPublic[]` (superuser: registro completo) |
| POST | `/owners` | **201** `OwnerWithApiKey` + cookie sesión. Sin auth. La key es para scripts: la app no la guarda y no se recupera |
| GET | `/owners/{ownerid}` | **200** público o completo si eres tú / superuser |
| GET | `/owners/csrf-cookie` | **200** `Detail` + cookie CSRF. Sin auth |
| POST | `/owners/login` | **200** `OwnerProfile` + cookie sesión, también sin verificar. **401** credenciales; **429** tras 10 intentos/min por email e IP |
| POST | `/owners/logout` | **200** `Detail` |
| GET | `/owners/me` | **200** `OwnerProfile` (incluye devices) |
| PUT | `/owners/me` | **200** `OwnerRead` (cambiar email desactiva hasta verificar) |
| DELETE | `/owners/me` | **204** |
| POST | `/owners/me/change-password` | **200** `Detail` |
| GET | `/owners/me/devices` | **200** `OwnerDevices` |
| POST | `/owners/me/resend-verification` | **200** `Detail` |
| POST | `/owners/me/rotate-key` | **200** `OwnerWithApiKey` |
| POST | `/owners/request-password-reset` | **200** `Detail`. Sin auth. Misma respuesta exista o no el email |
| POST | `/owners/reset-password` | **200** `Detail`. Sin auth: `token` del enlace va en el body. **400** en `token` si caducó o no vale |
| GET | `/owners/verify-email?token=` | **200** `Detail`. Sin auth |

### Postprocessing blueprints

| Método | Ruta | Respuesta |
|---|---|---|
Modelo (meshtastic-things `docs/architecture.md#postprocessing`): una **plantilla** es la receta; sus **versiones** son inmutables (entradas `slot` + pasos con clave estable). Un **postprocesado** es una versión vinculada a un device: asocia cada `slot` a un canal del device, lleva la **calibración** propia del device (historial con `valid_from`) y crea sus canales `derived.<campo>` al vincularse. Los parámetros `calibration: true` de `GET /algorithms` van en el device, el resto en el paso.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/postprocessing-blueprints[?owned=true]` | **200** propias + públicas, con `latest_version` |
| POST | `/postprocessing-blueprints` | **201** plantilla + versión 1 (`inputs`, `steps`); 409 nombre repetido |
| PUT | `/postprocessing-blueprints/{id}` | **200** solo `name`, `description`, `is_public` |
| DELETE | `/postprocessing-blueprints/{id}` | **204**; 409 si algún device usa una versión |
| GET/POST | `/postprocessing-blueprints/{id}/versions` | versiones; cambiar pasos = versión nueva |
| GET/POST | `/devices/{uuid}/postprocessings` | vincular (`blueprint_id`, `input_bindings`, `output_prefix`, `tolerance_seconds`); `problems` dice qué impide arrancar |
| PUT/DELETE | `/devices/{uuid}/postprocessings/{id}` | recablear, cambiar de versión, `is_enabled` (400 `{is_enabled: problems}`), desvincular |
| GET/POST/DELETE | `/devices/{uuid}/postprocessings/{id}/calibrations` | historial de calibración por `step_key` |
| GET/POST | `/devices/{uuid}/postprocessings/{id}/backfills` | recalcular histórico (≤ 90 días, 202 `pending`) |

Algunos rechazos llegan como lista DRF sin campo (`["..."]`); `attachErrorStatus` los pasa a `non_field_errors`.

### Readings

Query común: `channel` pisa a `payloadkind`; `start` default `-1h`; `stop` default `now`; `window` opcional; `agg` default `mean`. Latest: `lookback` default `-30d`.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/readings/devices/{deviceuuid}` | **200** `ReadingsResponse` |
| GET | `/readings/devices/{deviceuuid}/latest` | **200** `LatestReadingsResponse` |
| GET | `/readings/devices/{deviceuuid}/quality` | **200** `DeviceQualityResponse` |
| GET | `/readings/meshes/{meshid}/nodes/{nodeid}` | **200** `ReadingsResponse` |
| GET | `/readings/meshes/{meshid}/nodes/{nodeid}/latest` | **200** `LatestReadingsResponse` |
| GET | `/readings/meshes/{meshid}/nodes/{nodeid}/quality` | **200** `DeviceQualityResponse` |

Sin `payloadkind` en latest: lista plana de todos los canales. Con `payloadkind`: cuerpo tipo serie de esa familia.

### Telemetry variants

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/telemetry-variants` | **200** `TelemetryVariantRead[]` (auto al reportar; no hay POST) |
| GET | `/telemetry-variants/{id}` | **200** `TelemetryVariantRead` |
| PUT | `/telemetry-variants/{id}` | **200** (superuser; `payloadkind` fijo; intervalo esperado para calidad) |
| DELETE | `/telemetry-variants/{id}` | **204** (superuser) |
| GET | `/telemetry-variants/{id}/measurements` | **200** `TelemetryVariantMeasurementRead[]` |
| GET | `/telemetry-variants/{id}/measurements/{linkid}` | **200** canal + rango plausible |
| PUT | `/telemetry-variants/{id}/measurements/{linkid}` | **200** (superuser; rango para quality checks) |

---

## 7. Esquemas que el UI usa más

**Algorithm** — registro de funciones de postproceso.

**DeviceCreate** — `nodeid`, `meshid`, `isgateway` required; `adminkeysb64` write-only (hasta 3; PUT reemplaza la lista).

**DeviceUpdate** — `nodeid`/`mesh` fijos; `isallowed`, label, coords, identity, blueprint, intervalos.

**Detail** — `{ detail: string }` en rutas que no devuelven recurso.

**ChannelQuality** — completeness y gaps por canal.

Un gateway `isallowed: false` deja de decodificarse. Mover un device a otro mesh exige haberlo disallowed antes. Borrar mesh/owner/device intenta deregistrar gateways en el decoder; si falla, no borra.

---

## 8. Orden de implementación sugerido

1. Scaffold Vite + shadcn + TanStack Router/Query.
2. Copiar YAML a `openapi/` y generar Hey API.
3. Runtime cookies + CSRF + pantallas login/registro/`/owners/me`.
4. Listado meshes → devices → ficha.
5. `latest` + EvilCharts line sobre un canal.
6. Quality bars + mapa.
7. Blueprints + algorithms.
8. Settings (password, rotate-key) y rutas superuser.

El YAML es el contrato. Si el backend cambia, regenerar cliente; no parchear `src/api/`.
