import { renderSelection, mountSelection } from './selection-view.js';
import { dateLabel, localTime, localDate } from './dates.js';
import { focusPublicControl } from './accessibility.js';
import { icon } from '../../shared/icons.js';

// Todo dato personal se escapa antes de generar HTML; no se consulta por teléfono.
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function clockLabel(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
const progressSeconds = (ms) => Math.min(300, Math.max(0, Math.ceil(ms / 1000)));
function renderBody(state) {
  // La región estable de mountSelection anuncia estos avisos; el texto visible
  // no es otra región viva que compita al reemplazar la pantalla.
  const notice = state.notice ? `<p class="public-hold-notice">${esc(state.notice)}</p>` : '';
  if (state.phase === 'selection') return `${notice}${renderSelection(state)}`;
  if (state.phase === 'hold') return `<h2 id="selection-title" tabindex="-1">Apartar tu horario</h2>${notice}
    ${state.holdStatus === 'request-error' ? '<button class="btn btn-primary" type="button" data-selection-retry>Reintentar el mismo apartado</button>' : '<p>Espera mientras comprobamos el horario. Todavía no se ha creado una cita.</p>'}`;
  // Estas pantallas no dependen del apartado ni del catálogo: una recuperación
  // tras recarga puede no tener selecciones locales o contacto en memoria.
  if (state.phase === 'sending' || state.phase === 'uncertain') return `<h2 id="selection-title" tabindex="-1">${state.phase === 'sending' ? 'Registrando tu reserva' : 'Comprueba tu envío'}</h2>
    ${notice}<p class="public-limit">Mantendremos este intento hasta comprobar su resultado. No inicies otra reserva para resolver una espera.</p>
    ${state.phase === 'uncertain' ? `<div class="public-selection-actions"><button class="btn btn-primary" type="button" data-resolve-submission ${state.submission?.status === 'resolving' ? 'disabled' : ''}>Comprobar resultado</button>
    ${state.submission?.canRepeat ? '<button class="btn btn-light" type="button" data-repeat-submission>Reintentar el mismo envío</button>' : ''}</div>` : ''}`;
  if (state.phase === 'result') {
    const result = state.result;
    return `<h2 id="selection-title" tabindex="-1">Reserva registrada</h2>${notice}
      <p class="status-badge pendiente public-result-status">Pendiente</p>
      <p>Conserva el folio de tu reserva.</p><p class="public-result-folio">${esc(result.folio)}</p>
      <dl class="public-result-details"><dt>Negocio</dt><dd>${esc(result.nombreNegocio)}</dd>
      <dt>Servicio</dt><dd>${esc(result.nombreServicio)}</dd><dt>Sucursal</dt><dd>${esc(result.nombreSucursal)}</dd>
      <dt>Profesional</dt><dd>${esc(result.nombreProfesional)}</dd>
      <dt>Fecha</dt><dd>${esc(dateLabel(localDate(result.inicioUtc, result.zonaHoraria)))}</dd>
      <dt>Horario</dt><dd>${esc(localTime(result.inicioUtc, result.zonaHoraria))}–${esc(localTime(result.finUtc, result.zonaHoraria))}</dd>
      <dt>Zona horaria</dt><dd>${esc(result.zonaHoraria)}</dd><dt>Costo</dt><dd>${esc(result.costoAceptado)} MXN</dd></dl>`;
  }
  const { contact, contactErrors: errors } = state;
  const active = state.holdStatus === 'active' && state.remainingMs > 0;
  const input = (field, title, type = 'text', helper = '') => `<div class="public-contact-field"><label for="contact-${field}">${title}</label>
    <input class="form-control" id="contact-${field}" name="${field}" type="${type}" data-contact-field="${field}" autocomplete="off"
      value="${esc(contact[field])}" aria-invalid="${Boolean(errors[field])}" aria-describedby="contact-${field}-help contact-${field}-error" ${field !== 'notas' ? 'required' : ''}>
    <small id="contact-${field}-help">${helper}</small><p class="public-field-error" id="contact-${field}-error">${esc(errors[field] || '')}</p></div>`;
  return `<h2 id="selection-title" tabindex="-1">Completa tus datos</h2>
    <div class="public-hold-clock"><div class="public-hold-clock-line"><span>Tiempo restante</span><strong id="public-hold-time" role="timer" aria-live="off">${clockLabel(state.remainingMs)}</strong></div>
      <progress class="public-hold-progress" id="public-hold-progress" max="300" value="${progressSeconds(state.remainingMs)}" aria-label="Tiempo restante del apartado"></progress></div>
    ${notice}
    <form id="public-contact-form" data-contact-form autocomplete="off" novalidate>
      ${input('nombre', 'Nombre completo', 'text', 'Hasta 150 caracteres.')}
      ${input('telefono', 'Teléfono mexicano', 'tel', 'Diez dígitos; puedes usar +52, espacios y guiones.')}
      <div class="public-contact-field"><label for="contact-notas">Notas o motivo de consulta (opcional)</label>
        <textarea class="form-control" id="contact-notas" name="notas" rows="4" data-contact-field="notas" autocomplete="off" aria-invalid="${Boolean(errors.notas)}" aria-describedby="contact-notas-help contact-notas-error">${esc(contact.notas)}</textarea>
        <small id="contact-notas-help">Hasta 2000 caracteres. Se conservan solo mientras permanezcas en este flujo.</small><p class="public-field-error" id="contact-notas-error">${esc(errors.notas || '')}</p></div>
      ${errors.form ? `<p class="public-field-error">${esc(errors.form)}</p>` : ''}
      ${state.contactChecked ? '<p id="contact-checked">Los datos tienen un formato válido. Aún no se ha enviado una reserva.</p>' : ''}
      <p class="public-limit">La reserva se registrará como pendiente. El apartado no se amplía al escribir, revisar los datos o reintentar.</p>
      <div class="public-selection-actions"><button class="btn btn-light" type="button" data-return-availability ${state.holdStatus === 'releasing' ? 'disabled' : ''}>Volver a horarios</button>
        ${['unverified', 'checking'].includes(state.holdStatus) ? `<button class="btn btn-light" type="button" data-check-hold ${state.holdStatus === 'checking' ? 'disabled' : ''}>Comprobar vigencia</button>` : ''}
        <button class="btn btn-light" type="submit" data-review-contact ${!active ? 'disabled' : ''}>Revisar datos</button>
        <button class="btn btn-primary" type="button" data-submit-reservation ${!active ? 'disabled' : ''}>Reservar</button></div>
    </form>`;
}

const stepNames = ['Servicio', 'Sucursal', 'Profesional', 'Fecha y hora', 'Tus datos', 'Confirmación'];

export function renderBooking(state) {
  const step = state.phase === 'selection' ? state.step : state.phase === 'result' ? 5 : 4;
  const result = state.phase === 'result' ? state.result : null;
  const options = state.options || { servicios: [], sucursales: [], profesionales: [] };
  const chosen = (list, id) => options[list]?.find((item) => item.id === id);
  const service = chosen('servicios', state.selection?.servicioId);
  const branch = chosen('sucursales', state.selection?.sucursalId);
  const professional = chosen('profesionales', state.selection?.personalId);
  const date = state.selection?.date && state.selection?.slot
    ? `${dateLabel(state.selection.date)} · ${state.selection.slot.horaInicio}${state.phase === 'form' && state.hold?.zonaHoraria ? ` · ${state.hold.zonaHoraria}` : ''}` : '';
  const summary = [
    ['Servicio', result?.nombreServicio || service?.nombre || 'Selecciona un servicio', 'briefcase', Boolean(result?.nombreServicio || service?.nombre)],
    ['Sucursal', result?.nombreSucursal || branch?.nombre || 'Elige tu sucursal', 'pin', Boolean(result?.nombreSucursal || branch?.nombre)],
    ['Profesional', result?.nombreProfesional || professional?.nombre || 'Elige un profesional', 'stethoscope', Boolean(result?.nombreProfesional || professional?.nombre)],
    ['Fecha y hora', result ? `${dateLabel(localDate(result.inicioUtc, result.zonaHoraria))} · ${localTime(result.inicioUtc, result.zonaHoraria)}` : date || 'Encuentra tu horario', 'clock', Boolean(result || date)],
  ];
  const price = result?.costoAceptado ?? state.hold?.costoAceptado ?? service?.costo;
  return `<nav class="public-progress" aria-label="Pasos de reserva"><ol class="public-steps">${stepNames.map((name, index) => `<li class="${index < step ? 'is-complete' : ''}" ${step === index ? 'aria-current="step"' : ''}><span>${index < step ? '✓' : index + 1}</span><strong>${name}</strong></li>`).join('')}</ol></nav>
    <div class="public-booking-columns"><section class="public-booking-surface">${renderBody(state)}</section>
      <aside class="public-booking-aside" aria-label="Resumen de la reserva"><div class="public-summary-card"><div class="public-summary-content"><div class="public-summary-heading">${icon('calendar')}<h3>Resumen de tu cita</h3></div><dl class="public-summary-items">${summary.map(([label, value, symbol, filled]) => `<div class="${filled ? 'is-filled' : ''}"><dt class="visually-hidden">${label}</dt><dd>${icon(symbol)}<span>${esc(value)}</span></dd></div>`).join('')}</dl>${price !== undefined ? `<div class="public-summary-price"><span>${service?.duracionMinutos ? `${service.duracionMinutos} minutos` : 'Costo aceptado'}</span><strong>${esc(price)} <small>MXN</small></strong></div><p class="public-summary-payment">Pago directamente en sucursal.</p>` : ''}</div><span class="public-summary-leaf" aria-hidden="true">${icon('leaf')}</span></div>
      <p class="public-booking-trust">${result ? 'Reserva registrada, pendiente de confirmación.' : 'La disponibilidad y el costo se confirman con el servidor antes de registrar tu reserva.'}</p></aside></div>`;
}

// El contador se actualiza sin recrear inputs, para conservar foco, cursor e IME.
export function updateHoldTime(host, state) {
  const counter = host.querySelector('#public-hold-time');
  if (counter) counter.textContent = clockLabel(state.remainingMs);
  const progress = host.querySelector('#public-hold-progress');
  if (progress) progress.value = progressSeconds(state.remainingMs);
}
export function mountBooking(host, flow) {
  const render = mountSelection(host, flow, renderBooking);
  host.addEventListener('input', (event) => {
    const field = event.target.dataset.contactField;
    if (field) {
      flow.updateContact(field, event.target.value);
      // Edición sin render: no interrumpe el cursor, IME o un click en otro campo.
      event.target.setAttribute('aria-invalid', 'false');
      host.querySelector(`#contact-${field}-error`).textContent = '';
      const checked = host.querySelector('#contact-checked');
      if (checked) checked.hidden = true;
    }
  });
  host.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-contact-form]')) return;
    event.preventDefault(); flow.validateContact();
    focusPublicControl(host.querySelector('[aria-invalid="true"]'));
  });
  host.addEventListener('click', (event) => {
    if (event.target.closest('[data-return-availability]')) void flow.returnToAvailability();
    else if (event.target.closest('[data-check-hold]')) void flow.recheck();
    else if (event.target.closest('[data-submit-reservation]')) {
      void flow.submitReservation().then(() => focusPublicControl(host.querySelector('[aria-invalid="true"]')));
    } else if (event.target.closest('[data-resolve-submission]')) void flow.resolveSubmission();
    else if (event.target.closest('[data-repeat-submission]')) void flow.repeatSubmission();
  });
  return (state, kind) => kind === 'tick' ? updateHoldTime(host, state) : render(state);
}
