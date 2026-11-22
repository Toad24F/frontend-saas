import { api, usuarioActual as usuario } from '../../backend.js';
import { estadoAplicacion as estado, render } from '../../../shared/aplicacion.nucleo.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { escaparHtml, renderEncabezadoPagina, renderEstadoVacio } from '../../../shared/interfaz.componentes.js';
import { crearOperacionesLicencia } from './licencia.operaciones.js';
import { renderEstadoLicencia } from './licencia.presentacion.js';
import { leerCupoUsuarios, renderCupoUsuarios } from './usuarios.cupo.js';
import './negocio.estilos.css';
import '../../../shared/screens/disponibilidad/disponibilidad.estilos.css';
import { renderMedidorCupo } from './cupo.medidor.js';
import { renderHistorialCorreo } from './correo.historial.js';
import { vincularEspacioNegocio, estadoEspacioNegocio } from './negocio.espacio-trabajo.js';
import { consultarEnviosCompletos } from '../../modules/correos/correos.historial-client.js';

let idActual = null;
let detalle = null;
let cargando = null;
let fallo = null;

const textoFecha = (valor) => valor ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor)) : '—';

async function cargarNegocio(id) {
  const negocio = await api(`/negocios/${id}`);
  // El superadmin recibe ambos cupos del servidor junto con el detalle actual;
  // ningún contador procede de las filas visibles en catálogos.
  const [cupoSucursales, cupoUsuarios, envios, vigencia] = await Promise.all([
    api(`/negocios/${id}/cupo-sucursales`),
    leerCupoUsuarios(id, api),
    consultarEnviosCompletos(api, id),
    negocio.licencia ? api(`/licencias/${negocio.licencia.id}/vigencia`) : null,
  ]);
  return { negocio, cupoSucursales, cupoUsuarios, envios, vigencia };
}

export async function consultarDetalleNegocio() {
  const id = Number(estado.detalleNegocioId);
  idActual = id;
  detalle = null;
  fallo = null;
  cargando = cargarNegocio(id);
  try {
    const resultado = await cargando;
    if (idActual === id) detalle = resultado;
  } catch (error) {
    if (idActual === id) fallo = error;
  } finally {
    if (idActual === id) {
      cargando = null;
      render();
    }
  }
}

export function invalidarDetalleNegocio() {
  idActual = null;
  detalle = null;
  fallo = null;
  cargando = null;
}

export function datosDetalleNegocio() { return detalle; }

