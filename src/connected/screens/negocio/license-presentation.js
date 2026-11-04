const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateText = (value) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const names = { pendiente: 'Pendiente', vigente: 'Vigente', suspension_pendiente: 'Suspensión programada',
  suspendida: 'Suspendida', vencida: 'Vencida' };
const deliveryNames = { pendiente: 'Pendiente', tomado: 'En proceso', enviado: 'Enviado',
  fallido: 'Fallido', descartado: 'Descartado' };

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
      : state === 'vigente' ? '<button type="button" class="btn btn-danger-soft" data-business-action="suspend">Programar suspensión</button>' : ''}` : '';
  const explanation = state === 'suspension_pendiente'
    ? `El acceso sigue permitido hasta el bloqueo programado para ${esc(dateText(validity.bloqueoProgramadoEn))}, si la licencia no vence antes.`
    : state === 'suspendida' ? 'Acceso bloqueado. La reactivación restaura el tiempo conservado; renovar no levanta la suspensión.'
      : state === 'vencida' ? 'Acceso bloqueado por vencimiento. Renovar habilita un nuevo plazo si no existe otra suspensión.'
        : state === 'pendiente' ? 'La licencia aún no habilita el acceso.' : 'La licencia permite el acceso hasta su vencimiento.';
  return `<div class="business-detail-list"><div><span>Estado</span><strong>${esc(names[state] || 'Sin licencia')}</strong></div>
    <div><span>Acceso</span><strong>${validity?.condicionAcceso ? 'Acceso permitido' : 'Acceso bloqueado'}</strong></div>
    <div><span>Vence</span><strong>${esc(dateText(validity?.venceEn))}</strong></div>
    <div><span>Bloqueo programado</span><strong>${esc(dateText(validity?.bloqueoProgramadoEn))}</strong></div>
    <div><span>Tiempo restante</span><strong>${remaining ? `${remaining.dias} días, ${remaining.horas} horas y ${remaining.minutos} minutos` : '—'}</strong></div></div>
    <p class="information-note">${explanation}</p><div class="business-detail-actions">${actions}</div>`;
}

// El correo se consulta por separado. Una transición de licencia exitosa solo
// puede encolar avisos; no prueba que el proveedor los haya enviado.
export function licenseDeliveryHtml(deliveries) {
  if (!deliveries.length) return '<p>Sin correos registrados.</p>';
  return `<div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Tipo</th><th>Estado</th><th>Intentos</th><th>Confirmación / próximo intento</th><th>Acción</th></tr></thead><tbody>${deliveries.map((delivery) =>
    `<tr><td>${esc(delivery.tipo)}</td><td><span class="soft-tag">${esc(deliveryNames[delivery.estado] || delivery.estado)}</span>${delivery.ultimoError ? `<small class="d-block">${esc(delivery.ultimoError)}</small>` : ''}</td>
    <td>${esc(delivery.intentos)}</td><td>${esc(dateText(delivery.confirmadoEn || delivery.proximoIntentoEn))}</td>
    <td>${delivery.estado === 'fallido' ? `<button class="text-button" data-retry-delivery="${esc(delivery.id)}">Reintentar</button>` : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}
