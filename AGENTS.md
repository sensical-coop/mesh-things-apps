# Instrucciones para agentes de código

Al trabajar en este repositorio en **TypeScript** y **React**, sigue las guías locales en `docs/`. Tienen prioridad sobre convenciones genéricas cuando entren en conflicto con el estilo del proyecto.

## Git: una rama por pull request, cero worktrees

Prohibido crear un worktree. `git worktree add` no se usa. Ni un checkout en `/tmp`, ni una carpeta hermana, ni un segundo directorio. Este repositorio tiene un solo directorio de trabajo, y el trabajo se hace aquí.

Cada pull request sale de una rama nueva, creada en este directorio con `git switch -c`. El nombre lleva el número de la issue: `feat/<issue>-<slug>` (`fix/` o `chore/` si toca). No reutilices una rama para otra pull request. No hagas el cambio en `main`. Si la rama ya existe, cámbiate a ella aquí. No abras otro checkout para saltarte eso.

## Documentación de referencia

| Guía | Archivo | Origen |
|------|---------|--------|
| **Arquitectura monorepo** | [docs/architecture.md](./docs/architecture.md) | Este repo |
| **Roles y permisos** | [docs/roles.md](./docs/roles.md) | Este repo |
| **UI stories (fase 1)** | [docs/ui-stories.md](./docs/ui-stories.md) | Este repo |
| **Proyecto (dashboard / API)** | [docs/meshtastic-things-frontend-briefing.md](./docs/meshtastic-things-frontend-briefing.md) | Interno |
| **OA Design (lenguaje visual)** | [docs/oa-design.md](./docs/oa-design.md) | Open Analytics, compilado |
| **Skill OA** | `.cursor/skills/oa-design/` y `.agents/skills/oa-design/` | `.tmp/oa-design` |
| TypeScript | [docs/typescript-guidelines.md](./docs/typescript-guidelines.md) | MarsBased |
| React | [docs/react-guidelines.md](./docs/react-guidelines.md) | MarsBased |

Orden de verdad para **producto y HTTP**: architecture + ui-stories + OpenAPI. Login mock: Better Auth cookie + `/login` (email/password). El YAML vive en `docs/openapi.yaml`.

Orden de verdad para **UI**: OA Design (look) → BoardUI (nombres de token y primitivas) → shadcn / ReUI (piezas extra). Si un componente BoardUI choca con OA (p. ej. `rounded-3xl` vs squircle), gana OA: `oa-squircle` / `oa-squircle-inset`, pills en acciones, peso ≤ 500.

**Mapa de ficheros** (chrome, `router/`, `pages/`, `features/`, dónde cae shadcn, ciclo Layout/Shell): [docs/architecture.md](./docs/architecture.md) — secciones *Features (web + api-mock)* y *UI (`packages/ui`)*. No improvisar `app.tsx` / `shell.tsx` / `chrome/` / primitivas bajo `apps/web/src`.

## Monorepo (fase 1 de diseño ya montada)

pnpm + Turborepo. Scope npm `@mtt/*`.

| Pieza | Rol |
|---|---|
| `packages/tsconfig` | TS compartido |
| `packages/ui` | BoardUI + shadcn + ReUI + EvilCharts + mapcn. Destino de `pnpm shadcn`. Árbol en architecture. |
| `apps/web` | Vite + React 19. Landing y consola. Ver tabla siguiente. |
| `apps/docs` | TanStack Start + Fumadocs. Docs de producto en `apps/docs/content/docs`. La app sirve la raíz (`/overview`). El sitio redirige su `/docs` a ese origen (`DOCS_URL`). El logo del header enlaza a `VITE_WEB_URL`. |
| `packages/contracts` | Hey API + Zod 4.6 generado. Solo borde HTTP. |
| `packages/domain` | Vertical slices (sin Zod) |
| `apps/api-mock` | HTTP in-memory; repos en `src/features/<name>/repository.ts`; parsea bodies con `@mtt/contracts/zod` |

### `apps/web` — dónde va cada cosa

Detalle y árbol: [docs/architecture.md](./docs/architecture.md). Resumen:

