import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { list, resource, tenantById, formatDate } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, pageHead, button, empty } from '../../ui.js';
import './style.css';

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
let activeTab = 'schedule';
let blockScope = '';

export function getBlockScope() { return blockScope; }
export function setBlockScope(value) { blockScope = value === '' ? '' : String(value); }

export function scheduleRow(schedule, selected, tenantId, removable = false, blockIndex = 0) {
  const day = days[schedule.day];
  const branches = list('branches', tenantId).filter((branch) => selected.branchIds.includes(branch.id));
  return `<tr data-schedule-row data-schedule-day="${schedule.day}" data-id="${schedule.id}" class="schedule-day-${schedule.day} ${blockIndex > 0 ? 'schedule-repeat' : ''} ${schedule.enabled ? '' : 'schedule-disabled'}">
    <td><label class="form-check form-switch"><input class="form-check-input" type="checkbox" name="enabled-${schedule.id}" ${schedule.enabled ? 'checked' : ''} aria-label="Activar ${day}"/><span class="schedule-day-label">${day}</span></label></td>
    <td data-label="Sucursal" data-availability-field="schedule-${schedule.id}-branch"><select class="form-select form-select-sm" name="branch-${schedule.id}" aria-label="Sucursal del ${day}">${!isDemo ? `<option value="" ${schedule.branchId == null ? 'selected' : ''}>Selecciona sucursal</option>` : ''}${branches.map((branch) => `<option value="${branch.id}" ${schedule.branchId === branch.id ? 'selected' : ''}>${esc(branch.name)}</option>`).join('')}</select></td>
    <td data-label="Entrada" data-availability-field="schedule-${schedule.id}-start"><input class="form-control form-control-sm" type="time" name="start-${schedule.id}" value="${schedule.start}" aria-label="Entrada del ${day}"/></td>
    <td data-label="Descanso opcional" data-availability-field="schedule-${schedule.id}-break"><div class="time-pair"><input class="form-control form-control-sm" type="time" name="breakStart-${schedule.id}" value="${schedule.breakStart || ''}" aria-label="Inicio de descanso del ${day}"/><span>–</span><input class="form-control form-control-sm" type="time" name="breakEnd-${schedule.id}" value="${schedule.breakEnd || ''}" aria-label="Fin de descanso del ${day}"/></div></td>
    <td data-label="Salida" data-availability-field="schedule-${schedule.id}-end"><input class="form-control form-control-sm" type="time" name="end-${schedule.id}" value="${schedule.end}" aria-label="Salida del ${day}"/></td>
    <td data-label="Franjas"><div class="schedule-actions"><button type="button" class="btn btn-light schedule-add" data-add-schedule="${schedule.day}" aria-label="Agregar franja al ${day}" title="Agregar franja">+</button>${removable ? `<button type="button" class="icon-btn" data-remove-schedule="${schedule.id}" aria-label="Quitar franja del ${day}">${icon('x')}</button>` : ''}</div></td>
  </tr>`;
}

function scheduleSection(selected, schedules) {
  const rows = schedules.sort((a, b) => (isDemo ? a.day - b.day : (a.day || 7) - (b.day || 7)) || a.start.localeCompare(b.start))
    .map((schedule) => scheduleRow(schedule, selected, state.tenantId, (!isDemo && schedule.id > 0) || schedules.filter((item) => item.day === schedule.day).length > 1, schedules.filter((item) => item.day === schedule.day && item.start < schedule.start).length)).join('');
  return `<section class="surface availability-main-section"><div class="section-heading"><div><h2>Horario semanal</h2><p>Agrega varias franjas por día; cada una puede tener otra sucursal.</p></div></div><form id="schedule-form"><div class="table-responsive"><table class="table app-table schedule-table align-middle"><thead><tr><th>Día</th><th>Sucursal</th><th>Entrada</th><th>Descanso opcional</th><th>Salida</th><th>Franjas</th></tr></thead><tbody>${rows}</tbody></table></div><p class="schedule-help">Para comer y volver en otra sucursal, termina una franja antes de comer y agrega otra después. Las franjas pueden ser consecutivas si no se empalman.</p><p id="schedule-error" class="form-error availability-general-error" role="alert" tabindex="-1" hidden></p><div class="section-form-footer"><span>${icon('coffee')} Los descansos y huecos entre franjas quedan fuera de las citas disponibles.</span><button class="btn btn-primary" type="submit">${icon('check')}Guardar horario</button></div></form></section>`;
}

