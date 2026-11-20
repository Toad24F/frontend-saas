import { isDemo, loadBackendData } from '../../../connected/backend.js';
import { db } from '../../data.js';
import { pageHead, button } from '../../ui.js';
import { renderDirectorio, vincularDirectorio } from './plataforma.directorio.js';
import './plataforma.estilos.css';

function obtenerNegocios() {
  if (!isDemo) return db.tenants.filter((negocio) => negocio.slug);
  return db.tenants.map((negocio) => ({ ...negocio, category: null, license: negocio.suspended ? 'suspendida' : 'vigente', validity: { condicionAcceso: !negocio.suspended }, failedDeliveries: 0 }));
}

export function plataforma() {
  return pageHead(isDemo ? 'Negocios de la plataforma' : 'Panel de superadministración',
    isDemo ? 'Vista de superadministración · Entorno de demostración.' : 'Supervisa el acceso de los negocios, identifica licencias próximas a vencer y gestiona sus cuentas.',
    button('Registrar negocio', 'registrar-negocio')) + renderDirectorio(obtenerNegocios(), isDemo);
}

vincularDirectorio(obtenerNegocios, () => isDemo ? Promise.resolve() : loadBackendData(), isDemo);
