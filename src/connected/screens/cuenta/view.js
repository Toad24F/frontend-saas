import { api, user, roleLabel } from '../../backend.js';
import { render } from '../../../shared/app.js';
import { icon } from '../../../shared/icons.js';
import { escape, pageHead } from '../../../shared/ui.js';
import './style.css';

let licenseUserId = null;
let license = null;
let loading = false;
let error = null;

const licenseName = (state) => ({ pendiente: 'Pendiente', vigente: 'Vigente', suspension_pendiente: 'Suspensión programada', suspendida: 'Suspendida', vencida: 'Vencida' })[state] || state;
const dateText = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export async function refreshOwnLicense() {
  if (!user || user.rol === 'superadmin') return;
  const id = user.id;
  licenseUserId = id;
  loading = true;
  error = null;
  try {
    const next = await api('/licencias/mi-vigencia');
    if (licenseUserId === id) license = next;
  } catch (caught) {
    if (licenseUserId === id) error = caught;
  } finally {
    if (licenseUserId === id) { loading = false; render(); }
  }
}

export function account() {
  if (user.rol !== 'superadmin' && licenseUserId !== user.id) {
    licenseUserId = user.id;
    license = null;
    loading = true;
    void refreshOwnLicense();
  }
  return `${pageHead('Mi cuenta', 'Consulta tu acceso y administra tu contraseña.')}<div class="account-grid"><section class="surface account-section"><div class="section-heading"><h2>Datos de acceso</h2><span class="soft-tag">${escape(roleLabel(user.rol))}</span></div><div class="business-detail-list"><div><span>Nombre</span><strong>${escape(user.nombre)}</strong></div><div><span>Correo</span><strong>${escape(user.email)}</strong></div><div><span>Rol</span><strong>${escape(roleLabel(user.rol))}</strong></div></div><div class="business-detail-actions"><button type="button" class="btn btn-primary" data-action="change-password">${icon('lock')}Cambiar contraseña</button><button type="button" class="btn btn-light" data-action="logout-account">Cerrar sesión</button></div></section>${user.rol === 'superadmin' ? '' : `<section class="surface account-section"><div class="section-heading"><div><h2>Licencia del negocio</h2><p>El estado y tiempo restante vienen del backend.</p></div></div>${license ? `<div class="business-detail-list"><div><span>Estado</span><strong>${escape(licenseName(license.estado))}</strong></div><div><span>Vencimiento</span><strong>${dateText(license.venceEn)}</strong></div><div><span>Bloqueo programado</span><strong>${dateText(license.bloqueoProgramadoEn)}</strong></div><div><span>Tiempo restante</span><strong>${license.tiempoRestante ? `${license.tiempoRestante.dias} días, ${license.tiempoRestante.horas} horas y ${license.tiempoRestante.minutos} minutos` : '—'}</strong></div></div>` : `<p role="${error ? 'alert' : 'status'}">${error ? escape(error.message) : loading ? 'Consultando vigencia…' : 'Sin datos de licencia.'}</p>`}<div class="business-detail-actions"><button type="button" class="btn btn-light" data-action="refresh-license">Actualizar estado</button></div></section>`}</div>`;
}
