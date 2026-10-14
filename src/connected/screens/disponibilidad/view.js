import { api, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { list, TODAY, addDays, formatDate } from '../../../shared/data.js';
import { escape as esc, empty } from '../../../shared/ui.js';
import { availability as weeklyAvailability, getBlockScope } from '../../../shared/screens/disponibilidad/view.js';
import { minutesToLabel } from './payload.js';
import './style.css';

let cache = null;
let loading = null;
let teamExceptions = null;
let teamLoading = null;
let projection = null;
let range = { from: TODAY, to: addDays(TODAY, 13) };

export function selectedProfessional() {
  const people = list('professionals', state.tenantId);
  return people.find((person) => person.id === Number(state.scheduleProfessional)) || people[0];
}

export async function refreshAvailabilityData(force = false) {
  if (force) teamExceptions = null;
  const person = selectedProfessional();
  if (!person) return;
  const id = person.id;
  if (!force && cache?.id === id) return;
  if (loading?.id === id) return loading.promise;
  cache = { id, busy: true, error: '', offering: null, exceptions: [] };
  const promise = Promise.all([
    api(`/profesionales/${id}/oferta`),
    api(`/profesionales/${id}/excepciones`),
  ]).then(([offering, exceptions]) => {
    if (cache?.id === id) cache = { id, busy: false, error: '', offering, exceptions };
  }).catch((error) => {
    if (cache?.id === id) cache = { id, busy: false, error: error.message, offering: null, exceptions: [] };
  }).finally(() => {
    if (loading?.id === id) loading = null;
    if (state.page === 'disponibilidad' && selectedProfessional()?.id === id) render();
  });
  loading = { id, promise };
  return promise;
}

function refreshTeamExceptions() {
  const ids = list('professionals', state.tenantId).map((person) => person.id);
  const key = `${state.tenantId}:${ids.join(',')}`;
  if (teamExceptions?.key === key || teamLoading?.key === key) return;
  teamExceptions = { key, busy: true, error: '', items: [] };
  const promise = Promise.all(ids.map(async (id) => {
    const items = await api(`/profesionales/${id}/excepciones`);
    return items.map((item) => ({ ...item, professionalId: id }));
  })).then((groups) => {
    if (teamExceptions?.key === key) teamExceptions = { key, busy: false, error: '', items: groups.flat() };
  }).catch((error) => {
    if (teamExceptions?.key === key) teamExceptions = { key, busy: false, error: error.message, items: [] };
  }).finally(() => {
    if (teamLoading?.key === key) teamLoading = null;
    if (state.page === 'disponibilidad' && !getBlockScope()) render();
  });
  teamLoading = { key, promise };
}

export function setProjection(result, from, to) {
  projection = { id: selectedProfessional()?.id, result };
  range = { from, to };
  render();
}
export function invalidateProjection() { projection = null; }

const reasonLabels = {
  cuenta_inactiva: 'Cuenta inactiva', sucursal_inactiva: 'Sucursal inactiva',
  servicio_inactivo: 'Servicio inactivo', servicio_no_seleccionado: 'No seleccionado en general',
  atencion_inactiva: 'Atención pausada', servicio_no_ofrecido_en_sucursal: 'No seleccionado en esta sucursal',
};
const dateText = (value) => formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' });
const personName = (id) => list('professionals', state.tenantId).find((p) => p.id === id)?.name || 'Profesional';
const branchName = (id) => list('branches', state.tenantId).find((b) => b.id === id)?.name || `Sucursal ${id}`;

function offeringSection(person) {
  const offering = cache?.offering;
  return `<section class="surface availability-extra"><div class="section-heading"><div><h2>Oferta por sucursal</h2><p>Comprueba qué servicios ofrece ${esc(person.name)} y por qué alguno no aparece.</p></div><button type="button" class="btn btn-light" data-availability-action="general">Editar selección general</button></div>
  ${offering?.sucursales?.length ? `<div class="offering-grid">${offering.sucursales.map((branch) => `<article class="offering-branch"><div class="offering-branch-head"><div><h3>${esc(branch.nombre)}</h3><p>${branch.sucursalActiva ? 'Sucursal activa' : 'Sucursal inactiva'} · ${branch.atencionActiva ? 'Atención activa' : 'Atención pausada'}</p></div><button type="button" class="btn btn-light" data-availability-action="branch-services" data-branch-id="${branch.id}">Editar servicios</button></div><div class="offering-service-list">${branch.servicios.map((service) => `<div class="offering-service"><strong>${esc(service.nombre)}</strong><span class="${service.ofrecido ? 'offering-ok' : 'offering-off'}">${service.ofrecido ? 'Ofrecido' : esc((service.motivosExclusion || []).map((reason) => reasonLabels[reason] || reason).join(' · ') || 'No ofrecido')}</span></div>`).join('') || '<p class="availability-note">No hay servicios en el catálogo.</p>'}</div><button type="button" class="btn btn-light" data-availability-action="attention" data-branch-id="${branch.id}">${branch.atencionActiva ? 'Pausar atención' : 'Activar atención'}</button></article>`).join('')}</div>` : empty('Sin sucursales asignadas', user.rol === 'admin_negocio' ? 'Asigna sucursales desde la ficha del profesional.' : 'Pide a administración que te asigne una sucursal.')}
  <p class="availability-note">La oferta muestra estados y preferencias; no representa horarios libres ni citas disponibles.</p></section>`;
}

function exceptionsSection(exceptions, team = false) {
  return `<section class="surface availability-extra"><div class="section-heading"><div><h2>Excepciones por fecha</h2><p>Define una jornada especial o cierra una sucursal solo para una fecha.</p></div><button type="button" class="btn btn-light" data-availability-action="new-exception">Agregar excepción</button></div>${exceptions.length ? `<div class="blocks-list">${exceptions.map((item) => `<div class="block-item"><div><strong>${team ? `${esc(personName(item.professionalId))} · ` : ''}${esc(branchName(item.sucursalId))} · ${esc(dateText(item.fechaLocal))}</strong><small>${item.franjas.length ? item.franjas.map((slot) => `${minutesToLabel(slot.inicioMinutos)}–${minutesToLabel(slot.finMinutos)}`).join(', ') : 'Cierre de todo el día'}</small></div><div class="availability-row-actions"><button type="button" class="btn btn-light" data-availability-action="edit-exception" data-professional-id="${item.professionalId || selectedProfessional().id}" data-branch-id="${item.sucursalId}" data-date="${item.fechaLocal}">Editar</button><button type="button" class="icon-btn" data-availability-action="delete-exception" data-professional-id="${item.professionalId || selectedProfessional().id}" data-branch-id="${item.sucursalId}" data-date="${item.fechaLocal}" aria-label="Eliminar excepción de ${esc(branchName(item.sucursalId))} del ${esc(dateText(item.fechaLocal))}">×</button></div></div>`).join('')}</div>` : empty('Sin excepciones', 'Se aplicará el horario semanal habitual.')}</section>`;
}

function projectionSection(person) {
  const data = projection?.id === person.id ? projection.result : null;
  return `<section class="surface availability-extra"><div class="section-heading"><div><h2>Proyección de atención</h2><p>Tramos de trabajo tras descansos, excepciones y bloqueos.</p></div></div><form id="projection-form" class="projection-filter" novalidate><label data-availability-field="from">Desde<input class="form-control" type="date" name="from" required value="${range.from}"></label><label data-availability-field="to">Hasta<input class="form-control" type="date" name="to" required value="${range.to}"></label><button class="btn btn-primary" type="submit">Consultar</button><p id="projection-error" class="form-error availability-general-error" role="alert" tabindex="-1" hidden></p></form><p class="availability-note">Estos tramos no son espacios reservables. La proyección no aplica la selección de servicios ni el interruptor individual de atención por sucursal.</p>${data ? `<div class="projection-results"><h3>Intervalos (${data.intervalos.length})</h3>${data.intervalos.length ? `<div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Fecha</th><th>Sucursal</th><th>Horario local</th></tr></thead><tbody>${data.intervalos.map((item) => `<tr><td>${esc(dateText(item.fecha))}</td><td>${esc(branchName(item.sucursalId))}</td><td>${minutesToLabel(item.inicioMinutos)}–${minutesToLabel(item.finMinutos)}</td></tr>`).join('')}</tbody></table></div>` : empty('Sin intervalos', 'No hay tramos de atención en este rango.')}<h3>Omisiones (${data.omisiones.length})</h3>${data.omisiones.length ? `<div class="blocks-list">${data.omisiones.map((item) => `<div class="block-item"><div><strong>${esc(dateText(item.fecha))} · ${esc(branchName(item.sucursalId))}</strong><small>${esc(item.motivo)}</small></div></div>`).join('')}</div>` : '<p class="availability-note">No se reportaron omisiones.</p>'}</div>` : ''}</section>`;
}

export function availability() {
  const person = selectedProfessional();
  if (!person) return weeklyAvailability();
  if (cache?.id !== person.id && loading?.id !== person.id) void refreshAvailabilityData();
  const team = !getBlockScope() && user.rol === 'admin_negocio';
  if (team) refreshTeamExceptions();
  const extra = cache?.id === person.id ? cache : null;
  const pendingContent = !extra || extra.busy
    ? '<section class="surface availability-extra" aria-busy="true"><p class="availability-note">Cargando datos de disponibilidad…</p></section>'
    : extra.error
      ? `<section class="surface availability-extra"><p role="alert">${esc(extra.error)}</p><button type="button" class="btn btn-light" data-availability-action="retry">Reintentar</button></section>`
      : null;
  return weeklyAvailability({
    exceptionContent: team
      ? teamExceptions?.busy
        ? '<section class="surface availability-extra" aria-busy="true"><p class="availability-note">Cargando excepciones del equipo…</p></section>'
        : teamExceptions?.error
          ? `<section class="surface availability-extra"><p role="alert">${esc(teamExceptions.error)}</p><button type="button" class="btn btn-light" data-availability-action="retry-team">Reintentar</button></section>`
          : exceptionsSection(teamExceptions?.items || [], true)
      : pendingContent || exceptionsSection(extra.exceptions.map((item) => ({ ...item, professionalId: person.id }))),
    extraPanels: [
      { id: 'offering', label: 'Oferta por sucursal', content: pendingContent || offeringSection(person) },
      { id: 'projection', label: 'Proyección', content: pendingContent || projectionSection(person) },
    ],
  });
}

export function currentAvailabilityData() { return cache; }
export function findAvailabilityException(personId, date, branchId) {
  const items = teamExceptions?.items || (cache?.id === personId ? cache.exceptions : []);
  return items.find((item) => (item.professionalId || personId) === personId && item.fechaLocal === date && item.sucursalId === branchId);
}
export function retryTeamExceptions() { teamExceptions = null; refreshTeamExceptions(); }
