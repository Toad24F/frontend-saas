import { isDemo, loadBackendData } from '../../../connected/backend.js';
import { db } from '../../data.js';
import { pageHead, button } from '../../ui.js';
import { directoryHtml, bindDirectory } from './directory.js';
import './style.css';

function businesses() {
  if (!isDemo) return db.tenants.filter((tenant) => tenant.slug);
  return db.tenants.map((tenant) => ({ ...tenant, category: null, license: tenant.suspended ? 'suspendida' : 'vigente', validity: { condicionAcceso: !tenant.suspended }, failedDeliveries: 0 }));
}

export function platform() {
  return pageHead(isDemo ? 'Negocios de la plataforma' : 'Panel de superadministración',
    isDemo ? 'Vista de superadministración · Entorno de demostración.' : 'Supervisa el acceso de los negocios, identifica licencias próximas a vencer y gestiona sus cuentas.',
    button('Registrar negocio', 'new-tenant')) + directoryHtml(businesses(), isDemo);
}

bindDirectory(businesses, () => isDemo ? Promise.resolve() : loadBackendData(), isDemo);
