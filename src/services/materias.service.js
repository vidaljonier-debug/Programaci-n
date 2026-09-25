import * as materiasRepository from "../repositories/materias.repositorio.js";
import { HttpError } from "../utils/http-error.js";

/**
 * Obtiene las materias de un usuario con filtros y paginación.
 *
 * @async
 * @function listMaterias
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} filters - Filtros y opciones de paginación.
 * @returns {Promise<Object>} Materias encontradas y metadatos de paginación.
 */
export async function listMaterias(userId, filters) {
  const { materias, total } = await materiasRepository.findAllByUserId(userId, filters);

  return {
    data: materias,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit)
    }
  };
}

/**
 * Obtiene una materia perteneciente a un usuario.
 *
 * @async
 * @function getMateriaById
 * @param {string|number} id - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @returns {Promise<Object>} Datos de la materia.
 * @throws {HttpError} Código 404 si la materia no existe o no pertenece al usuario.
 */
export async function getMateriaById(id, userId) {

  const materia = await materiasRepository.findByIdAndUserId(id, userId);

  if (!materia) {
    throw new HttpError(404, "Materia_not_found", "No se encontró la materia con el ID proporcionado para el usuario especificado.");
  }

  return materia;
}

/**
 * Obtiene las tareas asociadas a una materia del usuario.
 *
 * @async
 * @function listTasksByMateriaId
 * @param {string|number} materiaId - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @returns {Promise<Object[]>} Tareas creadas para la materia.
 * @throws {HttpError} Código 404 si la materia no existe o no pertenece al usuario.
 */
export async function listTasksByMateriaId(materiaId, userId) {
  await getMateriaById(materiaId, userId);
  return materiasRepository.findTasksByMateriaIdAndUserId(materiaId, userId);
}

/**
 * Crea una materia para un usuario.
 *
 * @async
 * @function createMateria
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} materia - Datos de la materia.
 * @returns {Promise<Object>} Materia creada.
 * @throws {HttpError} Código 409 si el código o el nombre ya existen.
 */
export async function createMateria(userId, materia) {
  await ensureUniqueFields(userId, materia);
  return materiasRepository.createMateria(userId, materia);
}

/**
 * Valida que el código y el nombre sean únicos para un usuario.
 *
 * @async
 * @function ensureUniqueFields
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} materia - Datos de la materia a validar.
 * @param {string|number} [excludeId] - ID que se excluye durante una actualización.
 * @returns {Promise<void>} No retorna valor si la validación es exitosa.
 * @throws {HttpError} Código 409 (DUPLICATE_CODE) si el código ya existe.
 * @throws {HttpError} Código 409 (DUPLICATE_NAME) si el nombre ya existe.
 */
async function ensureUniqueFields(userId, materia, excludeId) {
  if (materia.codigo) {
    const duplicatedCode = await materiasRepository.existsByCode(userId, materia.codigo, excludeId);

    if (duplicatedCode) {
      throw new HttpError(409, "DUPLICATE_CODE", "Ya existe una materia con ese código.");
    }
  }

  if (materia.nombre) {
    const duplicatedName = await materiasRepository.existsByName(userId, materia.nombre, excludeId);

    if (duplicatedName) {
      throw new HttpError(409, "DUPLICATE_NAME", "Ya existe una materia con ese nombre.");
    }
  }
}

/**
 * Reemplaza completamente una materia existente.
 *
 * @async
 * @function replaceMateria
 * @param {string|number} id - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} materia - Datos completos de la materia.
 * @returns {Promise<Object>} Materia actualizada.
 * @throws {HttpError} Código 404 si la materia no existe.
 * @throws {HttpError} Código 409 si el código o el nombre ya existen.
 */
export async function replaceMateria(id, userId, materia) {
  await getMateriaById(id, userId);
  await ensureUniqueFields(userId, materia, id);
  return materiasRepository.updateMateria(id, userId, materia);
}

/**
 * Actualiza parcialmente una materia existente.
 *
 * @async
 * @function updateMateria
 * @param {string|number} id - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @param {Object} partialMateria - Campos de la materia que se actualizarán.
 * @returns {Promise<Object>} Materia actualizada.
 * @throws {HttpError} Código 404 si la materia no existe.
 * @throws {HttpError} Código 409 si el código o el nombre ya existen.
 */
export async function updateMateria(id, userId, partialMateria) {
  await getMateriaById(id, userId);
  await ensureUniqueFields(userId, partialMateria, id);
  return materiasRepository.patchMateria(id, userId, partialMateria);
}

/**
 * Elimina una materia perteneciente a un usuario.
 *
 * @async
 * @function removeMateria
 * @param {string|number} id - Identificador de la materia.
 * @param {string|number} userId - Identificador del usuario propietario.
 * @returns {Promise<void>} No retorna valor si la eliminación es exitosa.
 * @throws {HttpError} Código 404 si la materia no existe.
 */
export async function removeMateria(id, userId) {
  await getMateriaById(id, userId);
  await materiasRepository.deleteMateria(id, userId);
}

