# Arquitectura — Mesh Things apps

Monorepo (Turborepo + pnpm) para un dashboard Vite sobre la **Mesh Things API**. Su OpenAPI, copiado del repo de la API, es la fuente de verdad del hilo HTTP. La lógica de negocio no vive en React.

Esto **anula** el “no generar Zod al inicio” del briefing frontend: web y mock comparten schemas Zod **generados** por Orval.

---

## Piezas

```
mesh-things (snapshot) --> docs/openapi.json --> packages/contracts (Orval)
apps/web --> packages/ui + packages/contracts
apps/api-mock --> packages/domain + packages/contracts
```

| Package / app | Qué es | Qué no es |
|---|---|---|
| `packages/contracts` | Output de Orval (fetch, query options, Zod) **y** hechos HTTP escritos a mano que comparten web y api-mock: filtros de lista, cooldown de reenvío, términos, reglas de source y de blueprint, permisos (`authz`), streams de sink, límites de export y el puerto MQTT TLS. | Lógica de UI ni el modelo de dominio. `src/generated/` no se edita; se regenera con `pnpm openapi:sync`. |
| `packages/domain` | Vertical slices (`mesh`, `device`, `readings`, `measurement`, `source`, `sink`). Entidades e invariantes. Como `@taller/domain`. | Tipos generados. No fetch. No React. No permisos (viven en contracts). No interfaces de repositorio con un solo implementador. |
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
contracts  -->  (runtime generado + hechos HTTP a mano; no domain, no UI salvo hooks en módulos propios: `useTermsAsked` / `useTermsConfirmed` en `terms.ts`, `useResendVerification` en `resend-verification.ts`, `useSignup` en `signup.ts`, `useLogin` / `useLogout` / `invalidateMe` en `session.ts`, `useRegisterGateway` en `register-gateway.ts`)
```

Domain no importa `@meshtastic-things/contracts`. Los DTO del YAML y el modelo de dominio son dos capas: el mock traduce.

La web **no** importa `packages/domain`. Consume JSON ya validado (SDK con `validator: true` sobre Zod) y pinta.

---

## Features (web + api-mock)

Cada entidad de negocio vive en `features/<name>/` en el lado que la necesita. Las rutas viven en `apps/web/src/pages/` y solo orquestan features (repos, `model`, `ui/`). El HTTP generado no se llama desde las páginas: sale del `repository` de la feature. Reglas que el API exige y que varios clientes repiten (filtros, cooldown, términos de cuenta, source, blueprint, permisos, streams de sink, límites de export, puerto MQTT TLS) viven en `@mtt/contracts`, no copiadas en cada app.

| Feature | Web | api-mock |
|---|---|---|
| `auth` | `repository` + `session` | Better Auth en `auth.ts` (no hay `features/auth`) |
| `mesh` | `repository` + `model` | `repository.ts` |
| `device` | `repository` + `model` + `ui/` badges | `repository.ts` |
| `readings` | solo `repository.ts` (lo consume device) | `repository.ts` |
| `blueprint` | `repository` + `model` + `ui/` (editor de versiones) | `repository.ts` + `validate.ts` (sin puerto de domain) |
| `postprocessing` | `repository` + `model` + `ui/` (panel del device) | `repository.ts` (filas, `problems`) |
| `archive` | `repository` (un 404 del manifiesto es “no hay archivo”) + `ui/` | `repository.ts` + `zip.ts` |
| `export` | `repository` + `ui/` (CSV y el zip del archivo) | `repository.ts` |
| `alarm` | `repository` + `model` | — |
| `algorithm` | — (vía `blueprint/repository`) | `catalog.ts`, copia de `GET /algorithms` |
| `measurement` | — | `repository.ts` |

### Cliente (`apps/web`) — mapa de ficheros

Alias Vite `@` → `apps/web/src`. Import de primitivas: `@mtt/ui/…`, nunca copiar el registry a `src/`.

```
apps/web/
  components.json          # CLI shadcn: ui → @mtt/ui/components/ui (escribe en packages/ui)
  src/
    main.tsx               # createQueryClient (@mtt/contracts) + AppProviders (@mtt/ui) + <Layout router={router} />
    styles.css             # Tailwind; @source de @mtt/ui
    layout.tsx             # Layout (RouterProvider) + Shell (consola)
    header.tsx             # consola autenticada
    nav-links.tsx            # enlaces de consola que usa el header
    nav-items.ts             # páginas de consola y grupos Automation y Data; header y footer las pintan
    management-menu.tsx      # menú de superusuario y sus conteos (lo monta nav-links)
    terms-banner.tsx         # aviso de términos pendientes de las mallas (lo monta Shell)
    footer.tsx
    router/
      router.ts            # paths
      app-router.tsx       # createRoute / createRouter
      index.ts             # reexporta routes (no el instance)
    components/            # piezas de producto, no primitivas
      kpi/                 # kpi, kpi-panel + helpers kpi-icon.ts, kpi-shell.ts
      series/              # series-plot, series-chart
      brand.ts             # pageWidth; la marca es BrandMark de @mtt/ui
      smart-filters.tsx    # filtros de producto; solo los usa web
      filter-url.ts        # query string; el wire sale de @mtt/contracts/list-filter
      status-chip.tsx      # chrome de caption compartido; cada feature mapea tono y texto
      list-scaffold.tsx    # cabecera + frame + skeleton/tabla de las listas de consola
      site-header.tsx      # barra sticky de la landing y de las páginas legales
      flag.tsx
      modal.tsx
      skeleton-rows.tsx
      status-copy.tsx
    lib/                   # sin JSX
      format.ts
      page-heading.ts
    features/<name>/
      repository.ts
      model.ts             # opcional; presentación
      ui/                  # opcional; badges de la feature
    features/mesh-network/expanded-map.ts  # clase del mapa a pantalla completa
    features/auth/require-role.tsx  # guard operator | superuser; redirige al listado de mallas
    pages/devices/detail/computed-flag.tsx # badge "Computed"; solo lo usan las pestañas del dispositivo
    pages/
      home/                # landing pública
      login/ signup/ forgot-password/ reset-password/ verify-email/ verify-pending/
      terms/ dpa/ profile/
      meshes/list|detail
      devices/list|detail
      alarms/list  blueprints/list|detail
      sources/ sinks/ archive/ csv-downloads/
      operator-requests/ data-deletions/
        # cada carpeta de ruta: route.ts + page.tsx
  test/                    # *.test.ts — node:test
