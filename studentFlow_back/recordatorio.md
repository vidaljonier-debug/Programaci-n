# Aplicativo de recordatorios para StudentFlow

## Objetivo

Desarrollar para StudentFlow una página que permita consultar y administrar los registros de la tabla `recordatorio`. La experiencia debe inspirarse en el listado de materias visto en clase, pero adaptarse a la estructura actual del frontend y del backend del repositorio.

Antes de programar consultas, revisar el DER y los archivos SQL disponibles para confirmar las columnas y relaciones reales. La especificación de partida para `recordatorio` es: `id_recordatorio`, `id_tarea`, `mensaje`, `fecha_hora`, `canal`, `leido` y `created_at`; los canales esperados son `in_app` y `email`. Según el modelo esperado, cada recordatorio pertenece a una tarea y cada tarea a una materia. Si el DER o el SQL difieren, prevalece el esquema real: no inventar columnas ni cambiar la base de datos para ajustarla a este documento.

## Reglas para consultar y modificar datos

- Consultar `recordatorio` junto con `tarea` y `materia` para mostrar el título de la tarea y el nombre de la materia. Confirmar las claves y los campos de unión en el DER/SQL antes de implementar las consultas.
- Todas las consultas deben limitarse al usuario actual. El backend asigna temporalmente `request.user.id = 1` mediante `attachTemporaryUser`; seguir usando `request.user.id` y no aceptar un identificador de usuario enviado por el cliente.
- **Solo se pueden insertar, actualizar o eliminar filas de `recordatorio`.** Las tablas relacionadas —incluidas `tarea` y `materia`— son de solo lectura para esta funcionalidad. No modificar datos ni el esquema de esas tablas.
- Al crear o cambiar un recordatorio, comprobar mediante una consulta de lectura que la tarea exista y pertenezca al usuario actual. No confiar en un `tareaId` enviado por el navegador sin validarlo en el servidor.
- Usar consultas parametrizadas con `pool.execute`, siguiendo el patrón del repositorio. Los campos de `ORDER BY` no se parametrizan: seleccionar la columna desde una lista permitida y nunca concatenar directamente valores del cliente.

## Integración con el proyecto

Mantener la arquitectura existente:

- Backend: añadir ruta, controlador, servicio, repositorio y validador en `studentFlow_back/src`, siguiendo las capas y el manejo de errores de materias.
- Frontend: crear la página en `studentFlow_front/public/recordatorios.html`, su módulo de página en `public/js/pages/recordatorios.js` y las funciones del API en `public/js/api/recordatorios.js`. Reutilizar `request()` de `public/js/api/http.js` y `consultarEstado()` de `public/js/api/health.js`; no duplicar el cliente HTTP.
- Registrar la ruta del backend bajo `/api/v1/recordatorios` en `studentFlow_back/src/app.js`.
- Conservar el formato de respuesta existente `{ success, data, meta? }`, el manejo centralizado de errores y los códigos HTTP del proyecto. El endpoint de estado existente es `GET /api/v1/health`.
- No reemplazar la página actual de prueba de materias; agregar la nueva página sin cambiar el comportamiento existente.

## Interfaz

Crear una pantalla titulada **Listado de recordatorios**, con un diseño coherente con la página actual de StudentFlow y estas operaciones accesibles:

- **Listar**
- **Consultar uno**
- **Crear**
- **Reemplazar**
- **Actualizar campos**
- **Eliminar**
- **Estado del servicio**

La sección **Mis recordatorios** debe mostrar los datos obtenidos desde el API, indicar carga, éxito y error, y permitir actualizar el listado. La tabla debe incluir como mínimo **ID**, **Tarea**, **Materia**, **Mensaje**, **Fecha y hora**, **Canal** y **Leído**.

Mostrar 20 registros por página de forma predeterminada, con paginación cuando existan más resultados. Permitir buscar por mensaje, tarea o materia, filtrar por estado de lectura y ordenar por campos admitidos por el backend. Mostrar el total encontrado y la página actual.

Para crear o editar, ofrecer un selector de tareas cargado desde el servidor que incluya únicamente tareas del usuario actual. Los controles de edición solo deben modificar campos de `recordatorio`; no ofrecer acciones para cambiar la tarea ni la materia. Validar los datos antes de enviarlos y presentar los errores del API sin anunciar éxito cuando la operación falle.

Con los servicios iniciados según `studentFlow_front/README.md`, abrir:

`http://127.0.0.1:5500/recordatorios.html`

