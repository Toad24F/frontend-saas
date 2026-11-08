import { dateLabel, validDate } from './dates.js';
import { publicAnnouncement, createAnnouncer, focusPublicControl } from './accessibility.js';
import { icon } from '../../shared/icons.js';
import { browseDefaults, optionPage, optionToolbar, optionPagination, publicSkeleton, periodSlots } from '../../shared/public/options.js';

// Escape local para no importar el módulo UI del panel ni sus datos de demo.
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const names = ['Servicio', 'Sucursal', 'Profesional', 'Fecha y hora'];
const titles = ['Elige un servicio', 'Elige una sucursal', 'Elige un profesional', 'Elige fecha y hora'];
const keys = ['servicioId', 'sucursalId', 'personalId'];
const lists = ['servicios', 'sucursales', 'profesionales'];
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
function dateStrip(selected, availableDates = []) {
  if (!validDate(selected)) return '';
  return `<div class="public-date-strip" aria-label="Días con horarios disponibles">${availableDates.map((value) => {
    const day = new Date(`${value}T12:00:00Z`);
    const shortDay = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short' }).format(day);
    const shortMonth = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'short' }).format(day);
    return `<button class="public-date-chip ${value === selected ? 'selected' : ''}" type="button" data-selection-date="${value}" aria-pressed="${value === selected}" aria-label="Consultar ${esc(dateLabel(value))}"><span>${esc(shortDay)}</span><strong>${day.getUTCDate()}</strong><small>${esc(shortMonth)}</small></button>`;
  }).join('')}</div>`;
}

