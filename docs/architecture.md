# Arquitectura — Meshtastic Things apps

Monorepo (Turborepo + pnpm) para un dashboard Vite sobre **Meshtastic Things API 1.0.0**. El YAML es la fuente de verdad del hilo HTTP. La lógica de negocio no vive en React.

Esto **anula** el “no generar Zod al inicio” del briefing frontend: web y mock comparten schemas Zod **generados** por Hey API.

---

## Piezas

```
docs/openapi.yaml --> packages/contracts (Hey API)
apps/web --> packages/ui + packages/contracts
apps/api-mock --> packages/domain + packages/contracts
```

| Package / app | Qué es | Qué no es |
|---|---|---|
| `packages/contracts` | Output de `@hey-api/openapi-ts`. SDK fetch, tipos, **Zod** (request + response), `*Options` / `*Mutation`. | Código a mano. Se regenera si cambia el YAML. |
| `packages/domain` | Vertical slices (`mesh`, `device`, `readings`, `measurement`, `authz`). Entidades, invariantes, puertos de repo. Como `@taller/domain`. | Tipos Hey API. No fetch. No React. |
| `apps/api-mock` | Servidor HTTP que implementa las rutas de fase 1. Datos en memoria. Sesión Better Auth + cookie. Parsea bodies con Zod de contracts; mapea domain → JSON del OpenAPI. | Backend real. Persistencia. |
| `apps/web` | Vite + React + TanStack (cuando toque). UI: BoardUI + OA + ReUI Frame. Cliente HTTP = contracts. | Reglas de malla/device. Tipos OpenAPI a mano. |
| `packages/ui` | Tokens BoardUI remapeados a OA, Button BoardUI, Frame ReUI. | Lógica de negocio. |

`packages/tsconfig` compartido, mismo patrón que taller.

---

## Dirección de dependencias

```
web        -->  ui, contracts
api-mock   -->  contracts, domain
domain     -->  (nada de apps ni contracts)
ui         -->  (React, tokens; no domain)
contracts  -->  (solo runtime generado: fetch client, zod)
```

Domain no importa `@meshtastic-things/contracts`. Los DTO del YAML y el modelo de dominio son dos capas: el mock traduce.

La web **no** importa `packages/domain`. Consume JSON ya validado (SDK con `validator: true` sobre Zod) y pinta.

---

## Contratos (Hey API + Zod 4.6)

El YAML es el contrato. Zod **no se escribe a mano** para shapes OpenAPI. Vive en un solo sitio y se usa **solo en el borde HTTP**.

| Dónde | Qué hay |
|---|---|
| `docs/openapi.yaml` | Fuente de verdad |
| `packages/contracts/src/generated/` | Output Hey API. Incluye `zod.gen.ts`. No editar. |
| `@mtt/contracts/zod` | Import de schemas (`zMeshesCreateData`, `zDeviceRead`, …) |
| `apps/web` forms | `safeParse` del `*Data` (envelope `{ body }` / `{ path, query }`) |
| `apps/web` SDK | `validator: true` → `parseAsync` de request/response |
| `apps/api-mock` | `safeParse` del mismo `*Data` en POST; 400 con `error.issues` |
| `packages/domain` | Nada de Zod. Entidades propias; el mock traduce DTO ↔ domain |

Runtime: **Zod 4.6** (`zod@^4.6.5` en `@mtt/contracts`). Regenerar: `pnpm openapi-ts`.

Qué usar de 4.6 en este repo (y qué no):

| Feature 4.6 | En el borde MTT |
|---|---|
| `safeParse` + issues | **Sí.** Forms y mock necesitan mensajes. El error map es **lazy**: leer `result.error` en el mismo tick que el parse, no después de un `z.config()`. |
| SDK `parseAsync` | **Sí.** Hay que devolver el output tipado, no un boolean. |
| `.validate()` | **No** en forms/mock/SDK. No construye issues ni output. Solo si algún día hace falta un gate “¿es JSON válido?” sin enseñar errores. |
| `z.compile()` / `z.withParser()` | **No** hasta CSP (`new Function`) o coste medido. El gen de Hey API no emite parsers compilados. |
| `z.fromJSONSchema()` | **No.** Duplicaría Hey API. Si el YAML gana `minProperties` / `uniqueItems` / `contains`, regenerar; el plugin Zod los traduce. |
| `z.iban()`, `@zod/mini` | **No.** El OpenAPI no tiene IBANs; Mini no es lo que emite Hey API. |
| `z.email()` / `z.url()` | Gratis en schemas ya generados (`Owner*`, `vocabulary_uri`). 4.6 rechaza URLs inválidas más barato y el patrón de email deja de usar lookaheads. |

Evolución, en este orden:

1. Cambia el YAML → `pnpm openapi-ts`. Web y mock siguen importando los mismos `z*`.
2. Constraint extra (max length, uuid, enum) → YAML, no `.refine()` a mano encima del gen.
3. Invariante de negocio (PSK, disallow antes de mover) → `packages/domain`, no Zod.
4. Cuando los POST dejen de ser dos formularios y haya TanStack Form: el schema sigue siendo el `z*Data` / `z*Create` generado.
5. Compilar schemas (`z.compile`) solo si el mock o el cliente parsean payloads grandes (series de lecturas) y un profiler lo pide. Entonces un wrapper **fuera** de `generated/`, no parcheando el gen.

