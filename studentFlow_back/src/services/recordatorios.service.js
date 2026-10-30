import * as recordatoriosRepository from "../repositories/recordatorios.repositorio.js";
import { HttpError } from "../utils/http-error.js";

export async function listRecordatorios(userId, filters) {
  const { recordatorios, total } = await recordatoriosRepository.findAllByUserId(userId, filters);
  return {
    data: recordatorios,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit)
    }
  };
}

export async function listTareas(userId) {
  return recordatoriosRepository.findTasksByUserId(userId);
}

export async function getRecordatorio(id, userId) {
  const recordatorio = await recordatoriosRepository.findByIdAndUserId(id, userId);
  if (!recordatorio) {
    throw new HttpError(404, "RECORDATORIO_NOT_FOUND", "No se encontró el recordatorio para el usuario actual.");
  }
  return recordatorio;
}

async function ensureTaskBelongsToUser(tareaId, userId) {
  if (!await recordatoriosRepository.taskBelongsToUser(tareaId, userId)) {
    throw new HttpError(404, "TASK_NOT_FOUND", "La tarea no existe o no pertenece al usuario actual.");
  }
}

export async function createRecordatorio(userId, payload) {
  await ensureTaskBelongsToUser(payload.tareaId, userId);
  const created = await recordatoriosRepository.createRecordatorio(userId, payload);
  if (!created) {
    throw new HttpError(404, "TASK_NOT_FOUND", "La tarea no existe o no pertenece al usuario actual.");
  }
  return created;
}

export async function replaceRecordatorio(id, userId, payload) {
  await getRecordatorio(id, userId);
  await ensureTaskBelongsToUser(payload.tareaId, userId);
  await recordatoriosRepository.updateRecordatorio(id, userId, payload);
  return getRecordatorio(id, userId);
}

export async function updateRecordatorio(id, userId, payload) {
  await getRecordatorio(id, userId);
  if (payload.tareaId !== undefined) {
    await ensureTaskBelongsToUser(payload.tareaId, userId);
  }
  await recordatoriosRepository.updateRecordatorio(id, userId, payload);
  return getRecordatorio(id, userId);
}

export async function removeRecordatorio(id, userId) {
  await getRecordatorio(id, userId);
  const deleted = await recordatoriosRepository.deleteRecordatorio(id, userId);
  if (!deleted) {
    throw new HttpError(404, "RECORDATORIO_NOT_FOUND", "No se encontró el recordatorio para el usuario actual.");
  }
}
