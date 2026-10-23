import { dateLabel, validDate } from './dates.js';
import { publicAnnouncement, createAnnouncer, focusPublicControl } from './accessibility.js';
import { icon } from '../../shared/icons.js';

// Escape local para no importar el módulo UI del panel ni sus datos de demo.
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const names = ['Servicio', 'Sucursal', 'Profesional', 'Fecha y hora'];
const titles = ['¿Cómo podemos cuidarte?', 'Encuentra tu sucursal', 'Elige quién te acompaña', 'Un espacio en tu día'];
const keys = ['servicioId', 'sucursalId', 'personalId'];
const lists = ['servicios', 'sucursales', 'profesionales'];
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
function dateStrip(selected, availableDates, busy, today) {
  if (!validDate(selected)) return '';
  const previous = availableDates.filter((date) => date < selected).at(-1);
  const visible = previous
    ? [previous, ...availableDates.filter((date) => date >= selected).slice(0, 6)]
    : availableDates.filter((date) => date >= selected).slice(0, 7);
  return `<div class="public-date-navigation"><button class="public-date-arrow" type="button" data-selection-shift="-3" aria-label="Retroceder tres días" ${busy || selected <= today ? 'disabled' : ''}>${icon('left')}</button><div class="public-date-strip" aria-label="Días con horarios disponibles">${visible.map((value) => {
    const day = new Date(`${value}T12:00:00Z`);
    const shortDay = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short' }).format(day);
    const shortMonth = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'short' }).format(day);
    return `<button class="public-date-chip ${value === selected ? 'selected' : ''}" type="button" data-selection-date="${value}" aria-pressed="${value === selected}" aria-label="Consultar ${esc(dateLabel(value))}"><span>${esc(shortDay)}</span><strong>${day.getUTCDate()}</strong><small>${esc(shortMonth)}</small></button>`;
  }).join('')}</div><button class="public-date-arrow" type="button" data-selection-shift="3" aria-label="Avanzar tres días" ${busy ? 'disabled' : ''}>${icon('chevron')}</button></div>`;
}

// Radios nativos permiten selección con flechas y Tab. El controlador solo recibe
// IDs presentes en la respuesta pública vigente; el texto siempre se escapa.
export function renderSelection(state) {
  const { step, selection, query } = state;
  const busy = query.status === 'loading';
  const usable = query.status === 'ready';
  let content;
  if (step < 3) {
    content = `<fieldset class="public-options" ${!usable ? 'disabled' : ''}><legend class="visually-hidden">${names[step]}</legend>${(usable ? state.options[lists[step]] : []).map((item) => {
      const details = step === 0 ? `${item.duracionMinutos} min · ${money(item.costo)}` : step === 1 ? [item.direccion, item.telefono].filter(Boolean).join(' · ') : item.especialidad;
      const description = step === 0 ? item.descripcion : step === 1 ? item.indicaciones : '';
      return `<label class="public-option"><input type="radio" name="public-option" data-selection="${keys[step]}" value="${item.id}" ${selection[keys[step]] === item.id ? 'checked' : ''}><span class="public-option-symbol" aria-hidden="true">${step === 0 ? icon('briefcase') : step === 1 ? icon('pin') : esc(item.nombre.trim().charAt(0))}</span><span class="public-option-copy"><strong>${esc(item.nombre)}</strong>${description ? `<span class="public-option-description">${esc(description)}</span>` : ''}${details ? `<small>${esc(details)}</small>` : ''}</span><span class="public-option-check" aria-hidden="true">${icon('check')}</span></label>`;
    }).join('')}</fieldset>`;
  } else {
    const zone = state.timeZone || state.options.sucursales.find((item) => item.id === selection.sucursalId)?.zonaHoraria;
    content = `<label class="public-date-label" for="public-date">Fecha de tu cita</label>
      <input class="form-control public-date" id="public-date" type="date" value="${esc(selection.date)}" aria-invalid="${query.status === 'invalid'}" aria-describedby="public-zone selection-status">
      <p id="public-zone" class="public-zone">Horarios de la sucursal · ${esc(zone)}</p>
      ${dateStrip(selection.date, state.availableDates, busy, state.today)}
      <h3 class="public-day">Horarios disponibles${validDate(selection.date) ? ` para ${esc(dateLabel(selection.date))}` : ''}</h3>
      <fieldset class="public-slots" ${!usable ? 'disabled' : ''}><legend class="visually-hidden">Horarios disponibles en la zona ${esc(zone)}</legend>${state.slots.map((slot) =>
        `<label class="public-slot"><input type="radio" name="public-slot" value="${esc(slot.inicioUtc)}" data-slot ${selection.slot?.inicioUtc === slot.inicioUtc ? 'checked' : ''}><span>${esc(slot.horaInicio)}</span></label>`).join('')}</fieldset>
      ${selection.slot ? `<p class="public-selected">Horario seleccionado: ${esc(selection.slot.horaInicio)} · ${esc(zone)}</p>` : ''}
      <p class="public-limit">${state.bookingAvailable ? 'El horario se comprobará de nuevo antes de conceder un apartado de cinco minutos.' : 'La consulta de horarios no garantiza una reserva. El apartado y la captura de datos aún no están disponibles en esta entrega.'}</p>`;
  }
  return `<div class="public-stage-heading"><span class="public-stage-eyebrow" aria-current="step">PASO ${String(step + 1).padStart(2, '0')} DE 06</span><h2 id="selection-title" tabindex="-1">${titles[step]}</h2><p>${['Selecciona el servicio que necesitas.', 'Elige la ubicación más cómoda para ti.', 'Conoce al equipo disponible para tu servicio.', 'Selecciona la fecha y el horario que mejor te convengan.'][step]}</p></div>
    <div aria-busy="${busy}">${content}</div>
    <p id="selection-status">${esc(query.message)}</p>
    <div class="public-selection-actions">${step ? '<button type="button" class="btn btn-light" data-selection-back>Volver</button>' : ''}
      ${['error', 'invalid', 'empty'].includes(query.status) ? '<button type="button" class="btn btn-light" data-selection-retry>Reintentar consulta</button>' : ''}
      ${step < 3 ? `<button type="button" class="btn btn-primary" data-selection-next ${!usable || !selection[keys[step]] ? 'disabled' : ''}>Continuar</button>` : state.bookingAvailable ? `<button type="button" class="btn btn-primary" data-selection-next ${!usable || !selection.slot ? 'disabled' : ''}>Apartar este horario</button>` : ''}</div>`;
}