Config Hey API (`packages/contracts/openapi-ts.config.ts`):

- `@hey-api/client-fetch` + `runtimeConfigPath` (base URL, `credentials` cuando exista auth)
- `@hey-api/typescript`
- `@hey-api/sdk` con **`validator: true`** (valida request/response con Zod)
- `@hey-api/zod` (requests y responses)
- `@tanstack/react-query` (`queryOptions` + `mutationOptions`)

Nadie reexporta tipos a mano “porque el gen es feo”. Si el YAML cambia: regenerar, no parchear `packages/contracts`.

Uso en web:

- Queries: `useQuery(devicesListOptions({ query: { mesh_id } }))`
- Mutaciones: `...devicesCreateMutation()` + invalidar query keys generadas
- Forms: `zMeshesCreateData` / `zDevicesCreateData` con `safeParse` (hoy); el mismo schema si pasa a TanStack Form

Uso en mock:

- Mismo schema Zod de request para rechazar 400
- Respuestas construidas para pasar el schema de response (el cliente web las volverá a parsear)

---

## Domain (vertical slicing)

Un slice = carpeta. Export en `package.json` por slice (`./mesh/*`, `./device/*`, …), como taller.

Por slice, el mínimo:

- Entidad (invariantes en constructor / métodos)
- Tipos create/update propios del dominio
- `IXxxRepository` (puerto)
- Tests unitarios del slice (vitest)

Fase 1:

| Slice | Reglas que no van en la UI |
|---|---|
| `mesh` | Owner implícito; PSK no se lista al público; update de PSK es redistribuir (mock: aplicar a gateways allowed o fallar atómico) |
| `device` | `node_id` + `mesh_id` fijos al crear; `is_gateway` + `is_allowed` controlan decodificación; mover de malla exige disallow previo |
| `readings` | Series por `device_uuid` + canal; latest plano; window/agg |
| `measurement` | Catálogo de unidades / `quantity_kind` / display name (lectura) |

Owner de fase 1: slice `authz` (`role`: owner / staff / superuser). Flags OpenAPI `is_superuser` / `is_staff` se derivan del rol. Better Auth (memory adapter) emite la cookie `mtt_session`; `POST /owners/login` y `/api/auth/*` son la misma sesión.

---

## api-mock

- Proceso propio (`pnpm --filter api-mock dev`), CORS abierto al Vite.
- Store: `Map`s en RAM, seed al arrancar (2 mallas, 4 owners, mix de gateways/nodos, lecturas sintéticas).
- Implementa **solo** las operaciones de las UI stories de fase 1. El resto del YAML puede 501.
- Cookie de sesión Better Auth. El briefing de API keys espera.

---

## RBAC (mock)

Matriz y seed: [roles.md](./roles.md). Código: `packages/domain/src/authz/authz.ts`.

Login web: `/login` (shader OA + Frame), email/password. No OAuth ni magic link en el mock.

Repos in-memory implementan los puertos de domain. Controllers: Zod request → comando domain → serialize a forma OpenAPI.

---

## UI (BoardUI + OA + ReUI)

- Tokens BoardUI en `packages/ui/src/boardui/`. Look OA en `packages/ui/src/oa.css`.
- Instalar: `npx boardui@latest add <name>` y `pnpm dlx shadcn@latest add @reui/<name>` desde `packages/ui`.
- Apps importan `@mtt/ui/boardui.css`. `@source` del paquete UI en `apps/web/src/styles.css`.
- Tema: clase `.dark` + `boardui:theme`. Default light (cuerpo blanco OA).
- Skill: `.cursor/skills/oa-design/`. Compilado: [oa-design.md](./oa-design.md).

## Web (fase 1)

Rutas en [ui-stories.md](./ui-stories.md). Login en `/login`. Fetch con `credentials: include`.

`VITE_API_URL` apunta al mock. CSRF cookie no-op en el mock.

---

## Qué no hacer

- Editar ficheros generados en `packages/contracts`
- Duplicar tipos del OpenAPI en domain o en componentes
- Zod escrito a mano para bodies que el gen ya emite
- Meter reglas de “disallow antes de mover” en un `useEffect`
- Persistir API keys en el navegador (cuando llegue US-43)
- Implementar `/owners/*` más allá de login/me/list/retrieve y el perfil

---

## Orden de montaje

Hecho: workspace, `packages/ui`, `packages/contracts` (Hey API + Zod), `packages/domain`, `apps/api-mock`, web Query contra `GET /meshes`.

Pantallas US-11–31 siguen abiertas.

```bash
pnpm dev
```

Arranca Vite (`5173`) y el mock (`8787`). `VITE_API_URL` por defecto `http://localhost:8787`. Regenerar cliente: `pnpm openapi-ts`.

`GET /meshes` sigue el schema OpenAPI `Mesh` (incluye `psk_b64`). La UI no lo pinta; `Mesh.toListItem()` es la forma de dominio sin PSK.

Historias: [ui-stories.md](./ui-stories.md). API: [meshtastic-things-frontend-briefing.md](./meshtastic-things-frontend-briefing.md). Look: [oa-design.md](./oa-design.md).
