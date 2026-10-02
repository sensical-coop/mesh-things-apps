# UI stories — Mesh Things (dashboard)

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

### Fuentes (operator)

Una fuente es un broker MQTT remoto + filtro de topic que EMQX trae a esta instancia. Solo `operator` y `superuser` las gestionan; cada operator ve solo las suyas. Ver `docs/roles.md`.

**US-14 · Añadir una fuente**
Como operator, doy de alta un broker remoto para asociarle mallas.

- **Ruta:** `/console/sources`, en el menú “Data” de la cabecera (`components/data-menu.tsx`, con Sources y Archive), oculto para el resto; la URL directa redirige a mallas. Data agrupa también los *sinks* (US-19).
- **Paso previo (condiciones):** antes del formulario, `SourceTermsDialog` muestra lo que devuelve `GET /sources/terms` (la API es dueña de la versión y del texto, en el idioma de la consola): una casilla por afirmación, todas obligatorias. El operator es responsable del tratamiento del tráfico traído y Sensical su encargado (RGPD art. 28); aceptar es un contrato con el operator, no consentimiento de los interesados. Sin aceptar todas no se abre el formulario. El `POST` lleva `terms_version`; la API rechaza una versión ausente o antigua y guarda la aceptación. Se acepta en cada alta, nunca al editar. El backend real aún no tiene este endpoint (ver `plans/sources.md` en meshtastic-things).
- **Campos:** label, server (`host:port`), topic, TLS (por defecto sí), usuario, password (write-only, nunca vuelve), QoS 0/1 (por defecto 1)
- **Validación:** Zod de `POST /sources` + reglas del backend sin configuración (`validateSourceFields`: `host:port`, sin `$share`/`$SYS`, QoS 0/1). Los 400 del servidor (broker propio, listas de bloqueo) se pintan en su campo.
- **Tras éxito (201):** cerrar, refrescar la lista y mostrar el estado del puente devuelto (`status`). Un 502 significa que EMQX falló y no se guardó nada.
- **Lista:** label, server, topic, TLS, QoS, nº de mallas; editar y borrar. Borrar lista las mallas que usan la fuente (`GET /meshes?source_id=`) con enlace a cada una y no deja borrar hasta que no quede ninguna.
- **Editar:** mismo diálogo, precargado. El password nunca vuelve: la casilla “Keep password as is” (marcada) deshabilita el campo y no lo envía; desmarcada, un valor nuevo lo cambia y en blanco lo quita (se envía `""`). 502 = el puente no se reconfiguró y la fuente queda como estaba.
- **Contrato:** `GET/POST /sources`, `PUT/DELETE /sources/{id}`

**US-15 · Elegir la fuente de una malla**
Como operator, elijo en *Edit mesh* si la malla llega por el broker por defecto o por una de mis fuentes.

- **UI:** select “Source” en *Create mesh* (solo operators) y en `EditMeshDialog` (operator y dueño de la malla). Opciones: “Default broker” + sus fuentes.
- **Envío:** `source_id` solo si cambia (`null` = broker por defecto). 400 en `source_id` se pinta en el campo; 502 = no se movieron las pasarelas y no cambió nada.
- **Lista de mallas:** columna “Source” (“Default broker”, nombre de la fuente, o “—” si la malla no es tuya y la API no expone `source_id`). Visible para operators o si alguna fila tiene fuente. El detalle muestra la fuente en la cabecera si la hay.
- **Contrato:** `PUT /meshes/{mesh_id}`, `GET /sources`

**US-18 · Archivo Parquet**
Como operator, elijo qué dispositivos de mis mallas se guardan a largo plazo y me llevo sus lecturas como ficheros Parquet.

