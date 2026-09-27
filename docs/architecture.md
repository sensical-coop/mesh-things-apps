# Arquitectura — Mesh Things apps

Monorepo (Turborepo + pnpm) para un dashboard Vite sobre **Mesh Things API 1.0.0**. El YAML es la fuente de verdad del hilo HTTP. La lógica de negocio no vive en React.

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
| `apps/web` | Vite + React + TanStack. Chrome de consola (`layout`/`header`/`footer`), `router/`, `pages/`, `features/`, `components/` de app, `lib/`. Tests en `test/`. | Primitivas shadcn/BoardUI/ReUI/EvilCharts. Reglas de malla/device. |
| `packages/ui` | Tokens OA/BoardUI y **todas** las primitivas instaladas (BoardUI, shadcn, ReUI, EvilCharts, mapcn). Destino del CLI `pnpm shadcn`. | Páginas, fetch, features, chrome de consola. |

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

## Features (web + api-mock)

Cada entidad de negocio vive en `features/<name>/` en el lado que la necesita. Las rutas viven en `apps/web/src/pages/` y solo orquestan features (repos, `model`, `ui/`). El HTTP generado no se llama desde las páginas: sale del `repository` de la feature.

| Feature | Web | api-mock |
|---|---|---|
| `auth` | `repository` + `session` | Better Auth en `auth.ts` (no hay `features/auth`) |
| `mesh` | `repository` + `model` | `repository.ts` |
| `device` | `repository` + `model` + `ui/` badges | `repository.ts` |
| `readings` | solo `repository.ts` (lo consume device) | `repository.ts` |
| `blueprint` | `repository` + `model` + `ui/` (editor de versiones) | `repository.ts` + `validate.ts` (sin puerto de domain) |
| `postprocessing` | `repository` + `model` + `ui/` (panel del device) | `repository.ts` (filas, `problems`) |
| `algorithm` | — (vía `blueprint/repository`) | `catalog.ts`, copia de `GET /algorithms` |
| `measurement` | — | `repository.ts` |

### Cliente (`apps/web`) — mapa de ficheros

Alias Vite `@` → `apps/web/src`. Import de primitivas: `@mtt/ui/…`, nunca copiar el registry a `src/`.

```
apps/web/
  components.json          # CLI shadcn: ui → @mtt/ui/components/ui (escribe en packages/ui)
  src/
    main.tsx               # QueryClient + TooltipProvider + <Layout router={router} />
    styles.css             # Tailwind; @source de @mtt/ui
    layout.tsx             # Layout (RouterProvider) + Shell (consola)
    header.tsx
    footer.tsx
    router/
      router.ts            # paths + href()
      app-router.tsx       # createRoute / createRouter
      index.ts             # reexporta routes, href  (no el instance)
    components/            # piezas de producto, no primitivas
      form/                # form-field, form-number, form-select, form-checkbox
      kpi/                 # kpi, kpi-panel + helpers kpi-icon.ts, kpi-shell.ts
      series/              # series-plot, series-chart
      brand.tsx            # logo + pageWidth
      flag.tsx
      modal.tsx
      skeleton-rows.tsx
      status-copy.tsx
    lib/                   # sin JSX
      format.ts
      page-heading.ts
      dialog-actions.ts
    features/<name>/
      repository.ts
      model.ts             # opcional; presentación
      ui/                  # opcional; badges de la feature
    pages/
      home/                # landing pública
      login/
      meshes/list|detail
      devices/list|detail
      blueprints/list|detail
        # cada carpeta de ruta: route.ts + page.tsx
  test/                    # *.test.ts — node:test
```

Arranque (para no ciclar `layout` ↔ `app-router`):

