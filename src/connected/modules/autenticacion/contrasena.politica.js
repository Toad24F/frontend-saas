export function validarContrasenaNueva(contrasena, confirmacion) {
  if (contrasena.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.');
  if (new TextEncoder().encode(contrasena).length > 72) throw new Error('La contraseña no puede superar 72 bytes UTF-8.');
  if (confirmacion !== undefined && contrasena !== confirmacion) throw new Error('Las contraseñas no coinciden.');
}