function modeSection(tenant) {
  return `<section class="surface mode-section availability-main-section"><div><h2>Cómo se llena tu agenda</h2><p>${isDemo ? 'Elige qué horarios podrán reservar tus pacientes.' : pending}</p></div><div class="mode-options"><button type="button" data-mode="free" aria-pressed="${tenant.mode === 'free'}" class="mode-card ${tenant.mode === 'free' ? 'selected' : ''}">${icon('grid')}<span><strong>Ventana libre</strong><small>Muestra todos los espacios disponibles.</small></span><i>${tenant.mode === 'free' ? icon('check') : ''}</i></button><button type="button" data-mode="compact" aria-pressed="${tenant.mode === 'compact'}" class="mode-card ${tenant.mode === 'compact' ? 'selected' : ''}">${icon('calendar')}<span><strong>Agenda compacta</strong><small>Prioriza citas consecutivas, día por día.</small></span><i>${tenant.mode === 'compact' ? icon('check') : ''}</i></button></div></section>`;
}

function blocksSection() {
  const scope = !isDemo && user.rol === 'profesional' ? String(user.id) : blockScope;
  const blocks = list('blocks', state.tenantId).filter((block) => !scope || !block.professionalId || String(block.professionalId) === scope);
  return `<section class="surface availability-main-section"><div class="section-heading"><div><h2>Bloqueos</h2><p>Vacaciones, festivos o cambios de último momento.${scope ? ' Incluye los bloqueos de todo el equipo.' : ''}</p></div>${button('Agregar bloqueo', 'new-block', 'plus', 'btn-light')}</div>${blocks.length ? `<div class="blocks-list">${blocks.map((block) => `<div class="block-item"><span class="stat-icon amber">${icon('lock')}</span><div><strong>${esc(block.reason)}</strong><small>${formatDate(block.date, { day: 'numeric', month: 'short' })}${block.endDate !== block.date ? ` – ${formatDate(block.endDate, { day: 'numeric', month: 'short' })}` : ''} · ${block.start ? block.start + ' – ' + block.end : 'Todo el día'} · ${block.professionalId ? esc(resource('professionals', block.professionalId, state.tenantId).name) : 'Todo el equipo'}</small></div><button class="icon-btn" data-edit-block="${block.id}" ${!isDemo && user.rol === 'profesional' && block.professionalId !== user.id ? 'disabled' : ''} aria-label="Editar bloqueo ${esc(block.reason)}">${icon('edit')}</button><button class="icon-btn" data-remove-block="${block.id}" ${!isDemo && user.rol === 'profesional' && block.professionalId !== user.id ? 'disabled' : ''} aria-label="Eliminar bloqueo ${esc(block.reason)}">${icon('x')}</button></div>`).join('')}</div>` : empty('Sin bloqueos en esta vista', 'No hay bloqueos para la selección actual.')}</section>`;
}

