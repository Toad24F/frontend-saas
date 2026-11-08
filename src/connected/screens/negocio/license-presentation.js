import { licenseProgress } from '../cuenta/license-progress.js';

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateText = (value) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const names = { pendiente: 'Pendiente', vigente: 'Vigente', suspension_pendiente: 'Suspensión programada',
  suspendida: 'Suspendida', vencida: 'Vencida' };

// La vigencia del servidor determina el texto y las acciones. Una renovación
// aumenta plazo, pero nunca se anuncia como reactivación de una suspensión.
export function licenseStatusHtml(validity, pending = null) {
  const state = validity?.estado;
  const remaining = validity?.tiempoRestante;
  const actions = pending ? `<p role="status">Operación ${esc(pending.action)} pendiente de comprobar. No inicies otra transición.</p>
    <button type="button" class="btn btn-primary" data-license-retry>Comprobar operación</button>`
    : state && state !== 'pendiente' ? `<button type="button" class="btn btn-light" data-business-action="renew">Renovar un año</button>
    ${['suspendida', 'suspension_pendiente'].includes(state)
      ? '<button type="button" class="btn btn-primary" data-business-action="reactivate">Reactivar licencia</button>'
      : state === 'vigente' ? '<button type="button" class="btn btn-danger business-suspend-button" data-business-action="suspend">Programar suspensión</button>' : ''}` : '';
  const explanation = state === 'suspension_pendiente'
    ? `El acceso sigue permitido hasta el bloqueo programado para ${esc(dateText(validity.bloqueoProgramadoEn))}, si la licencia no vence antes.`
    : state === 'suspendida' ? 'Acceso bloqueado. La reactivación restaura el tiempo conservado; renovar no levanta la suspensión.'
      : state === 'vencida' ? 'Acceso bloqueado por vencimiento. Renovar habilita un nuevo plazo si no existe otra suspensión.'
        : state === 'pendiente' ? 'La licencia aún no habilita el acceso.' : 'La licencia permite el acceso hasta su vencimiento.';
  const progress = licenseProgress(validity);
  const frozen = state === 'suspendida' || validity?.tiempoCongelado === true;
  const tone = state === 'vencida' ? 'expired' : !frozen && remaining && remaining.dias < 30 ? 'warning' : 'normal';
  const access = validity?.condicionAcceso === true ? 'Acceso permitido' : validity?.condicionAcceso === false ? 'Acceso bloqueado' : 'Acceso sin confirmar';
  return `<div class="business-license-state"><strong class="business-license-badge business-license-badge-${Object.hasOwn(names, state) ? state : 'unknown'}">${esc(names[state] || 'Sin licencia')}</strong><span>${access}</span></div>
    <div class="business-license-time business-license-time-${tone}"><div class="business-license-time-heading"><div><span>${frozen ? 'Tiempo conservado' : 'Tiempo restante'}</span><strong>${remaining ? `${esc(remaining.dias)} días${frozen ? ' conservados' : ' restantes'}` : 'Sin tiempo disponible'}</strong>${remaining ? `<small>${esc(remaining.horas)} horas y ${esc(remaining.minutos)} minutos</small>` : ''}</div>${validity?.venceEn ? `<div class="business-license-expiry"><span>Vence el</span><strong>${esc(dateText(validity.venceEn))}</strong></div>` : ''}</div>
    ${progress ? `<progress max="100" value="${progress.value}" aria-label="${frozen ? 'Porcentaje de tiempo conservado' : 'Porcentaje de tiempo restante'} de la licencia">${progress.value}%</progress><p class="business-license-percentage">${progress.value}% ${frozen ? 'conservado' : 'restante'} del periodo de licencia</p>` : remaining ? '<p class="business-license-percentage">Porcentaje no disponible para este periodo.</p>' : ''}</div>
    ${validity?.bloqueoProgramadoEn ? `<p class="business-license-notice"><strong>Bloqueo programado:</strong> ${esc(dateText(validity.bloqueoProgramadoEn))}</p>` : ''}
    ${state && state !== 'vigente' ? `<p class="business-license-notice">${explanation}</p>` : ''}<div class="business-detail-actions">${actions}</div>`;
}

// El correo se consulta por separado. Una transición de licencia exitosa solo
// puede encolar avisos; no prueba que el proveedor los haya enviado.
export { mailResultsHtml as licenseDeliveryHtml } from './mail-history.js';
