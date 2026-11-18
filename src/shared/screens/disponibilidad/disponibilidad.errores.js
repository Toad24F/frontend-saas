const fechaValida = (valor) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};
const patronHora = /^([01]\d|2[0-3]):[0-5]\d$/;
const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function limpiarErroresDisponibilidad(raiz) {
  raiz.querySelectorAll('.disponibilidad-error-campo').forEach((elemento) => elemento.remove());
  raiz.querySelectorAll('[data-disponibilidad-campo].has-error').forEach((contenedor) => {
    contenedor.classList.remove('has-error');
    contenedor.querySelectorAll('input, select, textarea').forEach((control) => {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    });
  });
  raiz.querySelectorAll('.disponibilidad-error-general, #form-error, #horario-error, #proyeccion-error').forEach((destino) => {
    destino.hidden = true; destino.textContent = '';
  });
}

export function limpiarCampoDisponibilidad(raiz, control) {
  const contenedor = control.closest('[data-disponibilidad-campo]');
  if (!contenedor?.classList.contains('has-error')) return;
  contenedor.querySelectorAll('.disponibilidad-error-campo').forEach((elemento) => elemento.remove());
  contenedor.classList.remove('has-error');
  contenedor.querySelectorAll('input, select, textarea').forEach((elemento) => {
    elemento.removeAttribute('aria-invalid'); elemento.removeAttribute('aria-describedby');
  });
}

