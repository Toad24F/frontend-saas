import { api, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { icon } from '../../../shared/icons.js';
import { escape, pageHead, empty } from '../../../shared/ui.js';
import { createLicenseOperations } from './license-operations.js';
import { licenseStatusHtml } from './license-presentation.js';
import { readUserQuota, quotaHtml } from './user-quota.js';
import './style.css';
import '../../../shared/screens/disponibilidad/style.css';
import { quotaMeter } from './quota-meter.js';
import { mailHistoryHtml } from './mail-history.js';
import { bindBusinessWorkspace, workspaceState } from './workspace.js';

let currentId = null;
let snapshot = null;
let loading = null;
let failure = null;

const dateText = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

async function fetchBusiness(id) {
  const business = await api(`/negocios/${id}`);
  // El superadmin recibe ambos cupos del servidor junto con el detalle actual;
  // ningún contador procede de las filas visibles en catálogos.
  const [quota, userQuota, deliveries, validity] = await Promise.all([
    api(`/negocios/${id}/cupo-sucursales`),
    readUserQuota(id, api),
    api(`/negocios/${id}/envios`),
    business.licencia ? api(`/licencias/${business.licencia.id}/vigencia`) : null,
  ]);
  return { business, quota, userQuota, deliveries, validity };
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
    if (workspaceState.businessId !== id) {
      workspaceState.businessId = id;
      workspaceState.tab = 'general';
      workspaceState.mail = { status: '', type: '', page: 1 };
    }
    snapshot = null;
    failure = null;
    loading = null;
  }
  if (!snapshot && !failure && !loading) void refreshBusinessDetail();
  if (failure) return `${pageHead('Detalle de negocio', 'No pudimos cargar este negocio.')}<section class="surface business-detail-section"><p role="alert">${escape(failure.message)}</p><button class="btn btn-light" data-action="back-platform">Volver al panel</button><button class="btn btn-primary" data-action="retry-business-detail">Reintentar</button></section>`;
  if (!snapshot) return `${pageHead('Detalle de negocio', 'Consultando licencia, cupo e historial de envíos.')}<section class="surface business-detail-section" role="status">Cargando datos del negocio…</section>`;

  const { business, quota, userQuota, deliveries, validity } = snapshot;
  const invited = !business.administrador?.activadoEn;
  const failed = deliveries.filter((delivery) => delivery.estado === 'fallido').length;
  const canRecover = business.administrador?.id && business.administrador?.activadoEn;
  let licensePending = null;
  try { licensePending = createLicenseOperations({ api, actorId: user.id }).pending(); }
  catch { licensePending = { action: 'ilegible' }; }
  const general = `<div class="business-general"><section class="business-general-section" aria-labelledby="business-license-heading"><h2 id="business-license-heading">Licencia</h2>${licenseStatusHtml(validity, licensePending)}</section><section class="business-general-section" aria-labelledby="business-admin-heading"><h2 id="business-admin-heading">Administrador e invitación</h2>${invited ? '<p class="business-general-description">La activación crea la cuenta y habilita el primer año de licencia.</p>' : ''}<dl class="business-admin-facts"><div><dt>Correo del administrador</dt><dd>${escape(business.administrador?.email || business.emailContacto || '—')}</dd></div><div><dt>Identificador público</dt><dd>${escape(business.identificadorPublico)}</dd></div><div><dt>Fecha de creación</dt><dd>${dateText(business.creadoEn)}</dd></div><div><dt>Fecha de activación</dt><dd>${dateText(business.activadoEn)}</dd></div></dl><div class="business-detail-actions">${invited ? '<button class="btn btn-light" data-business-action="email">Corregir correo</button><button class="btn btn-light" data-business-action="reissue">Reemitir código</button>' : ''}${canRecover ? '<button class="btn btn-light" data-business-action="recovery">Autorizar recuperación</button>' : ''}</div></section></div>`;

  const limits = `<div class="business-limits"><section class="business-general-section" aria-labelledby="business-branches-heading"><h2 id="business-branches-heading">Sucursales</h2><p class="business-general-description">El límite aplica a sucursales activas.</p>${quotaMeter('Sucursales activas', quota.sucursalesActivas, quota.limiteSucursalesActivas, quota.disponibles)}<div class="business-detail-actions"><button class="btn btn-light" data-business-action="limit">Cambiar límite de sucursales</button></div></section><section class="business-general-section" aria-labelledby="business-users-heading"><h2 id="business-users-heading">Usuarios</h2><p class="business-general-description">Límites y consumo de cuentas activas.</p>${quotaHtml(userQuota)}</section></div>`;
  const mail = `<section class="business-general-section business-mail-section" aria-labelledby="business-mail-heading"><h2 id="business-mail-heading">Historial de correos</h2><p class="business-general-description">Invitaciones y avisos, del más reciente al más antiguo.</p>${mailHistoryHtml(deliveries, workspaceState.mail)}</section>`;

  const tabs = [['general', 'General', general], ['limits', 'Límites y uso', limits], ['mail', `Historial de correos${failed ? ` · ${failed} fallidos` : ''}`, mail]];
  return `${pageHead(business.nombre, 'Administración del negocio y seguimiento de su acceso.', '<button type="button" class="btn btn-light" data-action="back-platform">' + icon('arrow') + 'Volver al panel</button>')}<div class="business-workspace"><nav class="availability-tabs" role="tablist" aria-label="Información del negocio">${tabs.map(([id, label]) => `<button type="button" role="tab" id="business-tab-${id}" aria-controls="business-panel-${id}" aria-selected="${workspaceState.tab === id}" tabindex="${workspaceState.tab === id ? 0 : -1}" data-business-tab="${id}" class="${workspaceState.tab === id ? 'is-selected' : ''}">${label}</button>`).join('')}</nav>${tabs.map(([id, , content]) => `<div role="tabpanel" tabindex="0" id="business-panel-${id}" aria-labelledby="business-tab-${id}" ${workspaceState.tab === id ? '' : 'hidden'}>${content}</div>`).join('')}</div>`;
}

bindBusinessWorkspace(() => snapshot, refreshBusinessDetail);
