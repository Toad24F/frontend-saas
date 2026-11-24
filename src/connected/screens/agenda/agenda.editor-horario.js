import { escaparHtml as esc } from '../../../shared/interfaz.componentes.js';
import {
  borradorAgenda,
  guardarBorradorAgenda,
  borrarBorradorAgenda,
} from '../../../shared/screens/agenda/agenda.paneles.js';
import { puedeGestionarAgenda } from '../../modules/agenda/agenda.contrato-manual.js';
import {
  crearClientCambioHorario,
  crearPayloadCambioHorario,
} from '../../modules/agenda/agenda.cambio-horario.js';
import { crearMutacionVersionada } from '../../modules/agenda/agenda.mutacion-versionada.js';
import { errorSeguro } from '../../modules/agenda/agenda.errores.js';

// Proponer un horario no cambia la tarjeta: la disponibilidad y duración histórica las verifica el servidor.
export function montarEditorHorario(
  dialogo,
  detalle,
  { role: rol, scope: ambito, request: solicitar, onChanged: alCambiar, onReload: alRecargar, isCurrent: esVigente },
) {
  if (!puedeGestionarAgenda(rol)) return;
  const bloqueado =
    detalle.estado === 'cancelada' ||
    (detalle.inicioUtc && Date.parse(detalle.inicioUtc) <= Date.now());
  const claveInterna = `schedule:${ambito}:${detalle.id}`,
    borrador = borradorAgenda(claveInterna);
  dialogo
    .querySelector('.agenda-historial')
    .insertAdjacentHTML(
      'beforebegin',
      `<form class="agenda-editor-estado agenda-editor-horario"><h3>Cambiar horario</h3><p class="ayuda-campo">Se conservan servicio, profesional, sucursal y costo histórico. La propuesta se interpreta en la zona vigente de la sucursal; la zona guardada de esta cita es ${esc(detalle.zonaHoraria)}. El servidor comprueba disponibilidad y duración.</p>${bloqueado ? '<p role="status">Solo puedes mover citas futuras que no estén canceladas.</p>' : ''}<div class="formulario-dos-columnas"><label class="form-label">Nueva fecha<input class="form-control" type="date" name="fechaLocal" required></label><label class="form-label">Nueva hora<input class="form-control" type="time" name="horaInicio" required></label></div><p class="error-formulario" data-horario-error role="alert" tabindex="-1" hidden></p><div class="agenda-paginas-historial"><button type="submit" class="btn btn-primary">Guardar horario</button><button type="button" class="btn btn-light" data-horario-recargar hidden>Releer horario</button></div></form>`,
    );
  const formulario = dialogo.querySelector('.agenda-editor-horario'),
    guardar = formulario.querySelector('[type="submit"]'),
    recargar = formulario.querySelector('[data-horario-recargar]'),
    contenedorError = formulario.querySelector('[data-horario-error]');
  formulario.elements.fechaLocal.value = borrador?.fechaLocal ?? detalle.fechaLocal;
  formulario.elements.horaInicio.value =
    borrador?.horaInicio ?? detalle.horaInicio?.slice(0, 5);
  const mutacion = crearMutacionVersionada(
    detalle.version,
    (valores) => crearClientCambioHorario(solicitar).cambiarHorario(detalle.id, valores),
    (resultado) =>
      resultado?.id === detalle.id &&
      // El backend confirma una cita pendiente cuando el cambio de horario es efectivo.
      (resultado.estado === detalle.estado || (detalle.estado === 'pendiente' && resultado.estado === 'confirmada')) &&
      Number.isInteger(resultado.version) &&
      resultado.version >= detalle.version &&
      [resultado.inicioUtc, resultado.finUtc, resultado.finOcupacionUtc].every((valor) =>
        Number.isFinite(Date.parse(valor)),
      ) &&
      Boolean(resultado.zonaHoraria),
  );
  mutacion.state.stale = Boolean(
    borrador && (borrador.stale || borrador.version !== detalle.version),
  );
  const activo = () => formulario.isConnected && dialogo.open && esVigente();
  const recordar = () => {
    if (esVigente())
      guardarBorradorAgenda(claveInterna, {
        fechaLocal: formulario.elements.fechaLocal.value,
        horaInicio: formulario.elements.horaInicio.value,
        version: detalle.version,
        stale: mutacion.state.stale || mutacion.state.busy,
      });
  };
  function sincronizar(mensaje) {
    guardar.disabled = Boolean(
      bloqueado || mutacion.state.busy || mutacion.state.stale,
    );
    recargar.hidden = !mutacion.state.stale;
    formulario.querySelectorAll('input').forEach((entradaFormulario) => {
      entradaFormulario.disabled = Boolean(bloqueado || mutacion.state.busy);
    });
    if (mensaje) {
      contenedorError.textContent = mensaje;
      contenedorError.hidden = false;
    }
  }
  sincronizar(
    mutacion.state.stale
      ? 'Hay un conflicto pendiente o cambió la versión. Relee el horario antes de guardar.'
      : '',
  );
  formulario.oninput = recordar;
  // Mantener el horario escrito, pero impedir guardarlo cuando la versión comprobada ya no coincide.
  formulario.addEventListener('registro-desactualizado', (evento) => {
    mutacion.state.stale = true; recordar();
    sincronizar(evento.detail.kind === 'stale' ? 'La cita cambió en otra sesión. Conservamos tu horario propuesto; relee antes de guardar.' : 'No se pudo comprobar la versión vigente. Relee el horario antes de guardar.');
  });
  dialogo.addEventListener(
    'close',
    () => {
      if (formulario.isConnected) recordar();
    },
    { once: true },
  );
  recargar.onclick = () => {
    if (!mutacion.state.busy) {
      borrarBorradorAgenda(claveInterna);
      void alRecargar();
    }
  };
  formulario.onsubmit = async (evento) => {
    evento.preventDefault();
    if (bloqueado || mutacion.state.busy || mutacion.state.stale || !esVigente())
      return;
    const valores = Object.fromEntries(new FormData(formulario));
    try {
      crearPayloadCambioHorario({ ...valores, version: detalle.version });
    } catch (error) {
      sincronizar(error.message);
      contenedorError.focus();
      return;
    }
    // Persistir el bloqueo antes de esperar evita reenviar al cerrar y reabrir durante una respuesta lenta.
    const pendiente = mutacion.submit(valores);
    recordar();
    sincronizar();
    contenedorError.hidden = true;
    await pendiente;
    if (!activo()) return;
    if (mutacion.state.result) {
      borrarBorradorAgenda(claveInterna);
      await alCambiar(mutacion.state.result);
      return;
    }
    recordar();
    sincronizar(
      `${errorSeguro(mutacion.state.error).title}. ${errorSeguro(mutacion.state.error).message}${mutacion.state.stale ? ' El horario anterior sigue visible; relee antes de guardar.' : ''}`,
    );
    contenedorError.focus();
  };
}
