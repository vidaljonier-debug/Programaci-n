# Endpoint de eventos por materia

## Objetivo

Agregar `GET /api/v1/materias/:id/eventos` para consultar los eventos de una materia que pertenece al usuario autenticado.

## Procedimiento de los cambios

Los cambios siguen el flujo que ya utiliza el endpoint de tareas por materia:

1. **Registrar la ruta** en `src/routes/materias.routes.js`. Se importa `listEventosByMateria` desde el controlador y se registra `router.get("/:id/eventos", listEventosByMateria)`.
2. **Validar y atender la solicitud** en `src/controllers/materias.controller.js`. El controlador valida `request.params.id` con `validateMateriaId`, toma el identificador del usuario desde `request.user.id`, llama al servicio y responde con `sendSuccess(response, eventos)`. Los errores se propagan con `next(error)`.
3. **Aplicar la lógica de servicio** en `src/services/materias.service.js`. Primero se invoca `getMateriaById(id, userId)` para verificar que la materia exista y pertenezca al usuario. Si no existe o no es del usuario, se propaga el error 404. Luego se llama al repositorio.
4. **Consultar MySQL** en `src/repositories/materias.repositorio.js`. La función `findEventosByMateriaAndUserId` usa `pool.execute`, une `evento` con `materia` y filtra por `m.id_materia` y `m.id_usuario` con parámetros. Devuelve el arreglo `rows`.

## Consulta del repositorio

La consulta selecciona las columnas disponibles para esta implementación y usa alias camelCase para el resultado:

```sql
SELECT
  e.id_evento AS id,
  e.id_materia AS materiaId,
  e.hora_inicio AS horaInicio
FROM evento e
INNER JOIN materia m ON m.id_materia = e.id_materia
WHERE m.id_materia = ? AND m.id_usuario = ?
```

Los valores se envían como parámetros `[id, userId]`; no se interpolan directamente en el SQL. El repositorio retorna todas las filas coincidentes, por lo que si la materia no tiene eventos devuelve `[]`.

## Respuesta

Cuando la solicitud es válida, la respuesta mantiene el formato de `sendSuccess`:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "materiaId": 2,
      "horaInicio": "09:00:00"
    }
  ]
}
```

El ejemplo ilustra la estructura; los valores dependen de los registros almacenados en la base de datos. Para un identificador inválido se utiliza la validación existente de materias. Para una materia inexistente o que pertenezca a otro usuario, el servicio responde mediante el manejo centralizado del error 404.

## Archivos involucrados

- `src/routes/materias.routes.js`
- `src/controllers/materias.controller.js`
- `src/services/materias.service.js`
- `src/repositories/materias.repositorio.js`
