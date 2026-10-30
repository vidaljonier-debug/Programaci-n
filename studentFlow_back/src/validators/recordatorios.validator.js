import { HttpError } from "../utils/http-error.js";

const editableFields = new Set(["tareaId", "mensaje", "fechaHora", "canal", "leido"]);

function invalid(message) {
  throw new HttpError(422, "VALIDATION_ERROR", message);
}

function parseBoolean(value, fieldName) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return invalid(`El campo '${fieldName}' debe ser true o false.`);
}

function parseId(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return invalid(`El campo '${fieldName}' debe ser un entero mayor que cero.`);
  }
  return parsed;
}

function parseMessage(value) {
  if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 255) {
    return invalid("El mensaje debe tener entre 1 y 255 caracteres.");
  }
  return value.trim();
}

function parseDateTime(value) {
  if (typeof value !== "string") {
    return invalid("La fecha y hora debe tener formato YYYY-MM-DDTHH:mm[:ss].");
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    return invalid("La fecha y hora debe tener formato YYYY-MM-DDTHH:mm[:ss].");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "00"] = match;
  const [year, month, day, hour, minute, second] = [
    yearText, monthText, dayText, hourText, minuteText, secondText
  ].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59
  ) {
    return invalid("La fecha y hora no es válida.");
  }

  return `${yearText}-${monthText}-${dayText} ${hourText}:${minuteText}:${secondText}`;
}

function parseEditableField(field, value) {
  switch (field) {
    case "tareaId":
      return parseId(value, field);
    case "mensaje":
      return parseMessage(value);
    case "fechaHora":
      return parseDateTime(value);
    case "canal":
      if (value !== "in_app" && value !== "email") {
        return invalid("El canal debe ser 'in_app' o 'email'.");
      }
      return value;
    case "leido":
      return parseBoolean(value, field);
    default:
      return undefined;
  }
}

function validateBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalid("El cuerpo de la solicitud debe ser un objeto JSON.");
  }

  for (const field of Object.keys(body)) {
    if (!editableFields.has(field)) {
      return invalid(`El campo '${field}' no se puede modificar.`);
    }
  }
  return body;
}

export function validateRecordatorioListQuery(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1) {
    return invalid("El parámetro 'page' debe ser un entero mayor o igual a 1.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return invalid("El parámetro 'limit' debe ser un entero entre 1 y 100.");
  }
  if (query.sort !== undefined && !["id", "mensaje", "fechaHora", "canal", "leido"].includes(query.sort)) {
    return invalid("El parámetro 'sort' no es válido.");
  }
  if (query.order !== undefined && !["asc", "desc"].includes(String(query.order).toLowerCase())) {
    return invalid("El parámetro 'order' debe ser asc o desc.");
  }

  let leido;
  if (query.leido !== undefined) {
    leido = parseBoolean(query.leido, "leido");
  }
  return {
    leido,
    search: typeof query.search === "string" ? query.search.trim() : "",
    sort: query.sort || "fechaHora",
    order: String(query.order || "asc").toLowerCase(),
    page,
    limit
  };
}

export function validateRecordatorioId(id) {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new HttpError(400, "INVALID_ID", "El identificador de recordatorio no es válido.");
  }
  return parsed;
}

export function validateCreateRecordatorio(body) {
  const input = validateBody(body);
  for (const field of ["tareaId", "mensaje", "fechaHora", "canal"]) {
    if (input[field] === undefined) {
      return invalid(`El campo '${field}' es obligatorio.`);
    }
  }
  return {
    tareaId: parseEditableField("tareaId", input.tareaId),
    mensaje: parseEditableField("mensaje", input.mensaje),
    fechaHora: parseEditableField("fechaHora", input.fechaHora),
    canal: parseEditableField("canal", input.canal),
    leido: input.leido === undefined ? false : parseEditableField("leido", input.leido)
  };
}

export function validatePatchRecordatorio(body) {
  const input = validateBody(body);
  const fields = Object.keys(input);
  if (!fields.length) {
    return invalid("Envía al menos un campo válido para actualizar.");
  }
  return Object.fromEntries(fields.map(field => [field, parseEditableField(field, input[field])]));
}
