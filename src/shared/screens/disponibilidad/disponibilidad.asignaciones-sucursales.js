import { escape as esc } from '../../ui.js';

const borradores = new Map();
const ordenarIds = (ids) => [...ids].map(Number).sort((a, b) => a - b);
export const mismasSucursalesIds = (izquierda, derecha) => JSON.stringify(ordenarIds(izquierda)) === JSON.stringify(ordenarIds(derecha));

export function validarAsignacionesVigentes(original, seleccionadas, vigentes, sucursales) {
  if (!mismasSucursalesIds(original, vigentes)) throw new Error('Las asignaciones cambiaron desde que abriste esta vista. Actualiza la página y revisa tu selección.');
  if (seleccionadas.some((id) => !sucursales.some((sucursal) => sucursal.id === id && (sucursal.activo || vigentes.includes(id))))) {
    throw new Error('Una sucursal ya no está disponible. Actualiza la página y revisa tu selección.');
  }
}

export function consultarBorradorAsignaciones(personaId, sucursalesAsignadas) {
  if (!borradores.has(personaId)) borradores.set(personaId, { personaId, original: ordenarIds(sucursalesAsignadas), seleccionadas: ordenarIds(sucursalesAsignadas) });
  return borradores.get(personaId);
}

export function limpiarBorradorAsignaciones(personaId) {
  if (personaId == null) borradores.clear();
  else borradores.delete(personaId);
}

export function actualizarBorradorAsignaciones(formulario) {
  const borrador = consultarBorradorAsignaciones(Number(formulario.dataset.personaId), []);
  borrador.seleccionadas = ordenarIds([...formulario.querySelectorAll('input[name="branchIds"]:checked')].map((entrada) => entrada.value));
  const cambio = !mismasSucursalesIds(borrador.original, borrador.seleccionadas);
  const quitadas = borrador.original.filter((id) => !borrador.seleccionadas.includes(id));
  formulario.querySelector('[type="submit"]').disabled = !cambio;
  formulario.querySelector('[data-asignacion-resumen]').textContent = cambio
    ? `${borrador.seleccionadas.filter((id) => !borrador.original.includes(id)).length} por asignar · ${quitadas.length} por quitar`
    : 'Sin cambios pendientes';
  formulario.querySelector('[data-asignacion-aviso]').hidden = !quitadas.length;
  formulario.querySelectorAll('[data-asignacion-fila]').forEach((fila) => {
    const marcada = fila.querySelector('input').checked;
    fila.querySelector('[data-asignacion-estado]').textContent = marcada ? 'Asignada' : fila.dataset.inactive === 'true' ? 'Inactiva' : 'Sin asignar';
  });
  const error = formulario.querySelector('[data-asignacion-error]');
  error.hidden = true;
  error.textContent = '';
  return borrador;
}

export function bloqueosDeAsignacion(persona, franjas, citas = []) {
  const bloqueos = new Map();
  franjas.filter((fila) => fila.professionalId === persona.id && fila.branchId != null && fila.id > 0).forEach((fila) => bloqueos.set(fila.branchId, 'Conserva franjas de horario, aunque estén inactivas. Revísalas antes de quitar la asignación.'));
  citas.filter((elemento) => elemento.professionalId === persona.id && !['cancelada', 'no_asistio', 'completada'].includes(elemento.status)).forEach((elemento) => bloqueos.set(elemento.branchId, 'Conserva citas activas en esta demostración.'));
  return bloqueos;
}

export function renderFormularioAsignaciones(persona, sucursales, demo = false, bloqueos = new Map()) {
  const borrador = consultarBorradorAsignaciones(persona.id, persona.branchIds || []);
  borrador.seleccionadas = ordenarIds([...new Set([...borrador.seleccionadas, ...borrador.original.filter((id) => bloqueos.has(id))])]);
  const cambio = !mismasSucursalesIds(borrador.original, borrador.seleccionadas);
  const quitadas = borrador.original.filter((id) => !borrador.seleccionadas.includes(id));
  const agregadas = borrador.seleccionadas.filter((id) => !borrador.original.includes(id));
  return `<form id="formulario-asignaciones-sucursales" data-persona-id="${persona.id}">
    <div class="sucursales-asignadas-lista" role="group" aria-label="Sucursales disponibles">${sucursales.map((sucursal) => {
      const activa = sucursal.active !== false;
      const asignadaInicialmente = borrador.original.includes(sucursal.id);
      const seleccionadas = borrador.seleccionadas.includes(sucursal.id);
      const motivo = asignadaInicialmente && bloqueos.get(sucursal.id);
      const motivoId = `asignacion-requerida-${persona.id}-${sucursal.id}`;
      return `<label class="sucursal-asignada-fila" data-asignacion-fila data-inactive="${!activa}"><span class="sucursal-asignada-nombre"><strong>${esc(sucursal.name)}</strong>${!activa ? '<small>Sucursal inactiva</small>' : ''}${motivo ? `<small id="${motivoId}">Asignación requerida: ${esc(motivo)}</small>` : ''}</span><span class="sucursal-asignada-control"><span data-asignacion-estado>${seleccionadas ? 'Asignada' : activa ? 'Sin asignar' : 'Inactiva'}</span><input class="form-check-input" type="checkbox" name="branchIds" value="${sucursal.id}" ${seleccionadas ? 'checked' : ''} ${motivo || !activa && !asignadaInicialmente ? 'disabled' : ''} ${motivo ? `aria-describedby="${motivoId}"` : ''} aria-label="Asignar ${esc(sucursal.name)}" />${motivo && seleccionadas ? `<input type="hidden" name="branchIds" value="${sucursal.id}">` : ''}</span></label>`;
    }).join('')}</div>
    <p class="disponibilidad-nota" data-asignacion-aviso ${quitadas.length ? '' : 'hidden'}>Al quitar una asignación se eliminan sus ajustes de servicios. Si conserva horarios u otros ajustes de atención, primero tendrás que resolverlos.</p>
    <p class="form-error" role="alert" tabindex="-1" data-asignacion-error hidden></p>
    <div class="asignacion-pie"><span data-asignacion-resumen aria-live="polite">${cambio ? `${agregadas.length} por asignar · ${quitadas.length} por quitar` : 'Sin cambios pendientes'}</span><button type="submit" class="btn btn-primary" ${cambio ? '' : 'disabled'}>Guardar asignaciones</button></div>
    ${demo ? '<p class="disponibilidad-nota">Los cambios de esta demo se restablecen al recargar.</p>' : ''}
  </form>`;
}
