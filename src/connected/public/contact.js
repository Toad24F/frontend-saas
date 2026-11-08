// Mismos límites y normalización que contacto-reserva-publica.ts del servidor.
// Se cuentan puntos de código Unicode tras trim, sin truncar lo escrito.
export function validateContact(input) {
  const errors = {};
  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  const rawPhone = typeof input.telefono === 'string' ? input.telefono.replace(/[\s-]/g, '') : '';
  const telefono = rawPhone.startsWith('+52') ? rawPhone.slice(3) : rawPhone;
  const notas = typeof input.notas === 'string' ? input.notas.trim() : '';
  if (!nombre || [...nombre].length > 150) errors.nombre = 'Escribe tu nombre: máximo 150 caracteres.';
  if (!/^\d{10}$/.test(telefono)) errors.telefono = 'Usa diez dígitos mexicanos; se admite +52, espacios y guiones.';
  if ((input.notas !== undefined && input.notas !== null && typeof input.notas !== 'string') || [...notas].length > 2000) {
    errors.notas = 'Las notas deben tener como máximo 2000 caracteres.';
  }
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 32768) errors.form = 'El formulario excede 32 KiB. Reduce el texto sin perder los datos necesarios.';
  return { valid: Object.keys(errors).length === 0, errors, value: { nombre, telefono, notas: notas || null } };
}
