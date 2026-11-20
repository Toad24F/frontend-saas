import { configurarPaginacionCatalogo, renderPaginacionCatalogo, actualizarPaginaCatalogo } from '../catalogos/catalogos.paginacion.js';
import { renderEncabezadoCatalogo, renderBotonLimpiarCatalogo, hayFiltrosCatalogo } from '../catalogos/catalogos.encabezado.js';
import { esDemo, usuarioActual } from '../../../connected/backend.js';
import { estadoAplicacion, render } from '../../aplicacion.nucleo.js';
import { consultarVistaCatalogos, cambiarVistaCatalogos } from '../catalogos/catalogos.vista.js';
import { listarRegistros, formatearMoneda } from '../../aplicacion.datos.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { estadoRecurso } from '../../recursos.estado.js';
import { escaparHtml as escapar, renderEncabezadoPagina, renderBoton, renderEstadoVacio } from '../../interfaz.componentes.js';
import '../profesionales/profesionales.estilos.css';
import './servicios.estilos.css';

const interfaz = { busqueda: '', estado: 'todos' };
let negocioId = null;
const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function coincide(servicio) {
  return (!interfaz.busqueda || normalizar(`${servicio.name} ${servicio.description || ''}`).includes(normalizar(interfaz.busqueda)))
    && (interfaz.estado === 'todos' || (interfaz.estado === 'activo') === (servicio.active !== false));
}

function renderServicio(servicio, profesionales, propio, profesional, administrar, visible) {
  const activo = servicio.active !== false;
  const asignado = Boolean(profesional?.serviceIds.includes(servicio.id));
  const personas = profesionales.filter((persona) => persona.serviceIds.includes(servicio.id));
  const puedeEditar = !propio || servicio.creatorId === usuarioActual.id;
  const etiquetaAlternar = propio ? asignado ? 'Quitar selección' : 'Seleccionar' : activo ? 'Desactivar' : 'Activar';
  const alternar = `<button type="button" class="${!propio && activo ? 'action-caution' : ''}" data-alternar-servicio="${servicio.id}" aria-label="${etiquetaAlternar} ${escapar(servicio.name)}">${etiquetaAlternar}</button>`;
  const editar = puedeEditar ? `<button type="button" class="${propio ? 'profesional-editar' : 'profesional-disponibilidad'}" data-editar-servicio="${servicio.id}">Editar${propio ? '' : ` ${renderIcono('arrow')}`}</button>` : '';
  const adicional = administrar(servicio);
  const acciones = propio
    ? `<button type="button" class="profesional-disponibilidad" data-alternar-servicio="${servicio.id}" aria-label="${etiquetaAlternar} ${escapar(servicio.name)}" ${!activo && !asignado ? 'disabled title="Servicio inactivo en el negocio"' : ''}>${etiquetaAlternar} ${renderIcono('arrow')}</button>${editar}`
    : `${editar}<details class="profesional-mas"><summary aria-label="Más acciones para ${escapar(servicio.name)}">${renderIcono('more')}</summary><div class="profesional-menu-mas">${alternar}${adicional}</div></details>`;
  return `<article class="surface profesional-entrada servicio-entrada" data-servicio-entrada="${servicio.id}" ${visible ? '' : 'hidden'}>
    <div class="profesional-persona"><span class="servicio-icono ${servicio.color}">${renderIcono(servicio.icon)}</span><div class="profesional-identidad"><h2>${escapar(servicio.name)}</h2><p>${escapar(servicio.description || 'Sin descripción')}</p></div></div>
    <div class="profesional-asignacion servicio-detalles"><span>${renderIcono('clock')}<strong>${servicio.duration}</strong> min</span><span>${renderIcono('briefcase')}<strong>${formatearMoneda(servicio.price)}</strong> MXN</span><span>${renderIcono('users')}<strong>${personas.length}</strong> ${personas.length === 1 ? 'profesional' : 'profesionales'}</span></div>
    <span class="profesional-estado ${propio && activo && !asignado ? 'sin-seleccionar' : estadoRecurso(servicio).clase}"><i></i>${propio && activo ? asignado ? 'Seleccionado' : 'Sin seleccionar' : estadoRecurso(servicio).etiqueta}</span>
    <div class="profesional-acciones">${acciones}</div>
  </article>`;
}