export function renderDetalleNegocio() {
  const id = Number(estado.detalleNegocioId);
  if (!Number.isSafeInteger(id) || id < 1) return renderEstadoVacio('Negocio no encontrado', 'Vuelve al panel para elegir un negocio.');
  if (idActual !== id) {
    idActual = id;
    if (estadoEspacioNegocio.negocioId !== id) {
      estadoEspacioNegocio.negocioId = id;
      estadoEspacioNegocio.pestana = 'general';
      estadoEspacioNegocio.correo = { estado: '', tipo: '', pagina: 1 };
    }
    detalle = null;
    fallo = null;
    cargando = null;
  }
  if (!detalle && !fallo && !cargando) void consultarDetalleNegocio();
  if (fallo) return `${renderEncabezadoPagina('Detalle de negocio', 'No pudimos cargar este negocio.')}<section class="superficie negocio-seccion-detalle"><p role="alert">${escaparHtml(fallo.message)}</p><button class="btn btn-light" data-action="volver-plataforma">Volver al panel</button><button class="btn btn-primary" data-action="consultar-detalle-negocio">Reintentar</button></section>`;
  if (!detalle) return `${renderEncabezadoPagina('Detalle de negocio', 'Consultando licencia, cupo e historial de envíos.')}<section class="superficie negocio-seccion-detalle" role="status">Cargando datos del negocio…</section>`;

  const { negocio, cupoSucursales, cupoUsuarios, envios, vigencia } = detalle;
  const pendienteActivacion = !negocio.administrador?.activadoEn;
  const fallidos = envios.filter((envio) => envio.estado === 'fallido').length;
  const puedeRecuperar = negocio.administrador?.id && negocio.administrador?.activadoEn;
  let operacionPendiente = null;
  try { operacionPendiente = crearOperacionesLicencia({ api, actorId: usuario.id }).pendiente(); }
  catch { operacionPendiente = { action: 'ilegible' }; }
  const general = `<div class="negocio-general"><section class="negocio-seccion-general" aria-labelledby="negocio-titulo-licencia"><h2 id="negocio-titulo-licencia">Licencia</h2>${renderEstadoLicencia(vigencia, operacionPendiente)}</section><section class="negocio-seccion-general" aria-labelledby="negocio-titulo-administrador"><h2 id="negocio-titulo-administrador">Administrador e invitación</h2>${pendienteActivacion ? '<p class="negocio-descripcion-general">La activación crea la cuenta y habilita el primer año de licencia.</p>' : ''}<dl class="negocio-datos-administrador"><div><dt>Correo del administrador</dt><dd>${escaparHtml(negocio.administrador?.email || negocio.emailContacto || '—')}</dd></div><div><dt>Identificador público</dt><dd>${escaparHtml(negocio.identificadorPublico)}</dd></div><div><dt>Fecha de creación</dt><dd>${textoFecha(negocio.creadoEn)}</dd></div><div><dt>Fecha de activación</dt><dd>${textoFecha(negocio.activadoEn)}</dd></div></dl><div class="negocio-acciones-detalle">${pendienteActivacion ? '<button class="btn btn-light" data-accion-negocio="correo">Corregir correo</button><button class="btn btn-light" data-accion-negocio="reemitir">Reemitir código</button>' : ''}${puedeRecuperar ? '<button class="btn btn-light" data-accion-negocio="recuperacion">Autorizar recuperación</button>' : ''}</div></section></div>`;

  const limites = `<div class="negocio-limites"><section class="negocio-seccion-general" aria-labelledby="negocio-titulo-sucursales"><h2 id="negocio-titulo-sucursales">Sucursales</h2><p class="negocio-descripcion-general">El límite aplica a sucursales activas.</p>${renderMedidorCupo('Sucursales activas', cupoSucursales.sucursalesActivas, cupoSucursales.limiteSucursalesActivas, cupoSucursales.disponibles)}<div class="negocio-acciones-detalle"><button class="btn btn-light" data-accion-negocio="limite">Cambiar límite de sucursales</button></div></section><section class="negocio-seccion-general" aria-labelledby="negocio-titulo-usuarios"><h2 id="negocio-titulo-usuarios">Usuarios</h2><p class="negocio-descripcion-general">Límites y consumo de cuentas activas.</p>${renderCupoUsuarios(cupoUsuarios)}</section></div>`;
  const correo = `<section class="negocio-seccion-general negocio-seccion-correo" aria-labelledby="negocio-titulo-correo"><h2 id="negocio-titulo-correo">Historial de correos</h2><p class="negocio-descripcion-general">Invitaciones y avisos, del más reciente al más antiguo.</p>${renderHistorialCorreo(envios, estadoEspacioNegocio.correo)}</section>`;

  const pestanas = [['general', 'General', general], ['limites', 'Límites y uso', limites], ['correo', `Historial de correos${fallidos ? ` · ${fallidos} fallidos` : ''}`, correo]];
  return `${renderEncabezadoPagina(negocio.nombre, 'Administración del negocio y seguimiento de su acceso.', '<button type="button" class="btn btn-light" data-action="volver-plataforma">' + renderIcono('arrow') + 'Volver al panel</button>')}<div class="negocio-espacio-trabajo"><nav class="disponibilidad-pestanas" role="tablist" aria-label="Información del negocio">${pestanas.map(([id, etiqueta]) => `<button type="button" role="tab" id="negocio-pestana-${id}" aria-controls="negocio-panel-${id}" aria-selected="${estadoEspacioNegocio.pestana === id}" tabindex="${estadoEspacioNegocio.pestana === id ? 0 : -1}" data-negocio-pestana="${id}" class="${estadoEspacioNegocio.pestana === id ? 'is-selected' : ''}">${etiqueta}</button>`).join('')}</nav>${pestanas.map(([id, , contenido]) => `<div role="tabpanel" tabindex="0" id="negocio-panel-${id}" aria-labelledby="negocio-pestana-${id}" ${estadoEspacioNegocio.pestana === id ? '' : 'hidden'}>${contenido}</div>`).join('')}</div>`;
}

vincularEspacioNegocio(() => detalle, consultarDetalleNegocio);
