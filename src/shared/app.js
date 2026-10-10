import { isDemo, pending, modeUrl, user, roleLabel, availablePage, login, logout, restoreSession, loadBackendData } from '../connected/backend.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import './theme.css';
import './motion.css';
import './mobile.css';
import './screens/agenda/calendar.css';
import { icon } from './icons.js';
import { agendaView } from './screens/agenda/view.js';
import {
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
import { escape, avatar, badge, pageHead, button, toast, empty, modal } from './ui.js';

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
let animateNextRoute = true;
function setMobileMenuOpen(isOpen) {
  const layout = document.querySelector('.admin-layout');
  if (!layout) return;
  layout.classList.toggle('menu-open', isOpen);
  layout.querySelectorAll('button[data-action="menu"]').forEach((button) => {
    button.setAttribute('aria-expanded', String(isOpen));
  });
  if (isOpen) layout.querySelector('.sidebar .workspace-switch')?.focus();
  else layout.querySelector('.mobile-tabbar [data-action="menu"]')?.focus();
}
export function navigate(page) {
  history.pushState({}, '', modeUrl(`/admin/${page}`));
  state.page = page;
  state.search = '';
  animateNextRoute = true;
  render();
}
export function renderShell(content) {
  if (!tenantById(state.tenantId)) state.tenantId = db.tenants[0].id;
  const tenant = tenantById(state.tenantId);
  const sidebarScrollTop = document.querySelector('.sidebar')?.scrollTop ?? 0;
  const visibleNav = !isDemo && user?.rol === 'profesional' ? nav.filter((item) => item[0] !== 'profesionales') : nav;
  document.querySelector('#app').innerHTML =
    `<div class="admin-layout"><div class="sidebar-overlay" data-action="menu"></div><aside class="sidebar"><a class="brand" href="/admin/agenda" data-nav="agenda"><img src="/favicon.svg" alt=""/>cita<span class="brand-dot">.</span></a><button class="workspace-switch glass-effect glass-effect--dark" data-action="switch-tenant">${avatar(tenant.initials, 'workspace-avatar')}<span><strong>${escape(tenant.name)}</strong><small>Espacio de trabajo</small></span>${icon('down')}</button><nav aria-label="Navegación principal">${visibleNav.map((n) => (n.length === 2 ? `<div class="nav-section">${n[1]}</div>` : `<a href="/admin/${n[0]}" data-nav="${n[0]}" class="nav-item ${state.page === n[0] ? 'active' : ''}" ${state.page === n[0] ? 'aria-current="page"' : ''}>${icon(n[1])}<span>${n[2]}</span>${n[0] === 'agenda' ? `<span class="nav-count">${list('appointments', state.tenantId).filter((a) => a.date === TODAY).length}</span>` : ''}</a>`)).join('')}</nav><div class="sidebar-bottom"><a href="/admin/configuracion" data-nav="configuracion" class="nav-item ${state.page === 'configuracion' ? 'active' : ''}">${icon('settings')}<span>Configuración</span></a><div class="portal-card"><div class="portal-icon">${icon('link')}</div><strong>Tu agenda, a un enlace</strong><p>Comparte tu portal y recibe reservas en línea.</p><a href="/reservas/${tenant.slug}" data-portal>Ver portal de reservas ${icon('external')}</a></div><div class="sidebar-foot"><span class="green-dot"></span> Entorno de demostración <span>v1.0</span></div></div></aside><div class="main-layout"><header class="topbar"><div class="breadcrumbs"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Abrir menú">${icon('menu')}</button><span>Mi espacio</span>${icon('chevron')}<strong>${labels[state.page] || 'Agenda'}</strong></div><div class="topbar-right"><span class="demo-pill">Prototipo</span><span class="topbar-date">${icon('calendar')} ${formatDate(TODAY, { day: 'numeric', month: 'short', year: 'numeric' })}</span><button class="notification-button icon-btn" data-nav="notificaciones" aria-label="Ver notificaciones">${icon('bell')}<i></i></button><span class="topbar-divider"></span><button class="profile-button" data-nav="configuracion">${avatar('AV', 'peach')}<span><strong>Adriana Vega</strong><small>Administradora</small></span>${icon('down')}</button></div></header><main id="main-content" class="main-content${animateNextRoute ? ' motion-enter' : ''}">${content}</main><footer class="app-footer"><span>Un poco más de orden. Más tiempo para cuidar.</span><span>Hecho para tu día a día <span class="footer-logo">cita.</span></span></footer></div></div>`;
  const primaryTabs = [
    ['resumen', 'grid', 'Inicio'],
    ['agenda', 'calendar', 'Agenda'],
    ['clientes', 'users', 'Clientes'],
  ];
  const moreIsCurrent = !primaryTabs.some(([page]) => page === state.page);
  const mobileTabs = primaryTabs.map(([page, symbol, label]) =>
    `<a class="mobile-tab ${state.page === page ? 'is-current' : ''}" href="/admin/${page}" data-nav="${page}" ${state.page === page ? 'aria-current="page"' : ''}><span class="mobile-tab-icon">${icon(symbol)}</span><span>${label}</span></a>`,
  ).join('');
  const sidebar = document.querySelector('.sidebar');
  sidebar.id = 'mobile-navigation-drawer';
  sidebar.scrollTop = sidebarScrollTop;
  sidebar.insertAdjacentHTML('afterend',
    `<nav class="mobile-tabbar glass-effect" aria-label="Navegación inferior"><div class="mobile-tabbar-inner">${mobileTabs}<button type="button" class="mobile-tab ${moreIsCurrent ? 'is-current' : ''}" data-action="menu" aria-label="Más secciones" aria-controls="mobile-navigation-drawer" aria-expanded="false"><span class="mobile-tab-icon">${icon('menu')}</span><span>Más</span></button></div></nav>`,
  );
  document.querySelectorAll('a[href^="/admin/"], a[href^="/reservas/"]').forEach((link) => link.href = modeUrl(link.getAttribute('href')));
  const pill = document.querySelector('.demo-pill');
  pill.outerHTML = `<a class="demo-pill" href="${modeUrl(location.pathname, !isDemo)}" title="${isDemo ? 'Ver versión conectada' : 'Comparar con la demo'}">${isDemo ? 'Prototipo' : 'Ver demo'}</a>`;
  if (!isDemo) {
    document.querySelector('.sidebar-foot').innerHTML = '<span class="green-dot"></span> Backend conectado <span>v1.0</span>';
    document.querySelector('.profile-button').innerHTML = avatar(user.nombre.split(' ').slice(0, 2).map((x) => x[0]).join(''), 'peach') + `<span><strong>${escape(user.nombre)}</strong><small>${escape(roleLabel(user.rol))}</small></span>${icon('down')}`;
    if (user.rol === 'superadmin') document.querySelector('.sidebar nav').insertAdjacentHTML('beforeend', '<a class="nav-item" href="/admin/plataforma" data-nav="plataforma">Negocios</a>');
  }
  mountThemeToggle();
  animateNextRoute = false;
}
let extraViews = null,
  booking = null,
  actions = null;
export function render() {
  if (!db) return;
  if (!isDemo && location.pathname.startsWith('/reservas/')) { renderShell(empty('Portal de reservas', pending)); return; }
  document.title = `${import.meta.env.VITE_APP_NAME || 'Cita'} · ${location.pathname.startsWith('/reservas/') ? 'Reserva tu cita' : labels[state.page] || 'Agenda'}`;
  const path = location.pathname;
  if (path.startsWith('/reservas/')) {
    if (booking) booking.renderPortal(path.split('/')[2]);
    document.querySelectorAll('a[href^="/admin/"], a[href^="/reservas/"]').forEach((link) => link.href = modeUrl(link.getAttribute('href')));
    mountThemeToggle();
    return;
  }
  renderShell(
    !isDemo && !availablePage(state.page)
      ? pageHead(labels[state.page] || 'Agenda', '') + empty(pending, 'Puedes comparar esta pantalla con la demo.', `<a class="btn btn-light" href="${modeUrl(location.pathname, true)}">Ver demo</a>`)
      : state.page === 'agenda'
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
    if (navEl.dataset.navProfessional) state.scheduleProfessional = Number(navEl.dataset.navProfessional);
    navigate(navEl.dataset.nav);
    return;
  }
  const portal = e.target.closest('[data-portal]');
  if (portal) {
    e.preventDefault();
    history.pushState({}, '', modeUrl(portal.getAttribute('href').split('?')[0]));
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
      setMobileMenuOpen(!document.querySelector('.admin-layout')?.classList.contains('menu-open'));
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
  animateNextRoute = true;
  render();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.admin-layout.menu-open') && !document.querySelector('#app-dialog')?.open) {
    setMobileMenuOpen(false);
  }
});
function showLogin(message = '') {
  document.querySelector('#app').innerHTML = `<div class="startup-error"><img src="/favicon.svg" alt=""/><h1>Tu espacio en cita.</h1><p>Inicia sesión para trabajar con tu negocio.</p><div class="startup-actions"><button class="btn btn-primary" id="open-login">Iniciar sesión</button><a class="btn btn-light" href="${modeUrl(location.pathname, true)}">Ver demo</a></div></div>`;
  const showRecoveryDialog = (email = '') => {
    const el = modal('Recuperar contraseña', `<form id="recovery-email-form"><div class="dialog-body"><p class="form-intro">Ingresa tu correo y simularemos el envío de un código de verificación.</p><div class="form-field"><label class="form-label" for="recovery-email">Correo</label><input class="form-control" id="recovery-email" name="email" type="email" autocomplete="email" value="${escape(email)}" required/></div><div class="login-actions"><button type="button" data-recovery-action="back">Volver a iniciar sesión</button></div></div><div class="dialog-footer login-footer"><button class="btn btn-primary" type="submit">Enviar código de verificación</button></div></form>`);
    el.classList.add('auth-screen-transition');
    el.querySelector('[data-recovery-action="back"]').onclick = () => showLoginDialog();
    el.querySelector('#recovery-email-form').onsubmit = (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      showVerificationDialog(form.get('email'));
    };
    el.onclose = () => document.querySelector('#open-login')?.focus();
  };
  const showVerificationDialog = (email) => {
    const el = modal('Verificar correo', `<form id="recovery-code-form"><div class="dialog-body"><p class="form-intro">Simulamos el envío de un código a <strong>${escape(email)}</strong>. Escribe cualquier código para continuar.</p><div class="form-field"><label class="form-label" for="recovery-code">Código de verificación</label><input class="form-control" id="recovery-code" name="code" type="text" autocomplete="one-time-code" required/></div><div class="login-actions"><button type="button" data-recovery-action="back">Cambiar correo</button></div></div><div class="dialog-footer login-footer"><button class="btn btn-primary" type="submit">Verificar código</button></div></form>`);
    el.classList.add('auth-screen-transition');
    el.querySelector('[data-recovery-action="back"]').onclick = () => showRecoveryDialog(email);
    el.querySelector('#recovery-code-form').onsubmit = (event) => {
      event.preventDefault();
      showRecoveryConfirmation(email);
    };
    el.onclose = () => document.querySelector('#open-login')?.focus();
  };
  const showRecoveryConfirmation = (email) => {
    const el = modal('Código verificado', `<div class="dialog-body"><p class="form-intro">El código para <strong>${escape(email)}</strong> se aceptó correctamente en esta simulación. No se envió ningún correo ni se cambió la contraseña.</p><div class="login-actions"><button type="button" data-recovery-action="back">Volver a iniciar sesión</button></div></div><div class="dialog-footer login-footer"><button class="btn btn-primary" type="button" data-close-recovery>Cerrar</button></div>`);
    el.classList.add('auth-screen-transition');
    el.querySelector('[data-recovery-action="back"]').onclick = () => showLoginDialog();
    el.querySelector('[data-close-recovery]').onclick = () => el.close();
    el.onclose = () => document.querySelector('#open-login')?.focus();
  };
  const showLoginDialog = (loginError = '') => {
    const el = modal('Iniciar sesión', `<form id="login-form"><div class="dialog-body"><div class="form-field"><label class="form-label" for="login-email">Correo</label><input class="form-control" id="login-email" name="email" type="email" autocomplete="username" required/></div><div class="form-field"><label class="form-label" for="login-password">Contraseña</label><input class="form-control" id="login-password" name="password" type="password" autocomplete="current-password" required/></div><div class="login-actions"><button type="button" data-login-action="recover">Recuperar contraseña</button><button type="button" data-login-action="register">Crear cuenta</button></div><p class="login-notice" id="login-notice" role="status" hidden></p><p class="form-error" role="alert" id="login-error">${escape(loginError)}</p></div><div class="dialog-footer login-footer"><button class="btn btn-primary" type="submit">Entrar</button></div></form>`);
    el.classList.add('auth-screen-transition');
    el.querySelectorAll('[data-login-action]').forEach((button) => {
      button.onclick = () => {
        if (button.dataset.loginAction === 'register') {
          showRegisterDialog();
          return;
        }
        showRecoveryDialog(el.querySelector('#login-email').value);
      };
    });
    el.onclose = () => document.querySelector('#open-login')?.focus();
    el.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      const submit = event.target.querySelector('[type="submit"]'); submit.disabled = true;
      try {
        const f = new FormData(event.target); await login(f.get('email'), f.get('password'));
        el.close(); await start();
      } catch (error) { el.querySelector('#login-error').textContent = error.message; }
      finally { submit.disabled = false; }
    };
  };
  const showRegisterDialog = () => {
    const el = modal('Crear cuenta', `<form id="register-form"><div class="dialog-body"><p class="form-intro">Completa tus datos y el código de activación para solicitar acceso.</p><div class="form-field"><label class="form-label" for="register-email">Correo</label><input class="form-control" id="register-email" name="email" type="email" autocomplete="email" required/></div><div class="form-field"><label class="form-label" for="register-password">Contraseña</label><input class="form-control" id="register-password" name="password" type="password" autocomplete="new-password" required/></div><div class="form-field"><label class="form-label" for="register-activation-code">Código de activación</label><input class="form-control" id="register-activation-code" name="activationCode" type="text" autocomplete="off" spellcheck="false" required/></div><div class="login-actions"><button type="button" data-login-action="back">Ya tengo cuenta · Iniciar sesión</button></div><p class="login-notice" id="register-notice" role="status" hidden></p></div><div class="dialog-footer login-footer"><button class="btn btn-primary" type="submit">Crear cuenta</button></div></form>`);
    el.classList.add('auth-screen-transition');
    el.querySelector('[data-login-action="back"]').onclick = () => showLoginDialog();
    el.querySelector('#register-form').onsubmit = (event) => {
      event.preventDefault();
      const notice = el.querySelector('#register-notice');
      notice.textContent = 'El registro aún no está conectado al servidor; no se enviaron tus datos.';
      notice.hidden = false;
    };
    el.onclose = () => document.querySelector('#open-login')?.focus();
  };
  document.querySelector('#open-login').onclick = () => showLoginDialog(message);
  document.querySelector('#open-login').click();
}
window.addEventListener('cita-session-expired', () => { document.querySelector('#app-dialog')?.close(); showLogin('Tu sesión expiró. Inicia sesión nuevamente.'); });
export async function start() {
  try {
    document.documentElement.dataset.appMode = isDemo ? 'demo' : 'connected';
    if (isDemo) await (await import('../demo/data.js')).loadData();
    else {
      if (!await restoreSession()) { showLogin(); return; }
      state.tenantId = await loadBackendData();
    }
    state.page = location.pathname.startsWith('/admin/')
      ? location.pathname.split('/')[2]
      : 'agenda';
    [extraViews, booking, actions] = await Promise.all([
      isDemo ? import('../demo/screens/index.js') : import('../connected/screens/index.js'),
      isDemo ? import('../demo/screens/reservas/booking.js') : Promise.resolve(null),
      import('./actions.js'),
    ]);
    render();
    registerCalendarTool();
  } catch (error) {
    if (!isDemo && !user) { showLogin(error.message); return; }
    document.querySelector('#app').innerHTML =
      `<div class="startup-error"><img src="/favicon.svg" alt=""/><h1>No pudimos abrir tu agenda</h1><p>${escape(error.message)}</p><div class="startup-actions"><button class="btn btn-primary" onclick="location.reload()">Volver a intentar</button><a class="btn btn-light" href="${modeUrl(location.pathname, true)}">Ver demo</a></div></div>`;
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
