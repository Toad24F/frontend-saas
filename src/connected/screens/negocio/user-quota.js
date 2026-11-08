import { quotaMeter } from './quota-meter.js';
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
const esc = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function validQuota(data) {
  return data && ['profesionales', 'recepcionistas'].every((role) => {
    const item = data[role];
    return item && integer(item.limite, 1) && integer(item.activos) && integer(item.disponibles);
  });
}

// Esta lectura exclusiva de superadmin es la autoridad de los dos consumos;
// las listas de cuentas no se usan para calcular cupo o disponibilidad.
export async function readUserQuota(businessId, request) {
  if (!integer(businessId, 1)) throw new Error('Negocio no válido.');
  const data = await request(`/negocios/${businessId}/cupo-usuarios`);
  if (!validQuota(data)) throw new Error('La respuesta de cupo de usuarios no es válida.');
  return data;
}

export function validateUserLimits(values) {
  if (!integer(values?.profesionales, 1) || !integer(values?.recepcionistas, 1)) {
    throw new Error('Los dos límites deben ser enteros de al menos uno.');
  }
  return { limiteProfesionalesActivos: values.profesionales,
    limiteRecepcionistasActivos: values.recepcionistas };
}

export async function saveUserLimits(businessId, values, request) {
  if (!integer(businessId, 1)) throw new Error('Negocio no válido.');
  const result = await request(`/negocios/${businessId}/limites-usuarios`, 'PATCH', validateUserLimits(values));
  if (!validQuota(result)) throw new Error('La respuesta de cupo de usuarios no es válida.');
  return result;
}

// El texto presenta exactamente los contadores del backend y la edición
// permanece separada del cupo histórico de sucursales.
export function quotaHtml(data) {
  if (!validQuota(data)) throw new Error('La respuesta de cupo de usuarios no es válida.');
  return `${quotaMeter('Profesionales activos', data.profesionales.activos, data.profesionales.limite, data.profesionales.disponibles)}${quotaMeter('Recepcionistas activos', data.recepcionistas.activos, data.recepcionistas.limite, data.recepcionistas.disponibles)}<div class="business-detail-actions"><button type="button" class="btn btn-light" data-business-action="user-limits">Cambiar cupos de usuarios</button></div>`;
}

// El Administrador lee solo el cupo de su negocio a través de las rutas de
// cada rol. La API deriva el negocio de la sesión, nunca de un ID del DOM.
export async function readOwnRoleQuota(role, request) {
  if (!['profesionales', 'recepcionistas'].includes(role)) throw new Error('Rol de cupo no válido.');
  const data = await request(`/${role}/cupo`);
  if (!data || !integer(data.limite, 1) || !integer(data.activos) || !integer(data.disponibles)) {
    throw new Error('La respuesta de cupo del negocio no es válida.');
  }
  return data;
}

export function ownQuotaNotice(role, data) {
  if (!['profesionales', 'recepcionistas'].includes(role) || !data ||
    !integer(data.limite, 1) || !integer(data.activos) || !integer(data.disponibles)) {
    throw new Error('La respuesta de cupo del negocio no es válida.');
  }
  const label = role === 'profesionales' ? 'profesionales' : 'recepcionistas';
  return `<p class="form-intro" role="status">Cupo vigente de ${label}: ${esc(data.activos)} de ${esc(data.limite)} cuentas activas; ${esc(data.disponibles)} disponibles. El servidor vuelve a comprobarlo al guardar.</p>`;
}