function professionalContext(people, selected, tabId) {
  const isTeam = tabId === 'changes' && (isDemo || user.rol === 'admin_negocio') && !blockScope;
  const person = tabId === 'changes' && !isDemo && user.rol === 'profesional'
    ? people.find((item) => item.id === user.id) || selected
    : tabId === 'changes' && blockScope ? people.find((item) => String(item.id) === blockScope) || selected : selected;
  const selectedValue = isTeam ? '' : String(person.id);
  const id = { schedule: 'schedule-professional', changes: 'block-professional', offering: 'offering-professional', projection: 'projection-professional' }[tabId];
  const label = tabId === 'changes' ? 'Ver bloqueos y excepciones de' : tabId === 'offering' ? 'Ver oferta de' : tabId === 'projection' ? 'Ver proyección de' : 'Ver horario de';
  const initial = isTeam ? icon('users') : esc(person.name.trim().charAt(0).toUpperCase());
  const name = isTeam ? 'Todo el equipo' : esc(person.name);
  const detail = isTeam ? `${people.length} profesionales` : `${person.branchIds?.length || 0} sucursales asignadas`;
  const eligiblePeople = tabId === 'changes' && !isDemo && user.rol === 'profesional' ? [person] : people;
  const options = `${tabId === 'changes' && (isDemo || user.rol === 'admin_negocio') ? '<option value="">Todo el equipo</option>' : ''}${eligiblePeople.map((item) => `<option value="${item.id}" ${String(item.id) === selectedValue ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}`;
  return `<div class="availability-person-context"><span class="availability-person-avatar" aria-hidden="true">${initial}</span><div class="availability-person-copy"><strong>${name}</strong><small>${detail}</small></div><label class="availability-person-control" for="${id}"><span>${label}</span><select class="form-select" id="${id}" data-availability-professional="${tabId}">${options}</select></label></div>`;
}

function tabLayout(tabs, people, selected) {
  if (!tabs.some((tab) => tab.id === activeTab)) activeTab = tabs[0]?.id || '';
  return `<div class="availability-workspace">${tabs.filter((tab) => tab.context !== false).map((tab) => `<div data-availability-context="${tab.id}" ${tab.id === activeTab ? '' : 'hidden'}>${professionalContext(people, selected, tab.id)}</div>`).join('')}<nav class="availability-tabs" role="tablist" aria-label="Secciones de disponibilidad">${tabs.map((tab) => `<button type="button" role="tab" id="availability-tab-${tab.id}" aria-controls="availability-panel-${tab.id}" aria-selected="${tab.id === activeTab}" tabindex="${tab.id === activeTab ? '0' : '-1'}" data-availability-tab="${tab.id}" class="${tab.id === activeTab ? 'is-selected' : ''}">${tab.label}</button>`).join('')}</nav>${tabs.map((tab) => `<div role="tabpanel" id="availability-panel-${tab.id}" aria-labelledby="availability-tab-${tab.id}" data-availability-panel="${tab.id}" ${tab.id === activeTab ? '' : 'hidden'}>${tab.content}</div>`).join('')}</div>`;
}

export function availability({ exceptionContent = '', extraPanels = [] } = {}) {
  const tenant = tenantById(state.tenantId);
  const people = list('professionals', state.tenantId);
  if (blockScope && !people.some((person) => String(person.id) === blockScope)) blockScope = '';
  const selected = people.find((person) => person.id === Number(state.scheduleProfessional)) || people[0];
  if (!selected && !extraPanels.length) return `${pageHead('Disponibilidad', 'Organiza horarios y fechas de atención.')}${empty('Agrega a tu primer profesional', 'Después podrás configurar sus horarios.')}`;
  const tabs = [];
  if (selected) {
    const schedules = list('schedules', state.tenantId).filter((schedule) => schedule.professionalId === selected.id);
    if (!isDemo) for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      if (!schedules.some((schedule) => schedule.day === day)) schedules.push({ id: -100 - day, day, branchId: selected.branchIds[0], enabled: false, start: '', end: '', breakStart: '', breakEnd: '' });
    }
    tabs.push(
      { id: 'schedule', label: 'Horario semanal', content: scheduleSection(selected, schedules) + (isDemo && !extraPanels.length ? modeSection(tenant) : '') },
      { id: 'changes', label: exceptionContent ? 'Bloqueos y excepciones' : 'Bloqueos', content: blocksSection() + exceptionContent },
    );
  }
  tabs.push(...extraPanels);
  const description = !selected
    ? 'Consulta horarios disponibles y revisa afectaciones operativas.'
    : extraPanels.length
    ? 'Organiza horarios, cambios por fecha y servicios por sucursal.'
    : 'Organiza horarios y bloqueos de atención.';
  return `${pageHead('Disponibilidad', description)}${tabLayout(tabs, people, selected)}`;
}

export function setAvailabilityTab(tabId, focus = false) {
  const root = document.querySelector('.availability-workspace');
  const tab = root?.querySelector(`[data-availability-tab="${tabId}"]`);
  if (!tab) return;
  activeTab = tabId;
  root.querySelectorAll('[data-availability-tab]').forEach((item) => {
    const selected = item === tab;
    item.classList.toggle('is-selected', selected);
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  root.querySelectorAll('[data-availability-panel]').forEach((panel) => { panel.hidden = panel.dataset.availabilityPanel !== tabId; });
  root.querySelectorAll('[data-availability-context]').forEach((context) => { context.hidden = context.dataset.availabilityContext !== tabId; });
  if (focus) tab.focus();
}
