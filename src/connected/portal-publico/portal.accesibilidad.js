// Mensajes breves del estado público. Nunca se anuncian valores de contacto ni
// cada segundo del contador; los errores describen cómo corregir los campos.
export function anuncioPortal(estado) {
  const mensajes = [estado.aviso];
  if (estado.fase === 'seleccion') {
    if (estado.pasosAutomaticos?.length && estado.consulta.estado !== 'cargando') mensajes.push(`${estado.pasosAutomaticos.map((paso) => paso === 1 ? 'Sucursal' : 'Profesional').join(' y ')}: selección automática por ser la única opción disponible.`);
    if (estado.consulta.mensaje) mensajes.push(estado.consulta.mensaje);
    else if (estado.consulta.estado === 'lista') {
      const elementos = estado.paso === 3 ? estado.horarios : estado.opciones[['servicios', 'sucursales', 'profesionales'][estado.paso]];
      const cantidad = elementos.length;
      const sustantivo = estado.paso === 3 ? (cantidad === 1 ? 'horario' : 'horarios') : (cantidad === 1 ? 'opción' : 'opciones');
      mensajes.push(`${cantidad} ${sustantivo} ${cantidad === 1 ? 'disponible' : 'disponibles'}.`);
      if (estado.seleccion?.horario) mensajes.push(`Horario seleccionado: ${estado.seleccion.horario.horaInicio}.`);
    }
  } else if (estado.fase === 'formulario') {
    mensajes.push(...Object.values(estado.erroresContacto || {}).filter(Boolean));
    if (estado.contactoValidado) mensajes.push('Los datos tienen un formato válido. Aún no se ha enviado una reserva.');
  } else if (estado.fase === 'resultado') mensajes.push('Reserva registrada como pendiente de confirmación.');
  else if (estado.fase === 'enviando') mensajes.push('Registrando tu reserva. Espera mientras comprobamos el resultado.');
  return mensajes.filter(Boolean).join(' ');
}

// El nodo vive fuera del contenido reemplazado y recibe texto después del render.
// No repite mensajes idénticos ni interpreta HTML procedente del servidor.
export function crearAnunciador(nodo) {
  let previo;
  return (mensaje) => {
    if (mensaje !== previo) { nodo.textContent = mensaje; previo = mensaje; }
  };
}

// Reemplazar HTML y añadir errores puede dejar el foco debajo del viewport.
// Desplazar después de restaurar el cursor también cubre botones ya enfocados;
// sin animación para no provocar movimiento ni competir con la navegación.
export function enfocarControlPortal(destino, rango) {
  if (!destino) return;
  destino.focus();
  if (rango && destino.setSelectionRange) destino.setSelectionRange(...rango);
  destino.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}