| Sitio | Contenido |
|---|---|
| `src/main.tsx` | Providers + `<Layout router={router} />`. El instance sale de `@/router/app-router`. |
| `src/layout.tsx` | `Layout` (`RouterProvider`) y `Shell` (auth + header + outlet + footer). Única excepción a un componente por fichero. |
| `src/header.tsx`, `src/footer.tsx` | Chrome de consola, mismo nivel que `layout.tsx`. |
| `src/router/router.ts` | Paths + `href()`. Import `@/router`. |
| `src/router/app-router.tsx` | Árbol TanStack. No llamar al fichero `router.tsx` (choque Darwin con `router.ts`). |
| `src/components/` | Producto: `form/`, `kpi/`, `series/`, brand, flag, modal, … Un `.tsx` = un componente. |
| `src/lib/` | Helpers sin JSX (`format`, `page-heading`, `dialog-actions`). |
| `src/features/<name>/` | Entidades de negocio: `repository.ts`, opcional `model.ts` / `ui/`. Sin rutas. |
| `src/pages/` | Rutas (`home`, `login`, `meshes`, `devices`, `blueprints`). `route.ts` + `page.tsx`; invocan features. |
| `test/` | `node:test`. Prohibido `*.test.ts` bajo `src/`. |

Web **no** importa domain. Primitivas **no** viven en `apps/web/src`. Zod 4.6 generado vive en `@mtt/contracts/zod` (borde HTTP). No editar output de `openapi-ts`.

## Diseño visual

Look: **superficies blancas con esquinas de curvatura continua, sobre un escenario gris, un solo ink, un solo spring.** Tokens en `packages/ui/src/oa.css` (remap de nombres BoardUI). No copiar hex a `theme.css`. No pintar el dashboard gris de borde a borde: `body` blanco (`bg-background-full`); el gris (`background-secondary-default` / `--oa-stage`) va **dentro** de plates.

- Tipografía: Inter Tight variable (300–500) + Geist Mono. Utilidades compuestas BoardUI: `text-body-medium`, `text-title-2-medium`. Nunca `text-sm font-medium leading-5`. OA recorta semibold/bold a 500 en CSS.
- Color: tokens semánticos (`text-text-primary`, `bg-background-primary-default`, `border-separator-border`). Un acento `#ff495f` (`accent-500` / `--oa-primary`, el coral de [sensical.es](https://sensical.es)). Semánticos (éxito/error) en texto y puntos, no en fills de panel. Sin `dark:` de paleta cruda; `.dark` en `<html>`, persistido en `boardui:theme`.
- Forma: plates `oa-squircle` + `shadow-card`; acciones `rounded-full` / Button BoardUI. Elevación binaria: resting vs floating (`shadow-card` / `shadow-dropdown`).
- Motion: springs OA en `@mtt/ui/oa/springs`. Chrome no espera; datos con `.oa-arrive` o skeleton pixel-matched. `prefers-reduced-motion`.
- Copy: sentence case; el botón dice lo que ocurre. Ver `_copy.md` en el skill.
- Iconos BoardUI: `@remixicon/react` como referencia (`leadingIcon={RiAddLine}`), no como elemento.
- Clases: `cx` / `cn` de `@mtt/ui/utils` (o `@mtt/ui/utils/cx`).

Instalar primitivas:

```bash
cd packages/ui
npx boardui@latest add <nombre>
```

Desde la raíz (`pnpm shadcn` = `--cwd apps/web`; el `components.json` de web apunta `ui` a `@mtt/ui`):

```bash
pnpm shadcn add button
pnpm shadcn add @reui/<nombre>
```

Primitivas: `packages/ui/src/components/{base,ui,reui,evilcharts}`. Piezas de app: `apps/web/src/components/` (un componente por fichero; excepción `layout.tsx`). Tests: `apps/web/test/`. Registries en ambos `components.json`: `@reui`, `@evilcharts`, `@mapcn`.

Docs BoardUI: [installation](https://www.boardui.com/installation).

## TypeScript

- Tipar desde el origen (OpenAPI / Zod generado).
- `type` frente a `interface` (salvo augmentación).
- Props con tipos nombrados exportados.
- Sin casts; Zod en el borde HTTP.
- Resolver `null`/`undefined` pronto.

## React

- Funciones nombradas, hooks, TypeScript.
- Servidor (mock) como fuente de verdad vía Query cuando exista el cliente.
- Fase 1: login cookie (Better Auth). Sin register ni API keys.
- **Un componente por fichero.** Un `.tsx` exporta un componente. Prohibido barrels tipo `widgets.tsx`. Helpers sin UI → `src/lib/`. Excepción documentada: `src/layout.tsx` (`Layout` + `Shell`).

## OpenSpec

CLI `openspec`. Comandos en `.cursor/commands/`. No crear `openspec/changes` a mano.

## Mantenimiento MarsBased

```bash
curl -fsSL "https://raw.githubusercontent.com/MarsBased/handbook/refs/heads/main/guides/typescript-guidelines.md" \
  -o docs/typescript-guidelines.md
curl -fsSL "https://raw.githubusercontent.com/MarsBased/handbook/refs/heads/main/guides/development/react-guidelines.md" \
  -o docs/react-guidelines.md
```
