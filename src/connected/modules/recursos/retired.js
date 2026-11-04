import { api } from '../auth/session.js';

const types = new Set(['profesionales', 'recepcionistas', 'servicios', 'sucursales']);
const validId = (id) => Number.isSafeInteger(id) && id > 0;
export const canConsultRetired = (role, type) => role === 'admin_negocio' && types.has(type);
function ensureType(type) {
  if (!types.has(type)) throw new Error('Tipo de recurso no válido.');
}

// Las rutas de inhabilitados derivan el negocio del actor autenticado; no se
// acepta un negocio desde el navegador ni se mezcla la lista con el catálogo.
export async function readRetiredList(type, request = api) {
  ensureType(type);
  const rows = await request(`/${type}/inhabilitados`);
  if (!Array.isArray(rows)) throw new Error('La lista de inhabilitados no es válida.');
  return rows;
}

export async function readRetiredDetail(type, id, request = api) {
  ensureType(type);
  if (!validId(id)) throw new Error('Identificador no válido.');
  const item = await request(`/${type}/inhabilitados/${id}`);
  if (!item || item.id !== id || !item.inhabilitadoEn) throw new Error('El detalle inhabilitado no es válido.');
  return item;
}

export function disableReceptionist(id, request = api) {
  if (!validId(id)) throw new Error('Identificador de recepción no válido.');
  return request(`/recepcionistas/${id}/inhabilitar`, 'POST', {});
}
