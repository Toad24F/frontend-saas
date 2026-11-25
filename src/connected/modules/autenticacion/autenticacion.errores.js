export const mensajeSesionVencida = 'Tu sesión venció. Por favor, inicia sesión de nuevo.';

export function mensajeErrorIngreso(error) {
  if (error.status === 0) return 'No pudimos conectar con Citalendar. Revisa tu conexión e inténtalo de nuevo.';
  if (error.status >= 500 && error.status < 600) return 'Error del servidor.';
  return error.message;
}