- **Ajuste por dispositivo:** `archive_enabled` en `PUT /devices/{uuid}`; la API solo lo envía (`archive_enabled`, `_at`, `_by`) al dueño de la malla y a superusers, y solo lo acepta en mallas de un operator (400 en `archive_enabled` si no, o si la instancia no tiene archivo). Apagarlo deja de guardar y conserva lo guardado. `ArchiveSettingsDialog` (una casilla y su explicación) se abre desde el icono de archivo (`ArchiveButton`, relleno en acento si está activo): columna “S3 storage” en el inventario de dispositivos y en las tablas de variantes de la ficha (junto a “Alarms”), y en las tarjetas de últimos valores desde el menú “⋯” (`ChannelActionsMenu`: Alarms + S3 storage). Quien no puede archivar ve la campana sola. La ficha muestra “S3 storage: On since …” en Identidad. En la interfaz el ajuste del dispositivo se llama “S3 storage” (“Archive” sonaba a retirar el dispositivo); la página y el menú siguen siendo “Archive”. El inventario tiene un filtro “S3 storage” (On/Off) para operators; los dispositivos cuyo ajuste la API no envía no pasan ninguno de los dos.
- **Página:** `/console/archive` (menú Data, solo operators; la URL directa redirige a mallas). “Your meshes”: una fila por malla propia (superuser: además las que archivan algo) con dispositivos archivados, ficheros, tamaño y última hora. Para la malla elegida (`?mesh=`): sus dispositivos con el ajuste; “Files” con resumen y una fila por día UTC (más reciente primero; 14 días y “Show all”), que se despliega en un botón por hora (el 302 de la API) y descarga el día como un zip. “Download all (ZIP)” baja todo el archivo en un zip; los dos usan `GET /readings/archive/meshes/{id}/zip?start=&stop=`, que la API arma al vuelo con una carpeta por día y cada hora como `YYYY-MM-DD/YYYY-MM-DD_HH.parquet` (el fichero se llama `mesh-<id corto>_<días>.zip`: readings no puede leer la etiqueta de la malla). “Command line” abre un diálogo ancho con las mismas credenciales temporales: DuckDB `COPY` a un único Parquet, o `aws s3 sync` de las carpetas tal cual; “Query with DuckDB”: emite credenciales temporales (se muestran una vez, no se revocan) y rellena un comando DuckDB listo para copiar (path-style y `USE_SSL false` según el endpoint; sin endpoint en AWS). Antes de emitir, el comando lleva marcadores.
- **Instancia sin archivo (lite):** el listado responde 404 y la página lo dice. Sin STS, emitir credenciales responde 404 y se ofrece la descarga por ficheros.
- **Contrato:** `GET /readings/archive/meshes/{id}` (`start`/`stop`), `POST /readings/archive/meshes/{id}/credentials`, `GET /readings/archive/meshes/{id}/partitions/{day}/{hour}` (302). `GET /readings/archive/meshes/{id}/zip` (`start`/`stop`). Mock: `MOCK_ARCHIVE=false` imita lite, `MOCK_ARCHIVE_STS=false` un proveedor sin STS; el enlace firmado apunta a `/mock-s3/…` y descarga un fichero de relleno, no Parquet real.

**US-19 · Destinos (sinks)**
Como operator, publico lecturas de mis mallas en el bróker de la instancia para que un servicio que elijo se suscriba con sus propias credenciales.