El frontend sirve la página en el puerto `5500` de forma predeterminada y reenvía `/api/` al backend; respetar la configuración existente en vez de asumir el puerto `5501`.

## API propuesta

Todas las rutas del recurso parten de `/api/v1/recordatorios`.

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| GET | `/` | Lista recordatorios del usuario actual con búsqueda, filtros, orden y paginación |
| GET | `/tareas` | Lista las tareas propias disponibles para asociar |
| GET | `/:id` | Consulta un recordatorio propio |
| POST | `/` | Crea un recordatorio; responde HTTP 201 |
| PUT | `/:id` | Reemplaza los campos editables del recordatorio |
| PATCH | `/:id` | Actualiza solo los campos enviados |
| DELETE | `/:id` | Elimina únicamente el recordatorio; responde HTTP 204 |

Para listar, admitir `leido=true|false`, `search`, `page` (predeterminado `1`), `limit` (predeterminado `20`, máximo `100`), `sort` (solo campos permitidos, por ejemplo `id`, `mensaje`, `fechaHora`, `canal` y `leido`) y `order=asc|desc`. Usar `fechaHora` ascendente como orden predeterminado si el esquema confirmado lo permite. Devolver los metadatos de paginación mediante `sendSuccess(response, data, 200, meta)`.

Como contrato inicial, POST y PUT reciben `tareaId`, `mensaje` (de 1 a 255 caracteres), `fechaHora` (`YYYY-MM-DDTHH:mm[:ss]`) y `canal` (`in_app` o `email`); `leido` es opcional y por defecto `false`. PATCH recibe uno o más de esos campos. Confirmar longitud, nulabilidad, valores permitidos y nombres reales en el SQL/DER antes de fijar la validación. No permitir modificar `id_recordatorio` ni `created_at`.

Seguir las convenciones del backend para errores: identificadores inválidos, validación, registro inexistente o ajeno y fallos de base de datos deben propagarse al middleware centralizado, sin respuestas que aparenten éxito. Usar `400` para identificadores inválidos, `422` para datos inválidos y `404` cuando el registro o la tarea no exista o no pertenezca al usuario, de acuerdo con los patrones actuales. La eliminación exitosa debe usar `sendNoContent(response)`.

La lista debe conservar la forma `{ success: true, data: [...], meta: { page, limit, total, pages } }`. Cada registro debe devolver campos en camelCase siguiendo el modelo del frontend; como base: `id`, `tareaId`, `tareaTitulo`, `materiaNombre`, `mensaje`, `fechaHora`, `canal`, `leido` y `createdAt`. Ajustar los alias a las columnas confirmadas en el esquema.

Ejemplo inicial de creación:

```http
POST /api/v1/recordatorios
Content-Type: application/json

{
  "tareaId": 12,
  "mensaje": "Revisar los materiales antes de la entrega",
  "fechaHora": "2026-08-21T18:30",
  "canal": "in_app",
  "leido": false
}
```

## Criterios de aceptación

1. La página carga el listado desde el API, muestra hasta 20 registros por página e incluye la tarea y la materia relacionadas.
2. Se puede consultar, crear, reemplazar, actualizar parcialmente y eliminar un recordatorio propio.
3. La búsqueda, el filtro, el orden y la paginación usan solo parámetros admitidos por el backend.
4. El selector presenta tareas del usuario actual y no permite modificar datos de las tablas relacionadas.
5. Las únicas escrituras de base de datos de esta funcionalidad afectan a `recordatorio`; las tablas relacionadas se consultan únicamente.
6. La pantalla consulta `GET /api/v1/health` y muestra los errores de validación, pertenencia, conexión y servicio.
7. El funcionamiento existente de materias y del cliente HTTP se conserva.

## Verificación

- Desde `studentFlow_front`, ejecutar `npm test` para verificar el cliente HTTP existente y añadir pruebas de sus nuevas funciones del API.
- El backend actualmente no define un script `test` en `package.json`. Si se agregan pruebas del backend, hacerlo de acuerdo con las herramientas ya usadas en el proyecto; no documentar `npm test` como disponible hasta que exista ese script.
- Con MySQL y ambos servicios iniciados según `studentFlow_front/README.md`, probar listado, consulta, creación, reemplazo, actualización parcial, eliminación y estado del servicio.
- Revisar las consultas SQL para confirmar que son parametrizadas, aplican la pertenencia al usuario y no escriben en tablas distintas de `recordatorio`.
