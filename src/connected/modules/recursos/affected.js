import { api } from '../autenticacion/sesion.estado.js';
import { validarRangoInclusivo, textoMotivoDisponibilidad } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';

const references = { profesionales: 'personal', sucursales: 'sucursal', servicios: 'servicio' };

// La ruta privada calcula causas actuales en el backend. Recepción no forma
// parte de la oferta, y servicio no tiene filtro HTTP: se filtra su referencia
// en la respuesta autorizada sin inventar una causa local.
export async function readResourceEffects(type, id, from, to, request = api) {
  if (!references[type]) throw new Error('Este recurso no forma parte de la oferta de citas.');
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Identificador no válido.');
  if (Object.keys(validarRangoInclusivo(from, to)).length) throw new Error('Selecciona un rango válido de hasta 31 fechas.');
  const params = new URLSearchParams({ desde: from, hasta: to });
  if (type === 'profesionales') params.set('personalId', String(id));
  if (type === 'sucursales') params.set('sucursalId', String(id));
  const result = await request(`/disponibilidad/citas-afectadas?${params}`);
  if (!result || !Array.isArray(result.citas) || result.desde !== from || result.hasta !== to) {
    throw new Error('La respuesta de citas afectadas no es válida.');
  }
  // Una cita puede tener varias causas simultáneas. Esta vista conserva solo
  // las que el backend atribuye al recurso elegido y no las recalcula.
  return { ...result, citas: result.citas.flatMap((item) => {
    const causas = Array.isArray(item.causas) ? item.causas.filter((cause) =>
      cause.referenciaTipo === references[type] && cause.referenciaId === id) : [];
    return causas.length ? [{ ...item, causas }] : [];
  }) };
}

export function effectReasons(item) {
  return item.causas.map((cause) => textoMotivoDisponibilidad(cause.codigo));
}
