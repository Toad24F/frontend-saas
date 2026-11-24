import { esDemo, mensajePendiente, urlSegunModo, usuarioActual, etiquetaRol, paginaPermitida, paginaInicial, restaurarSesion, cargarDatosBackend } from '../connected/backend.js';
import { renderAutenticacion } from '../connected/screens/autenticacion/autenticacion.vista.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './global.estilos.css';
import './tema.estilos.css';
import './movimiento.estilos.css';
import './movil.estilos.css';
import './screens/agenda/agenda.calendario.css';
import { renderIcono } from './iconos.catalogo.js';
import { handleNavegacionAgenda, renderAgendaConservandoPosicion } from './screens/agenda/agenda.navegacion.js';
import { leerVistaAgenda, guardarVistaAgenda } from './screens/agenda/agenda.preferencia-vista.js';
import { vistaAgenda } from './screens/agenda/agenda.vista.js';
import {
  datosAplicacion,
  HOY,
  sumarDias,
  crearFecha,
  fechaIso,
  formatearFecha,
  listarRegistros,
  ampliarDatosCita,
  obtenerNegocio,
  etiquetasEstadoCita,
} from './aplicacion.datos.js';
import { escaparHtml, avatar, renderEncabezadoPagina, renderEstadoVacio } from './interfaz.componentes.js';
import { aplicarFiltrosProfesionales, restablecerFiltrosProfesionales, cambiarVistaProfesionales } from './screens/profesionales/profesionales.vista.js';
import { aplicarFiltrosRecepcionistas, restablecerFiltrosRecepcionistas, cambiarVistaRecepcionistas } from '../connected/screens/recepcionistas/recepcionistas.vista.js';
import { aplicarFiltrosServicios, restablecerFiltrosServicios, cambiarVistaServicios } from './screens/servicios/servicios.vista.js';
import { aplicarFiltrosSucursales, restablecerFiltrosSucursales, cambiarVistaSucursales } from './screens/sucursales/sucursales.vista.js';
import { cambiarPestanaDisponibilidad } from './screens/disponibilidad/disponibilidad.vista.js';
import { actualizarBorradorAsignaciones } from './screens/disponibilidad/disponibilidad.asignaciones-sucursales.js';
import { gruposDisponibilidadPermitidos, resolverGrupoDisponibilidad } from './screens/disponibilidad/disponibilidad.grupos.js';

