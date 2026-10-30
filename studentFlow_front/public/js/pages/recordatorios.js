import { consultarEstado } from "../api/health.js";
import {
  actualizarRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  listarRecordatorios,
  listarTareasRecordatorio,
  obtenerRecordatorio,
  reemplazarRecordatorio
} from "../api/recordatorios.js";

const listStatus = document.querySelector("#list-status");
const formStatus = document.querySelector("#form-status");
const form = document.querySelector("#recordatorio-form");
const taskSelect = document.querySelector("#task-id");
const reminderId = document.querySelector("#recordatorio-id");
const recordatoriosBody = document.querySelector("#recordatorios-body");
const pageSummary = document.querySelector("#page-summary");
const pageSize = 20;
let currentPage = 1;
let totalPages = 1;
let currentRecords = new Map();

function setStatus(element, type, message) {
  element.dataset.type = type;
  element.textContent = message;
}

function clearStatus(element) {
  element.dataset.type = "";
  element.textContent = "";
}

function toLocalDateTime(value) {
  return String(value || "").replace(" ", "T").slice(0, 16);
}

function formatDateTime(value) {
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

async function loadTasks() {
  try {
    const response = await listarTareasRecordatorio();
    taskSelect.replaceChildren(new Option("Selecciona una tarea", ""));
    for (const tarea of response.data) {
      const option = new Option(
        `${tarea.titulo} · ${tarea.materiaNombre} · entrega ${String(tarea.fechaEntrega).slice(0, 10)}`,
        String(tarea.id)
      );
      taskSelect.add(option);
    }
    if (!response.data.length) {
      setStatus(formStatus, "error", "No hay tareas propias disponibles para asociar.");
    }
  } catch (error) {
    setStatus(formStatus, "error", `No se pudieron cargar las tareas: ${error.message}`);
  }
}

async function loadRecordatorios() {
  setStatus(listStatus, "loading", "Cargando recordatorios…");
  const query = {
    search: document.querySelector("#search-filter").value.trim(),
    page: currentPage,
    limit: pageSize,
    sort: document.querySelector("#sort-filter").value,
    order: document.querySelector("#order-filter").value
  };
  const leido = document.querySelector("#read-filter").value;
  if (leido !== "") query.leido = leido;

  try {
    const response = await listarRecordatorios(query);
    currentRecords = new Map(response.data.map(recordatorio => [String(recordatorio.id), recordatorio]));
    totalPages = Math.max(response.meta?.pages || 1, 1);
    currentPage = response.meta?.page || currentPage;
    renderRecordatorios(response.data);
    const total = response.meta?.total ?? response.data.length;
    pageSummary.textContent = `Mostrando ${response.data.length} de ${total} recordatorios. Página ${currentPage} de ${totalPages}.`;
    document.querySelector("#previous-page").disabled = currentPage <= 1;
    document.querySelector("#next-page").disabled = currentPage >= totalPages;
    setStatus(listStatus, "success", "Recordatorios consultados correctamente.");
  } catch (error) {
    currentRecords.clear();
    recordatoriosBody.replaceChildren();
    pageSummary.textContent = "No fue posible cargar el listado.";
    document.querySelector("#previous-page").disabled = true;
    document.querySelector("#next-page").disabled = true;
    setStatus(listStatus, "error", `No se pudieron consultar los recordatorios: ${error.message}`);
  }
}

function addCell(row, value, className) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = value;
  row.append(cell);
  return cell;
}

