export function validarRecepcionista(datos, restablecimiento = false) {
  const errores = {};
  if (!restablecimiento) {
    const nombre = String(datos.get('name') || '').trim();
    const correo = String(datos.get('email') || '').trim();
    if (!nombre) errores.name = 'Escribe el nombre completo.';
    else if (nombre.length > 150) errores.name = 'El nombre no puede superar 150 caracteres.';
    if (!correo) errores.email = 'Escribe el correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.email = 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    else if (correo.length > 150) errores.email = 'El correo no puede superar 150 caracteres.';
  }
  const password = String(datos.get('password') || '');
  if (!password) errores.password = 'Escribe una contraseña.';
  else if (password.length < 12) errores.password = 'Usa al menos 12 caracteres.';
  else if (new TextEncoder().encode(password).length > 72) errores.password = 'La contraseña no puede superar 72 bytes.';
  return errores;
}

export function interpretarErrorRecepcionista(error) {
  const mensaje = String(error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.');
  const errores = {};
  for (const detalle of mensaje.split(' · ')) {
    if (/correo|emailRecepcionista|email/i.test(detalle)) errores.email = detalle;
    else if (/nombre|name/i.test(detalle)) errores.name = detalle;
    else if (/contraseñ|password|nuevaPassword/i.test(detalle)) errores.password = detalle;
  }
  return Object.keys(errores).length ? errores : null;
}
