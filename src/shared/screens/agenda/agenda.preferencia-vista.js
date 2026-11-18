const vistas = new Set(['day', 'week', 'month']);
const claveInterna = (modo) => `cita-agenda-view:${modo === 'demo' ? 'demo' : 'connected'}`;

// Preferencia de presentación local; no almacena fechas, filtros ni datos de pacientes.
export function leerVistaAgenda(movil, modo = 'connected', almacenamiento) {
  try {
    const guardado = (almacenamiento ?? globalThis.localStorage).getItem(claveInterna(modo));
    if (vistas.has(guardado)) return guardado;
  } catch { /* Sin almacenamiento, conservar el inicio semanal. */ }
  return 'week';
}
export function guardarVistaAgenda(vista, modo = 'connected', almacenamiento) {
  if (!vistas.has(vista)) return;
  try { (almacenamiento ?? globalThis.localStorage).setItem(claveInterna(modo), vista); }
  catch { /* La elección sigue funcionando durante esta visita. */ }
}
