import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import './theme.css';
import { icon } from './icons.js';
import { calendarColumns } from './calendar-layout.js';
import {
  loadData,
  db,
  TODAY,
  addDays,
  date,
  iso,
  formatDate,
  list,
  appointmentInfo,
  tenantById,
  statuses,
} from './data.js';
import { escape, avatar, badge, pageHead, button, toast, empty } from './ui.js';

const themeKey = 'cita-theme';
let theme = (() => {
  try {
    const saved = localStorage.getItem(themeKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // El prototipo sigue funcionando si el navegador bloquea el almacenamiento.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0e1915' : '#f5f7f4');
}
applyTheme();
function mountThemeToggle() {
  const host = document.querySelector('.topbar-right, .portal-topbar');
  if (!host) return;
  const dark = theme === 'dark';
  host.insertAdjacentHTML(
    'beforeend',
    `<button type="button" class="theme-toggle icon-btn" data-action="theme" aria-label="Activar modo ${dark ? 'claro' : 'oscuro'}" title="Modo ${dark ? 'claro' : 'oscuro'}" aria-pressed="${dark}">${icon(dark ? 'sun' : 'moon')}</button>`,
  );
}
function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  try { localStorage.setItem(themeKey, theme); } catch { /* preferencia temporal */ }
  document.querySelectorAll('.theme-toggle').forEach((button) => {
    const dark = theme === 'dark';
    button.innerHTML = icon(dark ? 'sun' : 'moon');
    button.setAttribute('aria-label', `Activar modo ${dark ? 'claro' : 'oscuro'}`);
    button.setAttribute('title', `Modo ${dark ? 'claro' : 'oscuro'}`);
    button.setAttribute('aria-pressed', String(dark));
  });
}

export const state = {
  tenantId: 1,
  page: 'agenda',
  calendarView: matchMedia('(max-width: 767px)').matches ? 'day' : 'week',
  date: TODAY,
  branch: 'all',
  professional: 'all',
  status: 'all',
  search: '',
};
const nav = [
  ['general', 'PRINCIPAL'],
  ['resumen', 'grid', 'Resumen'],
  ['agenda', 'calendar', 'Agenda'],
  ['clientes', 'users', 'Clientes'],
  ['business', 'MI NEGOCIO'],
  ['profesionales', 'stethoscope', 'Profesionales'],
  ['servicios', 'briefcase', 'Servicios'],
  ['sucursales', 'pin', 'Sucursales'],
  ['disponibilidad', 'clock', 'Disponibilidad'],
  ['analytics', 'ANÁLISIS'],
  ['reportes', 'chart', 'Reportes'],
  ['notificaciones', 'message', 'Notificaciones'],
];
const labels = Object.fromEntries(
  nav.filter((n) => n.length === 3).map((n) => [n[0], n[2]]),
);
labels.configuracion = 'Configuración';
labels.plataforma = 'Negocios';
export function navigate(page) {
  history.pushState({}, '', `/admin/${page}`);
  state.page = page;
  state.search = '';
  render();
}
export function renderShell(content) {
  const tenant = tenantById(state.tenantId);
  document.querySelector('#app').innerHTML =
    `<div class="admin-layout"><div class="sidebar-overlay" data-action="menu"></div><aside class="sidebar"><a class="brand" href="/admin/agenda" data-nav="agenda"><img src="/favicon.svg" alt=""/>cita<span class="brand-dot">.</span></a><button class="workspace-switch glass-effect glass-effect--dark" data-action="switch-tenant">${avatar(tenant.initials, 'workspace-avatar')}<span><strong>${escape(tenant.name)}</strong><small>Espacio de trabajo</small></span>${icon('down')}</button><nav aria-label="Navegación principal">${nav.map((n) => (n.length === 2 ? `<div class="nav-section">${n[1]}</div>` : `<a href="/admin/${n[0]}" data-nav="${n[0]}" class="nav-item ${state.page === n[0] ? 'active' : ''}" ${state.page === n[0] ? 'aria-current="page"' : ''}>${icon(n[1])}<span>${n[2]}</span>${n[0] === 'agenda' ? `<span class="nav-count">${list('appointments', state.tenantId).filter((a) => a.date === TODAY).length}</span>` : ''}</a>`)).join('')}</nav><div class="sidebar-bottom"><a href="/admin/configuracion" data-nav="configuracion" class="nav-item ${state.page === 'configuracion' ? 'active' : ''}">${icon('settings')}<span>Configuración</span></a><div class="portal-card"><div class="portal-icon">${icon('link')}</div><strong>Tu agenda, a un enlace</strong><p>Comparte tu portal y recibe reservas en línea.</p><a href="/reservas/${tenant.slug}" data-portal>Ver portal de reservas ${icon('external')}</a></div><div class="sidebar-foot"><span class="green-dot"></span> Entorno de demostración <span>v1.0</span></div></div></aside><div class="main-layout"><header class="topbar"><div class="breadcrumbs"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Abrir menú">${icon('menu')}</button><span>Mi espacio</span>${icon('chevron')}<strong>${labels[state.page] || 'Agenda'}</strong></div><div class="topbar-right"><span class="demo-pill">Prototipo</span><span class="topbar-date">${icon('calendar')} ${formatDate(TODAY, { day: 'numeric', month: 'short', year: 'numeric' })}</span><button class="notification-button icon-btn" data-nav="notificaciones" aria-label="Ver notificaciones">${icon('bell')}<i></i></button><span class="topbar-divider"></span><button class="profile-button" data-nav="configuracion">${avatar('AV', 'peach')}<span><strong>Adriana Vega</strong><small>Administradora</small></span>${icon('down')}</button></div></header><main id="main-content" class="main-content">${content}</main><footer class="app-footer"><span>Un poco más de orden. Más tiempo para cuidar.</span><span>Hecho para tu día a día <span class="footer-logo">cita.</span></span></footer></div></div>`;
  mountThemeToggle();
}
export function filteredAppointments() {
  return list('appointments', state.tenantId).filter(
    (a) =>
      (state.branch === 'all' || a.branchId === Number(state.branch)) &&
      (state.professional === 'all' ||
        a.professionalId === Number(state.professional)) &&
      (state.status === 'all' || a.status === state.status) &&
      (!state.search ||
        appointmentInfo(a)
          .client.name.toLowerCase()
          .includes(state.search.toLowerCase())),
  );
}
export function stats() {
  const today = list('appointments', state.tenantId).filter(
    (a) => a.date === state.date,
  );
  const pending = today.filter((a) => a.status === 'pendiente').length,
    confirmed = today.filter((a) => a.status === 'confirmada').length,
    completed = today.filter((a) => a.status === 'completada').length;
  return `<div class="stats-grid">${[
    [
      today.length,
      'Citas del día',
      'calendar',
      'orange',
      'Tu jornada, de un vistazo',
    ],
    [
      confirmed,
      'Confirmadas',
      'circleCheck',
      'blue',
      'Todo listo para recibirles',
    ],
    [
      pending,
      'Por confirmar',
      'clock',
      'amber',
      pending ? 'Esperando confirmación' : 'Estás al día',
    ],
    [
      completed,
      'Completadas',
      'check',
      'green',
      'Atención que hace la diferencia',
    ],
  ]
    .map(
      ([n, label, ico, color, desc]) =>
        `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(ico)}</span></div><div class="stat-number">${String(n).padStart(2, '0')}</div><div class="stat-caption">${color === 'green' ? '<span class="mini-dot green"></span>' : ''}${desc}</div></div>`,
    )
    .join('')}</div>`;
}
export function agendaView() {
  const monday = addDays(state.date, 1 - (date(state.date).getDay() || 7));
  const days =
    state.calendarView === 'day'
      ? [state.date]
      : Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const apps = filteredAppointments();
  let title =
    state.calendarView === 'day'
      ? formatDate(state.date)
      : `${date(monday).getDate()} – ${date(addDays(monday, 6)).getDate()} de ${formatDate(addDays(monday, 6), { month: 'long', year: 'numeric' })}`;
  if (state.calendarView === 'month')
    title = formatDate(state.date, { month: 'long', year: 'numeric' });
  const selectFilter = (kind, label, items) =>
    `<label class="filter-select">${icon(kind === 'branch' ? 'pin' : kind === 'professional' ? 'users' : 'circleCheck')}<select aria-label="${label}" data-filter="${kind}"><option value="all">${label}</option>${items.map((o) => `<option value="${o.id}" ${String(state[kind]) === String(o.id) ? 'selected' : ''}>${escape(o.name)}</option>`).join('')}</select>${icon('down')}</label>`;
  return `${pageHead('Agenda', 'Organiza tu día. Conecta con tus pacientes.', `<a class="btn btn-light" href="/reservas/${tenantById(state.tenantId).slug}" data-portal>${icon('external')}Portal de reservas</a>${button('Nueva cita', 'new-appointment')}`)}${stats()}<section class="calendar-panel" aria-label="Calendario de citas"><div class="calendar-toolbar"><div class="calendar-date"><h2>${title}</h2><div class="date-arrows"><button class="icon-btn" data-action="previous" aria-label="Periodo anterior">${icon('left')}</button><button class="icon-btn" data-action="next" aria-label="Periodo siguiente">${icon('chevron')}</button></div><button class="btn btn-today" data-action="today">Hoy</button></div><div class="segmented" aria-label="Vista del calendario">${[
    ['day', 'Día'],
    ['week', 'Semana'],
    ['month', 'Mes'],
  ]
    .map(
      ([v, l]) =>
        `<button data-view="${v}" class="${state.calendarView === v ? 'selected' : ''}" aria-pressed="${state.calendarView === v}">${l}</button>`,
    )
    .join(
      '',
    )}</div></div><div class="calendar-filters"><div class="filter-group">${selectFilter('branch', 'Todas las sucursales', list('branches', state.tenantId))}${selectFilter('professional', 'Todos los profesionales', list('professionals', state.tenantId))}${selectFilter(
    'status',
    'Todos los estados',
    Object.entries(statuses).map(([id, name]) => ({ id, name })),
  )}</div><label class="search-field">${icon('search')}<input type="search" id="agenda-search" placeholder="Buscar paciente..." aria-label="Buscar paciente" value="${escape(state.search)}"/></label></div>${state.calendarView === 'month' ? monthGrid(apps) : weekGrid(days, apps)}<div class="calendar-footer"><div class="legend">${Object.entries(
    statuses,
  )
    .map(([s, l]) => `<span><i class="legend-dot ${s}"></i>${l}</span>`)
    .join(
      '',
    )}</div><span class="timezone">GMT-6 · Chihuahua</span></div></section><div class="agenda-note">${icon('info')} Los horarios se muestran en la zona horaria de tu negocio.<span>Datos ficticios · 8 de septiembre de 2026</span></div>`;
}
function weekGrid(days, apps) {
  const hourHeight = 76;
  return `<div class="calendar-scroll"><div class="week-calendar ${days.length === 1 ? 'single-day' : ''}" style="--days:${days.length};--hour-height:${hourHeight}px"><div class="week-header"><span class="time-header">GMT-6</span>${days.map((day) => `<button class="day-header ${day === TODAY ? 'is-today' : ''} ${date(day).getDay() === 0 || date(day).getDay() === 6 ? 'weekend' : ''}" data-day="${day}"><span>${formatDate(day, { weekday: 'short' }).replace('.', '')}</span><strong>${date(day).getDate()}</strong>${day === TODAY ? '<i></i>' : ''}</button>`).join('')}</div><div class="week-body"><div class="time-gutter">${Array.from({ length: 10 }, (_, i) => `<span style="top:${i * hourHeight}px">${String(i + 9).padStart(2, '0')}:00</span>`).join('')}</div>${days
    .map((day) => {
      const dayApps = apps.filter((a) => a.date === day);
      const columns = calendarColumns(dayApps);
      return `<div class="day-column ${day === TODAY ? 'is-today' : ''} ${[0, 6].includes(date(day).getDay()) ? 'weekend' : ''}" data-calendar-date="${day}">${Array.from({ length: 9 }, (_, i) => `<button class="calendar-cell" data-slot-date="${day}" data-slot-time="${String(i + 9).padStart(2, '0')}:00" aria-label="Nueva cita el ${formatDate(day)} a las ${i + 9}:00"></button>`).join('')}<div class="lunch-block" style="top:${4 * hourHeight}px;height:${hourHeight}px">${icon('coffee')}<span>Descanso</span></div>${dayApps
        .map((a) => {
          const e = appointmentInfo(a);
          const start =
            Number(a.start.slice(0, 2)) * 60 + Number(a.start.slice(3));
          const end = Number(a.end.slice(0, 2)) * 60 + Number(a.end.slice(3));
          const { lane, width } = columns.get(a.id);
          return `<button class="calendar-event ${a.status}" data-appointment="${a.id}" style="top:${((start - 540) / 60) * hourHeight + 3}px;height:${Math.max(((end - start) / 60) * hourHeight - 6, 48)}px;left:calc(${lane * width}% + 5px);width:calc(${width}% - 10px)" aria-label="${escape(e.client.name)}, ${a.start}, ${statuses[a.status]}"><span class="event-time">${a.start} – ${a.end}${a.status === 'completada' ? icon('check') : ''}</span><strong>${escape(e.client.name)}</strong><span class="event-service">${escape(e.service.name)}</span><span class="event-professional">${escape(e.professional.name)}</span></button>`;
        })
        .join(
          '',
        )}${day === TODAY ? `<div class="current-time" style="top:${(11 + 20 / 60 - 9) * hourHeight}px"><i></i></div>` : ''}${[0, 6].includes(date(day).getDay()) && !dayApps.length ? '<span class="day-off">Sin citas</span>' : ''}</div>`;
    })
    .join('')}</div></div></div>`;
}
function monthGrid(apps) {
  const first = `${state.date.slice(0, 7)}-01`,
    start = addDays(first, 1 - (date(first).getDay() || 7));
  return `<div class="month-scroll"><div class="month-calendar">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="month-label">${d}</div>`).join('')}${Array.from(
    { length: 42 },
    (_, i) => {
      const day = addDays(start, i),
        dayApps = apps.filter((a) => a.date === day);
      return `<div class="month-day ${day.slice(0, 7) !== state.date.slice(0, 7) ? 'muted-day' : ''} ${day === TODAY ? 'is-today' : ''}"><button class="month-date" data-day="${day}">${date(day).getDate()}</button>${dayApps
        .slice(0, 3)
        .map(
          (a) =>
            `<button class="month-event ${a.status}" data-appointment="${a.id}">${a.start} ${escape(appointmentInfo(a).client.name)}</button>`,
        )
        .join(
          '',
        )}${dayApps.length > 3 ? `<button class="month-more" data-day="${day}">+${dayApps.length - 3} citas más</button>` : ''}</div>`;
    },
  ).join('')}</div></div>`;
}
let extraViews = null,
  booking = null,
  actions = null;
export function render() {
  document.title = `${import.meta.env.VITE_APP_NAME || 'Cita'} · ${location.pathname.startsWith('/reservas/') ? 'Reserva tu cita' : labels[state.page] || 'Agenda'}`;
  const path = location.pathname;
  if (path.startsWith('/reservas/')) {
    if (booking) booking.renderPortal(path.split('/')[2]);
    mountThemeToggle();
    return;
  }
  renderShell(
    state.page === 'agenda'
      ? agendaView()
      : extraViews
        ? extraViews.renderView(state.page)
        : empty('Preparando esta vista', 'La agenda ya está disponible.'),
  );
}
document.addEventListener('click', async (e) => {
  const navEl = e.target.closest('[data-nav]');
  if (navEl) {
    e.preventDefault();
    navigate(navEl.dataset.nav);
    return;
  }
  const portal = e.target.closest('[data-portal]');
  if (portal) {
    e.preventDefault();
    history.pushState({}, '', portal.getAttribute('href'));
    render();
    return;
  }
  const view = e.target.closest('[data-view]');
  if (view) {
    state.calendarView = view.dataset.view;
    render();
    return;
  }
  const day = e.target.closest('[data-day]');
  if (day) {
    state.date = day.dataset.day;
    state.calendarView = 'day';
    render();
    return;
  }
  const el = e.target.closest('[data-action]');
  if (el) {
    const action = el.dataset.action;
    if (action === 'theme') {
      toggleTheme();
      return;
    }
    if (action === 'menu') {
      document.querySelector('.admin-layout')?.classList.toggle('menu-open');
      return;
    }
    if (action === 'today') {
      state.date = TODAY;
      render();
      return;
    }
    if (action === 'previous' || action === 'next') {
      const n = action === 'next' ? 1 : -1;
      if (state.calendarView === 'month') {
        const d = date(state.date);
        d.setDate(1);
        d.setMonth(d.getMonth() + n);
        state.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      } else
        state.date = addDays(
          state.date,
          n * (state.calendarView === 'week' ? 7 : 1),
        );
      render();
      return;
    }
  }
  if (actions) actions.handleClick(e);
});
document.addEventListener('change', (e) => {
  if (e.target.dataset.filter) {
    state[e.target.dataset.filter] = e.target.value;
    render();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'agenda-search') {
    const pos = e.target.selectionStart;
    state.search = e.target.value;
    render();
    const input = document.querySelector('#agenda-search');
    input.focus();
    try {
      input.setSelectionRange(pos, pos);
    } catch {
      /* search inputs may not support selection */
    }
  }
});
window.addEventListener('popstate', () => {
  state.page = location.pathname.split('/')[2] || 'agenda';
  render();
});
async function start() {
  try {
    await loadData();
    state.page = location.pathname.startsWith('/admin/')
      ? location.pathname.split('/')[2]
      : 'agenda';
    [extraViews, booking, actions] = await Promise.all([
      import('./views.js'),
      import('./booking.js'),
      import('./actions.js'),
    ]);
    render();
    registerCalendarTool();
  } catch (error) {
    document.querySelector('#app').innerHTML =
      `<div class="startup-error"><img src="/favicon.svg" alt=""/><h1>No pudimos abrir tu agenda</h1><p>${escape(error.message)}</p><button class="btn btn-primary" onclick="location.reload()">Volver a intentar</button></div>`;
  }
}
// Mejora progresiva: los navegadores sin WebMCP siguen usando la misma interfaz.
function registerCalendarTool() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  try {
    Promise.resolve(
      context.registerTool(
        {
          name: 'show_calendar_view',
          title: 'Mostrar una vista de la agenda',
          description:
            'Cambia la vista y fecha de la agenda de demostración visible. No crea ni modifica citas.',
          inputSchema: {
            type: 'object',
            properties: {
              view: { type: 'string', enum: ['day', 'week', 'month'] },
              date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            },
            required: ['view', 'date'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (
              !input ||
              typeof input !== 'object' ||
              !['day', 'week', 'month'].includes(input.view) ||
              typeof input.date !== 'string' ||
              !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
              Number.isNaN(date(input.date).getTime()) ||
              iso(date(input.date)) !== input.date
            )
              throw new Error('Vista o fecha inválida.');
            state.calendarView = input.view;
            state.date = input.date;
            navigate('agenda');
            return {
              view: state.calendarView,
              date: state.date,
              tenant: tenantById(state.tenantId).name,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {
      /* API opcional no disponible en todos los navegadores. */
    });
  } catch {
    /* Registro opcional. */
  }
}
start();
