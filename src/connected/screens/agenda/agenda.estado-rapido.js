import { instalarMenuEstado } from '../../../shared/screens/agenda/agenda.menu-estado.js';
import { crearClientCitaManual, puedeGestionarCitas } from '../../modules/agenda/agenda.contrato-manual.js';
import { errorSeguro } from '../../modules/agenda/agenda.errores.js';
import { api, user } from '../../backend.js';
import { state as estado } from '../../../shared/app.js';
import { toast } from '../../../shared/ui.js';
import { statuses } from '../../../shared/data.js';

export function instalarEstadoRapido({ client, openDetail: abrirDetalle, refresh: refrescar }) {
  const escritor = crearClientCitaManual(api);
  instalarMenuEstado({
    active: () => document.documentElement.dataset.appMode === 'connected' && estado.page === 'agenda' && puedeGestionarCitas(user?.rol) ? `${user.id}:${user.negocioId}:${user.sesionId}` : null,
    read: (id) => client.consultarDetalle(id),
    openDetail: abrirDetalle,
    errorText: (error) => { const info = errorSeguro(error); return `${info.title}. ${info.message} Actualiza la cita antes de volver a guardar.`; },
    change: async (detalle, estado, motivo) => {
      const resultado = await escritor.cambiarEstado(detalle.id, { estado, motivo, version: detalle.version });
      if (resultado?.id !== detalle.id || resultado.folio !== detalle.folio || resultado.estado !== estado || !Number.isInteger(resultado.version) || resultado.version <= detalle.version) throw new Error('No se pudo comprobar el cambio.');
      return resultado;
    },
    changed: async (resultado, { restoreFocus: restaurarFoco }) => {
      await refrescar();
      if (restaurarFoco) (document.querySelector(`[data-agenda-menu-estado="${resultado.id}"]`) || document.querySelector('[data-agenda-hoy]'))?.focus({ preventScroll: true });
      toast(`Estado actualizado: ${statuses[resultado.estado]}.`);
    },
  });
}
