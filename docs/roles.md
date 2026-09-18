# Roles y permisos

Fuente de verdad en código: `packages/domain/src/authz/authz.ts`. El mock HTTP no duplica la matriz: llama a esas funciones. Los flags OpenAPI `is_superuser` y `is_staff` se derivan del rol, no al revés.

Tres roles. Un actor inactivo (`isActive: false`) no pasa ninguna comprobación.

## Roles

| Rol | Flags OpenAPI | Quién es |
|---|---|---|
| `owner` | `is_superuser: false`, `is_staff: false` | Dueño de mallas. Ve y edita solo lo suyo. |
| `staff` | `is_superuser: false`, `is_staff: true` | Operación interna. Lee el catálogo entero. No ve PSK. No escribe. |
| `superuser` | `is_superuser: true`, `is_staff: true` | Admin. Lee y escribe todo, incluido el PSK y el email de cada owner. |

`superuser` implica staff en el flag HTTP (Django-shaped). El rol de dominio sigue siendo `superuser`.

## Recursos

La unidad de pertenencia es `owner_id` en malla y blueprint. Un device hereda el owner de su malla.

| Capacidad | Función | owner | staff | superuser |
|---|---|---|---|---|
| Listar / leer mallas y devices propios | `canReadMesh` | sí, las suyas | todas | todas |
| Ver `psk_b64` | `canSeePsk` | la suya | no | sí |
| Crear / editar malla o device | `canWriteMesh` | las suyas | no | sí |
| Crear blueprint | `canWriteCatalog` | sí (queda a su nombre) | no | sí |
| Ver email y flags de un owner | `canReadOwnerEmail` | solo el propio | no (directorio público) | sí |
| `GET /owners` | — | `OwnerPublic` | `OwnerPublic` | `OwnerRead` completo |

`visibleOwned` recorta listas: staff y superuser ven todas las filas; un owner solo `ownerId === actor.id`.

404 vs 403: si el actor no puede **leer** el recurso, el mock responde 404 (no revela que existe). Si puede leer pero no escribir, 403.

## Rutas (mock)

Autenticadas con cookie Better Auth (`mtt_session`), salvo login, CSRF y `/health`.

- `POST /owners/login`, `POST /owners/logout`, `GET /owners/me`: sesión. El perfil incluye solo devices visibles.
- `GET /owners`, `GET /owners/{id}`: directorio público o registro completo según la tabla.
- `GET/POST /meshes`, `GET /meshes/{id}`: filtro + PSK según rol.
- `GET/POST /devices`, `PUT /devices/{id}`: el write exige `canWriteMesh` sobre la malla del device.
- `GET/POST /postprocessing-blueprints`: lista filtrada; staff no crea.
- Lecturas, quality, catálogo de measurements y algorithms: cualquier sesión activa que ya pueda leer el device.

## Seed del mock

| Email | Password | Rol | Datos |
|---|---|---|---|
| `owner@sensical.test` | `mesh-owner-12` | owner | Hill + porch + gateway |
| `river@sensical.test` | `mesh-owner-12` | owner | River + river gateway |
| `admin@sensical.test` | `mesh-admin-12` | superuser | Todo |
| `staff@sensical.test` | `mesh-staff-12` | staff | Lectura, sin PSK |

No hay register en el mock. Un owner nuevo solo entra si se añade al seed.
