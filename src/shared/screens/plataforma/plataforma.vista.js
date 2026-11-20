import { esDemo, cargarDatosBackend } from '../../../connected/backend.js';
import { datosAplicacion } from '../../aplicacion.datos.js';
import { renderEncabezadoPagina, renderBoton } from '../../interfaz.componentes.js';
import { renderDirectorio, vincularDirectorio } from './plataforma.directorio.js';
import './plataforma.estilos.css';

function obtenerNegocios() {
  if (!esDemo) return datosAplicacion.tenants.filter((negocio) => negocio.slug);
  return datosAplicacion.tenants.map((negocio) => ({ ...negocio, category: null, license: negocio.suspended ? 'suspendida' : 'vigente', validity: { condicionAcceso: !negocio.suspended }, failedDeliveries: 0 }));
}

export function plataforma() {
  return renderEncabezadoPagina(esDemo ? 'Negocios de la plataforma' : 'Panel de superadministración',
    esDemo ? 'Vista de superadministración · Entorno de demostración.' : 'Supervisa el acceso de los negocios, identifica licencias próximas a vencer y gestiona sus cuentas.',
    renderBoton('Registrar negocio', 'registrar-negocio')) + renderDirectorio(obtenerNegocios(), esDemo);
}

vincularDirectorio(obtenerNegocios, () => esDemo ? Promise.resolve() : cargarDatosBackend(), esDemo);
