import { confirmarCancelacion } from '../../../shared/screens/agenda/agenda.menu-estado.js';
import { statuses } from '../../../shared/data.js';
import { escape as esc } from '../../../shared/ui.js';
import { puedeGestionarCitas, crearClientCitaManual } from '../../modules/agenda/agenda.contrato-manual.js';
import { borradorAgenda, guardarBorradorAgenda, borrarBorradorAgenda } from '../../../shared/screens/agenda/agenda.paneles.js';
import { errorSeguro } from '../../modules/agenda/agenda.errores.js';

// La versión procede del detalle observado. Un conflicto exige releer y nunca se reenvía con una versión nueva automáticamente.
export function montarEditorEstado(dialogo, detalle, { role: rol, scope: ambito, request: solicitar, onChanged: alCambiar, onReload: alRecargar, isCurrent: esVigente = () => true }) {
  if (!puedeGestionarCitas(rol)) return;
  dialogo.querySelector('.agenda-historial').insertAdjacentHTML('beforebegin', `<form class="agenda-editor-estado"><h3>Gestionar estado</h3><label class="form-label" for="cita-estado">Estado de la cita</label><select class="form-select" id="cita-estado" name="estado">${Object.entries(statuses).map(([valor, etiqueta]) => `<option value="${valor}" ${valor === detalle.estado ? 'selected' : ''}>${etiqueta}</option>`).join('')}</select><label class="form-label" for="cita-motivo">Motivo del cambio <span class="optional">(opcional)</span></label><textarea class="form-control" id="cita-motivo" name="motivo" rows="2" maxlength="2000"></textarea><p class="field-hint">Solo Cancelada libera el horario. No asistió lo conserva. Los estados finales y la reactivación se comprueban en el servidor.</p><p class="form-error" data-estado-error role="alert" tabindex="-1" hidden></p><div class="agenda-paginas-historial"><button type="submit" class="btn btn-primary">Guardar estado</button><button type="button" class="btn btn-light" data-estado-recargar hidden>Actualizar detalle</button></div></form>`);
  const formulario = dialogo.querySelector('.agenda-editor-estado'), guardar = formulario.querySelector('[type="submit"]'), recargar = formulario.querySelector('[data-estado-recargar]'), contenedorError = formulario.querySelector('[data-estado-error]');
  const client = crearClientCitaManual(solicitar); let ocupado = false, desactualizado = false;
  const claveBorrador = `state:${ambito}:${detalle.id}`, borrador = borradorAgenda(claveBorrador);
  // El sondeo avisa sin sustituir estado/motivo ni mover el foco que está usando la persona.
  formulario.addEventListener('registro-desactualizado', (evento) => {
    desactualizado = true; guardar.disabled = true; recargar.hidden = false;
    contenedorError.textContent = evento.detail.kind === 'stale' ? 'La cita cambió en otra sesión. Conservamos tu borrador; actualiza el detalle antes de guardar.' : 'No se pudo comprobar la versión vigente. Actualiza el detalle antes de guardar.';
    contenedorError.hidden = false;
    guardarBorradorAgenda(claveBorrador, { estado: formulario.elements.estado.value, motivo: formulario.elements.motivo.value, version: detalle.version, stale: true });
  });
  if (borrador) {
    formulario.elements.estado.value = borrador.estado; formulario.elements.motivo.value = borrador.motivo;
    desactualizado = borrador.stale || borrador.version !== detalle.version;
    if (desactualizado) {
      contenedorError.textContent = 'La cita cambió o existe un conflicto pendiente. Actualiza el detalle antes de volver a guardar.';
      contenedorError.hidden = false; recargar.hidden = false; guardar.disabled = true;
    }
  }
  // Un borrador antiguo nunca adopta silenciosamente una versión nueva al reabrir el panel.
  dialogo.addEventListener('close', () => {
    if (formulario.isConnected && esVigente()) guardarBorradorAgenda(claveBorrador, { estado: formulario.elements.estado.value, motivo: formulario.elements.motivo.value, version: detalle.version, stale: desactualizado || ocupado });
  }, { once: true });
  recargar.onclick = () => { if (!ocupado && esVigente()) { borrarBorradorAgenda(claveBorrador); void alRecargar(); } };
  formulario.onsubmit = async (evento) => {
    evento.preventDefault(); if (ocupado || desactualizado || !esVigente()) return;
    ocupado = true; guardar.disabled = true; contenedorError.hidden = true;
    try {
      const valores = new FormData(formulario);
      if (valores.get('estado') === 'cancelada' && detalle.estado !== 'cancelada') {
        const confirmacion = await confirmarCancelacion(detalle, valores.get('motivo'));
        if (!confirmacion) {
          if (!desactualizado && formulario.isConnected && dialogo.open && esVigente()) { guardar.disabled = false; guardar.focus(); }
          return;
        }
        if (desactualizado || !formulario.isConnected || !dialogo.open || !esVigente()) return;
        valores.set('motivo', confirmacion.motivo);
        formulario.elements.motivo.value = confirmacion.motivo;
      }
      formulario.querySelectorAll('select,textarea').forEach((control) => { control.disabled = true; });
      const resultado = await client.cambiarEstado(detalle.id, { estado: valores.get('estado'), motivo: valores.get('motivo'), version: detalle.version });
      if (!formulario.isConnected || !dialogo.open || !esVigente()) return;
      if (resultado?.id !== detalle.id || resultado.folio !== detalle.folio || resultado.estado !== valores.get('estado') || !Number.isInteger(resultado.version) || resultado.version < detalle.version) throw new Error('No se pudo comprobar el cambio.');
      desactualizado = true;
      borrarBorradorAgenda(claveBorrador);
      await alCambiar();
    } catch (error) {
      if (!formulario.isConnected || !dialogo.open || !esVigente()) return;
      desactualizado = error.status !== 400;
      const info = errorSeguro(error);
      contenedorError.textContent = `${info.title}. ${info.message}${desactualizado ? ' Actualiza el detalle antes de volver a guardar.' : ''}`;
      contenedorError.hidden = false; recargar.hidden = !desactualizado; contenedorError.focus();
    } finally {
      ocupado = false;
      if (formulario.isConnected) { guardar.disabled = desactualizado; formulario.querySelectorAll('select,textarea').forEach((control) => { control.disabled = false; }); }
    }
  };
}