```

Arranque (para no ciclar `layout` ↔ `app-router`):

1. `app-router.tsx` importa `Shell` desde `@/layout` y exporta `router`.
2. `main.tsx` importa `router` y lo pasa a `Layout`.
3. `Layout` **no** importa el instance del router.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Paths | `src/router/router.ts` | `Object.freeze` de rutas absolutas y `consoleChild`. Las rutas que comparten web y la API (`SITE_PATHS`, `MESH_SEGMENTS`) salen de `@mtt/contracts/site`; `fillPath(path, params)` sustituye `$param`. Nadie pega `"/console/…"` en JSX. Import de paths: `@/router`. |
| Árbol | `src/router/app-router.tsx` | `createRootRoute` → landing `/`, login `/login`, consola `/console` (`Shell`) + hijos. El fichero se llama `app-router.tsx` **a propósito**: Darwin no admite `router.ts` y `router.tsx` en el mismo directorio. |
| Instance | `export const router` en `app-router.tsx` | Solo `main.tsx` lo monta. `index.ts` no lo reexporta. |
| Layout | `src/layout.tsx` | `Layout` = `RouterProvider` (prop `router`). `Shell` = auth gate (`authRepository.me`) + `Header` + `<Outlet />` + `Footer`. Única excepción a “un componente por fichero”. |
| Header / Footer | `src/header.tsx`, `src/footer.tsx` | Mismo nivel que `layout.tsx` / `main.tsx`. No hay carpeta `chrome/`. |
| Brand | `src/components/brand.ts` | `pageWidth`. La marca es `@mtt/ui/components/brand-mark`. |
| KPI / series | `src/components/kpi/`, `src/components/series/` | Un componente por `.tsx`. Helpers sin UI en `.ts` junto al KPI. |
| Forms | `@mtt/ui/forms` | Login, signup, mesh, gateway y fields. Su copy está en el catálogo de ui. |
| Format | `src/lib/format.ts` | Fechas, duraciones, números. |
| Shader login | `@mtt/ui/components/shader-backdrop` | Cinta WebGL detrás de la tarjeta de auth. **No** es `DialogOverlay` (`@mtt/ui/components/ui/dialog`). |
| Feature HTTP | `src/features/<name>/repository.ts` | Único sitio de esa feature que importa `@mtt/contracts/api`. |
| Presentación | `src/features/<name>/model.ts` | Títulos, silent, role label. Sin fetch. |
| UI de feature | `src/features/<name>/ui/` | Piezas de la feature (badges, diálogos, frames): se quedan en la feature aunque solo las use una página. Solo lo que compone piezas de varias features va bajo la página (el menú de acciones de un canal: alarmas + archivo, en `pages/devices/detail/channel-actions-menu.tsx`). Crear malla (`mesh-form.tsx`, `mesh-origin-dialog.tsx`, `create-mesh-dialog.tsx`) vive en `pages/meshes/list/`. El menú de superusuario y su conteo viven en `src/management-menu.tsx`, junto al chrome. |
| Página | `src/pages/<ruta>/` | `home`, `login`, `signup`, `forgot-password`, `reset-password`, `verify-email`, `verify-pending`, `terms`, `dpa`, `profile`, `meshes`, `devices`, `alarms`, `blueprints`, `sources`, `sinks`, `archive`, `csv-downloads`, `operator-requests`, `data-deletions`. `route.ts` + `page.tsx`. El detalle de device parte la página en `device-dashboard-tab.tsx`, `device-status-tab.tsx` y `telemetry-variant-section.tsx`. |
| Tests | `apps/web/test/` | `format`, `router`, `device-model`, `chart-range`. Importan `../src/…`. |

**Un componente por fichero.** Un `.tsx` de app exporta **un** componente React. Tipos y helpers de ese componente pueden ir al mismo fichero; un segundo componente va a otro archivo. Helpers sin JSX → `src/lib/` (o un `.ts` colocalizado si solo lo usa esa carpeta).

Excepción: `layout.tsx` exporta `Layout` y `Shell` (eran `app.tsx` + `shell.tsx`). No reintroducir `app.tsx`, `shell.tsx`, `widgets.tsx`, `form-fields.tsx`, ni `chrome/`.

### Servidor (`apps/api-mock/src`)

`features/<name>/repository.ts` es la clase en memoria (`MemoryMeshes`, `MemoryDevices`, …); domain no declara puertos. El catálogo de mediciones es el array del store. `store.ts` siembra IDs y llama a esas clases. Blueprints y postprocesados no tienen tipo de domain: `BlueprintRow` / `PostprocessingRow` viven en sus features; la validación replica `postprocessing.py` y `common/algorithms` del backend.

`app.ts` solo compone el servidor: CORS, sesión y el registro de rutas. Cada feature vive en `src/routes/<feature>.ts` (sesión → body parseado en `http.ts` → repositorio → `serialize.ts`). `runtime.ts` agrupa las operaciones de store que comparten varias rutas.

---

## Contratos (Orval + Zod 4.6)

El OpenAPI de la API es el contrato. Zod **no se escribe a mano** para shapes OpenAPI. Vive en un solo sitio y se usa **solo en el borde HTTP**.

| Dónde | Qué hay |
|---|---|
| `docs/openapi.json` | Copia del schema que sirve la API en `https://api.sensical.es/schema`. No editar: `pnpm openapi:sync` lo trae y regenera el cliente. |
| `packages/contracts/src/generated/` | Output Orval: `api.ts` (fetch + React Query) y `model.zod.ts` (Zod + tipos). No editar. |
| `packages/contracts/src/{api-errors,api-runtime,list-filter,resend-cooldown,resend-verification,signup,session,terms,terms-notice,register-gateway,mesh,source,blueprint,authz,export,sink,site,mock-accounts,query-client}.ts` | Hechos HTTP escritos a mano, al lado del gen. Exports: `@mtt/contracts/errors`, `/runtime`, `/list-filter`, `/resend-cooldown`, `/resend-verification`, `/signup`, `/session`, `/terms`, `/terms-notice`, `/register-gateway`, `/mesh`, `/source`, `/blueprint`, `/authz`, `/export`, `/sink`, `/site`, `/mock-accounts`, `/query-client`. Lo que importa el mock (`resend-cooldown`, `terms-notice`, …) no importa React ni `generated/api`: los hooks viven en su propio módulo. |
| `@mtt/contracts` | Schemas y tipos con el mismo nombre (`Mesh`, `MeshCreateRequest`, `DeviceRead`, …) |
| `@mtt/contracts/api` | Funciones (`meshesUpdate(meshId, body)`), `get*QueryOptions`, `get*QueryKey`, `get*MutationOptions`. Solo desde `repository.ts` |
| `@mtt/contracts/runtime` | `apiFetch`: `API_URL` sale de `VITE_API_URL` (si no, el mock), pide la cookie CSRF antes del primer método no seguro, lanza el body DRF con `status` (`toApiError`) y hace el `parse` del response |
| `apps/web` forms | `safeParse` del schema del body (`MeshCreateRequest.safeParse(body)`) |
| `apps/web` SDK | `apiFetch` recibe el Zod del response (`includeZodSchemaInArguments`) y lo parsea |
| `apps/api-mock` | `safeParse` del mismo schema de body en POST/PATCH; 400 con `error.issues` |
| `packages/domain` | Nada de Zod. Entidades propias; el mock traduce DTO ↔ domain |

