import { escape } from './ui.js';
import { icon } from './icons.js';

// Solo usa el slug del modelo del negocio propio: ni nombres normalizados,
// IDs numéricos ni consultas de superadministración sustituyen este dato.
export function accountPortalUrl({ user, tenant, origin, demo = false }) {
  if (user?.rol !== 'admin_negocio' || !user.negocioId || tenant?.id !== user.negocioId ||
    typeof tenant.slug !== 'string' || tenant.slug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tenant.slug)) return null;
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol)) return null;
  return `${base.origin}/reservas/${tenant.slug}${demo ? '?demo=1' : ''}`;
}

export function renderAccountPortal(context) {
  if (context.user?.rol !== 'admin_negocio') return '';
  const url = accountPortalUrl(context);
  return `<section class="surface account-portal" aria-labelledby="account-portal-title">
    <h2 id="account-portal-title">Tu portal de reservas</h2>
    <p>${context.demo ? 'Demostración con datos ficticios; no crea reservas reales.' : 'Comparte este enlace para que tus clientes consulten horarios y soliciten una reserva.'}</p>
    ${url ? `<label for="account-portal-url">Enlace del portal</label><input class="form-control" id="account-portal-url" value="${escape(url)}" readonly>
      <div class="account-portal-actions"><a class="btn btn-primary" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${icon('external')}Abrir portal<span class="visually-hidden"> (nueva pestaña)</span></a>
      <button class="btn btn-light" type="button" data-account-portal-copy>${icon('link')}Copiar enlace</button></div>` :
    '<p class="account-portal-unavailable">El enlace del negocio todavía no está disponible en tu perfil.</p><div class="account-portal-actions"><button class="btn btn-primary" type="button" disabled>Abrir portal</button><button class="btn btn-light" type="button" disabled>Copiar enlace</button></div>'}
    <p class="account-portal-status" data-account-portal-status role="status" aria-live="polite"></p></section>`;
}

// La apertura usa un enlace nativo sin data-portal: inicia la entrada pública
// independiente y no cae en el router interno del panel. Copiar nunca abre la API.
export async function copyAccountPortal(input, status, clipboard) {
  try {
    await clipboard.writeText(input.value);
    status.textContent = 'Enlace copiado.';
  } catch {
    input.focus(); input.select();
    status.textContent = 'Copia manualmente el enlace seleccionado.';
  }
}

const bound = new WeakSet();
export function bindAccountPortal(doc) {
  if (bound.has(doc)) return;
  bound.add(doc);
  doc.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-account-portal-copy]');
    if (!button || button.disabled) return;
    const section = button.closest('.account-portal');
    const input = section.querySelector('#account-portal-url');
    const status = section.querySelector('[data-account-portal-status]');
    button.disabled = true;
    await copyAccountPortal(input, status, globalThis.navigator?.clipboard);
    button.disabled = false;
  });
}