1. `app-router.tsx` importa `Shell` desde `@/layout` y exporta `router`.
2. `main.tsx` importa `router` y lo pasa a `Layout`.
3. `Layout` **no** importa el instance del router.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Paths | `src/router/router.ts` | `Object.freeze` de rutas absolutas y `consoleChild`. `href(path, params)` sustituye `$param`. Nadie pega `"/console/…"` en JSX. Import de paths: `@/router`. |
| Árbol | `src/router/app-router.tsx` | `createRootRoute` → landing `/`, login `/login`, consola `/console` (`Shell`) + hijos. El fichero se llama `app-router.tsx` **a propósito**: Darwin no admite `router.ts` y `router.tsx` en el mismo directorio. |
| Instance | `export const router` en `app-router.tsx` | Solo `main.tsx` lo monta. `index.ts` no lo reexporta. |
| Layout | `src/layout.tsx` | `Layout` = `RouterProvider` (prop `router`). `Shell` = auth gate (`authRepository.me`) + `Header` + `<Outlet />` + `Footer`. Única excepción a “un componente por fichero”. |
| Header / Footer | `src/header.tsx`, `src/footer.tsx` | Mismo nivel que `layout.tsx` / `main.tsx`. No hay carpeta `chrome/`. |
| Brand | `src/components/brand.tsx` | Logo y `pageWidth`. |
| KPI / series | `src/components/kpi/`, `src/components/series/` | Un componente por `.tsx`. Helpers sin UI en `.ts` junto al KPI. |
| Forms de app | `src/components/form/` | Wrappers de producto. Inputs shadcn en `@mtt/ui`. |
| Format | `src/lib/format.ts` | Fechas, duraciones, números. |
| Shader login | `src/pages/login/shader-backdrop.tsx` | Cinta WebGL detrás de la tarjeta. **No** es `DialogOverlay` (`@mtt/ui/components/ui/dialog`). |
| Feature HTTP | `src/features/<name>/repository.ts` | Único sitio de esa feature que importa `@mtt/contracts/query` (y SDK auth). |
| Presentación | `src/features/<name>/model.ts` | Títulos, silent, role label. Sin fetch. |
| UI de feature | `src/features/<name>/ui/` | Solo si se reutiliza en varias rutas (badges de device). Piezas de una sola página van junto a `page.tsx`. |
| Página | `src/pages/<ruta>/` | Mismo nivel que `features/`. `home/`, `login/`, `meshes/`, `devices/`, `blueprints/`. `route.ts` + `page.tsx`. Extra de detalle (p. ej. `chart-range.ts`) vive en esa carpeta. La landing no es una feature. |
| Tests | `apps/web/test/` | `format`, `router`, `device-model`, `chart-range`. Importan `../src/…`. |

**Un componente por fichero.** Un `.tsx` de app exporta **un** componente React. Tipos y helpers de ese componente pueden ir al mismo fichero; un segundo componente va a otro archivo. Helpers sin JSX → `src/lib/` (o un `.ts` colocalizado si solo lo usa esa carpeta).

Excepción: `layout.tsx` exporta `Layout` y `Shell` (eran `app.tsx` + `shell.tsx`). No reintroducir `app.tsx`, `shell.tsx`, `widgets.tsx`, `form-fields.tsx`, ni `chrome/`.

### Servidor (`apps/api-mock/src`)

`features/<name>/repository.ts` implementa el puerto de domain (`MemoryMeshes` → `IMeshRepository`, etc.). `store.ts` solo siembra IDs y llama a esas clases. Blueprints y postprocesados no tienen puerto de domain: `BlueprintRow` / `PostprocessingRow` viven en sus features; la validación replica `postprocessing.py` y `common/algorithms` del backend.

Controllers (`app.ts`) siguen mapeando HTTP → repo → JSON OpenAPI.

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

- Queries: `useQuery(deviceRepository.list({ query: { mesh_id } }))` (las `*Options` viven en el repository de la feature)
- Mutaciones: `...deviceRepository.create()` + invalidar query keys del mismo repository
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
- Store: seed en `store.ts`; repos in-memory en `features/*/repository.ts`.
- Implementa **solo** las operaciones de las UI stories de fase 1. El resto del YAML puede 501.
- Cookie de sesión Better Auth. El briefing de API keys espera.

---

## RBAC (mock)

Matriz y seed: [roles.md](./roles.md). Código: `packages/domain/src/authz/authz.ts`.

Login web: `/login` (shader OA + Frame), email/password. No OAuth ni magic link en el mock.

Repos in-memory implementan los puertos de domain. Controllers: Zod request → comando domain → serialize a forma OpenAPI.

---

## UI (`packages/ui`)

Un paquete. **No** hay `apps/web/src/components/{ui,reui,evilcharts}`: esas carpetas son el registry y viven aquí. La app envuelve (form, kpi, series, modal), no reinstala.

```
packages/ui/src/
  boardui/                 # CSS BoardUI (tokens)
  oa.css                   # remap OA
  oa/springs.ts
  theme.ts
  utils.ts                 # cn / cx  →  @mtt/ui/utils
  utils/                   # cx, dismiss-on-outside-press
  hooks/                   # use-mobile
  lib/                     # filter-url → query string
  components/
    base/                  # BoardUI (npx boardui add)
    ui/                    # shadcn (button, dialog, map, …)
    reui/                  # frame, filters, cascader, date-selector, number-field
    evilcharts/            # charts/ + ui/
    data-table.tsx
    smart-filters.tsx
```

