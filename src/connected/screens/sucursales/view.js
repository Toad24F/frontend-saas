import { user } from '../../backend.js';
import { getBranchQuota } from '../../modules/sucursales/quota.js';
import { branches as sharedBranches } from '../../../shared/screens/sucursales/view.js';
import { escape } from '../../../shared/ui.js';
import { retiredSection } from '../recursos/retired-view.js';

export function branches() {
  if (user?.rol !== 'admin_negocio') return sharedBranches();
  const quota = getBranchQuota();
  return `${sharedBranches({ quota, management: (branch) =>
    `<button type="button" data-disable-branch="${branch.id}" aria-label="Inhabilitar ${escape(branch.name)}">Inhabilitar</button>` })}${retiredSection('sucursales')}`;
}