export function mostrarErroresDisponibilidad(raiz, errores) {
  limpiarErroresDisponibilidad(raiz);
  const entradas = Object.entries(errores);
  for (const [campo, mensaje] of entradas) {
    const contenedor = raiz.querySelector(`[data-disponibilidad-campo="${campo}"]`);
    if (!contenedor) continue;
    const id = `disponibilidad-error-${campo.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const nota = document.createElement('p');
    nota.id = id; nota.className = 'disponibilidad-error-campo'; nota.setAttribute('role', 'alert');
    nota.textContent = mensaje;
    contenedor.append(nota);
    contenedor.classList.add('has-error');
    contenedor.querySelectorAll('input:not(:disabled), select:not(:disabled), textarea:not(:disabled)').forEach((control) => {
      control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', id);
    });
  }
  const primerCampo = raiz.querySelector(`[data-disponibilidad-campo="${entradas[0]?.[0]}"]`);
  const destinoFoco = primerCampo?.querySelector('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button') || primerCampo;
  destinoFoco?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  destinoFoco?.focus({ preventScroll: true });
}

export function mostrarErrorGeneralDisponibilidad(formulario, error, selector = '.disponibilidad-error-general') {
  limpiarErroresDisponibilidad(formulario);
  const destino = formulario.querySelector(selector);
  if (!destino) return;
  destino.textContent = error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
  destino.hidden = false;
  destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
  destino.focus({ preventScroll: true });
}

export function validarBloqueo(datos) {
  const errores = {};
  const motivo = String(datos.get('reason') || '').trim();
  const desde = String(datos.get('date') || '');
  const hasta = String(datos.get('endDate') || '');
  const inicio = String(datos.get('start') || '');
  const fin = String(datos.get('end') || '');
  if (!motivo) errores.reason = 'Escribe el motivo del bloqueo.';
  else if (motivo.length > 500) errores.reason = 'El motivo no puede superar 500 caracteres.';
  if (!fechaValida(desde)) errores.date = 'Selecciona una fecha inicial válida.';
  if (!fechaValida(hasta)) errores.endDate = 'Selecciona una fecha final válida.';
  else if (fechaValida(desde) && desde > hasta) errores.endDate = 'La fecha final debe ser igual o posterior a la fecha inicial.';
  if (Boolean(inicio) !== Boolean(fin)) {
    if (!inicio) errores.start = 'Indica también la hora inicial.';
    if (!fin) errores.end = 'Indica también la hora final.';
  } else if (inicio && fin && desde === hasta && inicio >= fin) {
    errores.end = 'La hora final debe ser posterior a la hora inicial.';
  }
  return errores;
}

export function interpretarErroresBloqueo(error) {
  const mensaje = String(error.message || '');
  const errores = {};
  for (const detalle of mensaje.split(' · ')) {
    if (/motivo/i.test(detalle)) errores.reason = 'Escribe un motivo válido de hasta 500 caracteres.';
    else if (/fechaInicio/i.test(detalle)) errores.date = 'Selecciona una fecha inicial válida.';
    else if (/fechaFin|anterior/i.test(detalle)) errores.endDate = 'La fecha final debe ser igual o posterior a la fecha inicial.';
    else if (/inicioMinutos/i.test(detalle)) errores.start = 'Revisa la hora inicial.';
    else if (/finMinutos|intervalo/i.test(detalle)) errores.end = 'Revisa la hora final; debe ser posterior a la inicial.';
    else if (/personalId|profesional/i.test(detalle)) errores.professionalId = detalle;
    else if (/sucursalId|sucursal/i.test(detalle)) errores.branchId = detalle;
  }
  return Object.keys(errores).length ? errores : null;
}

export function validarFranjasHorario(filas, sucursalesIds, demo = false) {
  const errores = {};
  for (const fila of filas) {
    const prefijo = `horario-${fila.id}`;
    if (fila.enabled && !sucursalesIds.includes(fila.branchId)) errores[`${prefijo}-sucursal`] = 'Selecciona una sucursal asignada al profesional.';
    if (!fila.enabled) continue;
    if (!patronHora.test(fila.start)) errores[`${prefijo}-entrada`] = `Indica la entrada del ${NOMBRES_DIAS[fila.day]}.`;
    if (!patronHora.test(fila.end)) errores[`${prefijo}-salida`] = `Indica la salida del ${NOMBRES_DIAS[fila.day]}.`;
    else if (patronHora.test(fila.start) && fila.start >= fila.end) errores[`${prefijo}-salida`] = 'La salida debe ser posterior a la entrada.';
    if (demo && patronHora.test(fila.start) && patronHora.test(fila.end) && (fila.start < '09:00' || fila.end > '18:00'))
      errores[`${prefijo}-${fila.start < '09:00' ? 'entrada' : 'salida'}`] = 'En la demostración, la atención debe quedar entre 09:00 y 18:00.';
    if (!demo && (fila.breakStart || fila.breakEnd)) {
      // Hasta que T051 retire los controles, se impide perder una pausa capturada.
      errores[`${prefijo}-descanso`] = 'Representa el descanso con dos franjas separadas.';
    } else if (fila.breakStart || fila.breakEnd) {
      if (!patronHora.test(fila.breakStart) || !patronHora.test(fila.breakEnd)) errores[`${prefijo}-descanso`] = 'Indica el inicio y el fin del descanso.';
      else if (fila.breakStart < fila.start || fila.breakStart >= fila.breakEnd || fila.breakEnd > fila.end)
        errores[`${prefijo}-descanso`] = 'El descanso debe quedar dentro de esta franja.';
    }
  }
  for (let dia = 0; dia < 7; dia++) {
    const activas = filas.filter((fila) => fila.enabled && fila.day === dia && patronHora.test(fila.start) && patronHora.test(fila.end)).sort((a, b) => a.start.localeCompare(b.start));
    for (let indice = 1; indice < activas.length; indice++) if (activas[indice].start < activas[indice - 1].end)
      errores[`horario-${activas[indice].id}-entrada`] = `Esta franja se empalma con ${activas[indice - 1].start}–${activas[indice - 1].end}.`;
  }
  return errores;
}

export function interpretarErroresHorario(error, filas) {
  const mensaje = String(error.message || '');
  const indices = [...mensaje.matchAll(/(?:filas?\s+| y )(\d+)/gi)].map((coincidencia) => Number(coincidencia[1]));
  const campo = /sucursalId/i.test(mensaje) ? 'sucursal' : /descanso/i.test(mensaje) ? 'descanso' : /finMinutos/i.test(mensaje) ? 'salida' : /inicioMinutos|empalme/i.test(mensaje) ? 'entrada' : null;
  if (!campo || !indices.length) return null;
  return Object.fromEntries(indices.filter((indice) => filas[indice]).map((indice) => [`horario-${filas[indice].id}-${campo}`, mensaje]));
}

export function validarProyeccion(desde, hasta) {
  const errores = {};
  if (!fechaValida(desde)) errores.from = 'Selecciona una fecha inicial válida.';
  if (!fechaValida(hasta)) errores.to = 'Selecciona una fecha final válida.';
  else if (fechaValida(desde) && desde > hasta) errores.to = 'La fecha final debe ser igual o posterior a la inicial.';
  else if (fechaValida(desde) && (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000 >= 366)
    errores.to = 'El rango puede abarcar hasta 366 días inclusive.';
  return errores;
}
