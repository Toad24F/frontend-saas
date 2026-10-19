import { icon } from '../../icons.js';
import { escape as esc, empty } from '../../ui.js';
import { formatZoned, reasonText, validateConfiguration, validateInclusiveRange, zonedParts } from './operational-contract.js';
import './operational.css';

export { validateConfiguration, validateInclusiveRange } from './operational-contract.js';

const modeLabels = { ventana_libre: 'Ventana libre', agenda_compacta: 'Agenda compacta' };

const fieldError = (name, errors) => errors?.[name]
  ? `<p class="availability-field-error" role="alert">${esc(errors[name])}</p>` : '';
const options = (items, selected, placeholder) => `${placeholder ? `<option value="">${esc(placeholder)}</option>` : ''}${items.map((item) => `<option value="${item.id}" ${String(item.id) === String(selected) ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}`;
const loading = (text) => `<div class="availability-loading" role="status" aria-live="polite"><span></span><p>${esc(text)}</p></div>`;
const errorState = (message, retry) => `<div class="availability-request-error" role="alert"><div>${icon('info')}<span><strong>No se pudo completar la consulta</strong><small>${esc(message)}</small></span></div><button type="button" class="btn btn-light" data-availability-action="${retry}">Reintentar</button></div>`;

export function configurationPanel(state, demo = false) {
  if (state.busy && !state.data) return `<section class="surface availability-extra">${loading('Cargando reglas de agenda…')}</section>`;
  if (state.error && !state.data && !state.draft) return `<section class="surface availability-extra operational-panel"><div class="section-heading"><div><h2>Reglas de agenda</h2><p>No se mostrarán valores supuestos cuando la lectura real falle.</p></div></div>${errorState(state.error, 'retry-configuration')}</section>`;
  const data = state.draft || state.data || { modo: 'ventana_libre', intervaloMinutos: 15, anticipacionMinutos: 15, diasFuturos: 60 };
  return `<section class="surface availability-extra operational-panel"><div class="section-heading"><div><h2>Reglas de agenda</h2><p>Define cómo se ofrecen los horarios en consultas con modalidad pública.</p></div>${demo ? '<span class="demo-data-label">Datos de demostración</span>' : ''}</div>
    ${state.error ? errorState(state.error, 'retry-configuration') : ''}
    <form id="agenda-configuration-form" class="operational-form" novalidate aria-busy="${state.busy}">
      <fieldset ${state.busy ? 'disabled' : ''}><legend class="visually-hidden">Configuración de agenda</legend>
        <div class="configuration-group-heading"><h3>Modo de agenda</h3><p>Elige cómo se presentan los horarios disponibles.</p></div>
        <div class="configuration-mode" data-availability-field="modo">
          <label class="configuration-choice"><input type="radio" name="modo" value="ventana_libre" ${data.modo === 'ventana_libre' ? 'checked' : ''}><span class="configuration-choice-face">${icon('grid')}<span class="configuration-choice-copy"><strong>Ventana libre</strong><small>Muestra todos los inicios válidos.</small></span><span class="configuration-active" aria-hidden="true">${icon('check')} Activo</span></span></label>
          <label class="configuration-choice"><input type="radio" name="modo" value="agenda_compacta" ${data.modo === 'agenda_compacta' ? 'checked' : ''}><span class="configuration-choice-face">${icon('calendar')}<span class="configuration-choice-copy"><strong>Agenda compacta</strong><small>Prioriza horarios cercanos a ocupaciones.</small></span><span class="configuration-active" aria-hidden="true">${icon('check')} Activo</span></span></label>
          ${fieldError('modo', state.errors)}
        </div>
        <div class="configuration-group-heading configuration-limits-heading"><h3>Condiciones para reservar</h3><p>Estos límites se aplican a los horarios públicos.</p></div>
        <div class="configuration-fields"><label data-availability-field="intervaloMinutos"><span>Intervalo entre inicios</span><select class="form-select" name="intervaloMinutos">${[5, 10, 15, 20, 30, 60].map((value) => `<option value="${value}" ${Number(data.intervaloMinutos) === value ? 'selected' : ''}>${value} minutos</option>`).join('')}</select><small>Separación entre horarios ofrecidos.</small>${fieldError('intervaloMinutos', state.errors)}</label><label data-availability-field="anticipacionMinutos"><span>Anticipación mínima</span><input class="form-control" type="number" name="anticipacionMinutos" min="0" step="5" required value="${esc(data.anticipacionMinutos)}"><small>Minutos antes de la cita, en múltiplos de 5.</small>${fieldError('anticipacionMinutos', state.errors)}</label><label data-availability-field="diasFuturos"><span>Horizonte futuro</span><input class="form-control" type="number" name="diasFuturos" min="0" step="1" required value="${esc(data.diasFuturos)}"><small>Días disponibles desde hoy.</small>${fieldError('diasFuturos', state.errors)}</label></div>
      </fieldset><div class="section-form-footer"><span>${icon('info')} El modo y los tres límites se aplican al guardar.</span><button class="btn btn-primary" type="submit" ${state.busy ? 'disabled' : ''}>${icon('check')}Guardar reglas</button></div>
    </form></section>`;
}

function identityFields({ role, professionals, branches, services, filters, errors, affected = false }) {
  const professional = role === 'profesional' ? professionals[0] : null;
  const professionalField = professional
    ? `<label><span>Profesional</span><input class="form-control" value="${esc(professional.name)}" readonly><input type="hidden" name="personalId" value="${professional.id}"></label>`
    : role === 'recepcionista'
      ? `<label data-availability-field="personalId"><span>Identificador del profesional${affected ? ' (opcional)' : ''}</span><input class="form-control" type="number" min="1" step="1" name="personalId" ${affected ? '' : 'required'} value="${esc(filters.personalId || '')}">${fieldError('personalId', errors)}</label>`
      : `<label data-availability-field="personalId"><span>Profesional${affected ? ' (opcional)' : ''}</span><select class="form-select" name="personalId" ${affected ? '' : 'required'}>${options(professionals, filters.personalId, affected ? 'Todos' : 'Selecciona profesional')}</select>${fieldError('personalId', errors)}</label>`;
  const branchField = role === 'recepcionista'
    ? `<label data-availability-field="sucursalId"><span>Identificador de sucursal${affected ? ' (opcional)' : ''}</span><input class="form-control" type="number" min="1" step="1" name="sucursalId" ${affected ? '' : 'required'} value="${esc(filters.sucursalId || '')}">${fieldError('sucursalId', errors)}</label>`
    : `<label data-availability-field="sucursalId"><span>Sucursal${affected ? ' (opcional)' : ''}</span><select class="form-select" name="sucursalId" ${affected ? '' : 'required'}>${options(branches, filters.sucursalId, affected ? 'Todas' : 'Selecciona sucursal')}</select>${fieldError('sucursalId', errors)}</label>`;
  const serviceField = affected ? '' : role === 'recepcionista'
    ? `<label data-availability-field="servicioId"><span>Identificador del servicio</span><input class="form-control" type="number" min="1" step="1" name="servicioId" required value="${esc(filters.servicioId || '')}">${fieldError('servicioId', errors)}</label>`
    : `<label data-availability-field="servicioId"><span>Servicio</span><select class="form-select" name="servicioId" required>${options(services, filters.servicioId, 'Selecciona servicio')}</select>${fieldError('servicioId', errors)}</label>`;
  return professionalField + branchField + serviceField;
}

function rulesSummary(result) {
  const rules = result?.reglas;
  if (!rules) return '';
  return `<div class="availability-rules" aria-label="Reglas aplicadas"><span><small>Modo</small><strong>${esc(modeLabels[rules.modo] || rules.modo)}</strong></span><span><small>Intervalo</small><strong>${esc(rules.intervaloMinutos)} min</strong></span><span><small>Anticipación</small><strong>${esc(rules.anticipacionMinutos)} min</strong></span><span><small>Horizonte</small><strong>${esc(rules.diasFuturos)} días</strong></span></div>`;
}

function slotResults(state) {
  const result = state.result;
  if (!result) return '';
  const stale = state.stale ? '<div class="availability-stale" role="status">Estos resultados están desactualizados. Reintenta la consulta antes de validarlos.</div>' : '';
  const slots = result.ranuras || [];
  const omissions = result.omisiones || [];
  const content = slots.length
    ? `<div class="slot-grid">${slots.map((slot) => { const parts = zonedParts(slot.inicioUtc, result.zonaHoraria); return `<button type="button" class="slot-option" data-availability-slot data-slot-date="${parts.date}" data-slot-time="${parts.time}" ${state.stale ? 'disabled' : ''}><strong>${esc(formatZoned(slot.inicioUtc, result.zonaHoraria))}</strong><small>hasta ${esc(formatZoned(slot.finUtc, result.zonaHoraria).split(', ').pop())}</small></button>`; }).join('')}</div>`
    : empty('Sin horarios en este rango', result.modalidad === 'publica' ? `No hay espacios dentro del horizonte de ${result.reglas?.diasFuturos ?? 0} días.` : 'No hay espacios que cumplan las reglas operativas.', result.modalidad === 'publica' ? '<button type="button" class="btn btn-light" data-availability-action="switch-manual">Cambiar a modalidad manual</button>' : '');
  return `<div class="availability-results ${state.stale ? 'is-stale' : ''}">${stale}<div class="availability-result-head"><div><span class="eyebrow">RESULTADO PRIVADO</span><h3>${slots.length} ${slots.length === 1 ? 'horario disponible' : 'horarios disponibles'}</h3><p>${esc(result.zonaHoraria)} · calculado ${esc(formatZoned(result.calculadoEn, result.zonaHoraria))}</p></div><span class="modality-badge">${result.modalidad === 'manual' ? 'Manual' : 'Pública'}</span></div>${rulesSummary(result)}${content}${omissions.length ? `<details class="availability-omissions"><summary>${omissions.length} ${omissions.length === 1 ? 'omisión del calendario' : 'omisiones del calendario'}</summary><ul>${omissions.map((item) => `<li><strong>${esc(item.fechaLocal)}</strong><span>${esc(reasonText(item.motivo))}</span></li>`).join('')}</ul></details>` : ''}</div>`;
}

function validationResult(state) {
  if (!state.result) return '';
  const data = state.result;
  return `<div class="validation-result ${data.valido ? 'is-valid' : 'is-invalid'}" role="status">${icon(data.valido ? 'circleCheck' : 'info')}<div><strong>${data.valido ? 'El horario sigue disponible' : 'El horario no está disponible'}</strong><p>${esc(formatZoned(data.inicioUtc, data.zonaHoraria))} – ${esc(formatZoned(data.finUtc, data.zonaHoraria).split(', ').pop())} · ${data.modalidad === 'manual' ? 'Manual' : 'Pública'}</p>${data.motivos?.length ? `<ul>${data.motivos.map((reason) => `<li>${esc(reasonText(reason))}</li>`).join('')}</ul>` : '<small>La validación no reserva ni aparta este horario.</small>'}</div></div>`;
}

export function availabilityQueryPanel(model, demo = false) {
  const note = model.role === 'recepcionista' ? '<p class="availability-contract-note">El backend actual permite consultar a Recepción, pero aún no expone catálogos de solo lectura para este rol. Introduce los identificadores operativos proporcionados por el negocio.</p>' : '';
  return `<section class="surface availability-extra operational-panel"><div class="section-heading"><div><h2>Consultar horarios disponibles</h2><p>Calcula espacios reales para un servicio. Una consulta no reserva el horario.</p></div>${demo ? '<span class="demo-data-label">Datos de demostración</span>' : ''}</div>${note}
    <form id="availability-query-form" class="operational-form" novalidate aria-busy="${model.busy}"><fieldset ${model.busy ? 'disabled' : ''}><legend class="visually-hidden">Filtros de disponibilidad</legend><div class="operational-filter-grid">${identityFields(model)}<label data-availability-field="from"><span>Desde</span><input class="form-control" type="date" name="from" required value="${esc(model.filters.from)}">${fieldError('from', model.errors)}</label><label data-availability-field="to"><span>Hasta</span><input class="form-control" type="date" name="to" required value="${esc(model.filters.to)}">${fieldError('to', model.errors)}</label><label data-availability-field="modalidad"><span>Modalidad</span><select class="form-select" name="modalidad"><option value="publica" ${model.filters.modalidad === 'publica' ? 'selected' : ''}>Pública</option><option value="manual" ${model.filters.modalidad === 'manual' ? 'selected' : ''}>Manual</option></select></label></div><p class="modality-explanation">${model.filters.modalidad === 'manual' ? 'Manual omite compactación, intervalo público, anticipación y horizonte; conserva todas las restricciones operativas.' : 'Pública aplica el modo de agenda, intervalo entre inicios, anticipación y horizonte configurados.'}</p></fieldset><div class="operational-submit"><p id="availability-query-error" class="form-error" role="alert" tabindex="-1" ${model.error ? '' : 'hidden'}>${esc(model.error || '')}</p><button class="btn btn-primary" type="submit" ${model.busy ? 'disabled' : ''}>${icon('search')}${model.busy ? 'Consultando…' : model.error ? 'Reintentar consulta' : 'Consultar horarios'}</button></div></form>
    ${model.busy && !model.result ? loading('Calculando disponibilidad…') : ''}${slotResults(model)}
    <div class="validation-divider"><span>Validación puntual</span><p>Comprueba una hora concreta con el mismo motor. No crea una cita.</p></div>
    <form id="availability-validation-form" class="validation-form" novalidate aria-busy="${model.validation.busy}"><input type="hidden" name="personalId" value="${esc(model.filters.personalId || '')}"><input type="hidden" name="sucursalId" value="${esc(model.filters.sucursalId || '')}"><input type="hidden" name="servicioId" value="${esc(model.filters.servicioId || '')}"><input type="hidden" name="modalidad" value="${esc(model.filters.modalidad)}"><label data-availability-field="fechaLocal"><span>Fecha</span><input class="form-control" type="date" name="fechaLocal" required value="${esc(model.validation.date || '')}"></label><label data-availability-field="horaInicio"><span>Hora de inicio</span><input class="form-control" type="time" name="horaInicio" required value="${esc(model.validation.time || '')}"></label><button class="btn btn-light" type="submit" ${model.validation.busy || model.stale ? 'disabled' : ''}>${icon('check')}${model.validation.busy ? 'Validando…' : 'Validar horario'}</button><p id="availability-validation-error" class="form-error" role="alert" tabindex="-1" ${model.validation.error ? '' : 'hidden'}>${esc(model.validation.error || '')}</p></form>${validationResult(model.validation)}
  </section>`;
}

function affectedResults(model) {
  if (!model.result) return '';
  const appointments = model.result.citas || [];
  const stale = model.stale ? '<div class="availability-stale">Estos resultados están desactualizados.</div>' : '';
  if (!appointments.length) return `<div class="affected-results">${stale}${empty('Sin citas afectadas', 'No se encontraron causas vigentes en el rango consultado.')}</div>`;
  return `<div class="affected-results ${model.stale ? 'is-stale' : ''}">${stale}<div class="section-heading"><div><h3>${appointments.length} ${appointments.length === 1 ? 'cita afectada' : 'citas afectadas'}</h3><p>Solo se muestran referencias operativas; no se modifica ninguna cita.</p></div></div><div class="affected-list">${appointments.map((item) => `<article><div class="affected-id"><span>Cita</span><strong>#${esc(item.citaId)}</strong></div><div><strong>${esc(formatZoned(item.inicioUtc, item.zonaHoraria))} – ${esc(formatZoned(item.finUtc, item.zonaHoraria).split(', ').pop())}</strong><small>${esc(item.zonaHoraria)} · Profesional #${esc(item.personalId)} · Sucursal #${esc(item.sucursalId)} · Servicio #${esc(item.servicioId)}</small><ul>${item.causas.map((cause) => `<li>${esc(reasonText(cause.codigo))}${cause.referenciaTipo ? ` · ${esc(cause.referenciaTipo)} #${esc(cause.referenciaId)}` : ''}</li>`).join('')}</ul></div></article>`).join('')}</div></div>`;
}

export function affectedAppointmentsPanel(model, demo = false) {
  return `<section class="surface availability-extra operational-panel"><div class="section-heading"><div><h2>Citas afectadas</h2><p>Revisa causas vigentes sin cancelar, reprogramar ni alterar las citas.</p></div>${demo ? '<span class="demo-data-label">Datos de demostración</span>' : ''}</div><form id="affected-appointments-form" class="operational-form" novalidate aria-busy="${model.busy}"><fieldset ${model.busy ? 'disabled' : ''}><legend class="visually-hidden">Filtros de citas afectadas</legend><div class="operational-filter-grid affected-filter-grid">${identityFields({ ...model, affected: true })}<label data-availability-field="from"><span>Desde</span><input class="form-control" type="date" name="from" required value="${esc(model.filters.from)}">${fieldError('from', model.errors)}</label><label data-availability-field="to"><span>Hasta</span><input class="form-control" type="date" name="to" required value="${esc(model.filters.to)}">${fieldError('to', model.errors)}</label></div></fieldset><div class="operational-submit"><p id="affected-appointments-error" class="form-error" role="alert" tabindex="-1" ${model.error ? '' : 'hidden'}>${esc(model.error || '')}</p><button class="btn btn-primary" type="submit" ${model.busy ? 'disabled' : ''}>${icon('search')}${model.busy ? 'Consultando…' : model.error ? 'Reintentar consulta' : 'Consultar afectaciones'}</button></div></form>${model.busy && !model.result ? loading('Buscando citas afectadas…') : ''}${affectedResults(model)}</section>`;
}

