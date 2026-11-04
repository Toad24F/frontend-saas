import { api, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { icon } from '../../../shared/icons.js';
import { escape, pageHead, empty } from '../../../shared/ui.js';
import { createLicenseOperations } from './license-operations.js';
import { licenseStatusHtml, licenseDeliveryHtml } from './license-presentation.js';
import './style.css';

let currentId = null;
let snapshot = null;
let loading = null;
let failure = null;

const dateText = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const licenseText = (state) => ({ pendiente: 'Pendiente', vigente: 'Vigente', suspension_pendiente: 'Suspensión programada', suspendida: 'Suspendida', vencida: 'Vencida' })[state] || state || 'Sin licencia';

async function fetchBusiness(id) {
  const business = await api(`/negocios/${id}`);
  const [quota, deliveries, validity] = await Promise.all([
    api(`/negocios/${id}/cupo-sucursales`),
    api(`/negocios/${id}/envios`),
    business.licencia ? api(`/licencias/${business.licencia.id}/vigencia`) : null,
  ]);
  return { business, quota, deliveries, validity };
}

export async function refreshBusinessDetail() {
  const id = Number(state.businessId);
  currentId = id;
  snapshot = null;
  failure = null;
  loading = fetchBusiness(id);
  try {
    const result = await loading;
    if (currentId === id) snapshot = result;
  } catch (error) {
    if (currentId === id) failure = error;
  } finally {
    if (currentId === id) {
      loading = null;
      render();
    }
  }
}

export function invalidateBusinessDetail() {
  currentId = null;
  snapshot = null;
  failure = null;
  loading = null;
}

export function businessDetailData() { return snapshot; }

export function businessDetail() {
  const id = Number(state.businessId);
  if (!Number.isSafeInteger(id) || id < 1) return empty('Negocio no encontrado', 'Vuelve al panel para elegir un negocio.');
  if (currentId !== id) {
    currentId = id;
    snapshot = null;
    failure = null;
    loading = null;
  }
  if (!snapshot && !failure && !loading) void refreshBusinessDetail();
  if (failure) return `${pageHead('Detalle de negocio', 'No pudimos cargar este negocio.')}<section class="surface business-detail-section"><p role="alert">${escape(failure.message)}</p><button class="btn btn-light" data-action="back-platform">Volver al panel</button><button class="btn btn-primary" data-action="retry-business-detail">Reintentar</button></section>`;
  if (!snapshot) return `${pageHead('Detalle de negocio', 'Consultando licencia, cupo e historial de envíos.')}<section class="surface business-detail-section" role="status">Cargando datos del negocio…</section>`;

  const { business, quota, deliveries, validity } = snapshot;
  const invited = !business.administrador?.activadoEn;
  const failed = deliveries.filter((delivery) => delivery.estado === 'fallido').length;
  const canRecover = business.administrador?.id && business.administrador?.activadoEn;
  let licensePending = null;
  try { licensePending = createLicenseOperations({ api, actorId: user.id }).pending(); }
  catch { licensePending = { action: 'ilegible' }; }
  return `${pageHead(business.nombre, 'Administración del negocio y seguimiento de su acceso.', '<button type="button" class="btn btn-light" data-action="back-platform">' + icon('arrow') + 'Volver al panel</button>')}<div class="stats-grid">${[
    ['Licencia', licenseText(validity?.estado), validity?.condicionAcceso === true ? 'Acceso permitido' : validity?.condicionAcceso === false ? 'Acceso bloqueado' : 'Estado del servidor'],
    ['Sucursales activas', `${quota.sucursalesActivas} / ${quota.limiteSucursalesActivas}`, `${quota.disponibles} disponibles`],
    ['Administrador', invited ? 'Pendiente' : 'Activado', business.administrador?.email || 'Sin correo'],
    ['Correos fallidos', failed, `${deliveries.length} envíos registrados`],
  ].map(([label, value, caption]) => `<div class="stat-card"><div class="stat-top">${escape(label)}</div><div class="stat-number">${escape(value)}</div><span class="stat-caption">${escape(caption)}</span></div>`).join('')}</div>
  <div class="business-detail-grid"><section class="surface business-detail-section"><div class="section-heading"><div><h2>Datos e invitación</h2><p>La activación crea la cuenta y habilita el primer año de licencia.</p></div></div><div class="business-detail-list"><div><span>Identificador público</span><strong>${escape(business.identificadorPublico)}</strong></div><div><span>Correo del administrador</span><strong>${escape(business.administrador?.email || business.emailContacto || '—')}</strong></div><div><span>Creado</span><strong>${dateText(business.creadoEn)}</strong></div><div><span>Activado</span><strong>${dateText(business.activadoEn)}</strong></div></div><div class="business-detail-actions">${invited ? `<button class="btn btn-light" data-business-action="email">Corregir correo</button><button class="btn btn-light" data-business-action="reissue">Reemitir código</button>` : ''}${canRecover ? `<button class="btn btn-light" data-business-action="recovery">Autorizar recuperación</button>` : ''}</div></section>
  <section class="surface business-detail-section"><div class="section-heading"><div><h2>Licencia y cupo</h2><p>El límite aplica a sucursales activas.</p></div></div>${licenseStatusHtml(validity, licensePending)}<div class="business-detail-actions"><button class="btn btn-light" data-business-action="limit">Cambiar límite</button></div></section></div>
  <section class="surface business-detail-section"><div class="section-heading"><div><h2>Historial de correos</h2><p>Un envío en cola aún no confirma entrega.</p></div></div>${deliveries.length ? licenseDeliveryHtml(deliveries) : empty('Sin correos registrados', 'Aquí aparecerán los estados de invitaciones y avisos.')}</section>`;
}
