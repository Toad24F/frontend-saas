import { user } from '../../backend.js';
import { getBranchQuota } from '../../modules/sucursales/quota.js';
import { branches as sharedBranches } from '../../../shared/screens/sucursales/view.js';
import { escape } from '../../../shared/ui.js';

export function branches() {
  if (user?.rol !== 'admin_negocio') return sharedBranches();
  const quota = getBranchQuota();
  return sharedBranches({ quota, management: (branch) =>
    `<button type="button" data-delete-branch="${branch.id}" aria-label="Eliminar ${escape(branch.name)}">Eliminar</button>` });
}
