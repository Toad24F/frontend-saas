export function validateReceptionist(data, reset = false) {
  const errors = {};
  if (!reset) {
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    if (!name) errors.name = 'Escribe el nombre completo.';
    else if (name.length > 150) errors.name = 'El nombre no puede superar 150 caracteres.';
    if (!email) errors.email = 'Escribe el correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Escribe un correo válido, por ejemplo nombre@dominio.com.';
    else if (email.length > 150) errors.email = 'El correo no puede superar 150 caracteres.';
  }
  const password = String(data.get('password') || '');
  if (!password) errors.password = 'Escribe una contraseña.';
  else if (password.length < 12) errors.password = 'Usa al menos 12 caracteres.';
  else if (new TextEncoder().encode(password).length > 72) errors.password = 'La contraseña no puede superar 72 bytes.';
  return errors;
}

export function receptionistError(error) {
  const message = String(error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.');
  const errors = {};
  for (const detail of message.split(' · ')) {
    if (/correo|emailRecepcionista|email/i.test(detail)) errors.email = detail;
    else if (/nombre|name/i.test(detail)) errors.name = detail;
    else if (/contraseñ|password|nuevaPassword/i.test(detail)) errors.password = detail;
  }
  return Object.keys(errors).length ? errors : null;
}
