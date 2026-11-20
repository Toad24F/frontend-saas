import { escaparHtml } from './interfaz.componentes.js';
import { renderIcono } from './iconos.catalogo.js';

// Solo usa el slug del modelo del negocio propio: ni nombres normalizados,
// IDs numéricos ni consultas de superadministración sustituyen este dato.
export function urlPortalCuenta({ usuario, negocio, origen, demo = false }) {
  if (usuario?.rol !== 'admin_negocio' || !usuario.negocioId || negocio?.id !== usuario.negocioId ||
    typeof negocio.slug !== 'string' || negocio.slug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(negocio.slug)) return null;
  const urlBase = new URL(origen);
  if (!['http:', 'https:'].includes(urlBase.protocol)) return null;
  return `${urlBase.origin}/reservas/${negocio.slug}${demo ? '?demo=1' : ''}`;
}

export function renderPortalCuenta(contexto) {
  if (contexto.usuario?.rol !== 'admin_negocio') return '';
  const enlace = urlPortalCuenta(contexto);
  return `<section class="surface account-portal" aria-labelledby="account-portal-title">
    <h2 id="account-portal-title">Tu portal de reservas</h2>
    <p>${contexto.demo ? 'Demostración con datos ficticios; no crea reservas reales.' : 'Comparte este enlace para que tus clientes consulten horarios y soliciten una reserva.'}</p>
    ${enlace ? `<label for="account-portal-url">Enlace del portal</label><input class="form-control" id="account-portal-url" value="${escaparHtml(enlace)}" readonly>
      <div class="account-portal-actions"><a class="btn btn-primary" href="${escaparHtml(enlace)}" target="_blank" rel="noopener noreferrer">${renderIcono('external')}Abrir portal<span class="visually-hidden"> (nueva pestaña)</span></a>
      <button class="btn btn-light" type="button" data-account-portal-copy>${renderIcono('link')}Copiar enlace</button></div>` :
    '<p class="account-portal-unavailable">El enlace del negocio todavía no está disponible en tu perfil.</p><div class="account-portal-actions"><button class="btn btn-primary" type="button" disabled>Abrir portal</button><button class="btn btn-light" type="button" disabled>Copiar enlace</button></div>'}
    <p class="account-portal-status" data-account-portal-status role="status" aria-live="polite"></p></section>`;
}

// La apertura usa un enlace nativo sin data-portal: inicia la entrada pública
// independiente y no cae en el router interno del panel. Copiar nunca abre la API.
export async function copiarEnlacePortalCuenta(campo, aviso, portapapeles) {
  try {
    await portapapeles.writeText(campo.value);
    aviso.textContent = 'Enlace copiado.';
  } catch {
    campo.focus(); campo.select();
    aviso.textContent = 'Copia manualmente el enlace seleccionado.';
  }
}

const documentosVinculados = new WeakSet();
export function vincularPortalCuenta(documento) {
  if (documentosVinculados.has(documento)) return;
  documentosVinculados.add(documento);
  documento.addEventListener('click', async (evento) => {
    const boton = evento.target.closest('[data-account-portal-copy]');
    if (!boton || boton.disabled) return;
    const seccion = boton.closest('.account-portal');
    const campo = seccion.querySelector('#account-portal-url');
    const aviso = seccion.querySelector('[data-account-portal-status]');
    boton.disabled = true;
    await copiarEnlacePortalCuenta(campo, aviso, globalThis.navigator?.clipboard);
    boton.disabled = false;
  });
}
