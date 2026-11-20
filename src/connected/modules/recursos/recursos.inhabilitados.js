import { api } from '../autenticacion/sesion.estado.js';

const tipos = new Set(['profesionales', 'recepcionistas', 'servicios', 'sucursales']);
const idValido = (id) => Number.isSafeInteger(id) && id > 0;
export const puedeConsultarInhabilitados = (rol, tipo) => rol === 'admin_negocio' && tipos.has(tipo);
function validarTipo(tipo) {
  if (!tipos.has(tipo)) throw new Error('Tipo de recurso no válido.');
}

// Las rutas de inhabilitados derivan el negocio del actor autenticado; no se
// acepta un negocio desde el navegador ni se mezcla la lista con el catálogo.
export async function listarInhabilitados(tipo, solicitar = api) {
  validarTipo(tipo);
  const filas = await solicitar(`/${tipo}/inhabilitados`);
  if (!Array.isArray(filas)) throw new Error('La lista de inhabilitados no es válida.');
  return filas;
}

export async function consultarDetalleInhabilitado(tipo, id, solicitar = api) {
  validarTipo(tipo);
  if (!idValido(id)) throw new Error('Identificador no válido.');
  const recurso = await solicitar(`/${tipo}/inhabilitados/${id}`);
  if (!recurso || recurso.id !== id || !recurso.inhabilitadoEn) throw new Error('El detalle inhabilitado no es válido.');
  return recurso;
}

export function inhabilitarRecepcionista(id, solicitar = api) {
  if (!idValido(id)) throw new Error('Identificador de recepción no válido.');
  return solicitar(`/recepcionistas/${id}/inhabilitar`, 'POST', {});
}

// Restaurar recupera la fila operativa sin conceder acceso ni activar oferta.
// Se verifica la respuesta antes de anunciar éxito o actualizar la vista.
export async function restaurarInhabilitado(tipo, id, solicitar = api) {
  validarTipo(tipo);
  if (!idValido(id)) throw new Error('Identificador no válido.');
  const resultado = await solicitar(`/${tipo}/${id}/restaurar`, 'POST', {});
  if (!resultado || resultado.id !== id || resultado.activo !== false || resultado.inhabilitadoEn !== null) {
    throw new Error('La respuesta de restauración no confirmó el estado inactivo. Actualiza la lista.');
  }
  return resultado;
}
