import { renderSelection, mountSelection } from './selection-view.js';
import { dateLabel, localTime, localDate } from './dates.js';

// Todo dato personal se escapa antes de generar HTML; no se consulta por teléfono.
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function clockLabel(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function renderBooking(state) {
  const notice = state.notice ? `<p class="public-hold-notice" role="status" aria-live="polite">${esc(state.notice)}</p>` : '';
  if (state.phase === 'selection') return `${notice}${renderSelection(state)}`;
  if (state.phase === 'hold') return `<h2 id="selection-title" tabindex="-1">Apartar tu horario</h2>${notice}
    ${state.holdStatus === 'request-error' ? '<button class="btn btn-primary" type="button" data-selection-retry>Reintentar el mismo apartado</button>' : '<p role="status">Espera mientras comprobamos el horario. Todavía no se ha creado una cita.</p>'}`;
  // Estas pantallas no dependen del apartado ni del catálogo: una recuperación
  // tras recarga puede no tener selecciones locales o contacto en memoria.
  if (state.phase === 'sending' || state.phase === 'uncertain') return `<h2 id="selection-title" tabindex="-1">${state.phase === 'sending' ? 'Registrando tu reserva' : 'Comprueba tu envío'}</h2>
    ${notice}<p class="public-limit">Mantendremos este intento hasta comprobar su resultado. No inicies otra reserva para resolver una espera.</p>
    ${state.phase === 'uncertain' ? `<div class="public-selection-actions"><button class="btn btn-primary" type="button" data-resolve-submission ${state.submission?.status === 'resolving' ? 'disabled' : ''}>Comprobar resultado</button>
    ${state.submission?.canRepeat ? '<button class="btn btn-light" type="button" data-repeat-submission>Reintentar el mismo envío</button>' : ''}</div>` : ''}`;
  if (state.phase === 'result') {
    const result = state.result;
    return `<h2 id="selection-title" tabindex="-1">Reserva registrada</h2>${notice}
      <p class="status-badge pendiente public-result-status" role="status">Pendiente</p>
      <p>Conserva el folio de tu reserva.</p><p class="public-result-folio">${esc(result.folio)}</p>
      <dl class="public-result-details"><dt>Negocio</dt><dd>${esc(result.nombreNegocio)}</dd>
      <dt>Servicio</dt><dd>${esc(result.nombreServicio)}</dd><dt>Sucursal</dt><dd>${esc(result.nombreSucursal)}</dd>
      <dt>Profesional</dt><dd>${esc(result.nombreProfesional)}</dd>
      <dt>Fecha</dt><dd>${esc(dateLabel(localDate(result.inicioUtc, result.zonaHoraria)))}</dd>
      <dt>Horario</dt><dd>${esc(localTime(result.inicioUtc, result.zonaHoraria))}–${esc(localTime(result.finUtc, result.zonaHoraria))}</dd>
      <dt>Zona horaria</dt><dd>${esc(result.zonaHoraria)}</dd><dt>Costo</dt><dd>${esc(result.costoAceptado)} MXN</dd></dl>`;
  }
  const { contact, contactErrors: errors, hold } = state;
  const active = state.holdStatus === 'active' && state.remainingMs > 0;
  const input = (field, title, type = 'text', helper = '') => `<div class="public-contact-field"><label for="contact-${field}">${title}</label>
    <input class="form-control" id="contact-${field}" name="${field}" type="${type}" data-contact-field="${field}" autocomplete="off"
      value="${esc(contact[field])}" aria-invalid="${Boolean(errors[field])}" aria-describedby="contact-${field}-help contact-${field}-error" ${field !== 'notas' ? 'required' : ''}>
    <small id="contact-${field}-help">${helper}</small><p class="public-field-error" id="contact-${field}-error">${esc(errors[field] || '')}</p></div>`;
  return `<h2 id="selection-title" tabindex="-1">Cuéntanos de ti</h2>
    <p class="public-summary">${esc(dateLabel(state.selection.date))} · ${esc(localTime(state.selection.slot.inicioUtc, hold.zonaHoraria))} · ${esc(hold.zonaHoraria)}</p>
    <p class="public-summary">Costo aceptado: ${esc(hold.costoAceptado)} MXN</p>
    <div class="public-hold-clock">Tiempo restante <strong id="public-hold-time" role="timer" aria-live="off">${clockLabel(state.remainingMs)}</strong></div>
    ${notice}
    <form id="public-contact-form" data-contact-form autocomplete="off" novalidate>
      ${input('nombre', 'Nombre completo', 'text', 'Hasta 150 caracteres.')}
      ${input('telefono', 'Teléfono mexicano', 'tel', 'Diez dígitos; puedes usar +52, espacios y guiones.')}
      <div class="public-contact-field"><label for="contact-notas">Notas o motivo de consulta (opcional)</label>
        <textarea class="form-control" id="contact-notas" name="notas" rows="4" data-contact-field="notas" autocomplete="off" aria-invalid="${Boolean(errors.notas)}" aria-describedby="contact-notas-help contact-notas-error">${esc(contact.notas)}</textarea>
        <small id="contact-notas-help">Hasta 2000 caracteres. Se conservan solo mientras permanezcas en este flujo.</small><p class="public-field-error" id="contact-notas-error">${esc(errors.notas || '')}</p></div>
      ${errors.form ? `<p class="public-field-error" role="alert">${esc(errors.form)}</p>` : ''}
      ${state.contactChecked ? '<p id="contact-checked" role="status">Los datos tienen un formato válido. Aún no se ha enviado una reserva.</p>' : ''}
      <p class="public-limit">La reserva se registrará como pendiente. El apartado no se amplía al escribir, revisar los datos o reintentar.</p>
      <div class="public-selection-actions"><button class="btn btn-light" type="button" data-return-availability ${state.holdStatus === 'releasing' ? 'disabled' : ''}>Volver a horarios</button>
        ${['unverified', 'checking'].includes(state.holdStatus) ? `<button class="btn btn-light" type="button" data-check-hold ${state.holdStatus === 'checking' ? 'disabled' : ''}>Comprobar vigencia</button>` : ''}
        <button class="btn btn-light" type="submit" ${!active ? 'disabled' : ''}>Revisar datos</button>
        <button class="btn btn-primary" type="button" data-submit-reservation ${!active ? 'disabled' : ''}>Reservar</button></div>
    </form>`;
}

// El contador se actualiza sin recrear inputs, para conservar foco, cursor e IME.
export function updateHoldTime(host, state) {
  const counter = host.querySelector('#public-hold-time');
  if (counter) counter.textContent = clockLabel(state.remainingMs);
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
    host.querySelector('[aria-invalid="true"]')?.focus();
  });
  host.addEventListener('click', (event) => {
    if (event.target.closest('[data-return-availability]')) void flow.returnToAvailability();
    else if (event.target.closest('[data-check-hold]')) void flow.recheck();
    else if (event.target.closest('[data-submit-reservation]')) {
      void flow.submitReservation().then(() => host.querySelector('[aria-invalid="true"]')?.focus());
    } else if (event.target.closest('[data-resolve-submission]')) void flow.resolveSubmission();
    else if (event.target.closest('[data-repeat-submission]')) void flow.repeatSubmission();
  });
  return (state, kind) => kind === 'tick' ? updateHoldTime(host, state) : render(state);
}
