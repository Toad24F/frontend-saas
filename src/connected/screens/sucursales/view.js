import { user } from '../../backend.js';
import { getBranchQuota } from '../../modules/sucursales/quota.js';
import { branches as sharedBranches } from '../../../shared/screens/sucursales/view.js';
import { escape } from '../../../shared/ui.js';
import './style.css';

export function branches() {
  if (user?.rol !== 'admin_negocio') return sharedBranches();
  const quota = getBranchQuota();
  const summary = quota ? `<section class="surface branch-quota" aria-label="Cupo de sucursales">
    <div><span class="subtle-text">Cupo de sucursales activas</span><strong>${escape(quota.sucursalesActivas)} de ${escape(quota.limiteSucursalesActivas)}</strong></div>
    <div><span class="subtle-text">Disponibles</span><strong>${escape(quota.disponibles)}</strong></div>
  </section>` : '';
  return `<div class="connected-branches">${sharedBranches({ beforeGrid: summary, management: (branch) =>
    `<button type="button" class="btn btn-danger-soft" data-delete-branch="${branch.id}" aria-label="Eliminar ${escape(branch.name)}">Eliminar</button>` })}</div>`;
}