// Radios nativos permiten selección con flechas y Tab. El controlador solo recibe
// IDs presentes en la respuesta pública vigente; el texto siempre se escapa.
export function renderSelection(state) {
  const { step, selection, query } = state;
  const busy = query.status === 'loading';
  const usable = query.status === 'ready';
  let content;
  if (step < 3) {
    const items = state.options[lists[step]];
    const browse = state.browse?.[step] || browseDefaults();
    const result = optionPage(items, step, browse);
    content = busy ? publicSkeleton() : `${usable ? optionToolbar(items, step, browse) : ''}<div id="public-option-results" tabindex="-1"><fieldset class="public-options" ${!usable ? 'disabled' : ''}><legend class="visually-hidden">${names[step]}</legend>${(usable ? result.rows : []).map((item) => {
      // Un servicio sin costo publicado conserva su duración, sin fabricar $0.
      const details = step === 0 ? [
        `${item.duracionMinutos} min`, ...(item.costo === undefined ? [] : [money(item.costo)]),
      ].join(' · ') : step === 1 ? [item.direccion, item.telefono].filter(Boolean).join(' · ') : item.especialidad;
      const description = step === 0 ? item.descripcion : step === 1 ? item.indicaciones : '';
      return `<label class="public-option"><input type="radio" name="public-option" data-selection="${keys[step]}" value="${item.id}" ${selection[keys[step]] === item.id ? 'checked' : ''}><span class="public-option-symbol" aria-hidden="true">${step === 0 ? icon('briefcase') : step === 1 ? icon('pin') : esc(item.nombre.trim().charAt(0))}</span><span class="public-option-copy"><strong>${esc(item.nombre)}</strong>${description ? `<span class="public-option-description">${esc(description)}</span>` : ''}${details ? `<small>${esc(details)}</small>` : ''}</span><span class="public-option-check" aria-hidden="true">${icon('check')}</span></label>`;
    }).join('')}</fieldset>${usable && !result.total ? '<div class="public-empty"><h3>No encontramos coincidencias</h3><p>Prueba otra búsqueda o limpia los filtros.</p><button type="button" class="btn btn-light" data-public-clear>Limpiar filtros</button></div>' : ''}${usable ? optionPagination(result) : ''}</div>`;
  } else {
    const zone = state.timeZone || state.options.sucursales.find((item) => item.id === selection.sucursalId)?.zonaHoraria;
    const shownSlots = periodSlots(state.slots, state.period);
    const nextDate = (state.availableDates || []).find((date) => date > selection.date);
    content = `<label class="public-date-label" for="public-date">Fecha de tu cita</label>
      <input class="form-control public-date" id="public-date" type="date" value="${esc(selection.date)}" aria-invalid="${query.status === 'invalid'}" aria-describedby="public-zone selection-status">
      <p id="public-zone" class="public-zone">Horarios de la sucursal · ${esc(zone)}</p>
      ${dateStrip(selection.date, state.availableDates)}
      <h3 class="public-day">Horarios disponibles${validDate(selection.date) ? ` para ${esc(dateLabel(selection.date))}` : ''}</h3>
      ${busy ? publicSkeleton(true) : ''}
      ${usable ? `<div class="public-periods" role="group" aria-label="Filtrar horarios por parte del día">${[['all', 'Todos'], ['morning', 'Mañana'], ['afternoon', 'Tarde']].map(([value, label]) => `<button class="btn btn-light" type="button" data-public-period="${value}" aria-pressed="${(state.period || 'all') === value}">${label} (${periodSlots(state.slots, value).length})</button>`).join('')}</div>` : ''}
      <fieldset class="public-slots" ${!usable ? 'disabled' : ''}><legend class="visually-hidden">Horarios disponibles en la zona ${esc(zone)}</legend>${(usable ? shownSlots : []).map((slot) =>
        `<label class="public-slot"><input type="radio" name="public-slot" value="${esc(slot.inicioUtc)}" data-slot ${selection.slot?.inicioUtc === slot.inicioUtc ? 'checked' : ''}><span>${esc(slot.horaInicio)}</span></label>`).join('')}</fieldset>
      ${selection.slot ? `<p class="public-selected">Horario seleccionado: ${esc(selection.slot.horaInicio)} · ${esc(zone)}</p>` : ''}
      ${usable && !shownSlots.length ? '<div class="public-empty"><h3>No hay horarios en esta parte del día</h3><p>Consulta todos los horarios o elige otra fecha.</p><button class="btn btn-light" type="button" data-public-period="all">Ver todos los horarios</button></div>' : ''}
      ${query.status === 'empty' ? `<div class="public-empty"><h3>No hay horarios disponibles para esta fecha</h3><p>Elige otro día para consultar horarios.</p>${!state.availableDates?.length ? '<p>No encontramos horarios disponibles en las fechas consultadas. Prueba otra fecha, sucursal o profesional.</p>' : ''}${nextDate ? `<button class="btn btn-primary" type="button" data-selection-date="${nextDate}">Ver siguiente día disponible</button>` : ''}<button class="btn btn-light" type="button" data-change-date>Cambiar fecha</button></div>` : ''}
      <p class="public-limit">${state.bookingAvailable ? 'El horario se comprobará de nuevo antes de conceder un apartado de cinco minutos.' : 'La consulta de horarios no garantiza una reserva. El apartado y la captura de datos aún no están disponibles en esta entrega.'}</p>`;
  }
  return `<div class="public-stage-heading"><span class="public-stage-eyebrow" aria-current="step">PASO ${String(step + 1).padStart(2, '0')} DE 06</span><h2 id="selection-title" tabindex="-1">${titles[step]}</h2><p>${['Selecciona el servicio que necesitas.', 'Elige la ubicación más cómoda para ti.', 'Conoce al equipo disponible para tu servicio.', 'Selecciona la fecha y el horario que mejor te convengan.'][step]}</p></div>
    <div aria-busy="${busy}">${content}</div>
    <p id="selection-status" ${step === 3 && query.status === 'empty' ? 'class="visually-hidden"' : ''}>${esc(query.message)}</p>
    ${(state.automaticSteps || []).length ? `<p class="public-auto-note">${state.automaticSteps.map((value) => names[value]).join(' y ')}: selección automática por ser la única opción disponible.</p>` : ''}
    <div class="public-selection-actions">${step < 3 && selection[keys[step]] ? `<p class="public-action-selection">Seleccionado: <strong>${esc(state.options[lists[step]].find((item) => item.id === selection[keys[step]])?.nombre || '')}</strong></p>` : ''}${step ? '<button type="button" class="btn btn-light" data-selection-back>Volver</button>' : ''}
      ${['error', 'invalid'].includes(query.status) || (step < 3 && query.status === 'empty') ? '<button type="button" class="btn btn-light" data-selection-retry>Reintentar consulta</button>' : ''}
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
  const browseInput = (event) => {
    if (event.isComposing) return;
    if (event.target.matches('[data-public-browse]')) controller.setBrowse(event.target.dataset.publicBrowse, event.target.value);
  };
  host.addEventListener('input', (event) => { if (event.target.type === 'search') browseInput(event); });
  host.addEventListener('compositionend', browseInput);
  host.addEventListener('change', (event) => {
    const input = event.target;
    if (input.matches('[data-selection]')) controller.choose(input.dataset.selection, Number(input.value));
    else if (input.matches('[data-slot]')) controller.chooseSlot(input.value);
    else if (input.id === 'public-date') void controller.setDate(input.value);
    else if (input.matches('select[data-public-browse]')) browseInput(event);
  });
  host.addEventListener('click', (event) => {
    const page = event.target.closest('[data-public-page]');
    if (page && !page.disabled) { controller.setBrowse('page', page.dataset.publicPage); focusPublicControl(host.querySelector('#public-option-results')); return; }
    if (event.target.closest('[data-public-clear]')) { controller.setBrowse('clear'); focusPublicControl(host.querySelector('#public-search') || host.querySelector('#selection-title')); return; }
    const period = event.target.closest('[data-public-period]');
    if (period) { controller.setPeriod(period.dataset.publicPeriod); return; }
    if (event.target.closest('[data-change-date]')) { focusPublicControl(host.querySelector('#public-date')); return; }
    if (event.target.closest('[data-selection-next]')) void controller.next();
    else if (event.target.closest('[data-selection-back]')) void controller.back();
    else if (event.target.closest('[data-selection-retry]')) void controller.retry();
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
    const oldPeriod = inside ? active.dataset.publicPeriod : '';
    const summaryWasOpen = content.querySelector('.public-summary-disclosure')?.open;
    const actions = ['selection-next', 'selection-back', 'selection-retry', 'return-availability', 'check-hold', 'submit-reservation', 'resolve-submission', 'repeat-submission', 'review-contact'];
    const oldAction = inside ? actions.find((key) => active.hasAttribute(`data-${key}`)) : null;
    const stepKey = `${state.phase}:${state.step}`;
    const changedStep = lastStep !== stepKey;
    const range = inside && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    const previousDateStrip = content.querySelector('.public-date-strip');
    const dateScroll = previousDateStrip?.scrollLeft || 0;
    const previousSelected = previousDateStrip?.querySelector('.public-date-chip.selected')?.dataset.selectionDate;
    content.innerHTML = renderView(state);
    const summary = content.querySelector('.public-summary-disclosure');
    if (summary && summaryWasOpen !== undefined) summary.open = summaryWasOpen;
    const dateStrip = content.querySelector('.public-date-strip');
    if (dateStrip) {
      const selectedChip = dateStrip.querySelector('.public-date-chip.selected');
      const firstChip = dateStrip.querySelector('.public-date-chip');
      if (selectedChip && firstChip && (lastSelectedDate !== state.selection?.date || previousSelected !== state.selection.date)) {
        const previousChip = selectedChip.previousElementSibling;
        dateStrip.scrollLeft = selectedChip.offsetLeft - firstChip.offsetLeft - (previousChip ? previousChip.offsetWidth + 9 : 0);
      } else dateStrip.scrollLeft = dateScroll;
    }
    const strip = host.querySelector('.public-steps');
    const currentStep = strip?.querySelector('[aria-current="step"]');
    if (currentStep && strip.scrollWidth > strip.clientWidth) {
      const stripBox = strip.getBoundingClientRect();
      const stepBox = currentStep.getBoundingClientRect();
      strip.scrollLeft += stepBox.left - stripBox.left - (strip.clientWidth - stepBox.width) / 2;
    }
    if (changedStep) focusPublicControl(host.querySelector('#selection-title'));
    else if (inside) {
      const target = oldId ? host.querySelector(`#${oldId}`) : oldDate
        ? [...host.querySelectorAll('[data-selection-date]')].find((button) => button.dataset.selectionDate === oldDate)
        : oldPeriod ? [...host.querySelectorAll('[data-public-period]')].find((button) => button.dataset.publicPeriod === oldPeriod)
        : oldName
        ? [...host.querySelectorAll('input')].find((input) => input.name === oldName && input.value === oldValue)
        : oldAction ? host.querySelector(`[data-${oldAction}]`) : null;
      if (target && !target.disabled) focusPublicControl(target, range);
      else focusPublicControl(host.querySelector('#selection-title'));
    }
    lastStep = stepKey;
    lastSelectedDate = state.selection?.date;
    const browsing = state.phase === 'selection' && state.step < 3 && state.query.status === 'ready';
    const result = browsing ? optionPage(state.options[lists[state.step]], state.step, state.browse?.[state.step]) : null;
    announce(browsing ? `${result.total} opciones encontradas. Página ${result.page} de ${result.pages}.${state.automaticSteps?.length ? ' Se seleccionaron automáticamente las etapas con una única opción disponible.' : ''}` : publicAnnouncement(state));
  };
}
