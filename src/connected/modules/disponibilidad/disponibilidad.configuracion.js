import { api } from '../autenticacion/sesion.estado.js';
import { leerConfiguracionConectada, validarConfiguracionConectada } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';

const CAMPOS_CONFIGURACION = ['modo', 'tiempoEntreCitasMinutos', 'anticipacionMinutos', 'diasFuturos'];

// El PUT reemplaza el conjunto completo; esta lista evita enviar campos viejos
// o de presentación aunque el llamador agregue propiedades al borrador.
export function crearPayloadConfiguracionAgenda(valores) {
  return Object.fromEntries(CAMPOS_CONFIGURACION.map((campo) => [campo, valores[campo]]));
}

// Un fallo conserva el dato confirmado y el borrador. Solo una respuesta que
// confirme los cuatro valores puede convertir el borrador en estado vigente.
export async function guardarReglasAgenda(estadoVigente, valores, solicitar = api) {
  const payload = crearPayloadConfiguracionAgenda(valores);
  const errores = validarConfiguracionConectada(payload);
  if (Object.keys(errores).length) return { guardado: false,
    estado: { ...estadoVigente, ocupado: false, borrador: payload, errores, error: '' } };
  try {
    const datos = leerConfiguracionConectada(await solicitar('/disponibilidad/configuracion', 'PUT', payload));
    if (CAMPOS_CONFIGURACION.some((campo) => datos[campo] !== payload[campo])) throw new Error('El servidor no confirmó el reemplazo completo de las reglas. Actualiza la vista.');
    return { guardado: true, estado: { cargado: true, ocupado: false, datos, borrador: null, errores: {}, error: '' } };
  } catch (error) {
    const camposAfectados = {};
    if (error.status === 400) for (const campo of CAMPOS_CONFIGURACION) {
      if (String(error.message).includes(campo)) camposAfectados[campo] = error.message;
    }
    return { guardado: false, estado: { ...estadoVigente, ocupado: false, borrador: payload, errores: camposAfectados,
      error: Object.keys(camposAfectados).length ? '' : error.message || 'No se pudieron guardar las reglas.' } };
  }
}
