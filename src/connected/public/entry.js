import 'bootstrap/dist/css/bootstrap.min.css';
import '../../shared/styles.css';
import '../../shared/theme.css';
import './style.css';
import { createPublicClient, PublicPortalError } from './http.js';
import { initializePublicBrowser, acquirePublicMutation } from './browser-session.js';
import { createAttemptStore } from './attempt-store.js';
import { createPortalBooking } from './booking.js';
import { mountBooking } from './booking-view.js';
import { bindBookingLifecycle } from './booking-lifecycle.js';
import { portalHeaderClock } from './dates.js';
import { icon } from '../../shared/icons.js';
import { businessInitials } from './business-identity.js';

// La recuperación con marcador precede a cualquier catálogo o nueva selección.
// Toda escritura conserva la sesión pública; nunca usa autenticación del panel.
export async function startPublicPortal(slug) {
  const root = document.querySelector('#app');
  let savedTheme;
  try { savedTheme = localStorage.getItem('cita-theme'); } catch { /* Preferencia opcional. */ }
  let theme = ['light', 'dark'].includes(savedTheme) ? savedTheme :
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.innerHTML = `<div class="public-portal">
    <header class="public-portal-header"><img width="176" height="42" alt="Citalendar" id="public-brand"><span class="public-header-clock">${icon('calendar')}<span class="visually-hidden">Fecha y hora local: </span><time id="public-clock"></time></span>
      <button type="button" class="theme-toggle icon-btn" id="public-theme"></button></header>
    <main id="public-main" class="public-portal-content" aria-labelledby="public-title">
      <div class="public-business-heading"><span class="public-business-mark" id="public-business-mark" aria-hidden="true"></span><div><p class="public-eyebrow">PORTAL DE RESERVAS</p><h1 id="public-title">Portal de reservas</h1><p id="public-category" hidden></p></div><span class="public-online-tag">Reservas en línea</span></div>
      <div id="public-status" role="status" aria-live="polite" aria-atomic="true"></div>
      <button type="button" class="btn btn-primary mt-3" id="public-retry" hidden>Reintentar conexión</button>
      <section id="public-selection" aria-label="Selección de cita" hidden></section>
    </main><footer class="public-portal-footer"><span>Tu tiempo importa. Tu bienestar, también.</span><span>Reservas con <strong>Citalendar</strong></span></footer></div>`;
  const status = root.querySelector('#public-status');
  const retry = root.querySelector('#public-retry');
  const themeButton = root.querySelector('#public-theme');
  const clock = root.querySelector('#public-clock');
  function updateBusinessIdentity(name) {
    root.querySelector('#public-title').textContent = name;
    root.querySelector('#public-business-mark').textContent = businessInitials(name);
  }
  function updateClock() {
    const current = portalHeaderClock(new Date());
    clock.dateTime = current.dateTime;
    clock.textContent = current.label;
  }
  updateClock();
  setInterval(updateClock, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateClock(); });
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1f2026' : '#f4f5f6');
    root.querySelector('#public-brand').src = theme === 'dark' ? '/brand/citalendar-logo-light.svg' : '/brand/citalendar-logo.svg';
    themeButton.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    themeButton.setAttribute('aria-label', `Activar modo ${theme === 'dark' ? 'claro' : 'oscuro'}`);
    themeButton.setAttribute('title', `Modo ${theme === 'dark' ? 'claro' : 'oscuro'}`);
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
  }
  themeButton.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    try { localStorage.setItem('cita-theme', theme); } catch { /* Sin persistencia, el tema sigue funcionando. */ }
  });
  applyTheme();
  document.title = 'Reservas · Citalendar';
  if (!slug) {
    status.textContent = 'El enlace del portal no es válido. Compruebe la dirección del negocio.';
    return;
  }
  const client = createPublicClient(slug);
  let initializing = false;
  // Desactivar reintentos mientras esperamos evita duplicar inicializaciones en esta pestaña.
  async function initialize() {
    if (initializing) return;
    initializing = true;
    retry.hidden = true;
    root.querySelector('#public-main').setAttribute('aria-busy', 'true');
    status.textContent = 'Conectando con el portal del negocio…';
    try {
      const { negocio } = await initializePublicBrowser(slug, client);
      // Los nombres recibidos se insertan como texto para impedir inyección de contenido.
      updateBusinessIdentity(negocio.nombre);
      document.title = `Reservas · ${negocio.nombre}`;
      status.textContent = '';
      const host = root.querySelector('#public-selection');
      host.hidden = false;
      let render;
      const channel = new BroadcastChannel(`citalendar:portal:${slug}`);
      const flow = createPortalBooking(client, { slug, channel, acquireMutation: () => acquirePublicMutation(slug),
        onChange: (state, kind) => {
          if (state.negocio?.nombre) {
            updateBusinessIdentity(state.negocio.nombre);
            const category = root.querySelector('#public-category');
            category.textContent = state.negocio.categoria || '';
            category.hidden = !state.negocio.categoria;
          }
          if (state.phase === 'result') {
            updateBusinessIdentity(state.result.nombreNegocio);
            document.title = `Reserva pendiente · ${state.result.nombreNegocio}`;
          }
          render(state, kind);
        } });
      render = mountBooking(host, flow);
      bindBookingLifecycle(flow);
      await flow.start();
    } catch (error) {
      status.textContent = error instanceof PublicPortalError ? error.message : 'No se pudo iniciar el portal. Reintenta la conexión.';
      const pending = createAttemptStore(slug).read().status !== 'missing';
      if (pending) status.textContent += ' Hay una recuperación pendiente; se conservará el marcador hasta poder comprobar el resultado.';
      retry.hidden = !pending && error.kind === 'http' && [403, 404].includes(error.status);
    } finally {
      initializing = false;
      root.querySelector('#public-main').setAttribute('aria-busy', 'false');
    }
  }
  retry.addEventListener('click', initialize);
  await initialize();
}
