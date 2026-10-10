/** Datos ficticios volátiles. El filtrado local solo demuestra el alcance visual;
 * la autorización real debe vivir en una API autenticada. */
export const TODAY = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') !== '1'
  ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chihuahua' })
  : import.meta.env?.VITE_DEMO_TODAY || '2026-09-08';
export const date = (iso) => new Date(`${iso}T12:00:00`);
export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (day, n) => {
  const d = date(day);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const minutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
export const time = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const formatDate = (
  day,
  opts = { day: 'numeric', month: 'long', year: 'numeric' },
) => date(day).toLocaleDateString('es-MX', opts);
export const money = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);
export const statuses = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
};
export let db;
export function replaceData(data) { db = data; }
export const list = (table, tenantId) =>
  db[table].filter((x) => x.tenantId === Number(tenantId));
export function resource(table, id, tenantId) {
  const item = db[table].find(
    (x) => x.id === Number(id) && x.tenantId === Number(tenantId),
  );
  if (!item) throw new Error('El recurso no está disponible en este negocio.');
  return item;
}
export const tenantById = (id) => db.tenants.find((t) => t.id === Number(id));
export const appointmentInfo = (a) => ({
  ...a,
  client: resource('clients', a.clientId, a.tenantId),
  service: resource('services', a.serviceId, a.tenantId),
  professional: resource('professionals', a.professionalId, a.tenantId),
  branch: resource('branches', a.branchId, a.tenantId),
});
