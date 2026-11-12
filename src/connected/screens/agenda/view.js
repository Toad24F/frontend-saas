import { api, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { list, statuses, tenantById } from '../../../shared/data.js';
import { escape as esc, pageHead, empty, badge, modal } from '../../../shared/ui.js';
import { icon } from '../../../shared/icons.js';
import { reasonText } from '../../../shared/screens/disponibilidad/operational-contract.js';
import { createAgendaClient } from '../../modules/agenda/client.js';
import { createAgendaStore } from '../../modules/agenda/store.js';
import { calendarPeriod, civilAdd, moveCalendarDate, todayCivil } from '../../modules/agenda/calendar.js';
import { calendarTitle, renderMetrics, renderTimeline, renderMonth } from './presentation.js';
import { canManageAppointments } from '../../modules/agenda/manual-contract.js';
import { hasPendingManual, openManualAppointment } from './manual-view.js';
import { attachStateEditor } from './state-editor.js';
import { zonedParts } from '../../../shared/screens/disponibilidad/operational-contract.js';
import '../../../shared/screens/agenda/style.css';
import './style.css';

const client = createAgendaClient(api);
const store = createAgendaStore(client.list);
let identity = null;
let choices = { branches: new Map(), people: new Map() };
let detailGeneration = 0;
const historical = (value) => value == null ? 'Sin registro histórico' : String(value);
const errorMessage = (error) => {
  if (error.status === 401) return 'Tu sesión o licencia ya no permite consultar estos datos.';
  if ([403, 404].includes(error.status)) return 'La consulta o el recurso no está disponible para tu cuenta.';
  if (error.status >= 500 || error.status === 0) return 'No se pudo consultar la agenda. Reintenta en unos momentos.';
  return error.message;
};
const errorPanel = (error, action) => `<div class="m4-error" data-m4-error role="alert"><p>${esc(errorMessage(error))}</p><button class="btn btn-light" ${action}>Reintentar consulta</button></div>`;

// La sesión forma parte de la caché: ninguna lectura de una cuenta se reutiliza al entrar con otra.
function reset() {
  store.reset(); choices = { branches: new Map(), people: new Map() }; identity = null; detailGeneration++;
}
window.addEventListener('cita-session-expired', reset);
function ensureSession() {
  const next = `${user?.id}:${user?.negocioId}:${user?.sesionId}`;
  if (identity !== next) { reset(); identity = next; state.date = todayCivil(); state.branch = state.professional = state.status = 'all'; state.search = ''; }
}
const filters = () => ({ ...calendarPeriod(state.calendarView, state.date), sucursalId: state.branch, personalId: user.rol === 'profesional' ? 'all' : state.professional, estado: state.status, busqueda: state.search });
function rememberOptions(data) {
  // Recepción no tiene rutas de catálogos. Sus opciones proceden de resúmenes autorizados ya recibidos.
  for (const item of data?.citas || []) {
    choices.branches.set(item.sucursalId, historical(item.nombreSucursal));
    choices.people.set(item.personalId, historical(item.nombreProfesional));
  }
  for (const item of list('branches', state.tenantId)) choices.branches.set(item.id, item.name);
  for (const item of list('professionals', state.tenantId)) choices.people.set(item.id, item.name);
}
async function load(force = false) {
  const query = filters();
  if (!force && store.state.key === JSON.stringify(query)) return;
  const currentIdentity = identity;
  if (await store.load(query)) {
    if (!user || currentIdentity !== identity) return;
    rememberOptions(store.state.data);
    if (state.page === 'agenda') {
      // La respuesta no borra un filtro que se está escribiendo ni pierde el foco por reconstruir la carcasa.
      const form = document.querySelector('#m4-agenda-filters');
      const draft = form ? new FormData(form) : null;
      const focused = document.activeElement;
      const focusName = focused?.name;
      const control = focused?.outerHTML;
      render();
      const nextForm = document.querySelector('#m4-agenda-filters');
      for (const [key, value] of draft || []) if (nextForm?.elements[key]) nextForm.elements[key].value = value;
      if (focusName) nextForm?.elements[focusName]?.focus();
      else if (control) {
        // Buscar el mismo control por sus atributos propios, sin insertar HTML de la respuesta.
        const attr = [...(focused?.attributes || [])].find((item) => item.name.startsWith('data-m4-'));
        if (attr) document.querySelector(`[${attr.name}="${attr.value}"]`)?.focus();
        else if (focused?.type === 'submit') nextForm?.querySelector('[type="submit"]')?.focus();
      }
    }
  }
}
// Mismos filtros compactos e iconos que la demo; cambian únicamente los nombres del contrato HTTP.
const select = (name, label, allLabel, options, value, image) => `<label class="filter-select">${icon(image)}<select name="${name}" aria-label="${label}"><option value="all">${allLabel}</option>${[...options].map(([id, text]) => `<option value="${esc(id)}" ${String(id) === String(value) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select>${icon('down')}</label>`;

function calendar(data) {
  const period = calendarPeriod(state.calendarView, state.date);
  const days = Array.from({ length: state.calendarView === 'day' ? 1 : 7 }, (_, index) => civilAdd(period.desde, index));
  const content = state.calendarView === 'month' ? renderMonth(state.date, data.citas, todayCivil()) : renderTimeline(days, data.citas, todayCivil());
  // Incluso un periodo vacío mantiene la cuadrícula para conservar la referencia temporal de la demo.
  return `${!data.citas.length ? '<p class="m4-empty-summary" role="status">Sin citas en este periodo</p>' : ''}${content}`;
}
export function agenda() {
  ensureSession();
  rememberOptions(null);
  void load();
  const model = store.state;
  const tenant = tenantById(state.tenantId);
  const portal = (tenant?.slug ? `<a class="btn btn-light" href="/reservas/${esc(tenant.slug)}" target="_blank" rel="noopener">${icon('external')}Portal de reservas</a>` : '') +
    (canManageAppointments(user?.rol) ? `<button type="button" class="btn btn-primary" data-m4-new>${icon('plus')}${hasPendingManual(user) ? 'Comprobar envío pendiente' : 'Nueva cita'}</button>` : '');
  const zones = [...new Set((model.data?.citas || []).map((item) => item.zonaHoraria))];
  return `${pageHead('Agenda', 'Organiza tu día. Conecta con tus pacientes.', portal)}${renderMetrics(model.data?.citas, state.date)}<section class="calendar-panel m4-agenda" aria-label="Agenda conectada"><div class="calendar-toolbar"><div class="calendar-date"><h2>${esc(calendarTitle(state.calendarView, state.date))}</h2><div class="date-arrows"><button class="icon-btn" data-m4-move="-1" aria-label="Periodo anterior">${icon('left')}</button><button class="icon-btn" data-m4-move="1" aria-label="Periodo siguiente">${icon('chevron')}</button></div><button class="btn btn-today" data-m4-today>Hoy</button></div><div class="segmented" aria-label="Vista del calendario">${[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([view, text]) => `<button data-m4-view="${view}" aria-pressed="${state.calendarView === view}" class="${state.calendarView === view ? 'selected' : ''}">${text}</button>`).join('')}</div></div><form id="m4-agenda-filters" class="calendar-filters"><div class="filter-group">${select('sucursalId', 'Sucursal', 'Todas las sucursales', choices.branches, state.branch, 'pin')}${user.rol !== 'profesional' ? select('personalId', 'Profesional', 'Todos los profesionales', choices.people, state.professional, 'users') : ''}${select('estado', 'Estado', 'Todos los estados', new Map(Object.entries(statuses)), state.status, 'circleCheck')}</div><label class="search-field">${icon('search')}<input type="search" name="busqueda" maxlength="150" placeholder="Buscar paciente..." aria-label="Buscar paciente" value="${esc(state.search)}"></label><button type="submit" class="visually-hidden" tabindex="-1">Aplicar filtros</button></form><div aria-live="polite" aria-busy="${model.busy}">${model.busy ? '<p class="m4-loading" role="status">Consultando citas del periodo…</p>' : model.error ? errorPanel(model.error, 'data-m4-retry') : model.data ? calendar(model.data) : ''}</div><div class="calendar-footer"><div class="legend">${Object.entries(statuses).map(([status, label]) => `<span><i class="legend-dot ${status}"></i>${label}</span>`).join('')}</div><span class="timezone" title="${esc(zones.join(' · '))}">${zones.length === 1 ? esc(zones[0]) : 'Zona local de cada cita'}</span></div></section><div class="agenda-note">${icon('info')} Los horarios se muestran en la zona guardada de cada cita.${user.rol === 'recepcionista' ? '<span title="Los filtros incluyen sucursales y profesionales de los periodos consultados.">Filtros de citas consultadas</span>' : ''}</div>`;
}

// Detalle e historial se consultan por separado: errores de eventos no ocultan el snapshot autorizado.
function detailMarkup(item) {
  const fields = [ ['Folio', item.folio], ['Paciente', item.nombreContacto], ['Teléfono', item.telefonoContacto], ['Origen', item.origen === 'manual' ? 'Agendamiento manual' : 'Portal de reservas'], ['Servicio', item.nombreServicio], ['Profesional', item.nombreProfesional], ['Sucursal', item.nombreSucursal], ['Inicio', `${item.fechaLocal} · ${item.horaInicio}`], ['Fin', `${item.fechaFinLocal} · ${item.horaFin}`], ['Zona horaria', item.zonaHoraria], ['Costo histórico', item.costoAceptado], ['Notas de consulta', item.motivoConsulta] ];
  return `${badge(item.estado)}<dl class="m4-detail-fields">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(historical(value))}</dd></div>`).join('')}</dl>${item.causas?.length ? `<ul>${item.causas.map((cause) => `<li>${esc(reasonText(cause.codigo))}</li>`).join('')}</ul>` : ''}`;
}
const actionLabels = { alta: 'Alta', cambio_estado: 'Cambio de estado', cancelacion: 'Cancelación', reactivacion: 'Reactivación', cambio_horario: 'Cambio de horario' };
const valueLabels = { estado: 'Estado', version: 'Versión', origen: 'Origen', folio: 'Folio', clienteId: 'Cliente', sucursalId: 'Sucursal', servicioId: 'Servicio', personalId: 'Profesional', inicioUtc: 'Inicio UTC', finUtc: 'Fin UTC', separacionMinutos: 'Separación (minutos)', finOcupacionUtc: 'Fin de ocupación UTC', zonaHoraria: 'Zona horaria', costoAceptado: 'Costo histórico' };
const valuesMarkup = (values) => values == null ? '<p>Sin valores registrados.</p>' : `<dl>${Object.entries(values).filter(([key]) => valueLabels[key]).map(([key, value]) => `<div><dt>${valueLabels[key]}</dt><dd>${esc(historical(value))}</dd></div>`).join('')}</dl>`;
export async function openAppointment(id) {
  const generation = ++detailGeneration;
  const dialog = modal('Detalle de la cita', '<div class="dialog-body"><p role="status">Consultando detalle…</p></div>', true);
  // Un historial largo necesita una superficie opaca para mantener legible el texto al desplazarlo.
  dialog.classList.add('m4-appointment-dialog');
  dialog.addEventListener('close', () => { if (generation === detailGeneration) detailGeneration++; }, { once: true });
  const active = () => dialog.open && generation === detailGeneration && Boolean(user);
  try {
    const detail = await client.detail(id);
    if (!active()) return;
    if (!detail || detail.id !== id || !detail.zonaHoraria) throw new Error('El detalle recibido no es válido.');
    dialog.querySelector('.dialog-body').innerHTML = `${detailMarkup(detail)}<section class="m4-history" aria-label="Historial de la cita"><h3>Historial de la cita</h3><div data-m4-history></div></section>`;
    // Estado e historial conservan su autoridad de servidor; solo los roles de gestión reciben editor.
    attachStateEditor(dialog, detail, { role: user.rol, request: api,
      onReload: () => openAppointment(id),
      onChanged: async () => { await load(true); await openAppointment(id); },
    });
    let historyGeneration = 0;
    async function showHistory(page = 1) {
      const revision = ++historyGeneration, target = dialog.querySelector('[data-m4-history]');
      target.innerHTML = '<p role="status">Consultando historial…</p>';
      try {
        const history = await client.history(id, page);
        if (!active() || revision !== historyGeneration) return;
        if (!history || !Array.isArray(history.eventos) || history.pagina !== page || typeof history.hayMas !== 'boolean') throw new Error('El historial recibido no es válido.');
        target.innerHTML = history.eventos.length ? `<ol>${history.eventos.map((event) => `<li><strong>${esc(actionLabels[event.accion] || event.accion)}</strong><p>${esc(new Intl.DateTimeFormat('es-MX', { timeZone: detail.zonaHoraria, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.ocurridoEn)))} · ${esc(detail.zonaHoraria)}</p><p>${event.origenActor === 'portal_publico' ? 'Portal público' : `Personal #${esc(event.actorUsuarioId)}`} · Versión ${esc(event.versionResultante)} · Evento ${esc(event.id)}</p>${event.motivo != null ? `<p>Motivo: ${esc(event.motivo)}</p>` : ''}<details><summary>Valores anteriores y nuevos</summary><h4>Antes</h4>${valuesMarkup(event.valoresAntes)}<h4>Después</h4>${valuesMarkup(event.valoresDespues)}</details></li>`).join('')}</ol>` : '<p>Sin eventos registrados.</p>';
        target.insertAdjacentHTML('beforeend', `<div class="m4-history-pages"><button class="btn btn-light" data-history-previous ${page === 1 ? 'disabled' : ''}>Página anterior</button><span>Página ${page}</span><button class="btn btn-light" data-history-next ${!history.hayMas ? 'disabled' : ''}>Siguiente página</button></div>`);
        target.querySelector('[data-history-previous]').onclick = () => void showHistory(page - 1);
        target.querySelector('[data-history-next]').onclick = () => void showHistory(page + 1);
        // Al reemplazar los controles de página, devolver el foco al nuevo control de avance.
        if (page > 1) target.querySelector('[data-history-previous]').focus();
      } catch (error) {
        if (!active() || revision !== historyGeneration) return;
        target.innerHTML = errorPanel(error, 'data-history-retry');
        target.querySelector('[data-history-retry]').onclick = () => void showHistory(page);
      }
    }
    await showHistory();
  } catch (error) {
    if (!active()) return;
    dialog.querySelector('.dialog-body').innerHTML = errorPanel(error, 'data-detail-retry');
    dialog.querySelector('[data-detail-retry]').onclick = () => void openAppointment(id);
  }
}