drf-spectacular comparte componentes entre request y response. `orval.config.ts` los separa al generar: el body sin campos `readOnly` pasa a `<Nombre>Request` y el response pierde los `writeOnly`. Si el backend activa `COMPONENT_SPLIT_REQUEST`, ese transformer sobra.

Runtime: **Zod 4.6** (`zod@^4.6.6` en `@mtt/contracts`). Sincronizar: `pnpm openapi:sync` (por defecto `https://api.sensical.es`; otra API con `OPENAPI_URL`, p. ej. `OPENAPI_URL=http://localhost`; o el snapshot del backend sin levantarlo con `OPENAPI_FILE=../meshtastic-things/server/mesh_things/src/mesh_things/client/openapi.json`). Solo regenerar sin descargar: `pnpm openapi:generate`.

Qué usar de 4.6 en este repo (y qué no):

| Feature 4.6 | En el borde MTT |
|---|---|
| `safeParse` + issues | **Sí.** Forms y mock necesitan mensajes. El error map es **lazy**: leer `result.error` en el mismo tick que el parse, no después de un `z.config()`. |
| `parse` del response | **Sí.** Hay que devolver el output tipado, no un boolean. |
| `.validate()` | **No** en forms/mock/SDK. No construye issues ni output. Solo si algún día hace falta un gate “¿es JSON válido?” sin enseñar errores. |
| `z.compile()` / `z.withParser()` | **No** hasta CSP (`new Function`) o coste medido. Orval no emite parsers compilados. |
| `z.fromJSONSchema()` | **No.** Duplicaría Orval. Si el YAML gana `minProperties` / `uniqueItems` / `contains`, regenerar. |
| `z.iban()`, `@zod/mini` | **No.** El OpenAPI no tiene IBANs; Mini no es lo que emite Orval. |
| `z.email()` / `z.url()` | Gratis en schemas ya generados (`Owner*`, `vocabulary_uri`). 4.6 rechaza URLs inválidas más barato y el patrón de email deja de usar lookaheads. |

