import { installStateMenu } from '../../../shared/screens/agenda/state-menu.js';
import { createManualClient, canManageAppointments } from '../../modules/agenda/manual-contract.js';
import { privateError } from '../../modules/agenda/errors.js';
import { api, user } from '../../backend.js';
import { state } from '../../../shared/app.js';
import { toast } from '../../../shared/ui.js';
import { statuses } from '../../../shared/data.js';

export function installQuickState({ client, openDetail, refresh }) {
  const writer = createManualClient(api);
  installStateMenu({
    active: () => document.documentElement.dataset.appMode === 'connected' && state.page === 'agenda' && canManageAppointments(user?.rol) ? `${user.id}:${user.negocioId}:${user.sesionId}` : null,
    read: (id) => client.detail(id),
    openDetail,
    errorText: (error) => { const info = privateError(error); return `${info.title}. ${info.message} Actualiza la cita antes de volver a guardar.`; },
    change: async (detail, estado, motivo) => {
      const result = await writer.changeState(detail.id, { estado, motivo, version: detail.version });
      if (result?.id !== detail.id || result.folio !== detail.folio || result.estado !== estado || !Number.isInteger(result.version) || result.version <= detail.version) throw new Error('No se pudo comprobar el cambio.');
      return result;
    },
    changed: async (result, { restoreFocus }) => {
      await refresh();
      if (restoreFocus) (document.querySelector(`[data-agenda-state-menu="${result.id}"]`) || document.querySelector('[data-m4-today]'))?.focus({ preventScroll: true });
      toast(`Estado actualizado: ${statuses[result.estado]}.`);
    },
  });
}
