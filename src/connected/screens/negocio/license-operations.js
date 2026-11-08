const actions = new Set(['suspender', 'reactivar', 'renovar']);
const keyPattern = /^[A-Za-z0-9_-]{16,64}$/;

export function validateSuspensionDays(value) {
  if (!Number.isInteger(value) || value < 0 || value > 30) throw new Error('El plazo debe ser un entero de 0 a 30 días.');
  return value;
}

// Un único intento por superadministrador permanece en sessionStorage hasta
// recibir tanto la respuesta idempotente como una nueva lectura de vigencia.
export function createLicenseOperations({ api, storage = globalThis.sessionStorage, actorId,
  keyFactory = () => crypto.randomUUID() }) {
  const slot = `citalendar:license:pending:${actorId}`;
  const isId = (value) => Number.isSafeInteger(value) && value > 0;
  const valid = (item) => item && actions.has(item.action) && isId(item.businessId) && isId(item.licenseId) &&
    keyPattern.test(item.key) && item.body && !Array.isArray(item.body) &&
    (item.action === 'suspender'
      ? Object.keys(item.body).length === 1 && validateSuspensionDays(item.body.plazoDias) >= 0
      : Object.keys(item.body).length === 0);
  function pending() {
    const raw = storage.getItem(slot);
    if (raw === null) return null;
    try {
      const item = JSON.parse(raw);
      if (valid(item)) return item;
    } catch { /* Un marcador ilegible bloquea nuevas operaciones. */ }
    throw new Error('Hay una operación de licencia guardada que no se puede comprobar.');
  }
  async function retry() {
    const item = pending();
    if (!item) throw new Error('No hay una operación de licencia pendiente.');
    // La misma ruta, clave y representación JSON evitan duplicar la anualidad
    // aunque el primer POST haya hecho commit y se pierda su respuesta.
    await api(`/licencias/${item.licenseId}/${item.action}`, 'POST', item.body,
      { headers: { 'Idempotency-Key': item.key } });
    const validity = await api(`/licencias/${item.licenseId}/vigencia`);
    storage.removeItem(slot);
    return validity;
  }
  async function run(action, businessId, licenseId, body) {
    if (pending()) throw new Error('Hay una operación de licencia pendiente. Comprueba su resultado antes de iniciar otra.');
    if (!actions.has(action) || !isId(businessId) || !isId(licenseId)) throw new Error('Operación de licencia inválida.');
    const exactBody = action === 'suspender' ? { plazoDias: validateSuspensionDays(body?.plazoDias) } : {};
    const key = keyFactory();
    if (!keyPattern.test(key)) throw new Error('No se pudo generar una clave de operación válida.');
    const item = { action, businessId, licenseId, body: exactBody, key };
    storage.setItem(slot, JSON.stringify(item));
    if (!pending()) throw new Error('No se pudo guardar la operación antes de enviarla.');
    return retry();
  }
  return { pending, run, retry };
}
