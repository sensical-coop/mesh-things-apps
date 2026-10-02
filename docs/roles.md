# Roles y permisos

Fuente de verdad en código: `packages/domain/src/authz/authz.ts`. El mock HTTP no duplica la matriz: llama a esas funciones. Los flags OpenAPI `is_superuser`, `is_staff` y `role` se derivan del rol, no al revés.

Cuatro roles. Un actor inactivo (`isActive: false`) no pasa ninguna comprobación.

## Roles

| Rol | Flags OpenAPI | Quién es |
|---|---|---|
| `owner` | `is_superuser: false`, `is_staff: false` | Dueño de mallas. Edita solo lo suyo; además lee mallas públicas. |
| `operator` | `is_superuser: false`, `is_staff: false`, `role: operator` | Owner que además da de alta **fuentes** (brokers MQTT remotos). Solo ve y usa las suyas. |
| `staff` | `is_superuser: false`, `is_staff: true` | Operación interna. Lee el catálogo entero. No ve PSK. No escribe. |
| `superuser` | `is_superuser: true`, `is_staff: true` | Admin. Lee y escribe todo, incluido el PSK y el email de cada owner. |

`superuser` implica staff en el flag HTTP (Django-shaped). El rol de dominio sigue siendo `superuser`. El campo HTTP `role` solo vale `member` u `operator` (`roleFlag`); todo lo que no es `operator` sale como `member`.

## Recursos

La unidad de pertenencia es `owner_id` en malla y blueprint. Un device hereda el owner de su malla.

Un `operator` es un `owner` a todos los efectos de mallas, devices y blueprints; la tabla solo lo separa donde difiere.

| Capacidad | Función | owner | operator | staff | superuser |
|---|---|---|---|---|---|
| Listar / leer mallas y devices | `canReadMesh` | las suyas y las públicas (`is_public`) | igual que owner | todas | todas |
| Ver `psk_b64` | `canSeePsk` | la suya | la suya | no | sí |
| Crear / editar malla o device | `canWriteMesh` | las suyas | las suyas | no | sí |
| Crear blueprint | `canWriteCatalog` | sí (queda a su nombre) | sí | no | sí |
| Gestionar fuentes (`/sources`) | `canManageSources` / `visibleSources` | no (403) | solo las suyas; ajenas 404 | no (403) | todas |
| Ver `source_id` de una malla | `canSeeMeshSource` | solo en las suyas | solo en las suyas | no | todas (solo lectura en ajenas) |
| Cambiar `source_id` de una malla | — | — | en las suyas, solo a una fuente propia | no | en las suyas |
| Pedir el rol operator | `canRequestOperator` | sí (una pendiente a la vez) | no (ya lo es) | no | no |
| Aprobar / rechazar peticiones | `canDecideOperatorRequests` | no | no | no | sí |
| Ver email y flags de un owner | `canReadOwnerEmail` | solo el propio | solo el propio | no (directorio público) | sí |
| `GET /owners` | — | `OwnerPublic` | `OwnerPublic` | `OwnerPublic` | `OwnerRead` completo |

`visibleMeshes` recorta la lista de mallas con `canReadMesh`. `visibleOwned` (blueprints) sigue siendo solo `ownerId === actor.id` para un owner.

Leer no es editar: en una malla pública ajena el lector no ve PSK ni devices rechazados (`is_allowed: false`), y recibe 403 en cualquier write. En web, `canEditMesh` (`features/mesh/model.ts`) oculta toda acción de escritura (editar, borrar, registrar, ajustes de device, alarmas) cuando la malla no es suya.

`source_id` se devuelve al dueño de la malla y a los superusers (solo lectura en ajenas); `psk_b64` sigue siendo solo del dueño. Asociar una fuente que el actor no ve responde 400 en `source_id`, igual que un id inexistente; reenviar la fuente actual siempre se acepta. En web, `canManageSources` (`features/source/model.ts`) decide la pestaña Sources y el selector de fuente en *Edit mesh*.

404 vs 403: si el actor no puede **leer** el recurso, el mock responde 404 (no revela que existe). Si puede leer pero no escribir, 403.

## Rutas (mock)

