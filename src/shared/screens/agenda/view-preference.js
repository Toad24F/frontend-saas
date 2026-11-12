const views = new Set(['day', 'week', 'month']);
const key = (mode) => `cita-agenda-view:${mode === 'demo' ? 'demo' : 'connected'}`;

// Preferencia de presentación local; no almacena fechas, filtros ni datos de pacientes.
export function readAgendaView(mobile, mode = 'connected', storage) {
  try {
    const saved = (storage ?? globalThis.localStorage).getItem(key(mode));
    if (views.has(saved)) return saved;
  } catch { /* Sin almacenamiento, conservar el inicio adaptado al tamaño. */ }
  return mobile ? 'day' : 'week';
}
export function saveAgendaView(view, mode = 'connected', storage) {
  if (!views.has(view)) return;
  try { (storage ?? globalThis.localStorage).setItem(key(mode), view); }
  catch { /* La elección sigue funcionando durante esta visita. */ }
}