Evolución, en este orden:

1. Cambia la API (y se despliega, o corre en local) → `pnpm openapi:sync`. Web y mock siguen importando los mismos schemas.
2. Constraint extra (max length, uuid, enum) → en la API, no `.refine()` a mano encima del gen.
3. Invariante de negocio (PSK, disallow antes de mover) → `packages/domain`, no Zod.
4. Cuando los POST dejen de ser dos formularios y haya TanStack Form: el schema sigue siendo el del body generado.
5. Compilar schemas (`z.compile`) solo si el mock o el cliente parsean payloads grandes (series de lecturas) y un profiler lo pide. Entonces un wrapper **fuera** de `generated/`, no parcheando el gen.

Config Orval (`packages/contracts/orval.config.ts`):

- `client: "react-query"`, `httpClient: "fetch"`, `mode: "single"`
- `schemas: { type: "zod", mode: "single" }` → `model.zod.ts`
- `mutator: apiFetch` + `includeZodSchemaInArguments` (un mutator propio salta la validación de Orval; así el fetcher parsea el response)
- Transformer de input que separa request/response (ver arriba)

Nadie reexporta tipos a mano “porque el gen es feo”. Si el YAML cambia: regenerar, no parchear `packages/contracts`.

Uso en web:

- Queries: `useQuery(deviceRepository.list({ mesh_id }))` (las `get*QueryOptions` viven en el repository de la feature)
- Mutaciones: `...deviceRepository.create()` + `mutate({ data })` / `mutate({ meshId, data })`; invalidar con las `get*QueryKey` del mismo repository
- Forms: `MeshCreateRequest` / `DeviceCreate` con `safeParse` (hoy); el mismo schema si pasa a TanStack Form

