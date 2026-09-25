import * as materiasService from "../services/materias.service.js";
import { sendNoContent, sendSuccess } from "../utils/api-response.js";

import {
    validateCreateMateria,
    validateMateriaListQuery,
    validateMateriaId,
    validatePatchMateria
} from "../validators/materias.validator.js";

/**
 * Atiende la consulta paginada de materias del usuario autenticado.
 *
 * @async
 * @function listMaterias
 * @param {import("express").Request} request - Solicitud HTTP.
 * @param {import("express").Response} response - Respuesta HTTP.
 * @param {import("express").NextFunction} next - Siguiente middleware.
 * @returns {Promise<import("express").Response|void>} Respuesta con las materias.
 */
export async function listMaterias(request, response, next) {
  try {
    const filters = validateMateriaListQuery(request.query);
    const result = await materiasService.listMaterias(request.user.id, filters);
    return sendSuccess(response, result.data, 200, result.meta);
  } catch (error) {
    return next(error);
  }
}

/**
 * Atiende la consulta de una materia por su identificador.
 *
 * @async
 * @function getMateriaById
 * @param {import("express").Request} request - Solicitud HTTP.
 * @param {import("express").Response} response - Respuesta HTTP.
 * @param {import("express").NextFunction} next - Siguiente middleware.
 * @returns {Promise<import("express").Response|void>} Respuesta con la materia.
 */
export async function getMateriaById(request, response, next) {
  try {

    const id  = validateMateriaId(request.params.id);
    const materia = await materiasService.getMateriaById(id, request.user.id);
    return sendSuccess(response, materia)

  } catch (error) {
    return next(error);
  }
}

/**
 * Atiende la consulta de las tareas de una materia.
 *
 * @async
 * @function listTasksByMateriaId
 * @param {import("express").Request} request - Solicitud HTTP.
 * @param {import("express").Response} response - Respuesta HTTP.
 * @param {import("express").NextFunction} next - Siguiente middleware.
 * @returns {Promise<import("express").Response|void>} Respuesta con las tareas.
 */
export async function listTasksByMateriaId(request, response, next) {
  try {
    const materiaId = validateMateriaId(request.params.id);
    const tareas = await materiasService.listTasksByMateriaId(materiaId, request.user.id);
    return sendSuccess(response, tareas);
  } catch (error) {
    return next(error);
  }
}

/**
 * Atiende la creación de una materia.
 *
 * @async
 * @function createMateria
 * @param {import("express").Request} request - Solicitud HTTP.
 * @param {import("express").Response} response - Respuesta HTTP.
 * @param {import("express").NextFunction} next - Siguiente middleware.
 * @returns {Promise<import("express").Response|void>} Respuesta con la materia creada.
 */
export async function createMateria(request, response, next) {
  try {
    const payload = validateCreateMateria(request.body);
    const materia = await materiasService.createMateria(request.user.id, payload);
    return sendSuccess(response, materia, 201);
  } catch (error) {
    return next(error);
  }
}

/**
 * Atiende el reemplazo completo de una materia.
 *
 * @async
 * @function replaceMateria
 * @param {import("express").Request} request - Solicitud HTTP.
 * @param {import("express").Response} response - Respuesta HTTP.
 * @param {import("express").NextFunction} next - Siguiente middleware.
 * @returns {Promise<import("express").Response|void>} Respuesta con la materia actualizada.
 */
export async function replaceMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const payload = validateCreateMateria(request.body);
    const materia = await materiasService.replaceMateria(id, request.user.id, payload);
    return sendSuccess(response, materia);
  } catch (error) {
    return next(error);
  }
}

/**
 * Atiende la actualización parcial de una materia.
 *
 * @async
 * @function updateMateria
 * @param {import("express").Request} request - Solicitud HTTP.
 * @param {import("express").Response} response - Respuesta HTTP.
 * @param {import("express").NextFunction} next - Siguiente middleware.
 * @returns {Promise<import("express").Response|void>} Respuesta con la materia actualizada.
 */
export async function updateMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const payload = validatePatchMateria(request.body);
    const materia = await materiasService.updateMateria(id, request.user.id, payload);
    return sendSuccess(response, materia);
  } catch (error) {
    return next(error);
  }
}

/**
 * Atiende la eliminación de una materia.
 *
 * @async
 * @function deleteMateria
 * @param {import("express").Request} request - Solicitud HTTP.
 * @param {import("express").Response} response - Respuesta HTTP.
 * @param {import("express").NextFunction} next - Siguiente middleware.
 * @returns {Promise<import("express").Response|void>} Respuesta HTTP 204.
 */
export async function deleteMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    await materiasService.removeMateria(id, request.user.id);
    return sendNoContent(response);
  } catch (error) {
    return next(error);
  }
}