Autenticadas con cookie Better Auth (`mtt_session`), salvo login, CSRF y `/health`.

- `POST /owners/login`, `POST /owners/logout`, `GET /owners/me`: sesión. El perfil incluye solo devices visibles.
- `GET /owners`, `GET /owners/{id}`: directorio público o registro completo según la tabla.
- `GET/POST /meshes` (`?owned=true` para solo las propias), `GET /meshes/{id}`: filtro + PSK según rol. 404 si no se puede leer.
- `GET/POST /devices`, `PUT /devices/{id}`: el write exige `canWriteMesh` sobre la malla del device.
- `GET/POST /postprocessing-blueprints`: lista filtrada; staff no crea.
- `GET/POST /sources`, `GET/PUT/DELETE /sources/{id}`: solo operator/superuser. 400 con errores por campo estilo DRF (`{ "server": ["Must be host:port."] }`); `#` como topic está bloqueado. Un host `*.invalid` simula que EMQX falla (502, no se guarda nada). `DELETE` con mallas asociadas: 409.
- Condiciones (la API pone versión y texto, en `en`/`es`): cuenta `GET /terms` (sin sesión; `POST /owners` y `POST /owners/me/terms-acceptance`, no caducan), malla `GET /meshes/terms` (`POST /meshes` sin fuente, `PUT /meshes/{id}` al pasar al broker por defecto, `POST /meshes/{id}/terms-acceptance` solo el dueño) y fuente `GET /sources/terms` (`POST /sources`, `POST /sources/{id}/terms-acceptance` solo quien la creó). `terms_version` actual obligatoria (400 si falta o es antigua), `terms_locale` opcional; cada aceptación se guarda. El owner expone `terms_accepted_version` (cuenta); la malla, `terms_accepted_version`, `terms_expires_at`, `paused_at` (dueño y superuser); la fuente, lo mismo y `status` (`paused` si caducó). El mock usa 365 días de validez (`MOCK_DATA_RETENTION_DAYS`, vacío = sin límite). Con `MOCK_TERMS_ENFORCED=false` imita una instancia lite (`REGISTRY__TERMS_ENFORCED=false`): 404 en todas las rutas de condiciones, `terms_version` opcional e ignorado, nada se registra ni caduca.
- `GET /meshes?source_id=`, `POST/PUT /meshes` con `source_id`: ver arriba.
- `GET/POST /owners/me/operator-request`: la última petición propia (404 si no hay) / pedir el rol con `reason`. 409 si ya es operator o ya hay una pendiente.
- `GET /operator-requests?status=pending|approved|rejected|all`, `GET/PUT /operator-requests/{id}` (`decision`, `note`): solo superuser. Aprobar convierte al owner en operator. 409 si ya se decidió.
- `GET /data-deletions?status=pending|cancelled|done|all&mesh_id=`: solo superuser (`canSeeDataDeletions`). El mock programa un borrado al eliminar una malla o sacarla de su fuente, y lo cancela al renovar condiciones o devolver la malla a la fuente.
- Todo 400 del mock responde errores por campo estilo DRF (`{campo: [msg]}`, `non_field_errors`).
- Lecturas, quality, catálogo de measurements y algorithms: cualquier sesión activa que ya pueda leer el device.

## Seed del mock

| Email | Password | Rol | Datos |
|---|---|---|---|
| `owner@sensical.test` | `mesh-owner-12` | owner | Hill + porch + gateway |
| `river@sensical.test` | `mesh-owner-12` | owner | River (pública) + river gateway |
| `admin@sensical.test` | `mesh-admin-12` | superuser | Todo |
| `operator@sensical.test` | `mesh-operator-12` | operator | Fuente "Meshtastic public EU" + Valley (malla con esa fuente) |
| `staff@sensical.test` | `mesh-staff-12` | staff | Lectura, sin PSK |

`river@sensical.test` tiene además una petición de operator pendiente (pestaña *Requests* como superuser) y la malla River con sus condiciones caducadas (banner, chip y renovación en la página de la malla). La fuente del operator caduca en 10 días (“Renovar pronto” en *Sources*).

No hay register en el mock. Un owner nuevo solo entra si se añade al seed.