// Controles propios evitan invocar las acciones de edición y creación reservadas a la demo.
export function handleAgendaClick(event) {
  const target = event.target.closest('[data-m4-new], [data-m4-view], [data-m4-move], [data-m4-date], [data-m4-today], [data-m4-retry], [data-m4-appointment]');
  if (!target || state.page !== 'agenda') return false;
  if (target.hasAttribute('data-m4-new')) {
    void openManualAppointment({ day: state.date,
      catalogs: { services: list('services', state.tenantId), branches: list('branches', state.tenantId), people: list('professionals', state.tenantId) },
      onSaved: async (result) => {
        // Reconsultar después del commit, sin insertar resultados supuestos en el calendario.
        state.date = zonedParts(result.inicioUtc, result.zonaHoraria).date;
        state.search = ''; state.branch = state.professional = state.status = 'all';
        await load(true);
      }, onCleared: () => render(),
    }); return true;
  }
  if (target.hasAttribute('data-m4-appointment')) { void openAppointment(Number(target.dataset.m4Appointment)); return true; }
  if (target.hasAttribute('data-m4-retry')) { void load(true); render(); return true; }
  if (target.dataset.m4View) state.calendarView = target.dataset.m4View;
  if (target.dataset.m4Move) state.date = moveCalendarDate(state.calendarView, state.date, Number(target.dataset.m4Move));
  if (target.dataset.m4Date) { state.date = target.dataset.m4Date; state.calendarView = 'day'; }
  if (target.hasAttribute('data-m4-today')) state.date = todayCivil();
  render();
  // La carcasa se vuelve a crear; conservar el foco del control que originó el cambio.
  const attribute = [...target.attributes].find((attr) => attr.name.startsWith('data-m4-'));
  if (attribute) document.querySelector(`[${attribute.name}="${attribute.value}"]`)?.focus();
  return true;
}
let searchTimer;
function applyFilters(form) {
  clearTimeout(searchTimer);
  if (state.page !== 'agenda' || !form.isConnected) return;
  const focusedName = document.activeElement?.name;
  const selection = document.activeElement?.selectionStart;
  const data = new FormData(form);
  state.branch = data.get('sucursalId'); state.professional = data.get('personalId') || 'all'; state.status = data.get('estado'); state.search = data.get('busqueda').trim();
  void load(true); render();
  const control = document.querySelector('#m4-agenda-filters')?.elements[focusedName || 'busqueda'];
  control?.focus();
  try { if (selection != null) control.setSelectionRange(selection, selection); } catch { /* Los selectores no admiten selección de texto. */ }
}
// La demo filtra al interactuar. En conectado se conserva el gesto con debounce y protección de generaciones.
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'm4-agenda-filters') return;
  event.preventDefault(); applyFilters(event.target);
});
document.addEventListener('change', (event) => {
  if (event.target.closest('#m4-agenda-filters') && event.target.tagName === 'SELECT') applyFilters(event.target.form);
});
document.addEventListener('input', (event) => {
  if (event.target.form?.id !== 'm4-agenda-filters' || event.target.name !== 'busqueda') return;
  clearTimeout(searchTimer);
  const form = event.target.form;
  searchTimer = setTimeout(() => applyFilters(form), 300);
});
