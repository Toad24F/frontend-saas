import { isDemo, api, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, TODAY, minutes } from '../../data.js';
import { field, select, basicForm } from '../../forms.js';
import { consultarAlcanceBloqueos } from './disponibilidad.vista.js';
import { interpretarErroresBloqueo, limpiarErroresDisponibilidad, limpiarCampoDisponibilidad, mostrarErroresDisponibilidad, mostrarErrorGeneralDisponibilidad, validarBloqueo } from './disponibilidad.errores.js';

const campoMarcado = (...argumentos) => field(...argumentos).replace('class="form-field"', `class="form-field" data-disponibilidad-campo="${argumentos[1]}"`);
const selectorMarcado = (...argumentos) => select(...argumentos).replace('class="form-field"', `class="form-field" data-disponibilidad-campo="${argumentos[1]}"`);

function abrirFormularioBloqueo(existente = null) {
  const editando = Boolean(existente);
  const puedeElegirEquipo = isDemo || user.rol === 'admin_negocio';
  const profesionales = list('professionals', state.tenantId);
  const opcionesProfesionales = [...(puedeElegirEquipo ? [{ id: '', name: 'Todo el equipo' }] : []), ...profesionales];
  const sucursales = [{ id: '', name: 'Todas las sucursales' }, ...list('branches', state.tenantId)];
  const dialogo = basicForm(
    editando ? 'Editar bloqueo' : 'Bloquear disponibilidad',
    `${campoMarcado('Motivo del bloqueo', 'reason', existente?.reason || '', 'text', 'required maxlength="500"')}
    <div class="form-row-two">${selectorMarcado('Tipo', 'type', [
      { id: 'vacaciones', name: 'Vacaciones' },
      { id: 'dia_festivo', name: 'Día festivo' },
      { id: 'emergencia', name: 'Emergencia' },
    ], existente?.type === 'feriado' ? 'dia_festivo' : existente?.type || 'vacaciones')}
    ${selectorMarcado('Profesional', 'professionalId', opcionesProfesionales, existente ? existente.professionalId ?? '' : (puedeElegirEquipo ? consultarAlcanceBloqueos() : user.id))}</div>
    ${selectorMarcado('Sucursal', 'branchId', sucursales, existente?.branchId ?? '')}
    <div class="form-row-two">${campoMarcado('Desde', 'date', existente?.date || TODAY, 'date', 'required')}${campoMarcado('Hasta', 'endDate', existente?.endDate || TODAY, 'date', 'required')}</div>
    <div class="form-row-two">${campoMarcado('Hora inicial (opcional)', 'start', existente?.start || '', 'time')}${campoMarcado('Hora final (opcional)', 'end', existente?.end || '', 'time')}</div>
    <p class="field-hint">Deja ambas horas vacías para bloquear días completos. Las citas existentes se conservan.</p>`,
    async (formulario) => {
      const bloqueo = {
        professionalId: !isDemo && user.rol === 'profesional' ? user.id : Number(formulario.get('professionalId')) || null,
        branchId: Number(formulario.get('branchId')) || null,
        date: formulario.get('date'), endDate: formulario.get('endDate'),
        start: formulario.get('start') || null, end: formulario.get('end') || null,
        type: formulario.get('type'), reason: formulario.get('reason').trim(),
      };
      if (!isDemo && user.rol === 'profesional' && bloqueo.professionalId !== user.id)
        throw new Error('Solo puedes gestionar bloqueos de tu propio perfil.');
      if (bloqueo.professionalId) resource('professionals', bloqueo.professionalId, state.tenantId);
      if (bloqueo.branchId) resource('branches', bloqueo.branchId, state.tenantId);
      if (!isDemo) {
        const payload = { personalId: bloqueo.professionalId, sucursalId: bloqueo.branchId, tipo: bloqueo.type, motivo: bloqueo.reason, fechaInicio: bloqueo.date, fechaFin: bloqueo.endDate, inicioMinutos: bloqueo.start ? minutes(bloqueo.start) : null, finMinutos: bloqueo.end ? minutes(bloqueo.end) : null };
        await api(editando ? `/bloqueos/${existente.id}` : '/bloqueos', editando ? 'PATCH' : 'POST', payload);
        (await import('../../../connected/screens/disponibilidad/disponibilidad.vista.js')).invalidarProyeccion();
        return;
      }
      if (editando) Object.assign(resource('blocks', existente.id, state.tenantId), bloqueo);
      else db.blocks.push({ id: Math.max(0, ...db.blocks.map((elemento) => elemento.id)) + 1, tenantId: state.tenantId, ...bloqueo });
    }, true, {
      drawer: true,
      validate(formulario) {
        const errores = validarBloqueo(new FormData(formulario));
        if (!Object.keys(errores).length) { limpiarErroresDisponibilidad(formulario); return true; }
        mostrarErroresDisponibilidad(formulario, errores);
        return false;
      },
      onError(error, formulario) {
        const errores = interpretarErroresBloqueo(error);
        if (errores) mostrarErroresDisponibilidad(formulario, errores);
        else mostrarErrorGeneralDisponibilidad(formulario, error, '#form-error');
      },
    },
  );
  dialogo.querySelector('#f-professionalId').required = false;
  dialogo.querySelector('#f-branchId').required = false;
  if (!isDemo && user.rol === 'profesional') dialogo.querySelector('#f-professionalId').disabled = true;
  const formulario = dialogo.querySelector('#editor-form');
  formulario.addEventListener('input', (evento) => limpiarCampoDisponibilidad(formulario, evento.target));
  formulario.addEventListener('change', (evento) => limpiarCampoDisponibilidad(formulario, evento.target));
}

export function nuevoBloqueo() { abrirFormularioBloqueo(); }
export function editarBloqueo(bloqueo) { abrirFormularioBloqueo(bloqueo); }