Uso en mock:

- Mismo schema Zod de request para rechazar 400
- Respuestas construidas para pasar el schema de response (el cliente web las volverá a parsear)

---

## Domain (vertical slicing)

Un slice = carpeta. Export en `package.json` por slice (`./mesh/*`, `./device/*`, …), como taller.

Por slice, el mínimo:

- Entidad (invariantes en constructor / métodos)
- Tipos create/update propios del dominio
- Tests unitarios del slice (vitest)

Los repos en memoria del mock no pasan por un puerto: cada uno tiene un solo implementador, así que la clase se usa directo.

Fase 1:

| Slice | Reglas que no van en la UI |
|---|---|
| `mesh` | Owner implícito; PSK no se lista al público; update de PSK es redistribuir (mock: aplicar a gateways allowed o fallar atómico) |
| `device` | `node_id` + `mesh_id` fijos al crear; `is_gateway` + `is_allowed` controlan decodificación; mover de malla exige disallow previo |
| `readings` | Series por `device_uuid` + canal; latest plano; window/agg |
| `measurement` | Catálogo de unidades / `quantity_kind` / display name (lectura) |

Permisos: `@mtt/contracts/authz` (`Viewer`: `id`, `role` owner|operator|staff|superuser, `isActive`). `flagsForRole` / `roleFlag` salen del rol; `viewerOf` es el inverso para el perfil de la consola. El registro `Actor` del mock vive en `apps/api-mock/src/auth.ts` y cumple `Viewer` sin mapeo. Better Auth (memory adapter) emite la cookie `mtt_session`; `POST /owners/login` y `/api/auth/*` son la misma sesión.

---

## api-mock

- Proceso propio (`pnpm --filter api-mock dev`), CORS abierto al Vite.
- Store: seed en `store.ts`; repos in-memory en `features/*/repository.ts`.
- Implementa **solo** las operaciones de las UI stories de fase 1. El resto del YAML puede 501.
- Cookie de sesión Better Auth. Alta en `/signup`. La API key se rota en el perfil; el mock la devuelve una vez.

---

## RBAC (mock)

Matriz y seed: [roles.md](./roles.md). Código: `packages/contracts/src/authz.ts`. La consola no reescribe la matriz: `viewerOf(me)` y los mismos predicados; sin `me`, la UI con permiso se queda oculta.

Login web: `/login` (shader OA + Frame), email/password. No OAuth ni magic link en el mock.

Controllers: Zod request → entidad domain → serialize a forma OpenAPI.

---

## UI (`packages/ui`)

Un paquete. **No** hay `apps/web/src/components/{ui,reui,evilcharts}`: esas carpetas son el registry y viven aquí. La app envuelve (form, kpi, series, modal), no reinstala.

