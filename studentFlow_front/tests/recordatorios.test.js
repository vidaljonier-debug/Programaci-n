import test from "node:test";
import assert from "node:assert/strict";
import {
  actualizarRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  listarRecordatorios,
  listarTareasRecordatorio,
  obtenerRecordatorio,
  reemplazarRecordatorio
} from "../public/js/api/recordatorios.js";

test("las funciones de recordatorios usan rutas y métodos esperados", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, ...options });
    return options.method === "DELETE"
      ? new Response(null, { status: 204 })
      : Response.json({ success: true, data: [] });
  });

  await listarRecordatorios({ leido: false, page: 2 });
  await listarTareasRecordatorio();
  await obtenerRecordatorio(12);
  await crearRecordatorio({ tareaId: 7 });
  await reemplazarRecordatorio(12, { tareaId: 7 });
  await actualizarRecordatorio(12, { leido: true });
  assert.equal(await eliminarRecordatorio(12), null);

  assert.deepEqual(calls.map(({ url, method }) => [method, url]), [
    ["GET", "/api/v1/recordatorios?leido=false&page=2"],
    ["GET", "/api/v1/recordatorios/tareas"],
    ["GET", "/api/v1/recordatorios/12"],
    ["POST", "/api/v1/recordatorios"],
    ["PUT", "/api/v1/recordatorios/12"],
    ["PATCH", "/api/v1/recordatorios/12"],
    ["DELETE", "/api/v1/recordatorios/12"]
  ]);
  assert.deepEqual(JSON.parse(calls[5].body), { leido: true });
});

test("los IDs no válidos no generan solicitudes", t => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => {
    throw new Error("No debería llamarse");
  });
  for (const id of [0, -1, "abc", "", "1/2", 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => obtenerRecordatorio(id), TypeError);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
