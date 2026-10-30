import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCreateRecordatorio,
  validatePatchRecordatorio,
  validateRecordatorioId,
  validateRecordatorioListQuery
} from "../src/validators/recordatorios.validator.js";

test("lista valida filtros y conserva false", () => {
  assert.deepEqual(validateRecordatorioListQuery({
    leido: "false",
    search: "entrega",
    page: "2",
    limit: "10",
    sort: "fechaHora",
    order: "desc"
  }), {
    leido: false,
    search: "entrega",
    sort: "fechaHora",
    order: "desc",
    page: 2,
    limit: 10
  });
});

test("crear normaliza fecha, valores por defecto y texto", () => {
  assert.deepEqual(validateCreateRecordatorio({
    tareaId: "7",
    mensaje: "  Revisar entrega  ",
    fechaHora: "2026-08-21T18:30",
    canal: "in_app"
  }), {
    tareaId: 7,
    mensaje: "Revisar entrega",
    fechaHora: "2026-08-21 18:30:00",
    canal: "in_app",
    leido: false
  });
});

test("PATCH solo devuelve los campos enviados", () => {
  assert.deepEqual(validatePatchRecordatorio({ leido: "true" }), { leido: true });
});

test("rechaza datos fuera del esquema, fechas inválidas y filtros no permitidos", () => {
  assert.throws(() => validateCreateRecordatorio({
    tareaId: 7,
    mensaje: "Aviso",
    fechaHora: "2026-02-30T12:00",
    canal: "email"
  }), { code: "VALIDATION_ERROR" });
  assert.throws(() => validatePatchRecordatorio({ createdAt: "hoy" }), {
    code: "VALIDATION_ERROR"
  });
  assert.throws(() => validateRecordatorioListQuery({ sort: "id_usuario" }), {
    code: "VALIDATION_ERROR"
  });
  assert.throws(() => validateRecordatorioListQuery({ leido: "all" }), {
    code: "VALIDATION_ERROR"
  });
});

test("valida identificadores de recordatorios", () => {
  assert.equal(validateRecordatorioId("12"), 12);
  assert.throws(() => validateRecordatorioId("abc"), { code: "INVALID_ID" });
});