`package.json` de `@mtt/ui` exporta por segmento (`./components/ui/*`, `./components/reui/*`, …) y aliases `#components/*` para que el CLI de shadcn resuelva imports internos **dentro** del paquete.

Importar por el export del paquete, no por `@/` de web:

| Qué | Import |
|---|---|
| BoardUI Button / Chip | `@mtt/ui/components/base/buttons/button`, `…/base/badges/chip` |
| shadcn | `@mtt/ui/components/ui/<name>` |
| Frame ReUI | `@mtt/ui/reui/frame` (archivo: `components/reui/frame.tsx`) |
| Filtros / cascader / number-field | `@mtt/ui/components/reui/…` |
| Charts | `@mtt/ui/components/evilcharts/charts/…` |
| Data table / smart filters | `@mtt/ui/components/data-table`, `@mtt/ui/components/smart-filters` |
| `cn` / `cx` | `@mtt/ui/utils` o `@mtt/ui/utils/cx` |
| Tema | `@mtt/ui/theme` |
| Query string de filtros | `@mtt/ui/lib/filter-url` |

Instalar (las primitivas **siempre** caen en `packages/ui`):

```bash
cd packages/ui && npx boardui@latest add <name>

# desde la raíz del monorepo (package.json → --cwd apps/web)
pnpm shadcn add button
pnpm shadcn add @reui/<nombre>
pnpm shadcn add @evilcharts/<nombre>
```

Hay **dos** `components.json`:

| Fichero | Rol |
|---|---|
| `apps/web/components.json` | El que usa `pnpm shadcn`. Alias `ui` → `@mtt/ui/components/ui` (y registries `@reui`, `@evilcharts`, `@mapcn`). |
| `packages/ui/components.json` | Aliases `#components`, `#lib`, `#hooks` para el código ya instalado en el paquete. CSS apunta a `apps/web/src/styles.css`. |

No lanzar shadcn “a pelo” contra `apps/web/src/components`. Si un add deja ficheros ahí, moverlos a `packages/ui` y cambiar imports a `@mtt/ui/…`.

- Apps importan `@mtt/ui/boardui.css`. `@source` del paquete UI en `apps/web/src/styles.css`.
- Tema: clase `.dark` + `boardui:theme`. Default light (cuerpo blanco OA).
- Skill: `.cursor/skills/oa-design/`. Compilado: [oa-design.md](./oa-design.md).

## Tests

| Dónde | Runner | Qué |
|---|---|---|
| `apps/web/test/*.test.ts` | `node --test` (`pnpm --filter web test`) | Router, format, models de presentación. **Prohibido** `*.test.ts` bajo `apps/web/src/`. |
| `packages/domain/tests/<slice>/` | vitest | Invariantes de dominio. |

No meter tests de UI/primitivas en `packages/ui` salvo que el propio paquete gane un runner.

## Web (fase 1)

Rutas: constantes en `apps/web/src/router/router.ts` (historias en [ui-stories.md](./ui-stories.md)). Landing pública en `/`. Login en `/login`. Inventario autenticado bajo `/console`. Fetch con `credentials: include`.

`VITE_API_URL` apunta al mock (compile-time; mismo ARG en `docker/Dockerfile`). CSRF cookie no-op en el mock.

Imagen frontend: `docker build -f docker/Dockerfile .` — `vite build` con plugin `nitro()`, runtime `node .output/server/index.mjs` (puerto 80). No incluye `api-mock`. Vite no es el proceso de producción. Nginx, si existe, solo como reverse proxy.

---

## Qué no hacer

- Editar ficheros generados en `packages/contracts`
- Duplicar tipos del OpenAPI en domain o en componentes
- Zod escrito a mano para bodies que el gen ya emite
- Meter reglas de “disallow antes de mover” en un `useEffect`
- Persistir API keys en el navegador (cuando llegue US-43)
- Meter primitivas shadcn/BoardUI/ReUI/EvilCharts en `apps/web/src` (van a `packages/ui`)
- Colocalizar `*.test.ts` dentro de `apps/web/src` (van a `apps/web/test/`)
- Exportar más de un componente desde el mismo `.tsx` (salvo `layout.tsx`: `Layout` + `Shell`)
- Crear `router.ts` y `router.tsx` juntos (usar `router/router.ts` + `router/app-router.tsx`)
- Que `layout.tsx` importe `router` desde `app-router` (ciclo). El instance entra por props desde `main.tsx`.
- Reintroducir `app.tsx`, `shell.tsx`, `chrome/`, `widgets.tsx`, `form-fields.tsx`
- Meter rutas o la landing dentro de `features/` (van a `src/pages/`; features son entidades)

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
