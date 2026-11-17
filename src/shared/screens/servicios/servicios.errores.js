export function validarServicio(datos, demo = false) {
  const errores = {};
  const nombre = String(datos.get('name') || '').trim();
  const descripcion = String(datos.get('description') || '').trim();
  const duracion = String(datos.get('duration') || '').trim();
  const precio = String(datos.get('price') || '').trim();
  if (!nombre) errores.name = 'Escribe el nombre del servicio.';
  else if (nombre.length > 150) errores.name = 'El nombre no puede superar 150 caracteres.';
  if (demo && !descripcion) errores.description = 'Escribe una descripción del servicio.';
  else if (descripcion.length > (demo ? 200 : 500))
    errores.description = `La descripción no puede superar ${demo ? 200 : 500} caracteres.`;
  if (!duracion) errores.duration = 'Escribe la duración en minutos.';
  else if (!/^\d+$/.test(duracion) || Number(duracion) < (demo ? 15 : 1) || Number(duracion) > (demo ? 240 : 4294967295))
    errores.duration = demo ? 'Escribe una duración entre 15 y 240 minutos.' : 'Escribe una duración entera entre 1 y 4,294,967,295 minutos.';
  else if (demo && Number(duracion) % 15 !== 0)
    errores.duration = 'Usa intervalos de 15 minutos.';
  if (!precio) errores.price = 'Escribe el precio informativo.';
  else if (!/^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(precio))
    errores.price = 'Escribe un precio entre $0 y $99,999, con máximo dos decimales.';
  return errores;
}

export function interpretarErrorServicio(error) {
  const mensaje = String(error.message || 'No se pudo guardar el servicio. Inténtalo de nuevo.');
  const errores = {};
  for (const detalle of mensaje.split(' · ')) {
    if (/duracionMinutos|duraci[oó]n/i.test(detalle)) errores.duration = 'La duración debe ser un número entero mayor que cero.';
    else if (/costo|precio/i.test(detalle)) errores.price = 'El precio debe ser mayor o igual a cero y tener máximo dos decimales.';
    else if (/descripci[oó]n|descripcion/i.test(detalle)) errores.description = detalle;
    else if (/nombre/i.test(detalle)) {
      errores.name = /ya est[aá] registrado/i.test(detalle)
        ? 'Ya existe un servicio con este nombre en tu negocio.'
        : /obligatorio/i.test(detalle) ? 'Escribe el nombre del servicio.'
          : /150 caracteres/i.test(detalle) ? 'El nombre no puede superar 150 caracteres.' : detalle;
    }
  }
  return Object.keys(errores).length ? errores : null;
}
