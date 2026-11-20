import { api } from '../autenticacion/sesion.estado.js';
import { validarRangoInclusivo, textoMotivoDisponibilidad } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';

const referencias = { profesionales: 'personal', sucursales: 'sucursal', servicios: 'servicio' };

// La ruta privada calcula causas actuales en el backend. Recepción no forma
// parte de la oferta, y servicio no tiene filtro HTTP: se filtra su referencia
// en la respuesta autorizada sin inventar una causa local.
export async function consultarCitasAfectadas(tipo, id, desde, hasta, solicitar = api) {
  if (!referencias[tipo]) throw new Error('Este recurso no forma parte de la oferta de citas.');
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Identificador no válido.');
  if (Object.keys(validarRangoInclusivo(desde, hasta)).length) throw new Error('Selecciona un rango válido de hasta 31 fechas.');
  const parametros = new URLSearchParams({ desde, hasta });
  if (tipo === 'profesionales') parametros.set('personalId', String(id));
  if (tipo === 'sucursales') parametros.set('sucursalId', String(id));
  const resultado = await solicitar(`/disponibilidad/citas-afectadas?${parametros}`);
  if (!resultado || !Array.isArray(resultado.citas) || resultado.desde !== desde || resultado.hasta !== hasta) {
    throw new Error('La respuesta de citas afectadas no es válida.');
  }
  // Una cita puede tener varias causas simultáneas. Esta vista conserva solo
  // las que el backend atribuye al recurso elegido y no las recalcula.
  return { ...resultado, citas: resultado.citas.flatMap((cita) => {
    const causas = Array.isArray(cita.causas) ? cita.causas.filter((causa) =>
      causa.referenciaTipo === referencias[tipo] && causa.referenciaId === id) : [];
    return causas.length ? [{ ...cita, causas }] : [];
  }) };
}

export function motivosAfectacion(cita) {
  return cita.causas.map((causa) => textoMotivoDisponibilidad(causa.codigo));
}