const claveTema = 'cita-theme';
let tema = (() => {
  try {
    const guardado = localStorage.getItem(claveTema);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {
    // El prototipo sigue funcionando si el navegador bloquea el almacenamiento.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();
function aplicarTema() {
  document.documentElement.dataset.theme = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'dark' ? '#0e1915' : '#f4f5f6');
}
aplicarTema();
export function montarSelectorTema() {
  const contenedor = document.querySelector('.barra-superior-derecha, .portal-demo-barra');
  if (!contenedor) return;
  if (contenedor.querySelector('.selector-tema')) return;
  const esOscuro = tema === 'dark';
  contenedor.insertAdjacentHTML(
    'beforeend',
    `<button type="button" class="selector-tema boton-icono" data-action="theme" aria-label="Activar modo ${esOscuro ? 'claro' : 'oscuro'}" title="Modo ${esOscuro ? 'claro' : 'oscuro'}" aria-pressed="${esOscuro}">${renderIcono(esOscuro ? 'sun' : 'moon')}</button>`,
  );
}
function alternarTema() {
  tema = tema === 'dark' ? 'light' : 'dark';
  aplicarTema();
  try { localStorage.setItem(claveTema, tema); } catch { /* preferencia temporal */ }
  document.querySelectorAll('.selector-tema').forEach((boton) => {
    const esOscuro = tema === 'dark';
    boton.innerHTML = renderIcono(esOscuro ? 'sun' : 'moon');
    boton.setAttribute('aria-label', `Activar modo ${esOscuro ? 'claro' : 'oscuro'}`);
    boton.setAttribute('title', `Modo ${esOscuro ? 'claro' : 'oscuro'}`);
    boton.setAttribute('aria-pressed', String(esOscuro));
  });
}

export const estadoAplicacion = {
  negocioId: 1,
  pagina: 'agenda',
  vistaCalendario: leerVistaAgenda(matchMedia('(max-width: 767px)').matches, esDemo ? 'demo' : 'connected'),
  fecha: HOY,
  sucursal: 'all',
  profesional: 'all',
  estadoCita: 'all',
  busqueda: '',
  grupoDisponibilidad: '',
};
window.addEventListener('agenda-cambio-distribucion', () => { if (estadoAplicacion.pagina === 'agenda') renderAgendaConservandoPosicion(render); });
matchMedia('(max-width: 767px)').addEventListener('change', ({ matches }) => {
  document.querySelectorAll('.profesionales-espacio .profesionales-resultados[data-vista-escritorio]').forEach((resultados) => {
    resultados.classList.remove('profesionales-vista--lista', 'profesionales-vista--tarjetas');
    resultados.classList.add(`profesionales-vista--${matches ? 'tarjetas' : resultados.dataset.vistaEscritorio}`);
  });
});
const navegacion = [
  ['general', 'PRINCIPAL'],
  ['resumen', 'grid', 'Resumen'],
  ['agenda', 'calendar', 'Agenda'],
  ['clientes', 'users', 'Clientes'],
  ['business', 'MI NEGOCIO'],
  ['profesionales', 'stethoscope', 'Profesionales'],
  ['servicios', 'briefcase', 'Servicios'],
  ['sucursales', 'pin', 'Sucursales'],
  ['disponibilidad', 'clock', 'Disponibilidad'],
  ['analytics', 'ANÁLISIS'],
  ['reportes', 'chart', 'Reportes'],
  ['notificaciones', 'message', 'Notificaciones'],
];
const etiquetas = Object.fromEntries(
  navegacion.filter((elemento) => elemento.length === 3).map((elemento) => [elemento[0], elemento[2]]),
);
etiquetas.configuracion = 'Configuración';
etiquetas.plataforma = 'Negocios';
etiquetas.negocio = 'Detalle de negocio';
etiquetas.cuenta = 'Mi cuenta';
etiquetas.recepcionistas = 'Recepcionistas';
etiquetas.profesionales = 'Profesionales';
let animarSiguienteRuta = true;
let menuDisponibilidadAbierto = null;
let menuUsuariosAbierto = null;
const rutaDisponibilidad = (grupo) => `/admin/disponibilidad/${grupo}`;
const grupoDisponibilidadSeleccionado = () => resolverGrupoDisponibilidad(estadoAplicacion.grupoDisponibilidad, esDemo, usuarioActual?.rol);
function renderElementoNavegacion(elemento) {
  if (elemento.length === 2) return `<div class="navegacion-seccion">${elemento[1]}</div>`;
  if (elemento[0] === 'usuarios') {
    const seleccionado = ['profesionales', 'recepcionistas'].includes(estadoAplicacion.pagina);
    const abierto = menuUsuariosAbierto ?? seleccionado;
    return `<div class="nav-disclosure"><button type="button" class="navegacion-enlace navegacion-desplegador ${seleccionado ? 'active' : ''}" data-users-menu aria-expanded="${abierto}" aria-controls="users-sidebar-submenu">${renderIcono('users')}<span>Usuarios</span>${renderIcono('chevron', 'navegacion-flecha')}</button><div class="navegacion-submenu" id="users-sidebar-submenu" ${abierto ? '' : 'hidden'}>${[['profesionales', 'Profesionales'], ...(!esDemo && usuarioActual?.rol === 'admin_negocio' ? [['recepcionistas', 'Recepcionistas']] : [])].map(([pagina, etiqueta]) => `<a href="/admin/${pagina}" data-nav="${pagina}" class="navegacion-subenlace ${estadoAplicacion.pagina === pagina ? 'es-actual' : ''}" ${estadoAplicacion.pagina === pagina ? 'aria-current="page"' : ''}>${etiqueta}</a>`).join('')}</div></div>`;
  }
  if (elemento[0] === 'disponibilidad') {
    const abierto = menuDisponibilidadAbierto ?? estadoAplicacion.pagina === 'disponibilidad';
    const enlaces = gruposDisponibilidadPermitidos(esDemo, usuarioActual?.rol).map((grupo) => `<a href="${rutaDisponibilidad(grupo.id)}" data-grupo-disponibilidad="${grupo.id}" class="navegacion-subenlace ${estadoAplicacion.pagina === 'disponibilidad' && grupoDisponibilidadSeleccionado() === grupo.id ? 'es-actual' : ''}" ${estadoAplicacion.pagina === 'disponibilidad' && grupoDisponibilidadSeleccionado() === grupo.id ? 'aria-current="page"' : ''}>${grupo.etiqueta}</a>`).join('');
    return `<div class="nav-disclosure"><button type="button" class="navegacion-enlace navegacion-desplegador ${estadoAplicacion.pagina === 'disponibilidad' ? 'active' : ''}" data-menu-disponibilidad aria-expanded="${abierto}" aria-controls="submenu-disponibilidad">${renderIcono('clock')}<span>Disponibilidad</span>${renderIcono('chevron', 'navegacion-flecha')}</button><div class="navegacion-submenu" id="submenu-disponibilidad" ${abierto ? '' : 'hidden'}>${enlaces}</div></div>`;
  }
  return `<a href="/admin/${elemento[0]}" data-nav="${elemento[0]}" class="navegacion-enlace ${estadoAplicacion.pagina === elemento[0] ? 'active' : ''}" ${estadoAplicacion.pagina === elemento[0] ? 'aria-current="page"' : ''}>${renderIcono(elemento[1])}<span>${elemento[2]}</span>${esDemo && elemento[0] === 'agenda' ? `<span class="navegacion-contador">${listarRegistros('appointments', estadoAplicacion.negocioId).filter((cita) => cita.date === HOY).length}</span>` : ''}</a>`;
}
function establecerMenuMovil(abierto) {
  const estructura = document.querySelector('.estructura-admin');
  if (!estructura) return;
  estructura.classList.toggle('menu-abierto', abierto);
  estructura.querySelectorAll('button[data-action="menu"]').forEach((boton) => {
    boton.setAttribute('aria-expanded', String(abierto));
  });
  if (abierto) estructura.querySelector('.barra-lateral nav .navegacion-enlace')?.focus();
  else estructura.querySelector('.navegacion-inferior [data-action="menu"]')?.focus();
}
function establecerMenuCuenta(abierto, devolverFoco = false) {
  const disparador = document.querySelector('.menu-cuenta-disparador');
  const panel = document.querySelector('.menu-cuenta-panel');
  if (!disparador || !panel) return;
  disparador.setAttribute('aria-expanded', String(abierto));
  panel.hidden = !abierto;
  if (devolverFoco) disparador.focus();
}
function renderMenuCuentaConectada() {
  const nombre = usuarioActual.nombre || 'Mi cuenta';
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('');
  return '<div class="menu-cuenta"><button type="button" class="boton-perfil menu-cuenta-disparador" aria-label="Opciones de ' +
    escaparHtml(nombre) + '" aria-expanded="false" aria-controls="menu-cuenta-panel">' +
    avatar(iniciales, 'durazno') + '<span><strong>' + escaparHtml(nombre) + '</strong><small>' +
    escaparHtml(etiquetaRol(usuarioActual.rol)) + '</small></span>' + renderIcono('down') + '</button>' +
    '<nav id="menu-cuenta-panel" class="menu-cuenta-panel" aria-label="Opciones de usuario" hidden>' +
    '<a href="' + urlSegunModo('/admin/cuenta') + '" data-nav="cuenta" ' +
    (estadoAplicacion.pagina === 'cuenta' ? 'aria-current="page"' : '') + '>' +
    renderIcono('user') + '<span>Mi cuenta</span></a>' +
    '<button type="button" data-action="cerrar-sesion-cuenta">' +
    renderIcono('logout') + '<span>Cerrar sesión</span></button></nav></div>';
}
export function navegar(pagina, id = null) {
  if (!esDemo && !paginaPermitida(pagina)) pagina = paginaInicial();
  if (pagina === 'negocio' && (!Number.isSafeInteger(Number(id)) || Number(id) < 1)) pagina = paginaInicial();
  if (pagina === 'disponibilidad') {
    estadoAplicacion.grupoDisponibilidad = grupoDisponibilidadSeleccionado();
    menuDisponibilidadAbierto = true;
  }
  history.pushState({}, '', urlSegunModo(pagina === 'disponibilidad' ? rutaDisponibilidad(estadoAplicacion.grupoDisponibilidad) : `/admin/${pagina}${pagina === 'negocio' ? `/${id}` : ''}`));
  estadoAplicacion.pagina = pagina;
  if (['profesionales', 'recepcionistas'].includes(pagina)) menuUsuariosAbierto = true;
  estadoAplicacion.detalleNegocioId = pagina === 'negocio' ? Number(id) : null;
  estadoAplicacion.busqueda = '';
  animarSiguienteRuta = true;
  render();
}
function navegarGrupoDisponibilidad(grupo) {
  const grupoResuelto = resolverGrupoDisponibilidad(grupo, esDemo, usuarioActual?.rol);
  if (!grupoResuelto) return;
  menuDisponibilidadAbierto = true;
  estadoAplicacion.grupoDisponibilidad = grupoResuelto;
  estadoAplicacion.pagina = 'disponibilidad';
  estadoAplicacion.busqueda = '';
  history.pushState({}, '', urlSegunModo(rutaDisponibilidad(grupoResuelto)));
  animarSiguienteRuta = true;
  render();
}
function restaurarGrupoDisponibilidad() {
  if (estadoAplicacion.pagina !== 'disponibilidad') return;
  const grupoSolicitado = location.pathname.split('/')[3];
  estadoAplicacion.grupoDisponibilidad = resolverGrupoDisponibilidad(grupoSolicitado, esDemo, usuarioActual?.rol);
  if (estadoAplicacion.grupoDisponibilidad && grupoSolicitado !== estadoAplicacion.grupoDisponibilidad) {
    history.replaceState({}, '', urlSegunModo(rutaDisponibilidad(estadoAplicacion.grupoDisponibilidad)));
  }
}
export function renderEstructuraAplicacion(contenido) {
  if (!obtenerNegocio(estadoAplicacion.negocioId)) estadoAplicacion.negocioId = datosAplicacion.tenants[0].id;
  const negocio = obtenerNegocio(estadoAplicacion.negocioId);
  const desplazamientoLateral = document.querySelector('.barra-lateral')?.scrollTop ?? 0;
  const inicio = esDemo ? 'agenda' : paginaInicial();
  const navegacionVisible = esDemo ? navegacion : [
    ['connected', usuarioActual.rol === 'superadmin' ? 'PLATAFORMA' : usuarioActual.rol === 'recepcionista' ? 'MI CUENTA' : 'MI NEGOCIO'],
    ...(usuarioActual.rol === 'superadmin' ? [['plataforma', 'grid', 'Negocios']] : [
      // Administración conserva su menú propio y expone Reportes en escritorio y en el menú móvil.
      ...(usuarioActual.rol === 'admin_negocio' ? [['agenda', 'calendar', 'Agenda'], ['clientes', 'users', 'Clientes']] : []),
      ...(usuarioActual.rol === 'admin_negocio' ? [['servicios', 'briefcase', 'Servicios'], ['sucursales', 'pin', 'Sucursales'], ['usuarios', 'users', 'Usuarios'], ['disponibilidad', 'clock', 'Disponibilidad'], ['reportes', 'chart', 'Reportes']] : [...navegacion.filter((elemento) => elemento.length === 3 && elemento[0] !== 'usuarios' && paginaPermitida(elemento[0])), ...(paginaPermitida('profesionales') ? [['profesionales', 'stethoscope', 'Profesionales']] : [])]),
    ]),
  ];
  const nombreEspacio = !esDemo && usuarioActual.rol === 'superadmin' ? 'Plataforma' : negocio.name;
  const inicialesEspacio = !esDemo && usuarioActual.rol === 'superadmin' ? 'PL' : negocio.initials;
  const marcaCatalogoMovil = ['profesionales', 'recepcionistas', 'servicios', 'sucursales'].includes(estadoAplicacion.pagina)
    ? `<a class="marca-catalogo-movil" href="/admin/${estadoAplicacion.pagina}" data-nav="${estadoAplicacion.pagina}" aria-label="Citalendar, ${etiquetas[estadoAplicacion.pagina].toLowerCase()}"><img class="logo-marca-claro" src="/brand/citalendar-logo.svg" alt=""><img class="logo-marca-oscuro" src="/brand/citalendar-logo-light.svg" alt=""></a>`
    : '';
  document.querySelector('#app').innerHTML =
    `<div class="estructura-admin"><div class="fondo-barra-lateral" data-action="menu"></div><aside class="barra-lateral"><a class="marca" aria-label="Citalendar: inicio" href="/admin/agenda" data-nav="agenda"><img class="logo-marca-claro" src="/brand/citalendar-logo.svg" alt=""/><img class="logo-marca-oscuro" src="/brand/citalendar-logo-light.svg" alt=""/></a><div class="identidad-espacio efecto-cristal efecto-cristal--oscuro">${avatar(inicialesEspacio, 'avatar-espacio')}<span><strong>${escaparHtml(nombreEspacio)}</strong></span></div><nav aria-label="Navegación principal">${navegacionVisible.map(renderElementoNavegacion).join('')}</nav><div class="seccion-inferior-lateral"><a href="/admin/configuracion" data-nav="configuracion" class="navegacion-enlace ${estadoAplicacion.pagina === 'configuracion' ? 'active' : ''}">${renderIcono('settings')}<span>Configuración</span></a><div class="tarjeta-portal"><div class="icono-portal">${renderIcono('link')}</div><strong>Tu agenda, a un enlace</strong><p>Comparte tu portal y recibe reservas en línea.</p><a href="/reservas/${negocio.slug}" data-portal>Ver portal de reservas ${renderIcono('external')}</a></div><div class="pie-lateral"><span class="punto-verde"></span> Entorno de demostración <span>v1.0</span></div></div></aside><div class="estructura-principal"><header class="barra-superior"><div class="migas-navegacion">${marcaCatalogoMovil}<button class="boton-icono menu-movil" data-action="menu" aria-label="Abrir menú">${renderIcono('menu')}</button><span>${escaparHtml(nombreEspacio)}</span>${renderIcono('chevron')}<strong>${etiquetas[estadoAplicacion.pagina] || 'Agenda'}</strong></div><div class="barra-superior-derecha"><span class="indicador-demo">Prototipo</span><span class="barra-superior-fecha">${renderIcono('calendar')} ${formatearFecha(HOY, { day: 'numeric', month: 'short', year: 'numeric' })}</span><button class="boton-notificaciones boton-icono" data-nav="notificaciones" aria-label="Ver notificaciones">${renderIcono('bell')}<i></i></button><span class="barra-superior-separador"></span><button class="boton-perfil" data-nav="configuracion">${avatar('AV', 'durazno')}<span><strong>Adriana Vega</strong><small>Administradora</small></span>${renderIcono('down')}</button></div></header><main id="contenido-principal" class="contenido-principal${animarSiguienteRuta ? ' animar-entrada' : ''}">${contenido}</main><footer class="pie-app"><span class="logo-pie">Citalendar</span></footer></div></div>`;
  const pestanasDemo = [
    ['resumen', 'grid', 'Inicio'],
    ['agenda', 'calendar', 'Agenda'],
    ['clientes', 'users', 'Clientes'],
  ];
  const pestanasPorRol = {
    superadmin: [['plataforma', 'grid', 'Negocios']],
    admin_negocio: [['agenda', 'calendar', 'Agenda'], ['clientes', 'users', 'Clientes'], ['profesionales', 'stethoscope', 'Equipo']],
    profesional: [['agenda', 'calendar', 'Agenda'], ['servicios', 'briefcase', 'Servicios'], ['disponibilidad', 'clock', 'Horario']],
    recepcionista: [['agenda', 'calendar', 'Agenda'], ['clientes', 'users', 'Clientes'], ['disponibilidad', 'clock', 'Disponibilidad'], ['cuenta', 'user', 'Mi cuenta']],
  };
  const pestanasPrincipales = esDemo ? pestanasDemo : pestanasPorRol[usuarioActual.rol] || [['cuenta', 'user', 'Mi cuenta']];
  const masEstaActivo = !pestanasPrincipales.some(([pagina]) => pagina === estadoAplicacion.pagina);
  const pestanasMoviles = pestanasPrincipales.map(([pagina, simbolo, etiqueta]) =>
    `<a class="pestana-movil ${estadoAplicacion.pagina === pagina ? 'es-actual' : ''}" href="/admin/${pagina}" data-nav="${pagina}" ${estadoAplicacion.pagina === pagina ? 'aria-current="page"' : ''}><span class="pestana-movil-icono">${renderIcono(simbolo)}</span><span>${etiqueta}</span></a>`,
  ).join('');
  const barraLateral = document.querySelector('.barra-lateral');
  barraLateral.id = 'mobile-navigation-drawer';
  barraLateral.scrollTop = desplazamientoLateral;
  barraLateral.insertAdjacentHTML('afterend',
    `<nav class="navegacion-inferior efecto-cristal" aria-label="Navegación inferior"><div class="navegacion-inferior-contenido" style="--cantidad-pestanas:${pestanasPrincipales.length + (esDemo || usuarioActual.rol !== 'recepcionista' ? 1 : 0)}">${pestanasMoviles}${esDemo || usuarioActual.rol !== 'recepcionista' ? `<button type="button" class="pestana-movil ${masEstaActivo ? 'es-actual' : ''}" data-action="menu" aria-label="Más secciones" aria-controls="mobile-navigation-drawer" aria-expanded="false"><span class="pestana-movil-icono">${renderIcono('menu')}</span><span>Más</span></button>` : ''}</div></nav>`,
  );
  document.querySelectorAll('a[href^="/admin/"], a[href^="/reservas/"]').forEach((enlace) => enlace.href = urlSegunModo(enlace.getAttribute('href')));
  const indicador = document.querySelector('.indicador-demo');
  indicador.outerHTML = `<a class="indicador-demo" href="${urlSegunModo(!esDemo && estadoAplicacion.pagina === 'cuenta' ? '/admin/agenda' : !esDemo && estadoAplicacion.pagina === 'negocio' ? '/admin/plataforma' : location.pathname, !esDemo)}" title="${esDemo ? 'Ver versión conectada' : 'Comparar con la demo'}">${esDemo ? 'Prototipo' : 'Ver demo'}</a>`;
  if (!esDemo) {
    const marca = document.querySelector('.marca');
    marca.href = urlSegunModo(`/admin/${inicio}`);
    marca.dataset.nav = inicio;
    const enlaceCuenta = document.querySelector('.seccion-inferior-lateral [data-nav="configuracion"]');
    enlaceCuenta.href = urlSegunModo('/admin/cuenta');
    enlaceCuenta.dataset.nav = 'cuenta';
    enlaceCuenta.querySelector('span').textContent = 'Mi cuenta';
    enlaceCuenta.querySelector('.icono').outerHTML = renderIcono('user');
    enlaceCuenta.classList.toggle('active', estadoAplicacion.pagina === 'cuenta');
    document.querySelector('.tarjeta-portal').remove();
    document.querySelector('.boton-notificaciones').remove();
    document.querySelector('.barra-superior-separador').remove();
    document.querySelector('.migas-navegacion strong').textContent = etiquetas[estadoAplicacion.pagina] || etiquetas[inicio];
    document.querySelector('.pie-lateral').remove();
    document.querySelector('.boton-perfil').outerHTML = renderMenuCuentaConectada();
  }
  montarSelectorTema();
  animarSiguienteRuta = false;
}
let pantallasAdicionales = null,
  portalDemo = null,
  acciones = null;
export function render() {
  if (!datosAplicacion) return;
  if (!esDemo && location.pathname.startsWith('/admin/') && !paginaPermitida(estadoAplicacion.pagina)) {
    estadoAplicacion.pagina = paginaInicial();
    history.replaceState({}, '', urlSegunModo(`/admin/${estadoAplicacion.pagina}`));
  }
  if (!esDemo && estadoAplicacion.pagina === 'negocio' && (!Number.isSafeInteger(estadoAplicacion.detalleNegocioId) || estadoAplicacion.detalleNegocioId < 1)) {
    estadoAplicacion.pagina = paginaInicial();
    history.replaceState({}, '', urlSegunModo(`/admin/${estadoAplicacion.pagina}`));
  }
  if (!esDemo && location.pathname.startsWith('/reservas/')) { renderEstructuraAplicacion(renderEstadoVacio('Portal de reservas', mensajePendiente)); return; }
  document.title = `${import.meta.env.VITE_APP_NAME || 'Citalendar'} · ${location.pathname.startsWith('/reservas/') ? 'Reserva tu cita' : etiquetas[estadoAplicacion.pagina] || 'Agenda'}`;
  const ruta = location.pathname;
  if (ruta.startsWith('/reservas/')) {
    if (portalDemo) portalDemo.renderPortalReservas(ruta.split('/')[2]);
    document.querySelectorAll('a[href^="/admin/"], a[href^="/reservas/"]').forEach((enlace) => enlace.href = urlSegunModo(enlace.getAttribute('href')));
    montarSelectorTema();
    return;
  }
  renderEstructuraAplicacion(
    !esDemo && !paginaPermitida(estadoAplicacion.pagina)
      ? renderEncabezadoPagina(etiquetas[estadoAplicacion.pagina] || 'Agenda', '') + renderEstadoVacio(mensajePendiente, 'Puedes comparar esta pantalla con la demo.', `<a class="btn btn-light" href="${urlSegunModo(location.pathname, true)}">Ver demo</a>`)
      : esDemo && estadoAplicacion.pagina === 'agenda'
      ? vistaAgenda()
      : pantallasAdicionales
        ? pantallasAdicionales.renderPantalla(estadoAplicacion.pagina)
        : renderEstadoVacio('Preparando esta vista', 'La agenda ya está disponible.'),
  );
}
function cerrarMenusProfesionales(excepto = null) {
  document.querySelectorAll('.profesional-mas[open]').forEach((menu) => {
    if (menu !== excepto) menu.open = false;
  });
}

document.addEventListener('toggle', (evento) => {
  const menu = evento.target;
  if (!menu.matches?.('.profesional-mas')) return;
  if (!menu.open) { menu.classList.remove('is-upward'); return; }
  cerrarMenusProfesionales(menu);
  const disparador = menu.querySelector('summary');
  const panel = menu.querySelector('.profesional-menu-mas');
  const barraMovil = document.querySelector('.navegacion-inferior');
  const limiteInferior = barraMovil && getComputedStyle(barraMovil).display !== 'none'
    ? barraMovil.getBoundingClientRect().top - 8
    : window.innerHeight - 8;
  menu.classList.toggle('is-upward', disparador.getBoundingClientRect().bottom + panel.offsetHeight + 6 > limiteInferior);
}, true);
document.addEventListener('click', (evento) => {
  if (!evento.target.closest('.profesional-mas') || evento.target.closest('[data-accion-profesional], [data-accion-recepcionista], [data-alternar-servicio], [data-inhabilitar-servicio], [data-alternar-sucursal], [data-inhabilitar-sucursal]')) cerrarMenusProfesionales();
}, true);
document.addEventListener('click', async (evento) => {
  const disparadorCuenta = evento.target.closest('.menu-cuenta-disparador');
  if (disparadorCuenta) {
    establecerMenuCuenta(disparadorCuenta.getAttribute('aria-expanded') !== 'true');
    return;
  }
  establecerMenuCuenta(false);
  const menuUsuarios = evento.target.closest('[data-users-menu]');
  if (menuUsuarios) {
    menuUsuariosAbierto = menuUsuarios.getAttribute('aria-expanded') !== 'true';
    menuUsuarios.setAttribute('aria-expanded', String(menuUsuariosAbierto));
    document.querySelector('#users-sidebar-submenu').hidden = !menuUsuariosAbierto;
    return;
  }
  const menuDisponibilidad = evento.target.closest('[data-menu-disponibilidad]');
  if (menuDisponibilidad) {
    menuDisponibilidadAbierto = menuDisponibilidad.getAttribute('aria-expanded') !== 'true';
    menuDisponibilidad.setAttribute('aria-expanded', String(menuDisponibilidadAbierto));
    document.querySelector('#submenu-disponibilidad').hidden = !menuDisponibilidadAbierto;
    return;
  }
  const enlaceGrupoDisponibilidad = evento.target.closest('[data-grupo-disponibilidad]');
  if (enlaceGrupoDisponibilidad) {
    evento.preventDefault();
    navegarGrupoDisponibilidad(enlaceGrupoDisponibilidad.dataset.grupoDisponibilidad);
    return;
  }
  const pestanaDisponibilidad = evento.target.closest('[data-disponibilidad-pestana]');
  if (pestanaDisponibilidad) { cambiarPestanaDisponibilidad(pestanaDisponibilidad.dataset.disponibilidadPestana); return; }
  const vistaProfesionales = evento.target.closest('[data-vista-profesionales]');
  if (vistaProfesionales) { cambiarVistaProfesionales(vistaProfesionales.dataset.vistaProfesionales); return; }
  if (evento.target.closest('[data-profesional-limpiar]')) { restablecerFiltrosProfesionales(); return; }
  const vistaRecepcionistas = evento.target.closest('[data-vista-recepcionistas]');
  if (vistaRecepcionistas) { cambiarVistaRecepcionistas(vistaRecepcionistas.dataset.vistaRecepcionistas); return; }
  if (evento.target.closest('[data-recepcionista-limpiar]')) { restablecerFiltrosRecepcionistas(); return; }
  const vistaServicios = evento.target.closest('[data-vista-servicios]');
  if (vistaServicios) { cambiarVistaServicios(vistaServicios.dataset.vistaServicios); return; }
  if (evento.target.closest('[data-servicio-limpiar]')) { restablecerFiltrosServicios(); return; }
  const vistaSucursales = evento.target.closest('[data-vista-sucursales]');
  if (vistaSucursales) { cambiarVistaSucursales(vistaSucursales.dataset.vistaSucursales); return; }
  if (evento.target.closest('[data-sucursal-limpiar]')) { restablecerFiltrosSucursales(); return; }
  const detalleNegocio = evento.target.closest('[data-detalle-negocio]');
  if (detalleNegocio && !esDemo) {
    navegar('negocio', Number(detalleNegocio.dataset.detalleNegocio));
    return;
  }
  const enlaceNavegacion = evento.target.closest('[data-nav]');
  if (enlaceNavegacion) {
    evento.preventDefault();
    if (enlaceNavegacion.dataset.navProfessional) estadoAplicacion.profesionalHorario = Number(enlaceNavegacion.dataset.navProfessional);
    navegar(enlaceNavegacion.dataset.nav);
    return;
  }
  const portal = evento.target.closest('[data-portal]');
  if (portal) {
    evento.preventDefault();
    history.pushState({}, '', urlSegunModo(portal.getAttribute('href').split('?')[0]));
    render();
    return;
  }
  const vista = evento.target.closest('[data-agenda-vista-demo]');
  const selectorVista = evento.target.closest('[data-agenda-vista], [data-agenda-vista-demo]');
  if (estadoAplicacion.pagina === 'agenda' && selectorVista) guardarVistaAgenda(selectorVista.dataset.agendaVista || selectorVista.dataset.agendaVistaDemo, esDemo ? 'demo' : 'connected');
  if (estadoAplicacion.pagina === 'agenda' && handleNavegacionAgenda(evento, estadoAplicacion, render)) return;
  if (vista) {
    estadoAplicacion.vistaCalendario = vista.dataset.agendaVistaDemo;
    render();
    return;
  }
  const dia = evento.target.closest('[data-agenda-dia-demo]');
  if (dia) {
    estadoAplicacion.fecha = dia.dataset.agendaDiaDemo;
    estadoAplicacion.vistaCalendario = 'day';
    render();
    return;
  }
  const elemento = evento.target.closest('[data-action]');
  if (elemento) {
    const accion = elemento.dataset.action;
    if (accion === 'theme') {
      alternarTema();
      return;
    }
    if (accion === 'menu') {
      establecerMenuMovil(!document.querySelector('.estructura-admin')?.classList.contains('menu-abierto'));
      return;
    }
    if (accion === 'agenda-hoy') {
      estadoAplicacion.fecha = HOY;
      render();
      return;
    }
    if (accion === 'periodo-anterior' || accion === 'periodo-siguiente') {
      const desplazamiento = accion === 'periodo-siguiente' ? 1 : -1;
      if (estadoAplicacion.vistaCalendario === 'month') {
        const fechaPeriodo = crearFecha(estadoAplicacion.fecha);
        fechaPeriodo.setDate(1);
        fechaPeriodo.setMonth(fechaPeriodo.getMonth() + desplazamiento);
        estadoAplicacion.fecha = `${fechaPeriodo.getFullYear()}-${String(fechaPeriodo.getMonth() + 1).padStart(2, '0')}-01`;
      } else
        estadoAplicacion.fecha = sumarDias(
          estadoAplicacion.fecha,
          desplazamiento * (estadoAplicacion.vistaCalendario === 'week' ? 7 : 1),
        );
      render();
      return;
    }
  }
  if (acciones) acciones.handleClicAplicacion(evento);
});
document.addEventListener('change', (evento) => {
  if (evento.target.closest('#formulario-asignaciones-sucursales')) { actualizarBorradorAsignaciones(evento.target.form); return; }
  if (evento.target.dataset.filtroProfesionales) { aplicarFiltrosProfesionales(); return; }
  if (evento.target.dataset.filtroRecepcionistas) { aplicarFiltrosRecepcionistas(); return; }
  if (evento.target.dataset.filtroServicios) { aplicarFiltrosServicios(); return; }
  if (evento.target.dataset.filtroSucursales) { aplicarFiltrosSucursales(); return; }
  if (evento.target.dataset.filtroAgenda) {
    estadoAplicacion[evento.target.dataset.filtroAgenda] = evento.target.value;
    if (evento.target.dataset.filtroAgenda === 'profesional') estadoAplicacion.historialAgenda = false;
    render();
  }
});
document.addEventListener('input', (evento) => {
  if (evento.target.id === 'busqueda-profesionales') { aplicarFiltrosProfesionales(); return; }
  if (evento.target.id === 'busqueda-recepcionistas') { aplicarFiltrosRecepcionistas(); return; }
  if (evento.target.id === 'busqueda-servicios') { aplicarFiltrosServicios(); return; }
  if (evento.target.id === 'busqueda-sucursales') { aplicarFiltrosSucursales(); return; }
  if (evento.target.id === 'agenda-busqueda') {
    const posicion = evento.target.selectionStart;
    estadoAplicacion.busqueda = evento.target.value;
    render();
    const entrada = document.querySelector('#agenda-busqueda');
    entrada.focus();
    try {
      entrada.setSelectionRange(posicion, posicion);
    } catch {
      /* search inputs may not support selection */
    }
  }
});
window.addEventListener('popstate', () => {
  estadoAplicacion.pagina = location.pathname.split('/')[2] || (esDemo ? 'agenda' : paginaInicial());
  restaurarGrupoDisponibilidad();
  estadoAplicacion.detalleNegocioId = estadoAplicacion.pagina === 'negocio' ? Number(location.pathname.split('/')[3]) : null;
  animarSiguienteRuta = true;
  render();
});
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && document.querySelector('.menu-cuenta-disparador[aria-expanded="true"]')) {
    establecerMenuCuenta(false, true);
    evento.preventDefault();
    return;
  }
  const pestanaDisponibilidad = evento.target.closest?.('[data-disponibilidad-pestana]');
  if (pestanaDisponibilidad && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) {
    const pestanas = [...pestanaDisponibilidad.closest('[role="tablist"]').querySelectorAll('[data-disponibilidad-pestana]')];
    const indice = pestanas.indexOf(pestanaDisponibilidad);
    const siguiente = evento.key === 'Home' ? 0 : evento.key === 'End' ? pestanas.length - 1 : (indice + (evento.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length;
    cambiarPestanaDisponibilidad(pestanas[siguiente].dataset.disponibilidadPestana, true);
    evento.preventDefault();
    return;
  }
  if (evento.key === 'Escape') {
    const menuAbierto = document.querySelector('.profesional-mas[open]');
    if (menuAbierto) {
      menuAbierto.open = false;
      menuAbierto.querySelector('summary')?.focus();
      evento.preventDefault();
      return;
    }
  }
  if (evento.key === 'Escape' && document.querySelector('.estructura-admin.menu-abierto') && !document.querySelector('#dialogo-app')?.open) {
    establecerMenuMovil(false);
  }
});
document.addEventListener('focusin', (evento) => {
  if (!evento.target.closest?.('.menu-cuenta')) establecerMenuCuenta(false);
});
function mostrarIngresoConectado(mensaje = '') {
  renderAutenticacion(mensaje, iniciarAplicacion);
}
window.addEventListener('cita-sesion-expirada', () => { document.querySelector('#dialogo-app')?.close(); mostrarIngresoConectado('Tu sesión expiró. Inicia sesión nuevamente.'); });
export async function iniciarAplicacion() {
  try {
    document.documentElement.dataset.appMode = esDemo ? 'demo' : 'connected';
    if (esDemo) await (await import('../demo/demo.datos.js')).cargarDatosDemo();
    else {
      if (!await restaurarSesion()) { mostrarIngresoConectado(); return; }
      estadoAplicacion.negocioId = await cargarDatosBackend();
    }
    estadoAplicacion.pagina = location.pathname.startsWith('/admin/')
      ? location.pathname.split('/')[2]
      : esDemo ? 'agenda' : paginaInicial();
    restaurarGrupoDisponibilidad();
    estadoAplicacion.detalleNegocioId = estadoAplicacion.pagina === 'negocio' ? Number(location.pathname.split('/')[3]) : null;
    [pantallasAdicionales, portalDemo, acciones] = await Promise.all([
      esDemo ? import('../demo/screens/pantallas.demo.js') : import('../connected/screens/pantallas.conectadas.js'),
      esDemo ? import('../demo/screens/reservas/reserva.vista.js') : Promise.resolve(null),
      import('./aplicacion.acciones.js'),
    ]);
    render();
    registrarHerramientaCalendario();
  } catch (error) {
    if (!esDemo && !usuarioActual) { mostrarIngresoConectado(error.message); return; }
    document.querySelector('#app').innerHTML =
      `<div class="arranque-error"><img src="/brand/citalendar-icon.svg" alt=""/><h1>No pudimos abrir tu agenda</h1><p>${escaparHtml(error.message)}</p><div class="arranque-acciones"><button class="btn btn-primary" onclick="location.reload()">Volver a intentar</button><a class="btn btn-light" href="${urlSegunModo(location.pathname, true)}">Ver demo</a></div></div>`;
  }
}
// Mejora progresiva: los navegadores sin WebMCP siguen usando la misma interfaz.
function registrarHerramientaCalendario() {
  const contexto = document.modelContext;
  if (!contexto?.registerTool) return;
  const cicloDeVida = new AbortController();
  window.addEventListener('pagehide', () => cicloDeVida.abort(), { once: true });
  try {
    Promise.resolve(
      contexto.registerTool(
        {
          name: 'show_calendar_view',
          title: 'Mostrar una vista de la agenda',
          description:
            'Cambia la vista y fecha de la agenda de demostración visible. No crea ni modifica citas.',
          inputSchema: {
            type: 'object',
            properties: {
              view: { type: 'string', enum: ['day', 'week', 'month'] },
              date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            },
            required: ['view', 'date'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(entrada) {
            if (
              !entrada ||
              typeof entrada !== 'object' ||
              !['day', 'week', 'month'].includes(entrada.view) ||
              typeof entrada.date !== 'string' ||
              !/^\d{4}-\d{2}-\d{2}$/.test(entrada.date) ||
              Number.isNaN(crearFecha(entrada.date).getTime()) ||
              fechaIso(crearFecha(entrada.date)) !== entrada.date
            )
              throw new Error('Vista o fecha inválida.');
            estadoAplicacion.vistaCalendario = entrada.view;
            guardarVistaAgenda(entrada.view, esDemo ? 'demo' : 'connected');
            estadoAplicacion.fecha = entrada.date;
            navegar('agenda');
            return {
              view: estadoAplicacion.vistaCalendario,
              date: estadoAplicacion.fecha,
              tenant: obtenerNegocio(estadoAplicacion.negocioId).name,
            };
          },
        },
        { signal: cicloDeVida.signal },
      ),
    ).catch(() => {
      /* API opcional no disponible en todos los navegadores. */
    });
  } catch {
    /* Registro opcional. */
  }
}
