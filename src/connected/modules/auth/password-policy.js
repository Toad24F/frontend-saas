export function validateNewPassword(password, confirmation) {
  if (password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.');
  if (new TextEncoder().encode(password).length > 72) throw new Error('La contraseña no puede superar 72 bytes UTF-8.');
  if (confirmation !== undefined && password !== confirmation) throw new Error('Las contraseñas no coinciden.');
}