```
packages/ui/src/
  boardui/                 # CSS BoardUI; el CLI lo importa como @mtt/ui/styles/globals.css
  oa.css                   # remap OA
  oa/springs.ts
  theme.ts
  locale.ts
  init-scripts.ts          # plugin Vite: tema y locale antes del primer paint
  locales/                 # en.json + es.json; AppProviders los mezcla bajo el catálogo de cada app
  forms/                   # login, signup, mesh, gateway, fields; su copy está en locales/
  assets/brand/            # marcas SVG
  utils.ts                 # cn / cx  →  @mtt/ui/utils
  utils/                   # cx
  hooks/                   # use-theme, use-locale
  components/
    app-providers.tsx      # IntlProvider + mensajes de ui
    brand-mark.tsx
    base/                  # BoardUI (npx boardui add)
    ui/                    # shadcn (button, dialog, map, …)
    reui/                  # frame, filters, cascader, number-field
    evilcharts/            # charts/ + ui/
    data-table.tsx
    language-switcher.tsx  # un selector; web y docs lo importan de aquí
    theme-toggle.tsx       # botón de tema; web y docs
```

`package.json` de `@mtt/ui` exporta `./components/*` (a cualquier profundidad) y `./reui/*`, y aliases `#components/*` para que el CLI de shadcn resuelva imports internos **dentro** del paquete.

Importar por el export del paquete, no por `@/` de web:

| Qué | Import |
|---|---|
| BoardUI Button / Chip | `@mtt/ui/components/base/buttons/button`, `…/base/badges/chip` |
| shadcn | `@mtt/ui/components/ui/<name>` |
| Frame ReUI | `@mtt/ui/reui/frame` (archivo: `components/reui/frame.tsx`) |
| Filtros / cascader / number-field | `@mtt/ui/components/reui/…` |
| Charts | `@mtt/ui/components/evilcharts/charts/…` |
| Data table | `@mtt/ui/components/data-table`. Smart filters: `@/components/smart-filters` (solo web) |
| `cn` / `cx` | `@mtt/ui/utils` |
| Tema | `@mtt/ui/theme` |
| Query string de filtros | `@/components/filter-url` (solo web; el wire sale de `@mtt/contracts/list-filter`) |

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

- Apps importan `@mtt/ui/boardui.css` (el mismo `src/boardui/globals.css`). El CLI de BoardUI escribe `@mtt/ui/styles/globals.css`; `package.json` exporta `./styles/*` hacia esa carpeta. `@source` del paquete UI en `apps/web/src/styles.css`.
- Tema: clase `.dark` + `boardui:theme`. Default light (cuerpo blanco OA).
- Skill: `.cursor/skills/oa-design/`. Compilado: [oa-design.md](./oa-design.md).

## Tests

| Dónde | Runner | Qué |
|---|---|---|
| `apps/web/test/*.test.ts` | `node --test` (`pnpm --filter web test`) | Router, format, models de presentación. **Prohibido** `*.test.ts` bajo `apps/web/src/`. |
| `packages/domain/tests/<slice>/` | vitest | Invariantes de dominio. |

No meter tests de UI/primitivas en `packages/ui` salvo que el propio paquete gane un runner.

## Web (fase 1)

### Portal público de documentación

La app de docs se sirve en el mismo origen que la web, bajo `/docs` (`/docs/overview`). Los headers públicos incluyen el enlace **Docs**, también en móvil.