export function servicios(administrar = () => '', { accionesEncabezado = '' } = {}) {
  if (negocioId !== estadoAplicacion.negocioId) { Object.assign(interfaz, { busqueda: '', estado: 'todos' }); negocioId = estadoAplicacion.negocioId; }
  const propio = !esDemo && usuarioActual?.rol === 'profesional';
  const profesional = propio ? listarRegistros('professionals', estadoAplicacion.negocioId)[0] : null;
  const servicios = listarRegistros('services', estadoAplicacion.negocioId);
  const profesionales = listarRegistros('professionals', estadoAplicacion.negocioId);
  const visibles = servicios.filter(coincide);
  const pagina = configurarPaginacionCatalogo('servicio', estadoAplicacion.negocioId, servicios, () => listarRegistros('services', estadoAplicacion.negocioId).filter(coincide), (servicio) => renderServicio(servicio, profesionales, propio, profesional, administrar, true), 'servicios');
  const activos = servicios.filter((servicio) => servicio.active !== false).length;
  const vistaEscritorio = consultarVistaCatalogos();
  const vistaResultados = matchMedia('(max-width: 767px)').matches ? 'tarjetas' : vistaEscritorio;
  return `<div class="profesionales-espacio servicios-espacio">${renderEncabezadoCatalogo('Servicios', propio ? 'Los servicios que ofreces a tus clientes.' : 'Gestiona lo que ofrece tu negocio.', accionesEncabezado + renderBoton('Nuevo servicio', 'nuevo-servicio'))}
    <div class="profesionales-resumen"><strong>${servicios.length}</strong> ${servicios.length === 1 ? 'servicio' : 'servicios'}<span aria-hidden="true">·</span><strong>${activos}</strong> activos<span aria-hidden="true">·</span><strong>${servicios.length - activos}</strong> inactivos</div>
    <section class="profesionales-herramientas servicios-herramientas" aria-label="Buscar y filtrar servicios">
      <label class="profesionales-busqueda">${renderIcono('search')}<span class="visually-hidden">Buscar servicios</span><input id="busqueda-servicios" type="search" placeholder="Buscar por nombre o descripción" value="${escapar(interfaz.busqueda)}" autocomplete="off"></label>
      <div class="profesionales-filtros"><label><span>Estado</span><select data-filtro-servicios="estado"><option value="todos">Todos</option><option value="activo" ${interfaz.estado === 'activo' ? 'selected' : ''}>Activos</option><option value="inactivo" ${interfaz.estado === 'inactivo' ? 'selected' : ''}>Inactivos</option></select></label>${renderBotonLimpiarCatalogo('servicio', interfaz)}</div>
      <div class="profesionales-selector-vista" role="group" aria-label="Tipo de vista"><button type="button" data-vista-servicios="lista" aria-pressed="${vistaEscritorio === 'lista'}" class="${vistaEscritorio === 'lista' ? 'is-selected' : ''}">${renderIcono('menu')}<span>Lista</span></button><button type="button" data-vista-servicios="tarjetas" aria-pressed="${vistaEscritorio === 'tarjetas'}" class="${vistaEscritorio === 'tarjetas' ? 'is-selected' : ''}">${renderIcono('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="profesionales-encabezado-resultados"><span id="conteo-resultados-servicios" role="estado" aria-live="polite">${visibles.length} ${visibles.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${servicios.length ? `<div class="profesionales-resultados profesionales-vista--${vistaResultados}" data-vista-escritorio="${vistaEscritorio}" id="servicio-resultados">${pagina.filas.map((servicio) => renderServicio(servicio, profesionales, propio, profesional, administrar, true)).join('')}</div>${renderPaginacionCatalogo('servicio', pagina)}<div class="profesionales-sin-resultados" id="sin-resultados-servicios" ${visibles.length ? 'hidden' : ''}>${renderEstadoVacio('Sin coincidencias', 'Prueba otra búsqueda o cambia el filtro de estado.', '<button type="button" class="btn btn-light" data-servicio-limpiar>Limpiar filtros</button>')}</div>` : renderEstadoVacio('Aún no hay servicios', 'Crea el primer servicio para organizar tu oferta.', '<button type="button" class="btn btn-primary" data-action="nuevo-servicio">Nuevo servicio</button>')}
    <div class="information-note">${renderIcono('info')} La duración de cada servicio determina los horarios disponibles en tu portal. El precio es informativo; no se realizan cobros en línea.</div>
  </div>`;
}

export function cambiarVistaServicios(vista) {
  if (cambiarVistaCatalogos(vista)) render();
}

export function restablecerFiltrosServicios() {
  Object.assign(interfaz, { busqueda: '', estado: 'todos' });
  const raiz = document.querySelector('.servicios-espacio');
  if (!raiz) return;
  raiz.querySelector('#busqueda-servicios').value = '';
  raiz.querySelector('[data-filtro-servicios]').value = 'todos';
  aplicarFiltrosServicios();
  raiz.querySelector('#busqueda-servicios').focus();
}

export function aplicarFiltrosServicios() {
  const raiz = document.querySelector('.servicios-espacio');
  if (!raiz) return;
  interfaz.busqueda = raiz.querySelector('#busqueda-servicios')?.value.trim() || '';
  interfaz.estado = raiz.querySelector('[data-filtro-servicios]')?.value || 'todos';
  raiz.querySelectorAll('[data-servicio-limpiar]').forEach((boton) => { boton.disabled = !hayFiltrosCatalogo(interfaz); });
  const visibles = new Set(listarRegistros('services', estadoAplicacion.negocioId).filter(coincide).map((servicio) => String(servicio.id)));
  actualizarPaginaCatalogo('servicio', true);
  const conteo = visibles.size;
  raiz.querySelector('#conteo-resultados-servicios').textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`;
  const sinResultados = raiz.querySelector('#sin-resultados-servicios');
  if (sinResultados) sinResultados.hidden = conteo > 0;
}
