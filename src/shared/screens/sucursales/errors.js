function validTimeZone(value) {
  if (!/^(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+)$/.test(value)) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true; }
  catch { return false; }
}

function validMapsLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === 'maps.app.goo.gl') return url.pathname.length > 1;
    if (host === 'goo.gl') return url.pathname.startsWith('/maps/');
    return /^(?:(?:www|maps)\.)?google\.(?:com(?:\.[a-z]{2})?|[a-z]{2}|co\.[a-z]{2})$/.test(host)
      && (host.startsWith('maps.') || url.pathname.startsWith('/maps'));
  } catch { return false; }
}

export function validateBranch(data, demo = false) {
  const errors = {};
  const name = String(data.get('name') || '').trim();
  const address = String(data.get('address') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const notes = String(data.get('notes') || '').trim();
  const timezone = String(data.get('timezone') || '').trim();
  const maps = String(data.get('maps') || '').trim();
  if (!name) errors.name = 'Escribe el nombre de la sucursal.';
  else if (name.length > 150) errors.name = 'El nombre no puede superar 150 caracteres.';
  if (!address) errors.address = 'Escribe la dirección de la sucursal.';
  else if (address.length > 255) errors.address = 'La dirección no puede superar 255 caracteres.';
  if (!phone) errors.phone = 'Escribe el teléfono de la sucursal.';
  else if (demo ? !/^\d{10}$/.test(phone) : phone.length < 7 || phone.length > 20 || !/^(?=(?:\D*\d){7,}\D*$)\+?[0-9][0-9 ()-]*[0-9]$/.test(phone))
    errors.phone = demo ? 'Escribe 10 dígitos, sin espacios ni guiones.' : 'Escribe entre 7 y 20 caracteres, con al menos 7 dígitos. Puedes usar +, espacios, paréntesis o guiones.';
  if (notes.length > 255) errors.notes = 'Las indicaciones no pueden superar 255 caracteres.';
  if (!demo) {
    if (!timezone) errors.timezone = 'Escribe la zona horaria de la sucursal.';
    else if (timezone.length > 64 || !validTimeZone(timezone))
      errors.timezone = 'Escribe una zona horaria válida, por ejemplo America/Chihuahua.';
  }
  if (maps) {
    if (maps.length > 2048) errors.maps = 'El enlace no puede superar 2048 caracteres.';
    else if (!validMapsLink(maps)) errors.maps = 'Pega un enlace HTTPS de Google Maps.';
  }
  return errors;
}

export function branchError(error) {
  const message = String(error.message || 'No se pudo guardar la sucursal. Inténtalo de nuevo.');
  const errors = {};
  for (const detail of message.split(' · ')) {
    if (/zonaHoraria|zona horaria/i.test(detail)) errors.timezone = 'Escribe una zona horaria válida, por ejemplo America/Chihuahua.';
    else if (/urlGoogleMaps|Google Maps|enlace/i.test(detail)) errors.maps = 'Pega un enlace HTTPS de Google Maps.';
    else if (/notasLlegada|indicaciones/i.test(detail)) errors.notes = detail;
    else if (/telefono|teléfono/i.test(detail)) errors.phone = /7 y 20/i.test(detail)
      ? 'El teléfono debe tener entre 7 y 20 caracteres.' : 'Revisa el formato del teléfono.';
    else if (/direccion|dirección/i.test(detail)) errors.address = /255/i.test(detail)
      ? 'La dirección no puede superar 255 caracteres.' : 'Escribe la dirección de la sucursal.';
    else if (/nombre/i.test(detail)) errors.name = /ya est[aá] registrado/i.test(detail)
      ? 'Ya existe una sucursal con este nombre en tu negocio.'
      : /150/i.test(detail) ? 'El nombre no puede superar 150 caracteres.' : 'Escribe el nombre de la sucursal.';
  }
  return Object.keys(errors).length ? errors : null;
}
