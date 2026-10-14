export function validateService(data, demo = false) {
  const errors = {};
  const name = String(data.get('name') || '').trim();
  const description = String(data.get('description') || '').trim();
  const duration = String(data.get('duration') || '').trim();
  const price = String(data.get('price') || '').trim();
  if (!name) errors.name = 'Escribe el nombre del servicio.';
  else if (name.length > 150) errors.name = 'El nombre no puede superar 150 caracteres.';
  if (demo && !description) errors.description = 'Escribe una descripción del servicio.';
  else if (description.length > (demo ? 200 : 500))
    errors.description = `La descripción no puede superar ${demo ? 200 : 500} caracteres.`;
  if (!duration) errors.duration = 'Escribe la duración en minutos.';
  else if (!/^\d+$/.test(duration) || Number(duration) < (demo ? 15 : 1) || Number(duration) > (demo ? 240 : 4294967295))
    errors.duration = demo ? 'Escribe una duración entre 15 y 240 minutos.' : 'Escribe una duración entera entre 1 y 4,294,967,295 minutos.';
  else if (demo && Number(duration) % 15 !== 0)
    errors.duration = 'Usa intervalos de 15 minutos.';
  if (!price) errors.price = 'Escribe el precio informativo.';
  else if (!/^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(price))
    errors.price = 'Escribe un precio entre $0 y $99,999, con máximo dos decimales.';
  return errors;
}

export function serviceError(error) {
  const message = String(error.message || 'No se pudo guardar el servicio. Inténtalo de nuevo.');
  const errors = {};
  for (const detail of message.split(' · ')) {
    if (/duracionMinutos|duraci[oó]n/i.test(detail)) errors.duration = 'La duración debe ser un número entero mayor que cero.';
    else if (/costo|precio/i.test(detail)) errors.price = 'El precio debe ser mayor o igual a cero y tener máximo dos decimales.';
    else if (/descripci[oó]n|descripcion/i.test(detail)) errors.description = detail;
    else if (/nombre/i.test(detail)) {
      errors.name = /ya est[aá] registrado/i.test(detail)
        ? 'Ya existe un servicio con este nombre en tu negocio.'
        : /obligatorio/i.test(detail) ? 'Escribe el nombre del servicio.'
          : /150 caracteres/i.test(detail) ? 'El nombre no puede superar 150 caracteres.' : detail;
    }
  }
  return Object.keys(errors).length ? errors : null;
}