El contenido vive en `apps/docs/content/docs/en` y `apps/docs/content/docs/es`. El mismo slug existe en los dos idiomas; el selector de idioma de la app elige el árbol (`hideLocale: always`, la URL no lleva prefijo). Para añadir una página, crear el `.mdx` en las dos carpetas con frontmatter `title` y apuntarlo en los dos `meta.json`. Un bloque ` ```mermaid ` se convierte en SVG al compilar (`apps/docs/src/lib/remark-diagrams.ts`, con `beautiful-mermaid`) y se pinta con `Diagram`; los colores son variables CSS (`.docs-diagram` en `apps/docs/src/docs.css`), así que el SVG sigue `boardui:theme` sin volver a dibujarse. El navegador no carga ninguna librería de diagramas. Las imágenes viven en `apps/docs/content/docs/assets/` y se enlazan con ruta relativa (`![texto alternativo](../assets/mesh-grid.svg)`): Vite las empaqueta con hash y ambos idiomas comparten el fichero. Una ruta absoluta (`/x.png`) apunta a `apps/docs/public/`.

`apps/docs` es una app TanStack Start. `fumadocsMdx()` compila la colección de `src/lib/source.ts`; el layout spacious vive en `src/routes/_docs.tsx`. La app se construye con base `/docs` (Vite `base` y Nitro `baseURL`) y sirve `/docs/*` y `/docs/api/search`. Caddy le pasa el `/docs` del sitio sin tocar la ruta; en desarrollo lo hace el proxy de Vite de `apps/web`. El portal usa el layout spacious de Fumadocs (`fumadocs-ui` apunta a `@fumadocs/base-ui`) con su propio header, separado del header público. Los colores reutilizan tokens OA mediante las variables `--color-fd-*`, definidas en la raíz solo mientras `.docs-portal` está montado (también llegan a los diálogos); fuera del portal quedan sin valor y las reglas globales de Fumadocs no afectan a la consola. Los textos de Fumadocs salen de los catálogos (`useDocsTranslations`); los controles de idioma y tema reutilizan los de la aplicación (`boardui:theme`). La búsqueda vive en `apps/docs/src/routes/api/search.ts` y responde en `/docs/api/search` con `createFromSource`.

Rutas: constantes en `apps/web/src/router/router.ts` (historias en [ui-stories.md](./ui-stories.md)). Landing pública en `/`. Login en `/login`. Inventario autenticado bajo `/console`. Fetch con `credentials: include`.

`apiFetch` lee `API_URL` de `VITE_API_URL` (compile-time; mismo ARG en `docker/Dockerfile`) y, antes de un POST, pide `/owners/csrf-cookie`. En el mock esa ruta responde 200 y no deja cookie.

Imagen frontend: `docker build -f docker/Dockerfile .` — `vite build` con plugin `nitro()`, runtime `node .output/server/index.mjs` (puerto 80). No incluye `api-mock`. Vite no es el proceso de producción. Nginx, si existe, solo como reverse proxy.

---

## Qué no hacer

- Editar ficheros generados en `packages/contracts`
- Duplicar tipos del OpenAPI en domain o en componentes
- Zod escrito a mano para bodies que el gen ya emite
- Meter reglas de “disallow antes de mover” en un `useEffect`
- Persistir API keys en el navegador
- Meter primitivas shadcn/BoardUI/ReUI/EvilCharts en `apps/web/src` (van a `packages/ui`)
- Colocalizar `*.test.ts` dentro de `apps/web/src` (van a `apps/web/test/`)
- Exportar más de un componente desde el mismo `.tsx` (salvo `layout.tsx`: `Layout` + `Shell`)
- Crear `router.ts` y `router.tsx` juntos (usar `router/router.ts` + `router/app-router.tsx`)
- Que `layout.tsx` importe `router` desde `app-router` (ciclo). El instance entra por props desde `main.tsx`.
- Reintroducir `app.tsx`, `shell.tsx`, `chrome/`, `widgets.tsx`, `form-fields.tsx`
- Meter rutas o la landing dentro de `features/` (van a `src/pages/`; features son entidades)

---

## Orden de montaje

Hecho: workspace, `packages/ui`, `packages/contracts` (Orval + Zod), `packages/domain`, `apps/api-mock` y la consola.

Montadas: landing, `/login`, `/signup`, reset y verificación de email, `/terms`, `/dpa`, perfil (rotar la API key) y la consola (`meshes`, `devices`, `alarms`, `blueprints`, `sources`, `sinks`, `archive`, `csv-downloads`, `operator-requests`, `data-deletions`). Historias por ruta: [ui-stories.md](./ui-stories.md).

```bash
pnpm dev
```

Arranca Vite (`5173`) y el mock (`8787`). `VITE_API_URL` por defecto `http://localhost:8787`. Sincronizar el contrato: `pnpm openapi:sync`.

`GET /meshes` sigue el schema OpenAPI `Mesh` (incluye `psk_b64`). La UI no lo pinta.

Historias: [ui-stories.md](./ui-stories.md). API: [meshtastic-things-frontend-briefing.md](./meshtastic-things-frontend-briefing.md). Look: [oa-design.md](./oa-design.md).