- **Ruta:** `/console/sinks`, en el menú “Data” (Sources · Sinks · Archive), solo operators; la URL directa redirige a mallas. Espeja *Sources*.
- **Paso previo (condiciones):** `TermsDialog` con `GET /sinks/terms` antes de cada alta, como en fuentes; el operator es responsable de lo que envía el destino y de a quién da las credenciales. El `POST` lleva `terms_version`.
- **Alta y edición:** `SinkDialog` (grande, dos columnas en escritorio): etiqueta y qué enviar (`decoded`, `derived`, `alarms`, al menos uno; se guardan en ese orden) a la izquierda; a la derecha “Send from”, una sola lista con cada malla que el actor puede editar y sus dispositivos debajo. Marcar la malla la envía entera (todos sus nodos, también los que se unan) y sus dispositivos quedan marcados y deshabilitados (“included with the mesh”); si no, se marcan dispositivos sueltos. Las elecciones sueltas se conservan al marcar y desmarcar la malla, pero no se envían mientras la malla va entera. Al editar, cada lista enviada sustituye la actual; las credenciales no cambian.
- **Credenciales:** el alta y “Issue a new password” (`POST /sinks/{id}/credentials`, desconecta a los consumidores) devuelven la contraseña una sola vez: `SinkCredentialsDialog` muestra broker, usuario, contraseña y filtro de tema, más un `mosquitto_sub` por TLS con sesión persistente (`-i` + `-c`) listo para copiar.
- **Lista:** destino, qué envía, desde cuántas mallas/dispositivos, consumidores conectados ahora (`connections`, “—” si el bróker no responde), estado (“Sending” / “Paused” si caducaron sus condiciones) y “Terms” con “Renew” para quien lo creó. Acciones: editar, nueva contraseña, eliminar.
- **Eliminar:** la API responde 409 con mallas o dispositivos asociados; el diálogo lo dice y ofrece editarlo para desmarcarlos. Eliminar revoca las credenciales.
- **Instancia sin EMQX:** todas las rutas responden 404 y la página lo dice, sin botón de alta.
- **Contrato:** `GET/POST /sinks`, `GET/PUT/DELETE /sinks/{id}`, `POST /sinks/{id}/credentials`, `GET /sinks/terms`, `POST /sinks/{id}/terms-acceptance`. Mock: `MOCK_SINKS=false` imita una instancia sin EMQX; `MOCK_SINKS_BROKER` cambia el `broker` que se muestra. Borrar una malla o un dispositivo lo quita de sus destinos; borrar la cuenta borra sus destinos.

**US-16 · Pedir y conceder el rol operator**
Como member, pido el rol operator explicando para qué; como superuser, lo apruebo o rechazo.

- **Member:** Perfil → “Operator role”: motivo obligatorio, estado de la última petición y nota del superuser. Rechazada → puede volver a pedirlo. 409/429 con su mensaje.
- **Superuser:** pestaña “Requests” (`/console/operator-requests`, pendientes por defecto, filtro por estado) y detalle en `/console/operator-requests/$requestId` (enlace del email). Aprobar/rechazar con nota opcional.
- **Contrato:** `GET/POST /owners/me/operator-request`, `GET /operator-requests`, `GET/PUT /operator-requests/{id}`

**US-17 · Condiciones: cuenta, malla y fuente**
Registrarse no crea mallas, así que las condiciones se aceptan donde empiezan los datos.