// Los eventos delegados sobreviven al render. Tras cambiar de paso el foco va al
// título; al refrescar una consulta conserva fecha/radio/botón cuando aún existe.
export function mountSelection(host, controller, renderView = renderSelection) {
  // Una única región viva sobrevive a los cambios de pantalla. El contenido
  // visible conserva sus ayudas por ID, sin generar anuncios duplicados.
  const content = document.createElement('div');
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
  host.append(content, live);
  const announce = createAnnouncer(live);
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
    else if (event.target.closest('[data-selection-shift]')) void controller.shiftDate(Number(event.target.closest('[data-selection-shift]').dataset.selectionShift));
    else if (event.target.closest('[data-selection-date]')) void controller.setDate(event.target.closest('[data-selection-date]').dataset.selectionDate);
  });
  let lastStep;
  let lastSelectedDate;
  return (state) => {
    const active = document.activeElement;
    const inside = host.contains(active);
    const oldId = inside ? active.id : '';
    const oldName = inside ? active.getAttribute('name') : '';
    const oldValue = inside ? active.getAttribute('value') : '';
    const oldDate = inside ? active.dataset.selectionDate : '';
    const oldShift = inside ? active.dataset.selectionShift : '';
    const actions = ['selection-next', 'selection-back', 'selection-retry', 'selection-shift', 'return-availability', 'check-hold', 'submit-reservation', 'resolve-submission', 'repeat-submission', 'review-contact'];
    const oldAction = inside ? actions.find((key) => active.hasAttribute(`data-${key}`)) : null;
    const stepKey = `${state.phase}:${state.step}`;
    const changedStep = lastStep !== stepKey;
    const range = inside && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    const dateScroll = content.querySelector('.public-date-strip')?.scrollLeft || 0;
    content.innerHTML = renderView(state);
    const dateStrip = content.querySelector('.public-date-strip');
    if (dateStrip) dateStrip.scrollLeft = lastSelectedDate === state.selection?.date ? dateScroll : 0;
    const strip = host.querySelector('.public-steps');
    const currentStep = strip?.querySelector('[aria-current="step"]');
    if (currentStep && strip.scrollWidth > strip.clientWidth) {
      const stripBox = strip.getBoundingClientRect();
      const stepBox = currentStep.getBoundingClientRect();
      strip.scrollLeft += stepBox.left - stripBox.left - (strip.clientWidth - stepBox.width) / 2;
    }
    if (changedStep) focusPublicControl(host.querySelector('#selection-title'));
    else if (inside) {
      const target = oldId ? host.querySelector(`#${oldId}`) : oldShift
        ? host.querySelector(`[data-selection-shift="${oldShift}"]`) : oldDate
        ? [...host.querySelectorAll('[data-selection-date]')].find((button) => button.dataset.selectionDate === oldDate)
        : oldName
        ? [...host.querySelectorAll('input')].find((input) => input.name === oldName && input.value === oldValue)
        : oldAction ? host.querySelector(`[data-${oldAction}]`) : null;
      if (target && !target.disabled) focusPublicControl(target, range);
      else focusPublicControl(host.querySelector('#selection-title'));
    }
    lastStep = stepKey;
    lastSelectedDate = state.selection?.date;
    announce(publicAnnouncement(state));
  };
}
