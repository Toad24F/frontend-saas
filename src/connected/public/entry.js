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

// La recuperación con marcador precede a cualquier catálogo o nueva selección.
// Toda escritura conserva la sesión pública; nunca usa autenticación del panel.
export async function startPublicPortal(slug) {
  const root = document.querySelector('#app');
  let savedTheme;
  try { savedTheme = localStorage.getItem('cita-theme'); } catch { /* Preferencia opcional. */ }
  let theme = ['light', 'dark'].includes(savedTheme) ? savedTheme :
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.innerHTML = `<div class="public-portal">
    <header class="public-portal-header"><img width="176" height="42" alt="Citalendar" id="public-brand">
      <button type="button" class="theme-toggle" id="public-theme">Cambiar tema</button></header>
    <main id="public-main" class="public-portal-content" aria-labelledby="public-title">
      <p class="public-eyebrow">Portal de reservas</p>
      <h1 id="public-title">Tu próxima cita</h1>
      <p id="public-business"></p>
      <div id="public-status" role="status" aria-live="polite" aria-atomic="true"></div>
      <button type="button" class="btn btn-primary mt-3" id="public-retry" hidden>Reintentar conexión</button>
      <section id="public-selection" aria-label="Selección de cita" hidden></section>
    </main></div>`;
  const status = root.querySelector('#public-status');
  const retry = root.querySelector('#public-retry');
  const themeButton = root.querySelector('#public-theme');
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1f2026' : '#f4f5f6');
    root.querySelector('#public-brand').src = theme === 'dark' ? '/brand/citalendar-logo-light.svg' : '/brand/citalendar-logo.svg';
    themeButton.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
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
      root.querySelector('#public-business').textContent = negocio.nombre;
      document.title = `Reservas · ${negocio.nombre}`;
      status.textContent = '';
      const host = root.querySelector('#public-selection');
      host.hidden = false;
      let render;
      const channel = new BroadcastChannel(`citalendar:portal:${slug}`);
      const flow = createPortalBooking(client, { slug, channel, acquireMutation: () => acquirePublicMutation(slug),
        onChange: (state, kind) => {
          if (state.phase === 'result') {
            root.querySelector('#public-business').textContent = state.result.nombreNegocio;
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
