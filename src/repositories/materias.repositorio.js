import {pool} from "../config/database.js";

const sortableFields = {
    id: "m.id_materia",
    nombre: "m.nombre",
    codigo: "m.codigo",
    creditos: "m.creditos",
    color: "m.color",
    activa: "m.activa",
    createdAt: "m.created_at",
    updatedAt: "m.updated_at"
}

  /**
   * Normaliza el campo y la dirección de ordenamiento usados por la consulta SQL.
   *
   * @param {string} sort - Campo solicitado para ordenar.
   * @param {string} order - Dirección del ordenamiento.
   * @returns {string} Expresión SQL segura para ordenar resultados.
   */
function normalizeSort(sort, order){

    const column = sortableFields[sort] || sortableFields.nombre;
    const direction = String(order).toLowerCase() === "desc" ? "DESC" : "ASC";
    return `${column} ${direction}`;

}

/**
 * Convierte una fila de base de datos al modelo público de materia.
 *
 * @param {Object} row - Fila devuelta por la base de datos.
 * @returns {Object} Materia normalizada.
 */
function mapMateria(row) {
  return {
    id: row.id,
    usuarioId: row.usuarioId,
    nombre: row.nombre,
    codigo: row.codigo,
    creditos: row.creditos,
    color: row.color,
    activa: row.activa,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

/**
 * Busca las materias de un usuario aplicando filtros, orden y paginación.
 *
 * @async
 * @function findAllByUserId
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} [filters={}] - Filtros de búsqueda y paginación.
 * @returns {Promise<{materias: Object[], total: number}>} Materias y total de registros.
 */
export async function findAllByUserId(userId, filters = {}) {

  const conditions = ["m.id_usuario = ?"];
  const params = [userId];

  if (typeof filters.activa === "boolean") {

    conditions.push("m.activa = ?");
    params.push(filters.activa ? 1 : 0);

  }

  if (filters.search) {

    conditions.push("(m.nombre LIKE ? OR m.codigo LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);

  }

  const [countRows] = await pool.execute(

    `SELECT COUNT(*) AS total
     FROM materia m
     WHERE ${conditions.join(" AND ")}`,
    params

  );

  const orderBy = normalizeSort(filters.sort, filters.order);
  const limit = filters.limit;
  const offset = (filters.page - 1) * limit;

  const [rows] = await pool.execute(

    `SELECT
       m.id_materia AS id,
       m.id_usuario AS usuarioId,
       m.nombre,
       m.codigo,
       m.color,
       m.creditos,
       m.activa,
       m.created_at AS createdAt,
       m.updated_at AS updatedAt
     FROM materia m
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]

  );

  return {

    materias: rows.map(mapMateria),
    total: countRows[0].total

  };
}

/**
 * Busca una materia por identificador y usuario propietario.
 *
 * @async
 * @function findByIdAndUserId
 * @param {string|number} id - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @returns {Promise<Object|null>} Materia encontrada o null.
 */
export async function findByIdAndUserId(id, userId) {

  const [rows] = await pool.execute(

    `SELECT
       m.id_materia AS id,
       m.id_usuario AS usuarioId,
       m.nombre,
       m.codigo,
       m.color,
       m.creditos,
       m.activa,
       m.created_at AS createdAt,
       m.updated_at AS updatedAt
     FROM materia m
     WHERE m.id_materia = ? AND m.id_usuario = ?`,

    [id, userId]

  );

  return rows[0] ? mapMateria(rows[0]) : null;
}

/**
 * Obtiene las tareas creadas para una materia perteneciente a un usuario.
 *
 * @async
 * @function findTasksByMateriaIdAndUserId
 * @param {string|number} materiaId - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @returns {Promise<Object[]>} Tareas asociadas a la materia.
 */
export async function findTasksByMateriaIdAndUserId(materiaId, userId) {
  const [rows] = await pool.execute(
    `SELECT t.*
     FROM tarea t
     INNER JOIN materia m ON m.id_materia = t.id_materia
     WHERE t.id_materia = ? AND m.id_usuario = ?
     ORDER BY t.created_at DESC`,
    [materiaId, userId]
  );

  return rows;
}

/**
 * Inserta una materia y devuelve el registro creado.
 *
 * @async
 * @function createMateria
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} materia - Datos de la materia.
 * @returns {Promise<Object>} Materia creada.
 */
export async function createMateria(userId, materia) {
  const [result] = await pool.execute(
    `INSERT INTO materia (id_usuario, nombre, codigo, color, creditos, activa)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      materia.nombre,
      materia.codigo,
      materia.color,
      materia.creditos,
      materia.activa ? 1 : 0
    ]
  );

  return findByIdAndUserId(result.insertId, userId);
}

/**
 * Comprueba si existe un código para un usuario.
 *
 * @async
 * @function existsByCode
 * @param {string|number} userId - Identificador del usuario.
 * @param {string} codigo - Código que se desea comprobar.
 * @param {string|number} [excludeId] - ID que se excluye de la comprobación.
 * @returns {Promise<boolean>} true si el código ya existe.
 */
export async function existsByCode(userId, codigo, excludeId) {
  const params = [userId, codigo];
  let sql = "SELECT 1 FROM materia WHERE id_usuario = ? AND codigo = ?";

  if (excludeId) {
    sql += " AND id_materia <> ?";
    params.push(excludeId);
  }

  sql += " LIMIT 1";

  const [rows] = await pool.execute(sql, params);
  return rows.length > 0;
}

/**
 * Comprueba si existe un nombre para un usuario.
 *
 * @async
 * @function existsByName
 * @param {string|number} userId - Identificador del usuario.
 * @param {string} nombre - Nombre que se desea comprobar.
 * @param {string|number} [excludeId] - ID que se excluye de la comprobación.
 * @returns {Promise<boolean>} true si el nombre ya existe.
 */
export async function existsByName(userId, nombre, excludeId) {
  const params = [userId, nombre];
  let sql = "SELECT 1 FROM materia WHERE id_usuario = ? AND nombre = ?";

  if (excludeId) {
    sql += " AND id_materia <> ?";
    params.push(excludeId);
  }

  sql += " LIMIT 1";

  const [rows] = await pool.execute(sql, params);
  return rows.length > 0;
}

/**
 * Actualiza parcialmente una materia.
 *
 * @async
 * @function patchMateria
 * @param {string|number} id - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} partialMateria - Campos que se actualizarán.
 * @returns {Promise<Object>} Materia actualizada.
 */
export async function patchMateria(id, userId, partialMateria) {
  const fields = [];
  const params = [];

  if (partialMateria.nombre !== undefined) {
    fields.push("nombre = ?");
    params.push(partialMateria.nombre);
  }

  if (partialMateria.codigo !== undefined) {
    fields.push("codigo = ?");
    params.push(partialMateria.codigo);
  }

  if (partialMateria.color !== undefined) {
    fields.push("color = ?");
    params.push(partialMateria.color);
  }

  if (partialMateria.creditos !== undefined) {
    fields.push("creditos = ?");
    params.push(partialMateria.creditos);
  }

  if (partialMateria.activa !== undefined) {
    fields.push("activa = ?");
    params.push(partialMateria.activa ? 1 : 0);
  }

  if (fields.length === 0) {
    return findByIdAndUserId(id, userId);
  }

  params.push(id, userId);

  await pool.execute(
    `UPDATE materia
     SET ${fields.join(", ")}
     WHERE id_materia = ? AND id_usuario = ?`,
    params
  );

  return findByIdAndUserId(id, userId);
}

/**
 * Elimina una materia de un usuario.
 *
 * @async
 * @function deleteMateria
 * @param {string|number} id - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @returns {Promise<boolean>} true si se eliminó una materia.
 */
export async function deleteMateria(id, userId) {
  const [result] = await pool.execute(
    "DELETE FROM materia WHERE id_materia = ? AND id_usuario = ?",
    [id, userId]
  );

  return result.affectedRows > 0;
}

/**
 * Reemplaza todos los campos de una materia.
 *
 * @async
 * @function updateMateria
 * @param {string|number} id - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} materia - Datos completos de la materia.
 * @returns {Promise<Object>} Materia actualizada.
 */
export async function updateMateria(id, userId, materia) {
  await pool.execute(
    `UPDATE materia
     SET nombre = ?, codigo = ?, color = ?, creditos = ?, activa = ?
     WHERE id_materia = ? AND id_usuario = ?`,
    [
      materia.nombre,
      materia.codigo,
      materia.color,
      materia.creditos,
      materia.activa ? 1 : 0,
      id,
      userId
    ]
  );

  return findByIdAndUserId(id, userId);
}