// Mensajes breves del estado público. Nunca se anuncian valores de contacto ni
// cada segundo del contador; los errores describen cómo corregir los campos.
export function publicAnnouncement(state) {
  const messages = [state.notice];
  if (state.phase === 'selection') {
    if (state.query.message) messages.push(state.query.message);
    else if (state.query.status === 'ready') {
      const items = state.step === 3 ? state.slots : state.options[['servicios', 'sucursales', 'profesionales'][state.step]];
      const count = items.length;
      const noun = state.step === 3 ? (count === 1 ? 'horario' : 'horarios') : (count === 1 ? 'opción' : 'opciones');
      messages.push(`${count} ${noun} ${count === 1 ? 'disponible' : 'disponibles'}.`);
      if (state.selection?.slot) messages.push(`Horario seleccionado: ${state.selection.slot.horaInicio}.`);
    }
  } else if (state.phase === 'form') {
    messages.push(...Object.values(state.contactErrors || {}).filter(Boolean));
    if (state.contactChecked) messages.push('Los datos tienen un formato válido. Aún no se ha enviado una reserva.');
  } else if (state.phase === 'result') messages.push('Reserva registrada como pendiente. Conserva el folio.');
  else if (state.phase === 'sending') messages.push('Registrando tu reserva. Espera mientras comprobamos el resultado.');
  return messages.filter(Boolean).join(' ');
}

// El nodo vive fuera del contenido reemplazado y recibe texto después del render.
// No repite mensajes idénticos ni interpreta HTML procedente del servidor.
export function createAnnouncer(node) {
  let previous;
  return (message) => {
    if (message !== previous) { node.textContent = message; previous = message; }
  };
}

// Reemplazar HTML y añadir errores puede dejar el foco debajo del viewport.
// Desplazar después de restaurar el cursor también cubre botones ya enfocados;
// sin animación para no provocar movimiento ni competir con la navegación.
export function focusPublicControl(target, range) {
  if (!target) return;
  target.focus();
  if (range && target.setSelectionRange) target.setSelectionRange(...range);
  target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}
