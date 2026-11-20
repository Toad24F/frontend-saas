import { esDemo, api, usuarioActual } from '../../../connected/backend.js';
import { estadoAplicacion } from '../../aplicacion.nucleo.js';
import { datosAplicacion, listarRegistros, obtenerRecurso, HOY, horaAMinutos } from '../../aplicacion.datos.js';
import { renderCampo, renderSelector, abrirFormulario } from '../../formularios.componentes.js';
import { consultarAlcanceBloqueos } from './disponibilidad.vista.js';
import { interpretarErroresBloqueo, limpiarErroresDisponibilidad, limpiarCampoDisponibilidad, mostrarErroresDisponibilidad, mostrarErrorGeneralDisponibilidad, validarBloqueo } from './disponibilidad.errores.js';

const campoMarcado = (...argumentos) => renderCampo(...argumentos).replace('class="campo-formulario"', `class="campo-formulario" data-disponibilidad-campo="${argumentos[1]}"`);
const selectorMarcado = (...argumentos) => renderSelector(...argumentos).replace('class="campo-formulario"', `class="campo-formulario" data-disponibilidad-campo="${argumentos[1]}"`);

function abrirFormularioBloqueo(existente = null) {
  const editando = Boolean(existente);
  const puedeElegirEquipo = esDemo || usuarioActual.rol === 'admin_negocio';
  const profesionales = listarRegistros('professionals', estadoAplicacion.negocioId);
  const opcionesProfesionales = [...(puedeElegirEquipo ? [{ id: '', name: 'Todo el equipo' }] : []), ...profesionales];
  const sucursales = [{ id: '', name: 'Todas las sucursales' }, ...listarRegistros('branches', estadoAplicacion.negocioId)];
  const dialogo = abrirFormulario(
    editando ? 'Editar bloqueo' : 'Bloquear disponibilidad',
    `${campoMarcado('Motivo del bloqueo', 'reason', existente?.reason || '', 'text', 'required maxlength="500"')}
    <div class="formulario-dos-columnas">${selectorMarcado('Tipo', 'type', [
      { id: 'vacaciones', name: 'Vacaciones' },
      { id: 'dia_festivo', name: 'Día festivo' },
      { id: 'emergencia', name: 'Emergencia' },
    ], existente?.type === 'feriado' ? 'dia_festivo' : existente?.type || 'vacaciones')}
    ${selectorMarcado('Profesional', 'professionalId', opcionesProfesionales, existente ? existente.professionalId ?? '' : (puedeElegirEquipo ? consultarAlcanceBloqueos() : usuarioActual.id))}</div>
    ${selectorMarcado('Sucursal', 'branchId', sucursales, existente?.branchId ?? '')}
    <div class="formulario-dos-columnas">${campoMarcado('Desde', 'date', existente?.date || HOY, 'date', 'required')}${campoMarcado('Hasta', 'endDate', existente?.endDate || HOY, 'date', 'required')}</div>
    <div class="formulario-dos-columnas">${campoMarcado('Hora inicial (opcional)', 'start', existente?.start || '', 'time')}${campoMarcado('Hora final (opcional)', 'end', existente?.end || '', 'time')}</div>
    <p class="ayuda-campo">Deja ambas horas vacías para bloquear días completos. Las citas existentes se conservan.</p>`,
    async (formulario) => {
      const bloqueo = {
        professionalId: !esDemo && usuarioActual.rol === 'profesional' ? usuarioActual.id : Number(formulario.get('professionalId')) || null,
        branchId: Number(formulario.get('branchId')) || null,
        date: formulario.get('date'), endDate: formulario.get('endDate'),
        start: formulario.get('start') || null, end: formulario.get('end') || null,
        type: formulario.get('type'), reason: formulario.get('reason').trim(),
      };
      if (!esDemo && usuarioActual.rol === 'profesional' && bloqueo.professionalId !== usuarioActual.id)
        throw new Error('Solo puedes gestionar bloqueos de tu propio perfil.');
      if (bloqueo.professionalId) obtenerRecurso('professionals', bloqueo.professionalId, estadoAplicacion.negocioId);
      if (bloqueo.branchId) obtenerRecurso('branches', bloqueo.branchId, estadoAplicacion.negocioId);
      if (!esDemo) {
        const payload = { personalId: bloqueo.professionalId, sucursalId: bloqueo.branchId, tipo: bloqueo.type, motivo: bloqueo.reason, fechaInicio: bloqueo.date, fechaFin: bloqueo.endDate, inicioMinutos: bloqueo.start ? horaAMinutos(bloqueo.start) : null, finMinutos: bloqueo.end ? horaAMinutos(bloqueo.end) : null };
        await api(editando ? `/bloqueos/${existente.id}` : '/bloqueos', editando ? 'PATCH' : 'POST', payload);
        (await import('../../../connected/screens/disponibilidad/disponibilidad.vista.js')).invalidarProyeccion();
        return;
      }
      if (editando) Object.assign(obtenerRecurso('blocks', existente.id, estadoAplicacion.negocioId), bloqueo);
      else datosAplicacion.blocks.push({ id: Math.max(0, ...datosAplicacion.blocks.map((elemento) => elemento.id)) + 1, tenantId: estadoAplicacion.negocioId, ...bloqueo });
    }, true, {
      panelLateral: true,
      validar(formulario) {
        const errores = validarBloqueo(new FormData(formulario));
        if (!Object.keys(errores).length) { limpiarErroresDisponibilidad(formulario); return true; }
        mostrarErroresDisponibilidad(formulario, errores);
        return false;
      },
      alFallar(error, formulario) {
        const errores = interpretarErroresBloqueo(error);
        if (errores) mostrarErroresDisponibilidad(formulario, errores);
        else mostrarErrorGeneralDisponibilidad(formulario, error, '#error-formulario');
      },
    },
  );
  dialogo.querySelector('#f-professionalId').required = false;
  dialogo.querySelector('#f-branchId').required = false;
  if (!esDemo && usuarioActual.rol === 'profesional') dialogo.querySelector('#f-professionalId').disabled = true;
  const formulario = dialogo.querySelector('#editor-form');
  formulario.addEventListener('input', (evento) => limpiarCampoDisponibilidad(formulario, evento.target));
  formulario.addEventListener('change', (evento) => limpiarCampoDisponibilidad(formulario, evento.target));
}

export function nuevoBloqueo() { abrirFormularioBloqueo(); }
export function editarBloqueo(bloqueo) { abrirFormularioBloqueo(bloqueo); }
