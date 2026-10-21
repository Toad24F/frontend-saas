import { api, user, roleLabel } from '../../backend.js';
import { render } from '../../../shared/app.js';
import { icon } from '../../../shared/icons.js';
import { escape, pageHead } from '../../../shared/ui.js';
import { licenseProgress } from './license-progress.js';
import './style.css';
import { db } from '../../../shared/data.js';
import { renderAccountPortal, bindAccountPortal } from '../../../shared/account-portal.js';
import '../../../shared/account-portal.css';

let licenseUserId = null;
let license = null;
let loading = false;
let error = null;

const licenseName = (state) => ({
  pendiente: 'Pendiente',
  vigente: 'Vigente',
  suspension_pendiente: 'Suspensión programada',
  suspendida: 'Suspendida',
  vencida: 'Vencida',
})[state] || state;

const dateText = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
const initials = (name) => (name || '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'MC';
const remainingText = (time) => time
  ? [time.dias + ' días', time.horas + ' horas', time.minutos + ' minutos'].join(', ')
  : '—';

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

function licenseContent() {
  if (!license) {
    return '<p class="account-license-message" role="' + (error ? 'alert' : 'status') + '">' +
      (error ? escape(error.message) : loading ? 'Consultando vigencia…' : 'Sin datos de licencia.') + '</p>';
  }
  const progress = licenseProgress(license);
  const status = license.estado || 'pendiente';
  const time = license.tiempoRestante;
  const progressMarkup = progress
    ? '<div class="account-license-progress"><div class="account-progress-heading"><span>Vigencia restante</span><strong>' +
      escape(remainingText(time)) + '</strong></div><progress max="100" value="' +
      progress.value + '" aria-label="Porcentaje restante de la vigencia total de la licencia">' +
      progress.value + '%</progress><p>' +
      'Calculada sobre la vigencia total de tu licencia, incluidas renovaciones.' +
      '</p></div>'
    : '<p class="account-license-message">Aún no hay tiempo restante disponible.</p>';
  return '<div class="account-license-overview"><div><span class="account-eyebrow">Tiempo restante</span>' +
    '<strong class="account-license-days">' + (time ? escape(String(time.dias)) : '—') +
    '<span> días</span></strong><p>Tu acceso al negocio</p></div>' +
    '<span class="account-license-status is-' + escape(status) + '">' + escape(licenseName(status)) + '</span></div>' +
    progressMarkup +
    '<div class="account-license-facts"><div><span>Vencimiento</span><strong>' + escape(dateText(license.venceEn)) +
    '</strong></div><div><span>Bloqueo programado</span><strong>' +
    escape(dateText(license.bloqueoProgramadoEn)) + '</strong></div></div>';
}

export function account() {
  bindAccountPortal(document);
  if (user.rol !== 'superadmin' && licenseUserId !== user.id) {
    licenseUserId = user.id;
    license = null;
    loading = true;
    void refreshOwnLicense();
  }
  const name = escape(user.nombre || 'Mi cuenta');
  const role = escape(roleLabel(user.rol));
  const email = escape(user.email || '—');
  return '<div class="account-page">' +
    pageHead('Mi cuenta', 'Consulta los datos de tu acceso y la vigencia de tu licencia.') +
    '<section class="surface account-identity" aria-label="Perfil de cuenta">' +
    '<span class="account-avatar" aria-hidden="true">' + escape(initials(user.nombre)) + '</span>' +
    '<div class="account-identity-copy"><span class="account-eyebrow">Perfil de cuenta</span><h2>' + name +
    '</h2><p>' + email + '</p></div><span class="account-role">' + role + '</span></section>' +
    '<div class="account-grid"><section class="surface account-section"><div class="account-section-heading">' +
    '<span class="account-section-icon" aria-hidden="true">' + icon('user') + '</span>' +
    '<div><h2>Datos de acceso</h2><p>Información vinculada a tu sesión.</p></div></div>' +
    '<dl class="account-details"><div><dt>Nombre</dt><dd>' + name + '</dd></div>' +
    '<div><dt>Correo electrónico</dt><dd>' + email + '</dd></div>' +
    '<div><dt>Rol</dt><dd>' + role + '</dd></div></dl></section>' +
    '<section class="surface account-section account-security"><div class="account-section-heading">' +
    '<span class="account-section-icon" aria-hidden="true">' + icon('lock') + '</span>' +
    '<div><h2>Seguridad</h2><p>Controla el acceso a tu cuenta.</p></div></div>' +
    '<div class="account-security-actions"><button type="button" class="btn btn-primary" data-action="change-password">' +
    icon('lock') + 'Cambiar contraseña</button>' +
    '<button type="button" class="btn btn-light" data-action="logout-account">Cerrar sesión</button></div></section></div>' +
    renderAccountPortal({ user, tenant: db.tenants.find((tenant) => tenant.id === user.negocioId), origin: location.origin }) +
    (user.rol === 'superadmin' ? '' :
      '<section class="surface account-section account-license"><div class="account-section-heading">' +
      '<span class="account-section-icon" aria-hidden="true">' + icon('calendar') + '</span>' +
      '<div><h2>Licencia del negocio</h2><p>Estado de vigencia de tu acceso.</p></div>' +
      '<button type="button" class="btn btn-light account-refresh" data-action="refresh-license">Actualizar estado</button>' +
      '</div>' + licenseContent() + '</section>') +
    '</div>';
}
