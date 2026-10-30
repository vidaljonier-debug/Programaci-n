import { pool } from "../config/database.js";

const sortableFields = {
  id: "r.id_recordatorio",
  mensaje: "r.mensaje",
  fechaHora: "r.fecha_hora",
  canal: "r.canal",
  leido: "r.leido"
};

function normalizeSort(sort, order) {
  const column = sortableFields[sort] || sortableFields.fechaHora;
  const direction = String(order).toLowerCase() === "desc" ? "DESC" : "ASC";
  return `${column} ${direction}`;
}

function mapRecordatorio(row) {
  return {
    id: row.id,
    tareaId: row.tareaId,
    tareaTitulo: row.tareaTitulo,
    materiaNombre: row.materiaNombre,
    mensaje: row.mensaje,
    fechaHora: row.fechaHora,
    canal: row.canal,
    leido: Boolean(row.leido),
    createdAt: row.createdAt
  };
}

const recordatorioSelect = `SELECT
    r.id_recordatorio AS id,
    r.id_tarea AS tareaId,
    t.titulo AS tareaTitulo,
    m.nombre AS materiaNombre,
    r.mensaje,
    DATE_FORMAT(r.fecha_hora, '%Y-%m-%dT%H:%i:%s') AS fechaHora,
    r.canal,
    r.leido,
    DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt
  FROM recordatorio r
  INNER JOIN tarea t ON t.id_tarea = r.id_tarea
  INNER JOIN materia m ON m.id_materia = t.id_materia`;

export async function findAllByUserId(userId, filters) {
  const conditions = ["m.id_usuario = ?"];
  const params = [userId];

  if (typeof filters.leido === "boolean") {
    conditions.push("r.leido = ?");
    params.push(filters.leido ? 1 : 0);
  }

  if (filters.search) {
    conditions.push("(r.mensaje LIKE ? OR t.titulo LIKE ? OR m.nombre LIKE ?)");
    const search = `%${filters.search}%`;
    params.push(search, search, search);
  }

  const where = conditions.join(" AND ");
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM recordatorio r
     INNER JOIN tarea t ON t.id_tarea = r.id_tarea
     INNER JOIN materia m ON m.id_materia = t.id_materia
     WHERE ${where}`,
    params
  );

  const limit = filters.limit;
  const offset = (filters.page - 1) * limit;
  const [rows] = await pool.execute(
    `${recordatorioSelect}
     WHERE ${where}
     ORDER BY ${normalizeSort(filters.sort, filters.order)}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    recordatorios: rows.map(mapRecordatorio),
    total: Number(countRows[0].total)
  };
}

export async function findByIdAndUserId(id, userId) {
  const [rows] = await pool.execute(
    `${recordatorioSelect}
     WHERE r.id_recordatorio = ? AND m.id_usuario = ?`,
    [id, userId]
  );
  return rows[0] ? mapRecordatorio(rows[0]) : null;
}

export async function findTasksByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT
       t.id_tarea AS id,
       t.titulo,
       t.fecha_entrega AS fechaEntrega,
       m.nombre AS materiaNombre
     FROM tarea t
     INNER JOIN materia m ON m.id_materia = t.id_materia
     WHERE m.id_usuario = ?
     ORDER BY t.fecha_entrega ASC, t.titulo ASC`,
    [userId]
  );
  return rows;
}

export async function taskBelongsToUser(tareaId, userId) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM tarea t
     INNER JOIN materia m ON m.id_materia = t.id_materia
     WHERE t.id_tarea = ? AND m.id_usuario = ?
     LIMIT 1`,
    [tareaId, userId]
  );
  return rows.length > 0;
}

export async function createRecordatorio(userId, recordatorio) {
  const [result] = await pool.execute(
    `INSERT INTO recordatorio (id_tarea, mensaje, fecha_hora, canal, leido)
     SELECT ?, ?, ?, ?, ?
     FROM tarea t
     INNER JOIN materia m ON m.id_materia = t.id_materia
     WHERE t.id_tarea = ? AND m.id_usuario = ?`,
    [
      recordatorio.tareaId,
      recordatorio.mensaje,
      recordatorio.fechaHora,
      recordatorio.canal,
      recordatorio.leido ? 1 : 0,
      recordatorio.tareaId,
      userId
    ]
  );
  return result.affectedRows ? findByIdAndUserId(result.insertId, userId) : null;
}

export async function updateRecordatorio(id, userId, recordatorio) {
  const columns = {
    tareaId: "id_tarea",
    mensaje: "mensaje",
    fechaHora: "fecha_hora",
    canal: "canal",
    leido: "leido"
  };
  const fields = [];
  const params = [];

  for (const [field, column] of Object.entries(columns)) {
    if (recordatorio[field] !== undefined) {
      fields.push(`r.${column} = ?`);
      params.push(field === "leido" ? (recordatorio[field] ? 1 : 0) : recordatorio[field]);
    }
  }

  params.push(id, userId);
  const [result] = await pool.execute(
    `UPDATE recordatorio r
     INNER JOIN tarea t ON t.id_tarea = r.id_tarea
     INNER JOIN materia m ON m.id_materia = t.id_materia
     SET ${fields.join(", ")}
     WHERE r.id_recordatorio = ? AND m.id_usuario = ?`,
    params
  );

  return findByIdAndUserId(id, userId);
}

export async function deleteRecordatorio(id, userId) {
  const [result] = await pool.execute(
    `DELETE r
     FROM recordatorio r
     INNER JOIN tarea t ON t.id_tarea = r.id_tarea
     INNER JOIN materia m ON m.id_materia = t.id_materia
     WHERE r.id_recordatorio = ? AND m.id_usuario = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}
