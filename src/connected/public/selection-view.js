import { dateLabel, validDate } from './dates.js';

// Escape local para no importar el módulo UI del panel ni sus datos de demo.
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const names = ['Servicio', 'Sucursal', 'Profesional', 'Fecha y hora'];
const titles = ['Elige tu servicio', 'Encuentra tu sucursal', 'Elige a tu profesional', 'Un espacio en tu día'];
const keys = ['servicioId', 'sucursalId', 'personalId'];
const lists = ['servicios', 'sucursales', 'profesionales'];
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

// Radios nativos permiten selección con flechas y Tab. El controlador solo recibe
// IDs presentes en la respuesta pública vigente; el texto siempre se escapa.
export function renderSelection(state) {
  const { step, selection, query } = state;
  const busy = query.status === 'loading';
  const usable = query.status === 'ready';
  const summary = keys.map((key, index) => state.options[lists[index]].find((item) => item.id === selection[key])?.nombre).filter(Boolean);
  let content;
  if (step < 3) {
    content = `<fieldset class="public-options" ${!usable ? 'disabled' : ''}><legend class="visually-hidden">${names[step]}</legend>${(usable ? state.options[lists[step]] : []).map((item) => {
      const details = step === 0 ? `${item.duracionMinutos} min · ${money(item.costo)} MXN` : step === 1 ? `${item.direccion} · ${item.zonaHoraria}` : '';
      return `<label class="public-option"><input type="radio" name="public-option" data-selection="${keys[step]}" value="${item.id}" ${selection[keys[step]] === item.id ? 'checked' : ''}><span><strong>${esc(item.nombre)}</strong>${details ? `<small>${esc(details)}</small>` : ''}</span></label>`;
    }).join('')}</fieldset>`;
  } else {
    const zone = state.timeZone || state.options.sucursales.find((item) => item.id === selection.sucursalId)?.zonaHoraria;
    content = `<label class="public-date-label" for="public-date">Fecha de tu cita</label>
      <input class="form-control public-date" id="public-date" type="date" value="${esc(selection.date)}" aria-describedby="public-zone selection-status">
      <p id="public-zone" class="public-zone">Horarios de la sucursal · ${esc(zone)}</p>
      ${validDate(selection.date) ? `<h3 class="public-day">${esc(dateLabel(selection.date))}</h3>` : ''}
      <fieldset class="public-slots" ${!usable ? 'disabled' : ''}><legend class="visually-hidden">Horarios disponibles en la zona ${esc(zone)}</legend>${state.slots.map((slot) =>
        `<label class="public-slot"><input type="radio" name="public-slot" value="${esc(slot.inicioUtc)}" data-slot ${selection.slot?.inicioUtc === slot.inicioUtc ? 'checked' : ''}><span>${esc(slot.horaInicio)}</span></label>`).join('')}</fieldset>
      ${selection.slot ? `<p class="public-selected" role="status">Horario seleccionado: ${esc(selection.slot.horaInicio)} · ${esc(zone)}. Aún no está apartado.</p>` : ''}
      <p class="public-limit">${state.bookingAvailable ? 'El horario se comprobará de nuevo antes de conceder un apartado de cinco minutos.' : 'La consulta de horarios no garantiza una reserva. El apartado y la captura de datos aún no están disponibles en esta entrega.'}</p>`;
  }
  return `<nav aria-label="Pasos de selección"><ol class="public-steps">${names.map((name, index) => `<li ${step === index ? 'aria-current="step"' : ''}><span>${index + 1}</span>${name}</li>`).join('')}</ol></nav>
    <p class="public-summary">${summary.map(esc).join(' · ')}</p>
    <h2 id="selection-title" tabindex="-1">${titles[step]}</h2>
    <div aria-busy="${busy}">${content}</div>
    <p id="selection-status" role="status" aria-live="polite" aria-atomic="true">${esc(query.message)}</p>
    <div class="public-selection-actions">${step ? '<button type="button" class="btn btn-light" data-selection-back>Volver</button>' : ''}
      ${['error', 'invalid', 'empty'].includes(query.status) ? '<button type="button" class="btn btn-light" data-selection-retry>Reintentar consulta</button>' : ''}
      ${step < 3 ? `<button type="button" class="btn btn-primary" data-selection-next ${!usable || !selection[keys[step]] ? 'disabled' : ''}>Continuar</button>` : state.bookingAvailable ? `<button type="button" class="btn btn-primary" data-selection-next ${!usable || !selection.slot ? 'disabled' : ''}>Apartar este horario</button>` : ''}</div>`;
}

// Los eventos delegados sobreviven al render. Tras cambiar de paso el foco va al
// título; al refrescar una consulta conserva fecha/radio/botón cuando aún existe.
export function mountSelection(host, controller, renderView = renderSelection) {
  host.addEventListener('change', (event) => {
    const input = event.target;
    if (input.matches('[data-selection]')) controller.choose(input.dataset.selection, Number(input.value));
    else if (input.matches('[data-slot]')) controller.chooseSlot(input.value);
    else if (input.id === 'public-date') void controller.setDate(input.value);
  });
  host.addEventListener('click', (event) => {
    if (event.target.closest('[data-selection-next]')) void controller.next();
    else if (event.target.closest('[data-selection-back]')) void controller.back();
    else if (event.target.closest('[data-selection-retry]')) void controller.retry();
  });
  let lastStep;
  return (state) => {
    const active = document.activeElement;
    const inside = host.contains(active);
    const oldId = inside ? active.id : '';
    const oldName = inside ? active.getAttribute('name') : '';
    const oldValue = inside ? active.getAttribute('value') : '';
    const oldAction = inside ? ['next', 'back', 'retry'].find((key) => active.hasAttribute(`data-selection-${key}`)) : null;
    const stepKey = `${state.phase}:${state.step}`;
    const changedStep = lastStep !== stepKey;
    const range = inside && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    host.innerHTML = renderView(state);
    if (changedStep) host.querySelector('#selection-title')?.focus();
    else if (inside) {
      const target = oldId ? host.querySelector(`#${oldId}`) : oldName
        ? [...host.querySelectorAll('input')].find((input) => input.name === oldName && input.value === oldValue)
        : oldAction ? host.querySelector(`[data-selection-${oldAction}]`) : null;
      if (target && !target.disabled) { target.focus(); if (range && target.setSelectionRange) target.setSelectionRange(...range); }
      else host.querySelector('#selection-title')?.focus();
    }
    lastStep = stepKey;
  };
}
