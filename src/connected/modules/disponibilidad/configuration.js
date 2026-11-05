import { api } from '../auth/session.js';
import { readConnectedConfiguration, validateConnectedConfiguration } from '../../../shared/screens/disponibilidad/operational-contract.js';

const fields = ['modo', 'tiempoEntreCitasMinutos', 'anticipacionMinutos', 'diasFuturos'];

// El PUT reemplaza el conjunto completo; esta lista evita enviar campos viejos
// o de presentación aunque el llamador agregue propiedades al borrador.
export function agendaConfigurationPayload(values) {
  return Object.fromEntries(fields.map((name) => [name, values[name]]));
}

// Un fallo conserva el dato confirmado y el borrador. Solo una respuesta que
// confirme los cuatro valores puede convertir el borrador en estado vigente.
export async function saveAgendaConfiguration(current, values, request = api) {
  const draft = agendaConfigurationPayload(values);
  const errors = validateConnectedConfiguration(draft);
  if (Object.keys(errors).length) return { saved: false,
    state: { ...current, busy: false, draft, errors, error: '' } };
  try {
    const data = readConnectedConfiguration(await request('/disponibilidad/configuracion', 'PUT', draft));
    if (fields.some((name) => data[name] !== draft[name])) throw new Error('El servidor no confirmó el reemplazo completo de las reglas. Actualiza la vista.');
    return { saved: true, state: { loaded: true, busy: false, data, draft: null, errors: {}, error: '' } };
  } catch (caught) {
    const affected = {};
    if (caught.status === 400) for (const name of fields) {
      if (String(caught.message).includes(name)) affected[name] = caught.message;
    }
    return { saved: false, state: { ...current, busy: false, draft, errors: affected,
      error: Object.keys(affected).length ? '' : caught.message || 'No se pudieron guardar las reglas.' } };
  }
}
