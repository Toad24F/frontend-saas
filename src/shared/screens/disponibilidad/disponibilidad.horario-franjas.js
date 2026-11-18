export function cambiarEstadoFranja(fila, activa) {
  fila.classList.toggle('horario-franja-inactiva', !activa);
  fila.querySelectorAll('select, input[type="time"], [data-quitar-franja]').forEach((control) => {
    control.disabled = !activa;
  });
}

export function leerFranjasHorario(formulario, negocioId, profesionalId) {
  return [...formulario.querySelectorAll('[data-horario-franja]')].map((fila) => {
    const id = Number(fila.dataset.id);
    const leerCampo = (campo) => fila.querySelector(`[name="${campo}-${id}"]`)?.value || '';
    return {
      id, tenantId: negocioId, professionalId: profesionalId, day: Number(fila.dataset.horarioDia),
      enabled: fila.querySelector(`[name="activo-${id}"]`).checked,
      branchId: Number(leerCampo('sucursal')),
      start: leerCampo('entrada'), end: leerCampo('salida'),
      breakStart: leerCampo('inicioDescanso'), breakEnd: leerCampo('finDescanso'),
    };
  });
}