- **Registro (cuenta):** `/signup` carga `GET /terms`: solo Condiciones de uso y Política de privacidad (dos casillas), en un bloque plegable cerrado hasta rellenar correo y contraseña, que se abre solo una vez. Envía `terms_version` y `terms_locale`. No caducan; Perfil (“Terms”) y un banner piden aceptarlas de nuevo solo si cambian.
- **Crear malla (malla):** “Create mesh” abre antes `GET /meshes/terms` (responsable del tratamiento, base jurídica, datos sensibles, retención), como “Add source”. Un operator con fuentes elige primero el origen del tráfico: el broker por defecto lleva a las condiciones y luego al formulario; una fuente va directa al formulario con ella preseleccionada, sin condiciones de malla. Si luego cambia a broker por defecto en el formulario, se piden al guardar. El formulario envía `terms_version` y `terms_locale`; en una fuente se aplican las de la fuente. En *Edit mesh*, pasar una malla de una fuente al broker por defecto las pide si la malla no tiene una aceptación vigente.
- **Estado de la malla:** columna “Status” en la lista (y chip en la cabecera de la malla), ordenable de más a menos urgente: *Scheduled for deletion* (rosa: condiciones caducadas, dejó de guardar datos), *Source paused* (rosa), *Source disconnected* (amarillo), *Terms changed* y *Renew soon* (amarillo), *Terms not accepted* (gris: sigue guardando datos), *Source status unknown* (gris), *Active* (lima). “—” para mallas ajenas. En una instancia lite todo es *Active* salvo problemas del puente.
- **Renovar:** el aviso de la página de la malla lleva el botón de renovar para su dueño (`POST /meshes/{id}/terms-acceptance`). Un banner cuenta las mallas propias caducadas.
- **Fuentes:** columnas “Status” y “Terms”; “Renew” para quien creó la fuente cuando está en pausa, caduca pronto o las condiciones cambiaron.
- **Borrado de datos:** borrar una malla, o sacarla de su fuente, avisa de que sus lecturas se borran tras el periodo de gracia.
- **Superuser:** pestaña “Deletions” (`/console/data-deletions`, `GET /data-deletions`): borrados programados por defecto, filtro por estado; los vencidos sin completar salen como “Overdue” con intentos y último error. La cabecera agrupa páginas en menús (`components/nav-menu.tsx`): “Automation” para todos (Alarms, “qué vigilar en cada medida”; Blueprints, “qué calcular a partir de las lecturas entrantes”) y, solo para superusers, “Management” (“Operator requests”, “Scheduled deletions”). Quedan: Meshes · Devices · Automation ▾ · Data ▾ (operators: Sources, Sinks, Archive) · Management ▾. En Management: el disparador muestra el total pendiente y cada elemento su contador (peticiones pendientes, borrados vencidos), ocultos si son cero. En móvil es un encabezado con sus dos enlaces.
- **Instancia lite** (`REGISTRY__TERMS_ENFORCED=false`): la consola lo detecta sola (`GET /terms` responde 404) y oculta todo lo anterior: sin bloque en el registro, sin paso de condiciones al crear malla o fuente, sin paso de origen, sin columna, chips, avisos, banner ni panel. No envía `terms_version`. Si no sabe (cargando o error de red), actúa como si se aplicaran.
- **Contrato:** `docs/openapi.yaml`, sincronizado con la API (ver `plans/sources.md`, “Terms per mesh”).

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
- **Bloques:** identidad (`DeviceRead`) · canales vistos (`GET .../measurements`) · variantes de telemetría (`GET .../telemetry-variants`) · postprocesado (`GET .../postprocessings`: vincular plantilla, conexiones, calibración, arrancar/detener, recalcular histórico)
- **Unidades y nombres de canal:** `GET /measurements` (no hardcodear °C)
- **Contrato:** `GET /devices/{device_uuid}` y nested lists

**US-42 · Plantillas de postprocesado**
Como owner, defino recetas que calculan canales nuevos y las ejecuto en mis devices, cada uno con su calibración.

- **Rutas:** `/console/blueprints` (propias + públicas) y `/console/blueprints/$blueprintId` (versiones, de la más nueva a la más antigua)
- **Editor:** entradas (`slot` + canal por defecto) y pasos ordenados; cada paso elige algoritmo de `GET /algorithms`, qué alimenta cada entrada (`slot:` o `step:<clave>.<salida>`), parámetros de configuración y nombres de salida. Los parámetros `calibration: true` no se piden aquí. Renombrar una entrada o un paso reescribe sus referencias. `draftProblems` replica la validación del backend antes de enviar.
- **Versiones inmutables:** editar solo cambia nombre, descripción y visibilidad; cambiar pasos es “New version”, que parte de la última.
- **En el device (US-22):** vincular (versión, asociación de entradas, prefijo, tolerancia), `problems` a la vista, arrancar/detener, calibración con historial (`valid_from`) y recalcular histórico.
- **Contrato:** ver *Postprocessing blueprints* en el briefing.

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
| `/console/blueprints`, `/console/blueprints/$blueprintId` | US-42 |
| `/console/sources` | US-14, US-15 (operator) |
| `/console/sinks` | US-19 (operator) |
| `/console/archive` | US-18 (operator) |
| `/console/operator-requests`, `/console/operator-requests/$requestId` | US-16 (superuser) |
| `/console/data-deletions` | US-17 (superuser) |

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
| US-43 | Cuenta y rotate-key | Key una sola vez en pantalla |
| US-44 | Borrar mesh/device | No borrar si el deregister del decoder falla |
| US-50–52 | Superuser | Catálogo measurements / telemetry-variants / metrics |

Lecturas por `mesh_id` + `node_id`: la API las tiene; el dashboard usa `device_uuid`.
