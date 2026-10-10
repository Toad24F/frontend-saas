import {
  db,
  list,
  resource,
  tenantById,
  TODAY,
  formatDate,
  date,
  money,
  appointmentInfo,
} from '../shared/data.js';
import { state, navigate } from '../shared/app.js';
import { icon } from '../shared/icons.js';
import { escape as esc, avatar, empty, toast } from '../shared/ui.js';
import {
  slots,
  nextDates,
  holdSlot,
  releaseHold,
  createAppointment,
} from './availability.js';

let booking = {
  tenantId: null,
  step: 1,
  serviceId: null,
  branchId: null,
  professionalId: null,
  day: TODAY,
  start: null,
  hold: null,
  contact: { name: '', phone: '', reason: '' },
  confirmed: null,
};
let lastRenderedStepKey = '';
const stepNames = [
  'Servicio',
  'Sucursal',
  'Profesional',
  'Fecha y hora',
  'Tus datos',
  'Confirmación',
];
const stepTitles = [
  '¿Cómo podemos cuidarte?',
  'Encuentra tu sucursal',
  'Elige quién te acompaña',
  'Un espacio en tu día',
  'Ya casi está, cuéntanos de ti',
  'Tu cita está confirmada',
];
const stepDescriptions = [
  'Selecciona el servicio que necesitas.',
  'Elige la ubicación más cómoda para ti.',
  'Conoce al equipo disponible para tu servicio.',
  'Selecciona la fecha y el horario que mejor te convengan.',
  'Solo necesitamos algunos datos para preparar tu visita.',
  'Nos dará mucho gusto recibirte.',
];
function options() {
  return {
    tenantId: booking.tenantId,
    serviceId: booking.serviceId,
    branchId: booking.branchId,
    professionalId: booking.professionalId,
    day: booking.day,
  };
}
function reset(id) {
  if (booking.hold) releaseHold(booking.hold.id);
  booking = {
    tenantId: id,
    step: 1,
    serviceId: null,
    branchId: null,
    professionalId: null,
    day: TODAY,
    start: null,
    hold: null,
    contact: { name: '', phone: '', reason: '' },
    confirmed: null,
  };
}
export function renderPortal(slug) {
  const tenant = db.tenants.find((t) => t.slug === slug);
  if (!tenant || tenant.suspended) {
    document.querySelector('#app').innerHTML =
      `<div class="portal-unavailable"><a class="brand portal-brand" href="/admin/agenda" data-nav="agenda"><img src="/favicon.svg" alt=""/>cita.</a>${empty('Este portal no está disponible', 'Revisa el enlace o comunícate directamente con el negocio.', '<a href="/admin/agenda" data-nav="agenda" class="btn btn-light">Volver a la demostración</a>')}</div>`;
    return;
  }
  if (booking.tenantId !== tenant.id) reset(tenant.id);
  if (state.tenantId !== tenant.id) {
    state.branch = state.professional = state.status = 'all';
    state.scheduleProfessional = null;
  }
  state.tenantId = tenant.id;
  const previousStep = Number(lastRenderedStepKey.split(':')[1]);
  document.body.dataset.motionDirection = booking.step < previousStep ? 'back' : 'forward';
  const stepKey = `${tenant.id}:${booking.step}`;
  const animateStep = stepKey !== lastRenderedStepKey;
  lastRenderedStepKey = stepKey;
  document.querySelector('#app').innerHTML =
    `<div class="booking-layout"><header class="portal-topbar"><a class="brand portal-brand" href="/reservas/${tenant.slug}" data-book-reset><img src="/favicon.svg" alt=""/>cita<span class="brand-dot">.</span></a><span class="portal-topbar-caption">Un momento para tu bienestar</span><a class="text-button" href="/admin/agenda" data-nav="agenda">${icon('left')} Volver al panel <span class="demo-pill">Demo</span></a></header><main class="booking-main"><div class="booking-business">${avatar(tenant.initials, 'mint', 'avatar-large')}<div><h1>${esc(tenant.name)}</h1><p>${esc(tenant.category)} <span>·</span> Chihuahua, México</p></div><span class="soft-tag">Reservas en línea</span></div><nav class="booking-steps" aria-label="Pasos de reserva">${stepNames.map((name, i) => `<div class="booking-step ${booking.step === i + 1 ? 'current' : ''} ${booking.step > i + 1 ? 'done' : ''}" ${booking.step === i + 1 ? 'aria-current="step"' : ''}><span>${booking.step > i + 1 ? icon('check') : i + 1}</span><strong>${name}</strong></div>`).join('')}</nav><div class="booking-columns"><section class="booking-surface ${booking.step === 6 ? 'confirmation-surface' : ''} ${animateStep ? 'motion-enter' : ''}"><div class="booking-title"><span class="eyebrow">${booking.step === 6 ? 'NOS VEMOS PRONTO' : `PASO ${String(booking.step).padStart(2, '0')} DE 06`}</span><h2>${stepTitles[booking.step - 1]}</h2><p>${stepDescriptions[booking.step - 1]}</p></div>${stepContent()}${booking.step < 5 ? `<div class="booking-controls"><button class="btn btn-subtle" data-book-back ${booking.step === 1 ? 'disabled' : ''}>${icon('left')}Atrás</button><button class="btn btn-primary" data-book-next ${canContinue() ? '' : 'disabled'}>Continuar ${icon('arrow')}</button></div>` : ''}</section><aside class="booking-aside">${booking.step === 6 ? visitNote(tenant) : summary(tenant)}<div class="booking-trust">${icon('shield')}<p>Este es un prototipo. Usa datos ficticios; no se realiza una reserva real ni se envían mensajes.</p></div></aside></div></main><footer class="portal-footer"><span>Tu tiempo importa. Tu bienestar, también.</span><span>Reservas con <strong>cita.</strong></span></footer></div>`;
  const stepStrip = document.querySelector('.booking-steps');
  const activeStep = stepStrip?.querySelector('.booking-step.current');
  if (activeStep && stepStrip.scrollWidth > stepStrip.clientWidth) {
    const stripBox = stepStrip.getBoundingClientRect();
    const activeBox = activeStep.getBoundingClientRect();
    stepStrip.scrollLeft += activeBox.left - stripBox.left
      - (stepStrip.clientWidth - activeBox.width) / 2;
  }
}
function canContinue() {
  return Boolean(
    [
      null,
      booking.serviceId,
      booking.branchId,
      booking.professionalId,
      booking.start,
    ][booking.step],
  );
}
function choice(id, kind, content, selected) {
  return `<button class="booking-choice ${selected === id ? 'selected' : ''}" data-book-choice="${kind}" data-value="${id}" aria-pressed="${selected === id}">${content}<span class="choice-radio">${selected === id ? icon('check') : ''}</span></button>`;
}
function stepContent() {
  const t = tenantById(booking.tenantId);
  if (booking.step === 1)
    return `<div class="booking-choices service-choices">${
      list('services', t.id)
        .map((s) =>
          choice(
            s.id,
            'serviceId',
            `<span class="service-icon ${s.color}">${icon(s.icon)}</span><span class="choice-content"><strong>${esc(s.name)}</strong><p>${esc(s.description)}</p><span class="choice-meta">${icon('clock')}${s.duration} min <i></i>${money(s.price)} MXN</span></span>`,
            booking.serviceId,
          ),
        )
        .join('') ||
      empty('Próximamente', 'El negocio aún está preparando su catálogo.')
    }</div>`;
  if (booking.step === 2) {
    const branches = list('branches', t.id).filter((b) =>
      list('professionals', t.id).some(
        (p) =>
          p.serviceIds.includes(booking.serviceId) &&
          p.branchIds.includes(b.id),
      ),
    );
    return `<div class="booking-choices">${branches.map((b) => choice(b.id, 'branchId', `<span class="service-icon orange">${icon('pin')}</span><span class="choice-content"><strong>${esc(b.name)}</strong><p>${esc(b.address)}</p><small>${esc(b.notes)}</small></span>`, booking.branchId)).join('') || empty('Sin sucursales disponibles', 'El negocio aún no asigna este servicio a un profesional.')}</div>`;
  }
  if (booking.step === 3) {
    return `<div class="booking-choices">${list('professionals', t.id)
      .filter(
        (p) =>
          p.serviceIds.includes(booking.serviceId) &&
          p.branchIds.includes(booking.branchId),
      )
      .map((p) =>
        choice(
          p.id,
          'professionalId',
          `${avatar(p.initials, p.color, 'avatar-large')}<span class="choice-content"><strong>${esc(p.name)}</strong><p>${esc(p.specialty)}</p><span class="professional-available">${icon('circleCheck')} Agenda disponible</span></span>`,
          booking.professionalId,
        ),
      )
      .join('')}</div>`;
  }
  if (booking.step === 4) {
    let dates = nextDates({ ...options(), from: TODAY }, 45);
    if (t.mode === 'compact') dates = dates.slice(0, 1);
    if (!dates.some((d) => d.day === booking.day)) {
      booking.day = dates[0]?.day || TODAY;
      booking.start = null;
    }
    const available = dates.find((d) => d.day === booking.day)?.slots || [];
    return `<div class="date-picker-heading"><h3>${formatDate(booking.day, { month: 'long', year: 'numeric' })}</h3><span>${icon('clock')} Hora de Chihuahua</span></div><div class="booking-date-strip">${dates
      .slice(0, 14)
      .map(
        (d) =>
          `<button class="booking-date ${d.day === booking.day ? 'selected' : ''}" data-book-date="${d.day}" aria-label="${formatDate(d.day)}" aria-pressed="${d.day === booking.day}"><span>${formatDate(d.day, { weekday: 'short' })}</span><strong>${date(d.day).getDate()}</strong><small>${formatDate(d.day, { month: 'short' })}</small></button>`,
      )
      .join(
        '',
      )}</div>${t.mode === 'compact' ? '<div class="information-note compact-note">Mostramos el primer día disponible y horarios contiguos para aprovechar mejor la jornada.</div>' : ''}<h3 class="slot-heading">Horarios disponibles</h3><div class="booking-slot-grid">${available.map((time) => `<button class="booking-slot ${booking.start === time ? 'selected' : ''}" data-book-time="${time}" aria-pressed="${booking.start === time}">${time}</button>`).join('')}</div>${available.length ? '' : empty('No hay espacios disponibles', 'Prueba con otro profesional o sucursal. La búsqueda cubre los próximos 45 días.')}<p class="field-hint mt-4">${icon('info')} Tu horario se apartará durante 5 minutos en el siguiente paso.</p>`;
  }
  if (booking.step === 5)
    return `<form id="contact-form"><div class="hold-notice">${icon('lock')}<span>Estamos guardando tu horario.<br/><small>Completa tus datos en <strong id="hold-timer">05:00</strong></small></span></div><div class="form-field"><label class="form-label" for="contact-name">Nombre completo <span>*</span></label><input class="form-control" id="contact-name" name="name" required maxlength="150" placeholder="Tu nombre y apellidos" value="${esc(booking.contact.name)}" autocomplete="off"/></div><div class="form-field"><label class="form-label" for="contact-phone">Teléfono de WhatsApp <span>*</span></label><div class="phone-input"><span>MX +52</span><input class="form-control" id="contact-phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9]{10}" minlength="10" maxlength="10" required placeholder="614 000 0000" value="${esc(booking.contact.phone)}" autocomplete="off"/></div><p class="field-hint">10 dígitos, sin espacios ni código de país.</p></div><div class="form-field"><label class="form-label" for="contact-reason">Motivo de consulta <span class="optional">(opcional)</span></label><textarea class="form-control" id="contact-reason" name="reason" rows="3" maxlength="500" placeholder="¿Hay algo que debamos saber?">${esc(booking.contact.reason)}</textarea></div><p class="privacy-note">Usa información ficticia. Tus datos solo se conservarán mientras esta demostración esté abierta.</p><p class="form-error" id="booking-error" role="alert" hidden></p><div class="booking-controls"><button type="button" class="btn btn-subtle" data-book-back>${icon('left')}Atrás</button><button type="submit" class="btn btn-primary">Confirmar mi cita ${icon('check')}</button></div></form>`;
  const a = appointmentInfo(booking.confirmed);
  return `<div class="confirmation-content"><span class="success-orbit">${icon('check')}</span><h3>¡Listo, ${esc(a.client.name.split(' ')[0])}!</h3><p>Guarda tu folio para identificar esta cita de demostración.</p><div class="confirmation-folio"><span>FOLIO DE CONTROL</span><strong>${a.folio}</strong><button class="icon-btn" data-copy-folio aria-label="Copiar folio">${icon('link')}</button></div><div class="confirmation-details"><span>${icon('briefcase')}<strong>${esc(a.service.name)}</strong></span><span>${icon('calendar')}${formatDate(a.date)} · ${a.start} h</span><span>${icon('stethoscope')}${esc(a.professional.name)}</span><span>${icon('pin')}${esc(a.branch.name)}</span></div><div class="information-note compact-note">${icon('info')} No se ha realizado ningún cobro. No se enviará WhatsApp en este prototipo.</div><button class="btn btn-primary w-100 mt-4" data-book-reset>Reservar otra cita ${icon('arrow')}</button><a href="/admin/agenda" data-nav="agenda" class="text-button confirmation-admin">Ver cita en el panel ${icon('external')}</a></div>`;
}
function summary(t) {
  const s = booking.serviceId
      ? resource('services', booking.serviceId, t.id)
      : null,
    b = booking.branchId ? resource('branches', booking.branchId, t.id) : null,
    p = booking.professionalId
      ? resource('professionals', booking.professionalId, t.id)
      : null;
  return `<div class="booking-summary glass-effect"><div class="summary-top">${icon('calendar')}<h3>Tu próxima visita</h3></div><p>Un espacio reservado para ti.</p><div class="summary-items">${[
    [s?.name, 'Selecciona un servicio', 'briefcase'],
    [b?.name, 'Elige tu sucursal', 'pin'],
    [p?.name, 'Elige un profesional', 'stethoscope'],
    [
      booking.start
        ? `${formatDate(booking.day, { day: 'numeric', month: 'short' })} · ${booking.start} h`
        : null,
      'Encuentra tu horario',
      'clock',
    ],
  ]
    .map(
      ([value, fallback, i]) =>
        `<div class="${value ? 'filled' : ''}">${icon(i)}<span>${esc(value || fallback)}</span></div>`,
    )
    .join(
      '',
    )}</div>${s ? `<div class="summary-price"><span>${s.duration} minutos</span><strong>${money(s.price)} <small>MXN</small></strong></div><p class="summary-payment">Pago directamente en sucursal.</p>` : ''}<div class="summary-flower" aria-hidden="true">${icon('leaf')}</div></div>`;
}
function visitNote(t) {
  return `<div class="booking-summary glass-effect"><div class="summary-top">${icon('heart')}<h3>Antes de tu visita</h3></div><p>Te recomendamos llegar 10 minutos antes de tu cita.</p><div class="summary-items"><div class="filled">${icon('pin')}<span>${esc(resource('branches', booking.branchId, t.id).notes)}</span></div><div class="filled">${icon('message')}<span>${esc(t.phone)}</span></div></div></div>`;
}
const redraw = () => renderPortal(tenantById(booking.tenantId).slug);
document.addEventListener('click', (e) => {
  if (!location.pathname.startsWith('/reservas/') || !booking.tenantId) return;
  const resetEl = e.target.closest('[data-book-reset]');
  if (resetEl) {
    e.preventDefault();
    reset(booking.tenantId);
    redraw();
    return;
  }
  const choice = e.target.closest('[data-book-choice]');
  if (choice) {
    const key = choice.dataset.bookChoice,
      id = Number(choice.dataset.value);
    const tables = {
      serviceId: 'services',
      branchId: 'branches',
      professionalId: 'professionals',
    };
    if (!tables[key]) return;
    resource(tables[key], id, booking.tenantId);
    booking[key] = id;
    if (key === 'serviceId') {
      booking.branchId = booking.professionalId = null;
    }
    if (key === 'branchId') booking.professionalId = null;
    booking.start = null;
    redraw();
    return;
  }
  const dateEl = e.target.closest('[data-book-date]');
  if (dateEl) {
    booking.day = dateEl.dataset.bookDate;
    booking.start = null;
    redraw();
    return;
  }
  const timeEl = e.target.closest('[data-book-time]');
  if (timeEl) {
    booking.start = timeEl.dataset.bookTime;
    redraw();
    return;
  }
  if (e.target.closest('[data-book-back]')) {
    if (booking.hold) {
      releaseHold(booking.hold.id);
      booking.hold = null;
    }
    booking.step = Math.max(1, booking.step - 1);
    redraw();
    return;
  }
  if (e.target.closest('[data-book-next]')) {
    if (!canContinue()) return;
    try {
      if (booking.step === 4) booking.hold = holdSlot(options(), booking.start);
      booking.step++;
      redraw();
    } catch (error) {
      booking.start = null;
      toast(error.message);
      redraw();
    }
    return;
  }
  if (e.target.closest('[data-copy-folio]'))
    navigator.clipboard
      .writeText(booking.confirmed.folio)
      .then(() => toast('Folio copiado.'))
      .catch(() => toast(`Tu folio: ${booking.confirmed.folio}`));
});
document.addEventListener('input', (e) => {
  if (
    e.target.closest('#contact-form') &&
    ['name', 'phone', 'reason'].includes(e.target.name)
  )
    booking.contact[e.target.name] = e.target.value;
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'contact-form') return;
  e.preventDefault();
  try {
    booking.confirmed = createAppointment(
      { ...options(), start: booking.start },
      booking.contact,
      booking.hold?.id,
    );
    booking.hold = null;
    booking.step = 6;
    state.date = booking.day;
    state.branch = state.professional = state.status = 'all';
    redraw();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    const el = document.querySelector('#booking-error');
    el.hidden = false;
    el.textContent = error.message;
  }
});
setInterval(() => {
  if (!booking.hold) return;
  if (!location.pathname.startsWith('/reservas/')) {
    releaseHold(booking.hold.id);
    booking.hold = null;
    booking.step = 4;
    return;
  }
  const remaining = Math.max(
    0,
    Math.ceil((booking.hold.expiresAt - Date.now()) / 1000),
  );
  const timer = document.querySelector('#hold-timer');
  if (timer)
    timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  if (!remaining) {
    releaseHold(booking.hold.id);
    booking.hold = null;
    booking.step = 4;
    booking.start = null;
    redraw();
    toast('El tiempo de reserva terminó. Puedes seleccionar otro horario.');
  }
}, 1000);
