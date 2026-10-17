import { isDemo, pending, modeUrl, user, roleLabel, availablePage, defaultPage, restoreSession, loadBackendData } from '../connected/backend.js';
import { showConnectedLogin } from '../connected/screens/auth/dialogs.js';
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
import { escape, avatar, pageHead, empty } from './ui.js';
import { applyProfessionalFilters, resetProfessionalFilters, setProfessionalView } from './screens/profesionales/view.js';
import { applyReceptionFilters, resetReceptionFilters, setReceptionView } from '../connected/screens/recepcionistas/view.js';
import { applyServiceFilters, resetServiceFilters, setServiceView } from './screens/servicios/view.js';
import { applyBranchFilters, resetBranchFilters, setBranchView } from './screens/sucursales/view.js';
import { setAvailabilityTab } from './screens/disponibilidad/view.js';

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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0e1915' : '#f4f5f6');
}
applyTheme();
export function mountThemeToggle() {
  const host = document.querySelector('.topbar-right, .portal-topbar');
  if (!host) return;
  if (host.querySelector('.theme-toggle')) return;
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
matchMedia('(max-width: 767px)').addEventListener('change', ({ matches }) => {
  document.querySelectorAll('.professional-workspace .professional-results[data-desktop-view]').forEach((results) => {
    results.classList.remove('professional-view--list', 'professional-view--cards');
    results.classList.add(`professional-view--${matches ? 'cards' : results.dataset.desktopView}`);
  });
});
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
labels.negocio = 'Detalle de negocio';
labels.cuenta = 'Mi cuenta';
labels.recepcionistas = 'Recepcionistas';
let animateNextRoute = true;
function setMobileMenuOpen(isOpen) {
  const layout = document.querySelector('.admin-layout');
  if (!layout) return;
  layout.classList.toggle('menu-open', isOpen);
  layout.querySelectorAll('button[data-action="menu"]').forEach((button) => {
    button.setAttribute('aria-expanded', String(isOpen));
  });
  if (isOpen) layout.querySelector('.sidebar nav .nav-item')?.focus();
  else layout.querySelector('.mobile-tabbar [data-action="menu"]')?.focus();
}
function setAccountMenuOpen(isOpen, returnFocus = false) {
  const trigger = document.querySelector('.account-menu-trigger');
  const panel = document.querySelector('.account-menu-panel');
  if (!trigger || !panel) return;
  trigger.setAttribute('aria-expanded', String(isOpen));
  panel.hidden = !isOpen;
  if (returnFocus) trigger.focus();
}
function connectedAccountMenu() {
  const name = user.nombre || 'Mi cuenta';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
  return '<div class="account-menu"><button type="button" class="profile-button account-menu-trigger" aria-label="Opciones de ' +
    escape(name) + '" aria-expanded="false" aria-controls="account-menu-panel">' +
    avatar(initials, 'peach') + '<span><strong>' + escape(name) + '</strong><small>' +
    escape(roleLabel(user.rol)) + '</small></span>' + icon('down') + '</button>' +
    '<nav id="account-menu-panel" class="account-menu-panel" aria-label="Opciones de usuario" hidden>' +
    '<a href="' + modeUrl('/admin/cuenta') + '" data-nav="cuenta" ' +
    (state.page === 'cuenta' ? 'aria-current="page"' : '') + '>' +
    icon('user') + '<span>Mi cuenta</span></a>' +
    '<button type="button" data-action="logout-account">' +
    icon('logout') + '<span>Cerrar sesión</span></button></nav></div>';
}
export function navigate(page, id = null) {
  if (!isDemo && !availablePage(page)) page = defaultPage();
  if (page === 'negocio' && (!Number.isSafeInteger(Number(id)) || Number(id) < 1)) page = defaultPage();
  history.pushState({}, '', modeUrl(`/admin/${page}${page === 'negocio' ? `/${id}` : ''}`));
  state.page = page;
  state.businessId = page === 'negocio' ? Number(id) : null;
  state.search = '';
  animateNextRoute = true;
  render();
}
export function renderShell(content) {
  if (!tenantById(state.tenantId)) state.tenantId = db.tenants[0].id;
  const tenant = tenantById(state.tenantId);
  const sidebarScrollTop = document.querySelector('.sidebar')?.scrollTop ?? 0;
  const home = isDemo ? 'agenda' : defaultPage();
  const visibleNav = isDemo ? nav : [
    ['connected', user.rol === 'superadmin' ? 'PLATAFORMA' : user.rol === 'recepcionista' ? 'MI CUENTA' : 'MI NEGOCIO'],
    ...(user.rol === 'superadmin' ? [['plataforma', 'grid', 'Negocios']] : [
      ...nav.filter((item) => item.length === 3 && availablePage(item[0]) && item[0] === 'profesionales'),
      ...(user.rol === 'admin_negocio' ? [['recepcionistas', 'users', 'Recepcionistas']] : []),
      ...nav.filter((item) => item.length === 3 && availablePage(item[0]) && item[0] !== 'profesionales'),
    ]),
  ];
  const workspaceName = !isDemo && user.rol === 'superadmin' ? 'Plataforma' : tenant.name;
  const workspaceInitials = !isDemo && user.rol === 'superadmin' ? 'PL' : tenant.initials;
  const mobileProfessionalBrand = ['profesionales', 'recepcionistas', 'servicios', 'sucursales'].includes(state.page)
    ? `<a class="mobile-professional-brand" href="/admin/${state.page}" data-nav="${state.page}" aria-label="Citalendar, ${labels[state.page].toLowerCase()}"><img class="brand-logo-on-light" src="/brand/citalendar-logo.svg" alt=""><img class="brand-logo-on-dark" src="/brand/citalendar-logo-light.svg" alt=""></a>`
    : '';
  document.querySelector('#app').innerHTML =
    `<div class="admin-layout"><div class="sidebar-overlay" data-action="menu"></div><aside class="sidebar"><a class="brand" aria-label="Citalendar: inicio" href="/admin/agenda" data-nav="agenda"><img class="brand-logo-on-light" src="/brand/citalendar-logo.svg" alt=""/><img class="brand-logo-on-dark" src="/brand/citalendar-logo-light.svg" alt=""/></a><div class="workspace-identity glass-effect glass-effect--dark">${avatar(workspaceInitials, 'workspace-avatar')}<span><strong>${escape(workspaceName)}</strong></span></div><nav aria-label="Navegación principal">${visibleNav.map((n) => (n.length === 2 ? `<div class="nav-section">${n[1]}</div>` : `<a href="/admin/${n[0]}" data-nav="${n[0]}" class="nav-item ${state.page === n[0] ? 'active' : ''}" ${state.page === n[0] ? 'aria-current="page"' : ''}>${icon(n[1])}<span>${n[2]}</span>${n[0] === 'agenda' ? `<span class="nav-count">${list('appointments', state.tenantId).filter((a) => a.date === TODAY).length}</span>` : ''}</a>`)).join('')}</nav><div class="sidebar-bottom"><a href="/admin/configuracion" data-nav="configuracion" class="nav-item ${state.page === 'configuracion' ? 'active' : ''}">${icon('settings')}<span>Configuración</span></a><div class="portal-card"><div class="portal-icon">${icon('link')}</div><strong>Tu agenda, a un enlace</strong><p>Comparte tu portal y recibe reservas en línea.</p><a href="/reservas/${tenant.slug}" data-portal>Ver portal de reservas ${icon('external')}</a></div><div class="sidebar-foot"><span class="green-dot"></span> Entorno de demostración <span>v1.0</span></div></div></aside><div class="main-layout"><header class="topbar"><div class="breadcrumbs">${mobileProfessionalBrand}<button class="icon-btn mobile-menu" data-action="menu" aria-label="Abrir menú">${icon('menu')}</button><span>${escape(workspaceName)}</span>${icon('chevron')}<strong>${labels[state.page] || 'Agenda'}</strong></div><div class="topbar-right"><span class="demo-pill">Prototipo</span><span class="topbar-date">${icon('calendar')} ${formatDate(TODAY, { day: 'numeric', month: 'short', year: 'numeric' })}</span><button class="notification-button icon-btn" data-nav="notificaciones" aria-label="Ver notificaciones">${icon('bell')}<i></i></button><span class="topbar-divider"></span><button class="profile-button" data-nav="configuracion">${avatar('AV', 'peach')}<span><strong>Adriana Vega</strong><small>Administradora</small></span>${icon('down')}</button></div></header><main id="main-content" class="main-content${animateNextRoute ? ' motion-enter' : ''}">${content}</main><footer class="app-footer"><span>Un poco más de orden. Más tiempo para cuidar.</span><span>Hecho para tu día a día <span class="footer-logo">Citalendar</span></span></footer></div></div>`;
  const demoTabs = [
    ['resumen', 'grid', 'Inicio'],
    ['agenda', 'calendar', 'Agenda'],
    ['clientes', 'users', 'Clientes'],
  ];
  const roleTabs = {
    superadmin: [['plataforma', 'grid', 'Negocios']],
    admin_negocio: [['profesionales', 'stethoscope', 'Equipo'], ['servicios', 'briefcase', 'Servicios'], ['sucursales', 'pin', 'Sucursales']],
    profesional: [['servicios', 'briefcase', 'Servicios'], ['sucursales', 'pin', 'Sucursales'], ['disponibilidad', 'clock', 'Horario']],
    recepcionista: [['disponibilidad', 'clock', 'Disponibilidad'], ['cuenta', 'user', 'Mi cuenta']],
  };
  const primaryTabs = isDemo ? demoTabs : roleTabs[user.rol] || [['cuenta', 'user', 'Mi cuenta']];
  const moreIsCurrent = !primaryTabs.some(([page]) => page === state.page);
  const mobileTabs = primaryTabs.map(([page, symbol, label]) =>
    `<a class="mobile-tab ${state.page === page ? 'is-current' : ''}" href="/admin/${page}" data-nav="${page}" ${state.page === page ? 'aria-current="page"' : ''}><span class="mobile-tab-icon">${icon(symbol)}</span><span>${label}</span></a>`,
  ).join('');
  const sidebar = document.querySelector('.sidebar');
  sidebar.id = 'mobile-navigation-drawer';
  sidebar.scrollTop = sidebarScrollTop;
  sidebar.insertAdjacentHTML('afterend',
    `<nav class="mobile-tabbar glass-effect" aria-label="Navegación inferior"><div class="mobile-tabbar-inner" style="--tab-count:${primaryTabs.length + (isDemo || user.rol !== 'recepcionista' ? 1 : 0)}">${mobileTabs}${isDemo || user.rol !== 'recepcionista' ? `<button type="button" class="mobile-tab ${moreIsCurrent ? 'is-current' : ''}" data-action="menu" aria-label="Más secciones" aria-controls="mobile-navigation-drawer" aria-expanded="false"><span class="mobile-tab-icon">${icon('menu')}</span><span>Más</span></button>` : ''}</div></nav>`,
  );
  document.querySelectorAll('a[href^="/admin/"], a[href^="/reservas/"]').forEach((link) => link.href = modeUrl(link.getAttribute('href')));
  const pill = document.querySelector('.demo-pill');
  pill.outerHTML = `<a class="demo-pill" href="${modeUrl(!isDemo && state.page === 'cuenta' ? '/admin/agenda' : !isDemo && state.page === 'negocio' ? '/admin/plataforma' : location.pathname, !isDemo)}" title="${isDemo ? 'Ver versión conectada' : 'Comparar con la demo'}">${isDemo ? 'Prototipo' : 'Ver demo'}</a>`;
  if (!isDemo) {
    const brand = document.querySelector('.brand');
    brand.href = modeUrl(`/admin/${home}`);
    brand.dataset.nav = home;
    const accountLink = document.querySelector('.sidebar-bottom [data-nav="configuracion"]');
    accountLink.href = modeUrl('/admin/cuenta');
    accountLink.dataset.nav = 'cuenta';
    accountLink.querySelector('span').textContent = 'Mi cuenta';
    accountLink.querySelector('.icon').outerHTML = icon('user');
    accountLink.classList.toggle('active', state.page === 'cuenta');
    document.querySelector('.portal-card').remove();
    document.querySelector('.notification-button').remove();
    document.querySelector('.topbar-divider').remove();
    document.querySelector('.breadcrumbs strong').textContent = labels[state.page] || labels[home];
    document.querySelector('.sidebar-foot').remove();
    document.querySelector('.profile-button').outerHTML = connectedAccountMenu();
  }
  mountThemeToggle();
  animateNextRoute = false;
}
let extraViews = null,
  booking = null,
  actions = null;
export function render() {
  if (!db) return;
  if (!isDemo && location.pathname.startsWith('/admin/') && !availablePage(state.page)) {
    state.page = defaultPage();
    history.replaceState({}, '', modeUrl(`/admin/${state.page}`));
  }
  if (!isDemo && state.page === 'negocio' && (!Number.isSafeInteger(state.businessId) || state.businessId < 1)) {
    state.page = defaultPage();
    history.replaceState({}, '', modeUrl(`/admin/${state.page}`));
  }
  if (!isDemo && location.pathname.startsWith('/reservas/')) { renderShell(empty('Portal de reservas', pending)); return; }
  document.title = `${import.meta.env.VITE_APP_NAME || 'Citalendar'} · ${location.pathname.startsWith('/reservas/') ? 'Reserva tu cita' : labels[state.page] || 'Agenda'}`;
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
function closeProfessionalMenus(except = null) {
  document.querySelectorAll('.professional-more[open]').forEach((menu) => {
    if (menu !== except) menu.open = false;
  });
}

document.addEventListener('toggle', (event) => {
  const menu = event.target;
  if (!menu.matches?.('.professional-more')) return;
  if (!menu.open) { menu.classList.remove('is-upward'); return; }
  closeProfessionalMenus(menu);
  const trigger = menu.querySelector('summary');
  const panel = menu.querySelector('.professional-more-menu');
  const mobileBar = document.querySelector('.mobile-tabbar');
  const bottomLimit = mobileBar && getComputedStyle(mobileBar).display !== 'none'
    ? mobileBar.getBoundingClientRect().top - 8
    : window.innerHeight - 8;
  menu.classList.toggle('is-upward', trigger.getBoundingClientRect().bottom + panel.offsetHeight + 6 > bottomLimit);
}, true);
document.addEventListener('click', (event) => {
  if (!event.target.closest('.professional-more') || event.target.closest('[data-professional-action], [data-reception-action], [data-toggle-service], [data-delete-service], [data-toggle-branch], [data-delete-branch]')) closeProfessionalMenus();
}, true);
document.addEventListener('click', async (e) => {
  const accountTrigger = e.target.closest('.account-menu-trigger');
  if (accountTrigger) {
    setAccountMenuOpen(accountTrigger.getAttribute('aria-expanded') !== 'true');
    return;
  }
  setAccountMenuOpen(false);
  const availabilityTab = e.target.closest('[data-availability-tab]');
  if (availabilityTab) { setAvailabilityTab(availabilityTab.dataset.availabilityTab); return; }
  const professionalView = e.target.closest('[data-professional-view]');
  if (professionalView) { setProfessionalView(professionalView.dataset.professionalView); return; }
  if (e.target.closest('[data-professional-reset]')) { resetProfessionalFilters(); return; }
  const receptionView = e.target.closest('[data-reception-view]');
  if (receptionView) { setReceptionView(receptionView.dataset.receptionView); return; }
  if (e.target.closest('[data-reception-reset]')) { resetReceptionFilters(); return; }
  const serviceView = e.target.closest('[data-service-view]');
  if (serviceView) { setServiceView(serviceView.dataset.serviceView); return; }
  if (e.target.closest('[data-service-reset]')) { resetServiceFilters(); return; }
  const branchView = e.target.closest('[data-branch-view]');
  if (branchView) { setBranchView(branchView.dataset.branchView); return; }
  if (e.target.closest('[data-branch-reset]')) { resetBranchFilters(); return; }
  const business = e.target.closest('[data-business-detail]');
  if (business && !isDemo) {
    navigate('negocio', Number(business.dataset.businessDetail));
    return;
  }
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
  if (e.target.dataset.professionalFilter) { applyProfessionalFilters(); return; }
  if (e.target.dataset.receptionFilter) { applyReceptionFilters(); return; }
  if (e.target.dataset.serviceFilter) { applyServiceFilters(); return; }
  if (e.target.dataset.branchFilter) { applyBranchFilters(); return; }
  if (e.target.dataset.filter) {
    state[e.target.dataset.filter] = e.target.value;
    render();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'professional-search') { applyProfessionalFilters(); return; }
  if (e.target.id === 'reception-search') { applyReceptionFilters(); return; }
  if (e.target.id === 'service-search') { applyServiceFilters(); return; }
  if (e.target.id === 'branch-search') { applyBranchFilters(); return; }
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
  state.page = location.pathname.split('/')[2] || (isDemo ? 'agenda' : defaultPage());
  state.businessId = state.page === 'negocio' ? Number(location.pathname.split('/')[3]) : null;
  animateNextRoute = true;
  render();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.account-menu-trigger[aria-expanded="true"]')) {
    setAccountMenuOpen(false, true);
    event.preventDefault();
    return;
  }
  const availabilityTab = event.target.closest?.('[data-availability-tab]');
  if (availabilityTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    const tabs = [...availabilityTab.closest('[role="tablist"]').querySelectorAll('[data-availability-tab]')];
    const index = tabs.indexOf(availabilityTab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setAvailabilityTab(tabs[next].dataset.availabilityTab, true);
    event.preventDefault();
    return;
  }
  if (event.key === 'Escape') {
    const openMenu = document.querySelector('.professional-more[open]');
    if (openMenu) {
      openMenu.open = false;
      openMenu.querySelector('summary')?.focus();
      event.preventDefault();
      return;
    }
  }
  if (event.key === 'Escape' && document.querySelector('.admin-layout.menu-open') && !document.querySelector('#app-dialog')?.open) {
    setMobileMenuOpen(false);
  }
});
document.addEventListener('focusin', (event) => {
  if (!event.target.closest?.('.account-menu')) setAccountMenuOpen(false);
});
function showLogin(message = '') {
  showConnectedLogin(message, start);
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
      : isDemo ? 'agenda' : defaultPage();
    state.businessId = state.page === 'negocio' ? Number(location.pathname.split('/')[3]) : null;
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
      `<div class="startup-error"><img src="/brand/citalendar-icon.svg" alt=""/><h1>No pudimos abrir tu agenda</h1><p>${escape(error.message)}</p><div class="startup-actions"><button class="btn btn-primary" onclick="location.reload()">Volver a intentar</button><a class="btn btn-light" href="${modeUrl(location.pathname, true)}">Ver demo</a></div></div>`;
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
