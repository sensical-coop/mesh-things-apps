# Instrucciones para agentes de código

Al trabajar en este repositorio en **TypeScript** y **React**, sigue las guías locales en `docs/`. Tienen prioridad sobre convenciones genéricas cuando entren en conflicto con el estilo del proyecto.

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

## Monorepo (fase 1 de diseño ya montada)

pnpm + Turborepo. Scope npm `@mtt/*`.

| Pieza | Rol |
|---|---|
| `packages/tsconfig` | TS compartido |
| `packages/ui` | BoardUI (`src/boardui`), remap OA (`src/oa.css`), ReUI Frame, botón BoardUI |
| `apps/web` | Vite + React 19. Consume `@mtt/ui` |
| `packages/contracts` | Hey API + Zod 4.6 generado. Solo borde HTTP. |
| `packages/domain` | Vertical slices (sin Zod) |
| `apps/api-mock` | HTTP in-memory; parsea bodies con `@mtt/contracts/zod` |

Web **no** importa domain. Zod 4.6 generado vive en `@mtt/contracts/zod` (borde HTTP). No editar output de `openapi-ts`.

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
pnpm dlx shadcn@latest add @reui/<nombre>
```

`components.json` registra `@reui`. Templates de página enteros van en `apps/web`, no en el paquete UI.

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

## OpenSpec

CLI `openspec`. Comandos en `.cursor/commands/`. No crear `openspec/changes` a mano.

## Mantenimiento MarsBased

```bash
curl -fsSL "https://raw.githubusercontent.com/MarsBased/handbook/refs/heads/main/guides/typescript-guidelines.md" \
  -o docs/typescript-guidelines.md
curl -fsSL "https://raw.githubusercontent.com/MarsBased/handbook/refs/heads/main/guides/development/react-guidelines.md" \
  -o docs/react-guidelines.md
```
