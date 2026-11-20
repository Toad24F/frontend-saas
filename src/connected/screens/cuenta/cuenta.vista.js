import { api, usuarioActual as usuario, etiquetaRol } from '../../backend.js';
import { render } from '../../../shared/aplicacion.nucleo.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { escaparHtml, renderEncabezadoPagina } from '../../../shared/interfaz.componentes.js';
import { progresoLicencia } from './licencia.progreso.js';
import './cuenta.estilos.css';
import { datosAplicacion } from '../../../shared/aplicacion.datos.js';
import { renderPortalCuenta, vincularPortalCuenta } from '../../../shared/cuenta.portal.js';
import '../../../shared/cuenta.portal.css';
import { leerPublicacionPrecios, guardarPublicacionPrecios } from '../../modules/publicacion/publicacion.precios.js';
import { renderPublicacionPrecios } from './cuenta.publicacion-precios.js';

let usuarioIdLicencia = null;
let licencia = null;
let cargando = false;
let error = null;
let publicacion = { usuarioId: null, cargando: false, guardando: false, datos: null, borrador: null, error: '' };

// La publicación vive en la cuenta del Administrador y se vuelve a leer al cambiar de sesión.
export async function consultarPublicacionPrecios() {
  if (usuario?.rol !== 'admin_negocio') return;
  const usuarioId = usuario.id;
  publicacion = { ...publicacion, usuarioId, cargando: true, borrador: null, error: '' };
  render();
  try {
    const datos = await leerPublicacionPrecios();
    if (publicacion.usuarioId === usuarioId) publicacion = { ...publicacion, cargando: false, datos, error: '' };
  } catch (capturado) {
    if (publicacion.usuarioId === usuarioId) publicacion = { ...publicacion, cargando: false, datos: null, error: capturado.message };
  }
  render();
}

export async function actualizarPublicacionPrecios(habilitado) {
  if (usuario?.rol !== 'admin_negocio' || !publicacion.datos || publicacion.guardando) return;
  publicacion = { ...publicacion, guardando: true, borrador: habilitado, error: '' };
  render();
  try {
    const datos = await guardarPublicacionPrecios(habilitado);
    publicacion = { ...publicacion, guardando: false, datos, borrador: null, error: '' };
  } catch (capturado) {
    publicacion = { ...publicacion, guardando: false, error: capturado.message };
  }
  render();
}

const nombreEstadoLicencia = (estado) => ({
  pendiente: 'Pendiente',
  vigente: 'Vigente',
  suspension_pendiente: 'Suspensión programada',
  suspendida: 'Suspendida',
  vencida: 'Vencida',
})[estado] || estado;

const textoFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(fecha);
};
const iniciales = (nombre) => (nombre || '').trim().split(/\s+/).slice(0, 2).map((parte) => parte[0] || '').join('').toUpperCase() || 'MC';
const textoTiempoRestante = (tiempo) => tiempo
  ? [tiempo.dias + ' días', tiempo.horas + ' horas', tiempo.minutos + ' minutos'].join(', ')
  : '—';

export async function consultarLicenciaPropia() {
  if (!usuario || usuario.rol === 'superadmin') return;
  const id = usuario.id;
  usuarioIdLicencia = id;
  cargando = true;
  error = null;
  try {
    const siguiente = await api('/licencias/mi-vigencia');
    if (usuarioIdLicencia === id) licencia = siguiente;
  } catch (capturado) {
    if (usuarioIdLicencia === id) error = capturado;
  } finally {
    if (usuarioIdLicencia === id) { cargando = false; render(); }
  }
}

function renderContenidoLicencia() {
  if (!licencia) {
    return '<p class="cuenta-licencia-mensaje" role="' + (error ? 'alert' : 'status') + '">' +
      (error ? escaparHtml(error.message) : cargando ? 'Consultando vigencia…' : 'Sin datos de licencia.') + '</p>';
  }
  const progreso = progresoLicencia(licencia);
  const estado = licencia.estado || 'pendiente';
  const tiempo = licencia.tiempoRestante;
  const contenidoProgreso = progreso
    ? '<div class="cuenta-licencia-progreso"><div class="cuenta-encabezado-progreso"><span>Vigencia restante</span><strong>' +
      escaparHtml(textoTiempoRestante(tiempo)) + '</strong></div><progress max="100" value="' +
      progreso.valor + '" aria-label="Porcentaje restante de la vigencia total de la licencia">' +
      progreso.valor + '%</progress><p>' +
      'Calculada sobre la vigencia total de tu licencia, incluidas renovaciones.' +
      '</p></div>'
    : '<p class="cuenta-licencia-mensaje">Aún no hay tiempo restante disponible.</p>';
  return '<div class="cuenta-licencia-resumen"><div><span class="cuenta-antetitulo">Tiempo restante</span>' +
    '<strong class="cuenta-licencia-dias">' + (tiempo ? escaparHtml(String(tiempo.dias)) : '—') +
    '<span> días</span></strong><p>Tu acceso al negocio</p></div>' +
    '<span class="cuenta-licencia-estado is-' + escaparHtml(estado) + '">' + escaparHtml(nombreEstadoLicencia(estado)) + '</span></div>' +
    contenidoProgreso +
    '<div class="cuenta-licencia-datos"><div><span>Vencimiento</span><strong>' + escaparHtml(textoFecha(licencia.venceEn)) +
    '</strong></div><div><span>Bloqueo programado</span><strong>' +
    escaparHtml(textoFecha(licencia.bloqueoProgramadoEn)) + '</strong></div></div>';
}