function renderRecordatorios(items) {
  recordatoriosBody.replaceChildren();
  for (const item of items) {
    const row = document.createElement("tr");
    addCell(row, String(item.id));
    addCell(row, item.tareaTitulo || "");
    addCell(row, item.materiaNombre || "");
    addCell(row, item.mensaje, "message-cell");
    addCell(row, formatDateTime(item.fechaHora));
    addCell(row, item.canal === "in_app" ? "Aplicación" : "Correo");
    addCell(row, item.leido ? "Sí" : "No");
    const actions = document.createElement("td");
    actions.className = "row-actions";
    for (const [action, label, style] of [
      ["consult", "Consultar", "secondary"],
      ["edit", "Editar", "secondary"],
      ["delete", "Eliminar", "danger"]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = style;
      button.dataset.action = action;
      button.dataset.id = item.id;
      button.textContent = label;
      actions.append(button);
    }
    row.append(actions);
    recordatoriosBody.append(row);
  }

  if (!items.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "muted";
    cell.textContent = "No se encontraron recordatorios con esos criterios.";
    row.append(cell);
    recordatoriosBody.append(row);
  }
}

function setEditMode(recordatorio) {
  reminderId.value = recordatorio.id;
  taskSelect.value = String(recordatorio.tareaId);
  document.querySelector("#reminder-message").value = recordatorio.mensaje;
  document.querySelector("#reminder-date").value = toLocalDateTime(recordatorio.fechaHora);
  document.querySelector("#reminder-channel").value = recordatorio.canal;
  document.querySelector("#reminder-read").checked = recordatorio.leido;
  document.querySelector("#form-title").textContent = `Editar recordatorio #${recordatorio.id}`;
  document.querySelector("#form-help").textContent = "PUT reemplaza todos los campos; PATCH modifica solo los campos marcados.";
  document.querySelector("#save-button").textContent = "Reemplazar recordatorio (PUT)";
  document.querySelector("#patch-button").hidden = false;
  document.querySelector("#new-button").hidden = false;
  document.querySelector("#patch-help").hidden = false;
  document.querySelectorAll(".patch-option").forEach(option => { option.hidden = false; });
  document.querySelectorAll("[data-patch-field]").forEach(input => { input.checked = false; });
  clearStatus(formStatus);
}

function resetForm() {
  form.reset();
  reminderId.value = "";
  document.querySelector("#form-title").textContent = "Crear recordatorio";
  document.querySelector("#form-help").textContent = "Los datos se guardan en la tabla de recordatorios.";
  document.querySelector("#save-button").textContent = "Crear recordatorio";
  document.querySelector("#patch-button").hidden = true;
  document.querySelector("#new-button").hidden = true;
  document.querySelector("#patch-help").hidden = true;
  document.querySelectorAll(".patch-option").forEach(option => { option.hidden = true; });
  clearStatus(formStatus);
}

function readFormPayload() {
  const taskId = Number(taskSelect.value);
  if (!Number.isSafeInteger(taskId) || taskId < 1) {
    throw new Error("Selecciona una tarea propia.");
  }
  const message = document.querySelector("#reminder-message").value.trim();
  if (!message || message.length > 255) {
    throw new Error("El mensaje debe tener entre 1 y 255 caracteres.");
  }
  const dateTime = document.querySelector("#reminder-date").value;
  if (!dateTime) throw new Error("Indica la fecha y hora del recordatorio.");
  return {
    tareaId: taskId,
    mensaje: message,
    fechaHora: dateTime,
    canal: document.querySelector("#reminder-channel").value,
    leido: document.querySelector("#reminder-read").checked
  };
}

async function submitForm(event) {
  event.preventDefault();
  try {
    const payload = readFormPayload();
    const id = reminderId.value;
    let successMessage;
    if (id) {
      await reemplazarRecordatorio(id, payload);
      successMessage = `Recordatorio #${id} reemplazado correctamente.`;
    } else {
      const response = await crearRecordatorio(payload);
      successMessage = `Recordatorio #${response.data.id} creado correctamente.`;
    }
    resetForm();
    setStatus(formStatus, "success", successMessage);
    await loadRecordatorios();
  } catch (error) {
    setStatus(formStatus, "error", error.message);
  }
}

async function patchRecordatorio() {
  try {
    const id = reminderId.value;
    if (!id) throw new Error("Selecciona un recordatorio de la tabla antes de actualizar.");
    const values = readFormPayload();
    const changes = {};
    for (const input of document.querySelectorAll("[data-patch-field]:checked")) {
      changes[input.dataset.patchField] = values[input.dataset.patchField];
    }
    if (!Object.keys(changes).length) {
      throw new Error("Marca “Aplicar” en al menos un campo para enviar PATCH.");
    }
    await actualizarRecordatorio(id, changes);
    resetForm();
    setStatus(formStatus, "success", `Los campos seleccionados del recordatorio #${id} se actualizaron.`);
    await loadRecordatorios();
  } catch (error) {
    setStatus(formStatus, "error", error.message);
  }
}

async function consultRecordatorio(id) {
  setStatus(document.querySelector("#consult-status"), "loading", "Consultando recordatorio…");
  try {
    const response = await obtenerRecordatorio(id);
    document.querySelector("#consult-id").value = response.data.id;
    document.querySelector("#consult-result").textContent = JSON.stringify(response.data, null, 2);
    setStatus(document.querySelector("#consult-status"), "success", "Recordatorio consultado correctamente.");
    document.querySelector("#consulta").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    document.querySelector("#consult-result").textContent = "";
    setStatus(document.querySelector("#consult-status"), "error", error.message);
  }
}

document.querySelector("#filters-form").addEventListener("submit", event => {
  event.preventDefault();
  currentPage = 1;
  void loadRecordatorios();
});
document.querySelector("#refresh-button").addEventListener("click", () => void loadRecordatorios());
document.querySelector("#previous-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    void loadRecordatorios();
  }
});
document.querySelector("#next-page").addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    void loadRecordatorios();
  }
});
form.addEventListener("submit", submitForm);
document.querySelector("#patch-button").addEventListener("click", patchRecordatorio);
document.querySelector("#new-button").addEventListener("click", resetForm);
document.querySelector("#health-button").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const response = await consultarEstado();
    setStatus(listStatus, "success", `Servicio disponible; base de datos ${response.data.database}.`);
  } catch (error) {
    setStatus(listStatus, "error", `Estado del servicio: ${error.message}`);
  } finally {
    button.disabled = false;
  }
});
document.querySelector("#consult-form").addEventListener("submit", event => {
  event.preventDefault();
  void consultRecordatorio(document.querySelector("#consult-id").value);
});
recordatoriosBody.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const recordatorio = currentRecords.get(button.dataset.id);
  if (!recordatorio) return;

  if (button.dataset.action === "consult") {
    document.querySelector("#consult-id").value = recordatorio.id;
    void consultRecordatorio(recordatorio.id);
  } else if (button.dataset.action === "edit") {
    setEditMode(recordatorio);
    document.querySelector("#formulario").scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (button.dataset.action === "delete") {
    if (!window.confirm(`¿Eliminar el recordatorio #${recordatorio.id}?`)) return;
    button.disabled = true;
    eliminarRecordatorio(recordatorio.id)
      .then(() => {
        setStatus(listStatus, "success", `Recordatorio #${recordatorio.id} eliminado correctamente.`);
        if (reminderId.value === String(recordatorio.id)) resetForm();
        return loadRecordatorios();
      })
      .catch(error => setStatus(listStatus, "error", `No se pudo eliminar: ${error.message}`));
  }
});

void loadTasks();
void loadRecordatorios();
