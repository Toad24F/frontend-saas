import { renderMedidorCupo } from './cupo.medidor.js';
const enteroValido = (valor, minimo = 0) => Number.isSafeInteger(valor) && valor >= minimo;
const escapar = (valor) => String(valor).replace(/[&<>"']/g, (caracter) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);

function cupoValido(datos) {
  return datos && ['profesionales', 'recepcionistas'].every((rol) => {
    const elemento = datos[rol];
    return elemento && enteroValido(elemento.limite, 1) && enteroValido(elemento.activos) && enteroValido(elemento.disponibles);
  });
}

// Esta lectura exclusiva de superadmin es la autoridad de los dos consumos;
// las listas de cuentas no se usan para calcular cupo o disponibilidad.
export async function leerCupoUsuarios(negocioId, solicitar) {
  if (!enteroValido(negocioId, 1)) throw new Error('Negocio no válido.');
  const datos = await solicitar(`/negocios/${negocioId}/cupo-usuarios`);
  if (!cupoValido(datos)) throw new Error('La respuesta de cupo de usuarios no es válida.');
  return datos;
}

export function validarLimitesUsuarios(valores) {
  if (!enteroValido(valores?.profesionales, 1) || !enteroValido(valores?.recepcionistas, 1)) {
    throw new Error('Los dos límites deben ser enteros de al menos uno.');
  }
  return { limiteProfesionalesActivos: valores.profesionales,
    limiteRecepcionistasActivos: valores.recepcionistas };
}

export async function guardarLimitesUsuarios(negocioId, valores, solicitar) {
  if (!enteroValido(negocioId, 1)) throw new Error('Negocio no válido.');
  const resultado = await solicitar(`/negocios/${negocioId}/limites-usuarios`, 'PATCH', validarLimitesUsuarios(valores));
  if (!cupoValido(resultado)) throw new Error('La respuesta de cupo de usuarios no es válida.');
  return resultado;
}

// El texto presenta exactamente los contadores del backend y la edición
// permanece separada del cupo histórico de sucursales.
export function renderCupoUsuarios(datos) {
  if (!cupoValido(datos)) throw new Error('La respuesta de cupo de usuarios no es válida.');
  return `${renderMedidorCupo('Profesionales activos', datos.profesionales.activos, datos.profesionales.limite, datos.profesionales.disponibles)}${renderMedidorCupo('Recepcionistas activos', datos.recepcionistas.activos, datos.recepcionistas.limite, datos.recepcionistas.disponibles)}<div class="negocio-acciones-detalle"><button type="button" class="btn btn-light" data-accion-negocio="limites-usuarios">Cambiar cupos de usuarios</button></div>`;
}

// El Administrador lee solo el cupo de su negocio a través de las rutas de
// cada rol. La API deriva el negocio de la sesión, nunca de un ID del DOM.
export async function leerCupoRolPropio(rol, solicitar) {
  if (!['profesionales', 'recepcionistas'].includes(rol)) throw new Error('Rol de cupo no válido.');
  const datos = await solicitar(`/${rol}/cupo`);
  if (!datos || !enteroValido(datos.limite, 1) || !enteroValido(datos.activos) || !enteroValido(datos.disponibles)) {
    throw new Error('La respuesta de cupo del negocio no es válida.');
  }
  return datos;
}

export function renderAvisoCupoPropio(rol, datos) {
  if (!['profesionales', 'recepcionistas'].includes(rol) || !datos ||
    !enteroValido(datos.limite, 1) || !enteroValido(datos.activos) || !enteroValido(datos.disponibles)) {
    throw new Error('La respuesta de cupo del negocio no es válida.');
  }
  const etiqueta = rol === 'profesionales' ? 'profesionales' : 'recepcionistas';
  return `<p class="introduccion-formulario" role="status">Cupo vigente de ${etiqueta}: ${escapar(datos.activos)} de ${escapar(datos.limite)} cuentas activas; ${escapar(datos.disponibles)} disponibles. El servidor vuelve a comprobarlo al guardar.</p>`;
}
