import { api, user } from '../../backend.js';
import { escape as esc } from '../../../shared/ui.js';
import { agendaPanel as modal, agendaDraft, saveAgendaDraft, clearAgendaDraft } from '../../../shared/screens/agenda/panels.js';
import { icon } from '../../../shared/icons.js';
import { formatZoned } from '../../../shared/screens/disponibilidad/operational-contract.js';
import { createAgendaClient } from '../../modules/agenda/client.js';
import { canManageAppointments, createManualClient, manualSelection, manualSlots } from '../../modules/agenda/manual-contract.js';
import { createManualOperation } from '../../modules/agenda/manual-operation.js';
import { privateError } from '../../modules/agenda/errors.js';

const client = createManualClient(api), directory = createAgendaClient(api);
const storage = () => { try { return sessionStorage; } catch { return { getItem() { throw new Error('Almacenamiento no disponible.'); } }; } };
const operationFor = (actor) => createManualOperation({ scope: { actorId: actor.id, negocioId: actor.negocioId }, storage: storage(), client });
export function hasPendingManual(actor) {
  return canManageAppointments(actor?.rol) && operationFor(actor).state.status !== 'idle';
}
const field = (label, name, value = '', type = 'text', extra = '') => `<div class="form-field"><label class="form-label" for="manual-${name}">${label}</label><input class="form-control" id="manual-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
function resourceField(label, name, items, role) {
  // Recepción conserva el contrato existente de Disponibilidad: IDs provistos por el negocio,
  // nunca llamadas a catálogos que ese rol no tiene autorizados.
  if (role === 'recepcionista') return field(`Identificador ${label === 'Sucursal' ? 'de sucursal' : label === 'Servicio' ? 'del servicio' : 'del profesional'}`, name, '', 'number', 'min="1" max="4294967295" step="1" required');
  return `<div class="form-field"><label class="form-label" for="manual-${name}">${label}</label><select class="form-select" id="manual-${name}" name="${name}" required><option value="">Selecciona ${label.toLowerCase()}</option>${items.filter((item) => item.active !== false).map((item) => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></div>`;
}

// El formulario mantiene la composición de la demo; todo cálculo de oferta/fin/costo queda en servidor.
export async function openManualAppointment({ day, catalogs, onSaved, onCleared }) {
  if (!canManageAppointments(user?.rol)) return;
  const actor = { ...user }, operation = operationFor(actor);
  const draftKey = `manual:${actor.negocioId}:${actor.id}:${actor.sesionId || ''}`;
  const draft = operation.state.marker ? null : agendaDraft(draftKey);
  const dialog = modal('Nueva cita', `<form id="connected-manual-form" novalidate><div class="dialog-body"><fieldset data-manual-fields><p class="form-intro">Agenda una atención para tu paciente.</p>${actor.rol === 'recepcionista' ? '<p class="field-hint">Introduce los identificadores de servicio, sucursal y profesional proporcionados por tu negocio.</p>' : ''}<div class="form-row-two">${resourceField('Servicio', 'servicioId', catalogs.services, actor.rol)}${resourceField('Sucursal', 'sucursalId', catalogs.branches, actor.rol)}</div><div class="form-row-two">${resourceField('Profesional', 'personalId', catalogs.people, actor.rol)}${field('Fecha', 'fechaLocal', day, 'date', 'required')}</div><button type="button" class="btn btn-light" data-manual-query>${icon('search')}Consultar horarios</button><div class="form-field"><label class="form-label" for="manual-horario">Horario disponible</label><select id="manual-horario" name="horario" class="form-select" disabled><option value="">Consulta primero los horarios</option></select><p class="field-hint" data-manual-availability role="status"></p></div><div class="form-separator"><span>DATOS DEL PACIENTE</span></div><div class="m4-customer-mode" role="group" aria-label="Tipo de cliente"><label><input type="radio" name="clienteModo" value="nuevo" checked> Cliente nuevo</label><label><input type="radio" name="clienteModo" value="existente"> Cliente existente</label></div><div data-customer-new><div class="form-row-two">${field('Nombre completo', 'nombreCompleto', '', 'text', 'maxlength="150" autocomplete="off"')}${field('Teléfono', 'telefono', '', 'tel', 'maxlength="30" autocomplete="off"')}</div></div><div data-customer-existing hidden>${field('Buscar cliente', 'busquedaCliente', '', 'search', 'maxlength="150" autocomplete="off"')}<button type="button" class="btn btn-light" data-customer-search>Buscar clientes</button><div data-customer-results aria-live="polite"></div></div><div class="form-field"><label class="form-label" for="manual-notas">Notas de consulta <span class="optional">(opcional)</span></label><textarea class="form-control" name="notas" id="manual-notas" rows="2" maxlength="2000"></textarea></div><p class="field-hint">Consultar horarios no los aparta. El servidor vuelve a comprobar la disponibilidad al confirmar.</p></fieldset><p class="form-error" data-manual-error role="alert" tabindex="-1" hidden></p><div data-manual-operation aria-live="polite"></div></div><div class="dialog-footer"><button class="btn btn-light" type="button" data-manual-close>Cerrar</button><button class="btn btn-primary" type="submit" data-manual-save disabled>${icon('check')}Confirmar cita</button></div></form>`, true);
  dialog.classList.add('m4-appointment-dialog');
  const form = dialog.querySelector('form'), fields = form.querySelector('[data-manual-fields]');
  const slotsSelect = form.elements.horario, submit = form.querySelector('[data-manual-save]');
  const errorBox = form.querySelector('[data-manual-error]'), panel = form.querySelector('[data-manual-operation]');
  let generation = 0, customerGeneration = 0, slots = [], availability = null, queryIdentity = '', searchPage = 1, searchTerm = '', savedNotified = false, customerChoices = [];
  const active = () => dialog.open && form.isConnected && user?.id === actor.id && user?.negocioId === actor.negocioId;
  const queryValues = () => ({ personalId: form.elements.personalId.value, sucursalId: form.elements.sucursalId.value, servicioId: form.elements.servicioId.value, fechaLocal: form.elements.fechaLocal.value });
  const fail = (error) => { if (!active()) return; const info = privateError(error); errorBox.textContent = typeof error.status === 'number' ? `${info.title}. ${info.message}` : error.message; errorBox.hidden = false; errorBox.focus(); };
  const clearError = () => { errorBox.hidden = true; errorBox.textContent = ''; };
  const close = () => { if (!operation.state.busy) dialog.close(); };
  dialog.querySelector('[data-close]').onclick = close;
  dialog.oncancel = (event) => { event.preventDefault(); close(); };
  dialog.onclick = (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } };
  form.querySelector('[data-manual-close]').onclick = close;
  dialog.addEventListener('close', () => {
    // Cerrar un borrador no lo descarta; solo la memoria de esta sesión lo conserva.
    if (form.isConnected && user?.id === actor.id) {
      if (savedNotified) clearAgendaDraft(draftKey);
      else if (operation.state.status === 'idle') {
        const values = Object.fromEntries(new FormData(form)); delete values.horario;
        saveAgendaDraft(draftKey, { values, customers: customerChoices });
      }
    }
    generation++; customerGeneration++; document.querySelector('[data-m4-new]')?.focus();
  }, { once: true });
  function invalidateSlots() {
    generation++; slots = []; availability = null; queryIdentity = '';
    slotsSelect.innerHTML = '<option value="">Consulta primero los horarios</option>'; slotsSelect.disabled = true;
    form.querySelector('[data-manual-query]').disabled = false;
    form.querySelector('[data-manual-availability]').textContent = ''; submit.disabled = true;
  }
  // Una selección manual no tiene versión propia: un cambio externo invalida sus ranuras, nunca su envío pendiente.
  const onAgendaUpdated = () => {
    if (!active() || operation.state.status !== 'idle' || operation.state.busy) return;
    invalidateSlots(); paint();
    errorBox.textContent = 'La agenda cambió en otra sesión. Conservamos tus datos; consulta los horarios nuevamente antes de confirmar.';
    errorBox.hidden = false;
  };
  window.addEventListener('m4-agenda-updated', onAgendaUpdated);
  dialog.addEventListener('close', () => window.removeEventListener('m4-agenda-updated', onAgendaUpdated), { once: true });
  function paint() {
    const state = operation.state, idle = state.status === 'idle';
    fields.disabled = !idle; fields.hidden = state.status === 'registered';
    submit.disabled = !idle || !slots[Number(slotsSelect.value)] || slotsSelect.value === '' || JSON.stringify(queryValues()) !== queryIdentity;
    submit.hidden = !idle;
    form.querySelector('[data-manual-close]').disabled = state.busy;
    dialog.querySelector('[data-close]').disabled = state.busy;
    if (state.busy) panel.innerHTML = '<p role="status">Comprobando el envío de la cita…</p>';
    else if (state.status === 'registered') panel.innerHTML = `<div class="information-note"><strong>Cita registrada · ${esc(state.result.folio)}</strong><p>${esc(formatZoned(state.result.inicioUtc, state.result.zonaHoraria))} · ${esc(state.result.zonaHoraria)}</p><p>Costo aceptado: ${esc(state.result.costoAceptado)}</p><button type="button" class="btn btn-primary" data-manual-done>Volver a la agenda</button></div>`;
    else if (state.status === 'not_registered') panel.innerHTML = '<p>No se registró la cita. Puedes corregir los datos y consultar otro horario.</p><button type="button" class="btn btn-light" data-manual-edit>Corregir datos</button>';
    else if (state.status === 'uncertain') panel.innerHTML = `<p role="status">Hay un envío pendiente de comprobar. Comprueba el resultado antes de crear otra cita.</p>${state.error ? `<p>${esc(typeof state.error.status === 'number' ? `${privateError(state.error).title}. ${privateError(state.error).message}` : state.error.message)}</p>` : ''}<button type="button" class="btn btn-primary" data-manual-resolve>Comprobar resultado</button>`;
    else if (state.status === 'storage_error') panel.innerHTML = `<p role="alert">${esc(state.error.message)}</p>`;
    else panel.innerHTML = '';
    panel.querySelector('[data-manual-resolve]')?.addEventListener('click', () => void perform(() => operation.resolve()));
    panel.querySelector('[data-manual-done]')?.addEventListener('click', () => { if (operation.acknowledge()) { dialog.close(); onCleared?.(); } else fail(operation.state.error); });
    panel.querySelector('[data-manual-edit]')?.addEventListener('click', () => { if (operation.acknowledge()) { invalidateSlots(); paint(); fields.querySelector('input,select')?.focus(); } else fail(operation.state.error); });
  }
  async function perform(action) {
    try {
      const promise = action(); paint(); await promise;
      if (!active()) return;
      paint();
      if (operation.state.status === 'registered' && !savedNotified) {
        savedNotified = true;
        try { await onSaved?.(operation.state.result); } catch { fail(new Error('La cita quedó registrada, pero no se pudo actualizar la agenda.')); }
      }
    } catch (error) { fail(error); }
  }
  form.querySelector('[data-manual-query]').onclick = async () => {
    clearError(); invalidateSlots(); const current = ++generation, values = queryValues();
    const button = form.querySelector('[data-manual-query]'); button.disabled = true;
    form.querySelector('[data-manual-availability]').textContent = 'Consultando horarios disponibles…';
    try {
      const response = await client.availability(values);
      if (!active() || current !== generation) return;
      slots = manualSlots(response, values); availability = response; queryIdentity = JSON.stringify(values);
      slotsSelect.innerHTML = '<option value="">Selecciona un horario</option>' + slots.map((slot, index) => `<option value="${index}">${esc(formatZoned(slot.inicioUtc, response.zonaHoraria))} – ${esc(formatZoned(slot.finUtc, response.zonaHoraria))}</option>`).join('');
      slotsSelect.disabled = !slots.length;
      form.querySelector('[data-manual-availability]').textContent = slots.length ? `${slots.length} horarios · ${response.zonaHoraria}` : 'Sin horarios disponibles para esta combinación y fecha.';
    } catch (error) { if (active() && current === generation) { form.querySelector('[data-manual-availability]').textContent = ''; fail(new Error(`No se pudo consultar la disponibilidad. ${privateError(error).title}. ${privateError(error).message}`)); } }
    finally { if (active() && current === generation) { button.disabled = false; paint(); } }
  };
  async function searchCustomers(page = 1) {
    const version = ++customerGeneration, target = form.querySelector('[data-customer-results]');
    if (page === 1) searchTerm = form.elements.busquedaCliente.value.trim();
    target.innerHTML = '<p role="status">Buscando clientes…</p>';
    try {
      const response = await directory.clients({ busqueda: searchTerm, pagina: page, limite: 50 });
      if (!active() || version !== customerGeneration) return;
      if (!response || !Array.isArray(response.clientes) || response.pagina !== page || typeof response.hayMas !== 'boolean') throw new Error('El directorio recibido no es válido.');
      customerChoices = response.clientes;
      searchPage = page;
      target.innerHTML = response.clientes.length ? response.clientes.map((customer) => `<label class="m4-customer-choice"><input type="radio" name="clienteId" value="${esc(customer.id)}"><span><strong>${esc(customer.nombreCompleto)}</strong><small>${esc(customer.telefono)} · Ficha #${esc(customer.id)}</small></span></label>`).join('') : '<p>No se encontraron clientes.</p>';
      target.insertAdjacentHTML('beforeend', `<div class="m4-history-pages"><button type="button" class="btn btn-light" data-customer-previous ${page === 1 ? 'disabled' : ''}>Clientes anteriores</button><span>Página ${page}</span><button type="button" class="btn btn-light" data-customer-next ${!response.hayMas ? 'disabled' : ''}>Más clientes</button></div>`);
      target.querySelector('[data-customer-previous]').onclick = () => void searchCustomers(searchPage - 1);
      target.querySelector('[data-customer-next]').onclick = () => void searchCustomers(searchPage + 1);
    } catch (error) { if (active() && version === customerGeneration) { target.innerHTML = ''; fail(error); } }
  }
  form.querySelector('[data-customer-search]').onclick = () => { clearError(); void searchCustomers(); };
  form.addEventListener('input', (event) => { if (['servicioId', 'sucursalId', 'personalId', 'fechaLocal'].includes(event.target.name)) invalidateSlots(); });
  form.addEventListener('change', (event) => {
    if (['servicioId', 'sucursalId', 'personalId', 'fechaLocal'].includes(event.target.name)) invalidateSlots();
    if (event.target.name === 'clienteModo') { form.querySelector('[data-customer-new]').hidden = event.target.value !== 'nuevo'; form.querySelector('[data-customer-existing]').hidden = event.target.value !== 'existente'; }
    paint();
  });
  form.onsubmit = (event) => {
    event.preventDefault(); clearError();
    if (operation.state.status !== 'idle') return;
    try {
      const slot = slots[Number(slotsSelect.value)];
      if (!slot || slotsSelect.value === '' || !availability || JSON.stringify(queryValues()) !== queryIdentity) throw new Error('Consulta y selecciona un horario vigente antes de confirmar.');
      const values = new FormData(form), existing = values.get('clienteModo') === 'existente';
      const selection = manualSelection({ ...queryValues(), fechaLocal: slot.fechaLocal, horaInicio: slot.horaInicio, notas: values.get('notas'),
        ...(existing ? { clienteId: values.get('clienteId') } : { clienteNuevo: { nombreCompleto: values.get('nombreCompleto'), telefono: values.get('telefono') } }) });
      void perform(() => operation.submit(selection));
    } catch (error) { fail(error); }
  };
  // Restituir el contenido requerido para resolver; no reintentar registrar al abrir o recargar.
  const pending = operation.state.marker?.seleccion;
  if (pending) {
    for (const name of ['servicioId', 'sucursalId', 'personalId', 'fechaLocal', 'notas']) form.elements[name].value = pending[name] ?? '';
    if (pending.clienteNuevo) { form.elements.nombreCompleto.value = pending.clienteNuevo.nombreCompleto; form.elements.telefono.value = pending.clienteNuevo.telefono; }
    else { form.elements.clienteModo.value = 'existente'; form.querySelector('[data-customer-new]').hidden = true; form.querySelector('[data-customer-existing]').hidden = false; form.querySelector('[data-customer-results]').innerHTML = `<p>Cliente seleccionado: ficha #${esc(pending.clienteId)}.</p>`; }
  }
  if (!pending && draft) {
    for (const [name, value] of Object.entries(draft.values)) if (form.elements[name] && name !== 'clienteId') form.elements[name].value = value;
    customerChoices = draft.customers || [];
    const chosen = customerChoices.find((item) => String(item.id) === draft.values.clienteId);
    if (chosen) form.querySelector('[data-customer-results]').innerHTML = `<label class="m4-customer-choice"><input type="radio" name="clienteId" value="${esc(chosen.id)}" checked><span><strong>${esc(chosen.nombreCompleto)}</strong><small>${esc(chosen.telefono)} · Ficha #${esc(chosen.id)}</small></span></label>`;
    const existing = form.elements.clienteModo.value === 'existente';
    form.querySelector('[data-customer-new]').hidden = existing; form.querySelector('[data-customer-existing]').hidden = !existing;
    // Las ranuras anteriores nunca se reutilizan: al reabrir se exige otra consulta al motor.
    invalidateSlots();
  }
  paint(); if (operation.state.marker) await perform(() => operation.start());
}
