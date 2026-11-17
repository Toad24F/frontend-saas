function esZonaHorariaValida(valor) {
  if (!/^(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+)$/.test(valor)) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: valor }); return true; }
  catch { return false; }
}

function esEnlaceMapasValido(valor) {
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    const dominio = url.hostname.toLowerCase();
    if (dominio === 'maps.app.goo.gl') return url.pathname.length > 1;
    if (dominio === 'goo.gl') return url.pathname.startsWith('/maps/');
    return /^(?:(?:www|maps)\.)?google\.(?:com(?:\.[a-z]{2})?|[a-z]{2}|co\.[a-z]{2})$/.test(dominio)
      && (dominio.startsWith('maps.') || url.pathname.startsWith('/maps'));
  } catch { return false; }
}

export function validarSucursal(datos, demo = false) {
  const errores = {};
  const nombre = String(datos.get('name') || '').trim();
  const direccion = String(datos.get('address') || '').trim();
  const telefono = String(datos.get('phone') || '').trim();
  const indicaciones = String(datos.get('notes') || '').trim();
  const zonaHoraria = String(datos.get('timezone') || '').trim();
  const mapas = String(datos.get('maps') || '').trim();
  if (!nombre) errores.name = 'Escribe el nombre de la sucursal.';
  else if (nombre.length > 150) errores.name = 'El nombre no puede superar 150 caracteres.';
  if (!direccion) errores.address = 'Escribe la dirección de la sucursal.';
  else if (direccion.length > 255) errores.address = 'La dirección no puede superar 255 caracteres.';
  if (!telefono) errores.phone = 'Escribe el teléfono de la sucursal.';
  else if (demo ? !/^\d{10}$/.test(telefono) : telefono.length < 7 || telefono.length > 20 || !/^(?=(?:\D*\d){7,}\D*$)\+?[0-9][0-9 ()-]*[0-9]$/.test(telefono))
    errores.phone = demo ? 'Escribe 10 dígitos, sin espacios ni guiones.' : 'Escribe entre 7 y 20 caracteres, con al menos 7 dígitos. Puedes usar +, espacios, paréntesis o guiones.';
  if (indicaciones.length > 255) errores.notes = 'Las indicaciones no pueden superar 255 caracteres.';
  if (!demo) {
    if (!zonaHoraria) errores.timezone = 'Escribe la zona horaria de la sucursal.';
    else if (zonaHoraria.length > 64 || !esZonaHorariaValida(zonaHoraria))
      errores.timezone = 'Escribe una zona horaria válida, por ejemplo America/Chihuahua.';
  }
  if (mapas) {
    if (mapas.length > 2048) errores.maps = 'El enlace no puede superar 2048 caracteres.';
    else if (!esEnlaceMapasValido(mapas)) errores.maps = 'Pega un enlace HTTPS de Google Maps.';
  }
  return errores;
}

export function interpretarErrorSucursal(error) {
  const mensaje = String(error.message || 'No se pudo guardar la sucursal. Inténtalo de nuevo.');
  const errores = {};
  for (const detalle of mensaje.split(' · ')) {
    if (/zonaHoraria|zona horaria/i.test(detalle)) errores.timezone = 'Escribe una zona horaria válida, por ejemplo America/Chihuahua.';
    else if (/urlGoogleMaps|Google Maps|enlace/i.test(detalle)) errores.maps = 'Pega un enlace HTTPS de Google Maps.';
    else if (/notasLlegada|indicaciones/i.test(detalle)) errores.notes = detalle;
    else if (/telefono|teléfono/i.test(detalle)) errores.phone = /7 y 20/i.test(detalle)
      ? 'El teléfono debe tener entre 7 y 20 caracteres.' : 'Revisa el formato del teléfono.';
    else if (/direccion|dirección/i.test(detalle)) errores.address = /255/i.test(detalle)
      ? 'La dirección no puede superar 255 caracteres.' : 'Escribe la dirección de la sucursal.';
    else if (/nombre/i.test(detalle)) errores.name = /ya est[aá] registrado/i.test(detalle)
      ? 'Ya existe una sucursal con este nombre en tu negocio.'
      : /150/i.test(detalle) ? 'El nombre no puede superar 150 caracteres.' : 'Escribe el nombre de la sucursal.';
  }
  return Object.keys(errores).length ? errores : null;
}