export function cuenta() {
  vincularPortalCuenta(document);
  if (usuario.rol === 'admin_negocio' && publicacion.usuarioId !== usuario.id && !publicacion.cargando) void consultarPublicacionPrecios();
  if (usuario.rol !== 'superadmin' && usuarioIdLicencia !== usuario.id) {
    usuarioIdLicencia = usuario.id;
    licencia = null;
    cargando = true;
    void consultarLicenciaPropia();
  }
  const nombre = escaparHtml(usuario.nombre || 'Mi cuenta');
  const rol = escaparHtml(etiquetaRol(usuario.rol));
  const correo = escaparHtml(usuario.email || '—');
  return '<div class="cuenta-pagina">' +
    renderEncabezadoPagina('Mi cuenta', 'Consulta los datos de tu acceso y la vigencia de tu licencia.') +
    '<section class="superficie cuenta-identidad" aria-label="Perfil de cuenta">' +
    '<span class="cuenta-avatar" aria-hidden="true">' + escaparHtml(iniciales(usuario.nombre)) + '</span>' +
    '<div class="cuenta-texto-identidad"><span class="cuenta-antetitulo">Perfil de cuenta</span><h2>' + nombre +
    '</h2><p>' + correo + '</p></div><span class="cuenta-rol">' + rol + '</span></section>' +
    '<div class="cuenta-cuadricula"><section class="superficie cuenta-seccion"><div class="cuenta-encabezado-seccion">' +
    '<span class="cuenta-icono-seccion" aria-hidden="true">' + renderIcono('user') + '</span>' +
    '<div><h2>Datos de acceso</h2><p>Información vinculada a tu sesión.</p></div></div>' +
    '<dl class="cuenta-datos"><div><dt>Nombre</dt><dd>' + nombre + '</dd></div>' +
    '<div><dt>Correo electrónico</dt><dd>' + correo + '</dd></div>' +
    '<div><dt>Rol</dt><dd>' + rol + '</dd></div></dl></section>' +
    '<section class="superficie cuenta-seccion cuenta-seguridad"><div class="cuenta-encabezado-seccion">' +
    '<span class="cuenta-icono-seccion" aria-hidden="true">' + renderIcono('lock') + '</span>' +
    '<div><h2>Seguridad</h2><p>Controla el acceso a tu cuenta.</p></div></div>' +
    '<div class="cuenta-acciones-seguridad"><button type="button" class="btn btn-primary" data-action="cambiar-contrasena-cuenta">' +
    renderIcono('lock') + 'Cambiar contraseña</button>' +
    '<button type="button" class="btn btn-light" data-action="cerrar-sesion-cuenta">Cerrar sesión</button></div></section></div>' +
    renderPortalCuenta({ usuario: usuario, negocio: datosAplicacion.tenants.find((tenant) => tenant.id === usuario.negocioId), origen: location.origin }) +
    (usuario.rol === 'admin_negocio' ? renderPublicacionPrecios(publicacion) : '') +
    (usuario.rol === 'superadmin' ? '' :
      '<section class="superficie cuenta-seccion cuenta-licencia"><div class="cuenta-encabezado-seccion">' +
      '<span class="cuenta-icono-seccion" aria-hidden="true">' + renderIcono('calendar') + '</span>' +
      '<div><h2>Licencia del negocio</h2><p>Estado de vigencia de tu acceso.</p></div>' +
      '<button type="button" class="btn btn-light cuenta-actualizar" data-action="consultar-licencia-propia">Actualizar estado</button>' +
      '</div>' + renderContenidoLicencia() + '</section>') +
    '</div>';
}
