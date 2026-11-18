import { progresoLicencia } from '../cuenta/licencia.progreso.js';

const escapar = (valor = '') => String(valor).replace(/[&<>"']/g, (caracter) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);
const textoFecha = (valor) => valor && Number.isFinite(Date.parse(valor))
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor)) : '—';
const nombres = { pendiente: 'Pendiente', vigente: 'Vigente', suspension_pendiente: 'Suspensión programada',
  suspendida: 'Suspendida', vencida: 'Vencida' };

// La vigencia del servidor determina el texto y las acciones. Una renovación
// aumenta plazo, pero nunca se anuncia como reactivación de una suspensión.
export function renderEstadoLicencia(vigencia, pendiente = null) {
  const estado = vigencia?.estado;
  const restante = vigencia?.tiempoRestante;
  const acciones = pendiente ? `<p role="status">Operación ${escapar(pendiente.action)} pendiente de comprobar. No inicies otra transición.</p>
    <button type="button" class="btn btn-primary" data-licencia-reintentar>Comprobar operación</button>`
    : estado && estado !== 'pendiente' ? `<button type="button" class="btn btn-light" data-accion-negocio="renovar">Renovar un año</button>
    ${['suspendida', 'suspension_pendiente'].includes(estado)
      ? '<button type="button" class="btn btn-primary" data-accion-negocio="reactivar">Reactivar licencia</button>'
      : estado === 'vigente' ? '<button type="button" class="btn btn-danger negocio-boton-suspender" data-accion-negocio="suspender">Programar suspensión</button>' : ''}` : '';
  const explicacion = estado === 'suspension_pendiente'
    ? `El acceso sigue permitido hasta el bloqueo programado para ${escapar(textoFecha(vigencia.bloqueoProgramadoEn))}, si la licencia no vence antes.`
    : estado === 'suspendida' ? 'Acceso bloqueado. La reactivación restaura el tiempo conservado; renovar no levanta la suspensión.'
      : estado === 'vencida' ? 'Acceso bloqueado por vencimiento. Renovar habilita un nuevo plazo si no existe otra suspensión.'
        : estado === 'pendiente' ? 'La licencia aún no habilita el acceso.' : 'La licencia permite el acceso hasta su vencimiento.';
  const progreso = progresoLicencia(vigencia);
  const congelado = estado === 'suspendida' || vigencia?.tiempoCongelado === true;
  const tono = estado === 'vencida' ? 'vencido' : !congelado && restante && restante.dias < 30 ? 'aviso' : 'normal';
  const acceso = vigencia?.condicionAcceso === true ? 'Acceso permitido' : vigencia?.condicionAcceso === false ? 'Acceso bloqueado' : 'Acceso sin confirmar';
  return `<div class="negocio-estado-licencia"><strong class="negocio-etiqueta-licencia negocio-etiqueta-licencia-${Object.hasOwn(nombres, estado) ? estado : 'desconocida'}">${escapar(nombres[estado] || 'Sin licencia')}</strong><span>${acceso}</span></div>
    <div class="negocio-tiempo-licencia negocio-tiempo-licencia-${tono}"><div class="negocio-encabezado-tiempo-licencia"><div><span>${congelado ? 'Tiempo conservado' : 'Tiempo restante'}</span><strong>${restante ? `${escapar(restante.dias)} días${congelado ? ' conservados' : ' restantes'}` : 'Sin tiempo disponible'}</strong>${restante ? `<small>${escapar(restante.horas)} horas y ${escapar(restante.minutos)} minutos</small>` : ''}</div>${vigencia?.venceEn ? `<div class="negocio-vencimiento-licencia"><span>Vence el</span><strong>${escapar(textoFecha(vigencia.venceEn))}</strong></div>` : ''}</div>
    ${progreso ? `<progress max="100" value="${progreso.valor}" aria-label="${congelado ? 'Porcentaje de tiempo conservado' : 'Porcentaje de tiempo restante'} de la licencia">${progreso.valor}%</progress><p class="negocio-porcentaje-licencia">${progreso.valor}% ${congelado ? 'conservado' : 'restante'} del periodo de licencia</p>` : restante ? '<p class="negocio-porcentaje-licencia">Porcentaje no disponible para este periodo.</p>' : ''}</div>
    ${vigencia?.bloqueoProgramadoEn ? `<p class="negocio-aviso-licencia"><strong>Bloqueo programado:</strong> ${escapar(textoFecha(vigencia.bloqueoProgramadoEn))}</p>` : ''}
    ${estado && estado !== 'vigente' ? `<p class="negocio-aviso-licencia">${explicacion}</p>` : ''}<div class="negocio-acciones-detalle">${acciones}</div>`;
}

// El correo se consulta por separado. Una transición de licencia exitosa solo
// puede encolar avisos; no prueba que el proveedor los haya enviado.
export { renderResultadosCorreo as renderEnviosLicencia } from './correo.historial.js';
