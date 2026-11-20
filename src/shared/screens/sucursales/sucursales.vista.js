import { configurarPaginacionCatalogo, renderPaginacionCatalogo, actualizarPaginaCatalogo } from '../catalogos/catalogos.paginacion.js';
import { renderEncabezadoCatalogo, renderCupoCatalogo, renderBotonLimpiarCatalogo, hayFiltrosCatalogo } from '../catalogos/catalogos.encabezado.js';
import { esDemo, usuarioActual } from '../../../connected/backend.js';
import { estadoAplicacion, render } from '../../aplicacion.nucleo.js';
import { consultarVistaCatalogos, cambiarVistaCatalogos } from '../catalogos/catalogos.vista.js';
import { listarRegistros } from '../../aplicacion.datos.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { estadoRecurso } from '../../recursos.estado.js';
import { escaparHtml as escapar, renderEncabezadoPagina, renderBoton, renderEstadoVacio } from '../../interfaz.componentes.js';
import '../profesionales/profesionales.estilos.css';
import './sucursales.estilos.css';

const interfaz = { busqueda: '', estado: 'todos' };
let alcance = null;
const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function coincide(sucursal) {
  return (!interfaz.busqueda || normalizar(`${sucursal.name} ${sucursal.address || ''} ${sucursal.phone || ''} ${sucursal.notes || ''}`).includes(normalizar(interfaz.busqueda)))
    && (interfaz.estado === 'todos' || (interfaz.estado === 'activo') === (sucursal.active !== false));
}

function mapaGoogle(sucursal) {
  if (!sucursal.maps) return null;
  try {
    const url = new URL(sucursal.maps);
    const dominio = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(dominio)) return null;
    if (dominio === 'www.google.com' && url.pathname.startsWith('/maps/embed')) return { enlace: url.href, insercion: url.href, aproximado: false };
    const lugar = url.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
    const coordenadas = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    const consulta = url.searchParams.get('q') || url.searchParams.get('query') || (lugar ? decodeURIComponent(lugar.replace(/\+/g, ' ')) : '') || (coordenadas ? `${coordenadas[1]},${coordenadas[2]}` : '') || sucursal.address;
    return { enlace: url.href, insercion: consulta ? `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&output=embed` : null, aproximado: !lugar && !coordenadas && !url.searchParams.has('q') && !url.searchParams.has('query') };
  } catch { return null; }
}

function barraCupo(sucursales, propias, cupo) {
  if (!esDemo && !propias && !cupo) return '<p class="catalogo-cupo-error">Cupo de sucursales no disponible.</p>';
  if (cupo) return renderCupoCatalogo('Sucursales activas', { activos: Number(cupo.sucursalesActivas), limite: Number(cupo.limiteSucursalesActivas), disponibles: Number(cupo.disponibles) });
  const activas = sucursales.filter((sucursal) => sucursal.active !== false).length;
  const limite = cupo && Number.isFinite(Number(cupo.limiteSucursalesActivas)) ? Number(cupo.limiteSucursalesActivas) : sucursales.length;
  const usadas = cupo ? Number(cupo.sucursalesActivas) || 0 : activas;
  const titulo = cupo ? 'Cupo de sucursales activas' : propias ? 'Atención activa en tus sucursales' : 'Sucursales activas';
  return `<section class="sucursales-cupo" aria-label="${titulo}"><div class="sucursales-cupo-encabezado"><span>${titulo}</span><strong>${usadas} de ${limite}</strong></div><progress class="sucursales-cupo-progreso" value="${Math.max(0, usadas)}" max="${Math.max(1, limite, usadas)}" aria-label="${titulo}"></progress>${cupo ? `<small>${Number(cupo.disponibles) || 0} ${Number(cupo.disponibles) === 1 ? 'sucursal disponible' : 'sucursales disponibles'}</small>` : ''}</section>`;
}

function renderSucursal(sucursal, profesionales, propia, administrar, visible) {
  const activa = sucursal.active !== false;
  const personas = profesionales.filter((persona) => persona.branchIds.includes(sucursal.id));
  const mapa = mapaGoogle(sucursal);
  const estado = propia ? !sucursal.globalActive ? 'Sucursal inactiva' : activa ? 'Atención activa' : 'Atención pausada' : estadoRecurso(sucursal).etiqueta === 'Activo' ? 'Activa' : estadoRecurso(sucursal).etiqueta === 'Inactivo' ? 'Inactiva' : 'Inhabilitada';
  const etiquetaAlternar = propia ? activa ? 'Pausar atención' : 'Activar atención' : activa ? 'Desactivar' : 'Activar';
  const alternar = `<button type="button" class="${activa ? 'accion-precaucion' : ''}" data-alternar-sucursal="${sucursal.id}" aria-label="${etiquetaAlternar} ${escapar(sucursal.name)}" ${propia && !sucursal.globalActive ? 'disabled title="Sucursal inactiva en el negocio"' : ''}>${etiquetaAlternar}</button>`;
  const acciones = propia
    ? `<button type="button" class="profesional-disponibilidad" data-alternar-sucursal="${sucursal.id}" aria-label="${etiquetaAlternar} ${escapar(sucursal.name)}" ${!sucursal.globalActive ? 'disabled title="Sucursal inactiva en el negocio"' : ''}>${etiquetaAlternar} ${renderIcono('arrow')}</button>`
    : `<button type="button" class="profesional-disponibilidad" data-editar-sucursal="${sucursal.id}">Editar ${renderIcono('arrow')}</button><details class="profesional-mas"><summary aria-label="Más acciones para ${escapar(sucursal.name)}">${renderIcono('more')}</summary><div class="profesional-menu-mas">${alternar}${administrar(sucursal)}</div></details>`;
  return `<article class="superficie profesional-entrada sucursal-entrada" data-sucursal-entrada="${sucursal.id}" ${visible ? '' : 'hidden'}>
    <div class="sucursal-mapa">${mapa?.insercion ? `<iframe title="Mapa de ${escapar(sucursal.name)}" src="${escapar(mapa.insercion)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>${mapa.aproximado ? '<span class="sucursal-mapa-leyenda">Vista por dirección</span>' : ''}` : `<div class="sucursal-mapa-vacio">${renderIcono('pin')}<span>${sucursal.maps ? 'Enlace de mapa no compatible' : 'Mapa no agregado'}</span></div>`}</div>
    <div class="profesional-persona"><span class="sucursal-icono">${renderIcono('pin')}</span><div class="profesional-identidad"><h2>${escapar(sucursal.name)}</h2><p>${escapar(sucursal.address || 'Dirección no disponible')}</p>${sucursal.phone ? `<small>${escapar(sucursal.phone)}</small>` : ''}</div></div>
    <div class="profesional-asignacion sucursal-detalles"><span>${renderIcono('users')}<strong>${personas.length}</strong> ${personas.length === 1 ? 'profesional' : 'profesionales'}</span>${mapa ? `<a href="${escapar(mapa.enlace)}" target="_blank" rel="noopener noreferrer">${renderIcono('pin')}Abrir en Google Maps</a>` : ''}${sucursal.notes ? `<span class="sucursal-llegada">${renderIcono('info')}${escapar(sucursal.notes)}</span>` : ''}</div>
    <span class="profesional-estado ${activa && (!propia || sucursal.globalActive) ? 'is-active' : 'is-inactive'}"><i></i>${estado}</span>
    <div class="profesional-acciones">${acciones}</div>
  </article>`;
}

export function sucursales({ cupo = null, administrar = () => '', accionesEncabezado = '' } = {}) {
  const propia = !esDemo && usuarioActual?.rol === 'profesional';
  const alcanceActual = `${estadoAplicacion.negocioId}:${propia ? usuarioActual.id : 'admin'}`;
  if (alcance !== alcanceActual) { Object.assign(interfaz, { busqueda: '', estado: 'todos' }); alcance = alcanceActual; }
  const profesional = propia ? listarRegistros('professionals', estadoAplicacion.negocioId)[0] : null;
  const sucursales = listarRegistros('branches', estadoAplicacion.negocioId).filter((sucursal) => !propia || profesional?.branchIds.includes(sucursal.id));
  const profesionales = listarRegistros('professionals', estadoAplicacion.negocioId);
  const activas = sucursales.filter((sucursal) => sucursal.active !== false).length;
  const visibles = sucursales.filter(coincide);
  const pagina = configurarPaginacionCatalogo('sucursal', estadoAplicacion.negocioId, sucursales, () => listarRegistros('branches', estadoAplicacion.negocioId).filter((sucursal) => (!propia || profesional?.branchIds.includes(sucursal.id)) && coincide(sucursal)), (sucursal) => renderSucursal(sucursal, profesionales, propia, administrar, true), 'sucursales');
  const vistaEscritorio = consultarVistaCatalogos();
  const vistaResultados = matchMedia('(max-width: 767px)').matches ? 'tarjetas' : vistaEscritorio;
  return `<div class="profesionales-espacio sucursales-espacio">${renderEncabezadoCatalogo('Sucursales', propia ? 'Consulta y activa la disponibilidad de tus sucursales asignadas.' : 'Gestiona las ubicaciones de tu negocio.', accionesEncabezado + (propia ? '' : renderBoton('Nueva sucursal', 'nueva-sucursal')), barraCupo(sucursales, propia, cupo))}
    <div class="profesionales-resumen"><strong>${sucursales.length}</strong> ${sucursales.length === 1 ? 'sucursal' : 'sucursales'}<span aria-hidden="true">·</span><strong>${activas}</strong> activas<span aria-hidden="true">·</span><strong>${sucursales.length - activas}</strong> inactivas</div>
    <section class="profesionales-herramientas sucursales-herramientas" aria-label="Buscar y filtrar sucursales">
      <label class="profesionales-busqueda">${renderIcono('search')}<span class="visually-hidden">Buscar sucursales</span><input id="busqueda-sucursales" type="search" placeholder="Buscar por nombre, dirección o teléfono" value="${escapar(interfaz.busqueda)}" autocomplete="off"></label>
      <div class="profesionales-filtros"><label><span>Estado</span><select data-filtro-sucursales="estado"><option value="todos">Todas</option><option value="activo" ${interfaz.estado === 'activo' ? 'selected' : ''}>Activas</option><option value="inactivo" ${interfaz.estado === 'inactivo' ? 'selected' : ''}>Inactivas</option></select></label>${renderBotonLimpiarCatalogo('sucursal', interfaz)}</div>
      <div class="profesionales-selector-vista" role="group" aria-label="Tipo de vista"><button type="button" data-vista-sucursales="lista" aria-pressed="${vistaEscritorio === 'lista'}" class="${vistaEscritorio === 'lista' ? 'is-selected' : ''}">${renderIcono('menu')}<span>Lista</span></button><button type="button" data-vista-sucursales="tarjetas" aria-pressed="${vistaEscritorio === 'tarjetas'}" class="${vistaEscritorio === 'tarjetas' ? 'is-selected' : ''}">${renderIcono('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="profesionales-encabezado-resultados"><span id="conteo-resultados-sucursales" role="estado" aria-live="polite">${visibles.length} ${visibles.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${sucursales.length ? `<div class="profesionales-resultados profesionales-vista--${vistaResultados}" data-vista-escritorio="${vistaEscritorio}" id="sucursal-resultados">${pagina.filas.map((sucursal) => renderSucursal(sucursal, profesionales, propia, administrar, true)).join('')}</div>${renderPaginacionCatalogo('sucursal', pagina)}<div class="profesionales-sin-resultados" id="sin-resultados-sucursales" ${visibles.length ? 'hidden' : ''}>${renderEstadoVacio('Sin coincidencias', 'Prueba otra búsqueda o cambia el filtro de estado.', '<button type="button" class="btn btn-light" data-sucursal-limpiar>Limpiar filtros</button>')}</div>` : renderEstadoVacio('Aún no hay sucursales', propia ? 'Tu negocio todavía no te asigna una sucursal.' : 'Crea una sucursal para empezar a organizar la atención.', propia ? '' : '<button type="button" class="btn btn-primary" data-action="nueva-sucursal">Nueva sucursal</button>')}
  </div>`;
}

export function cambiarVistaSucursales(vista) {
  if (cambiarVistaCatalogos(vista)) render();
}

export function restablecerFiltrosSucursales() {
  Object.assign(interfaz, { busqueda: '', estado: 'todos' });
  const raiz = document.querySelector('.sucursales-espacio');
  if (!raiz) return;
  raiz.querySelector('#busqueda-sucursales').value = '';
  raiz.querySelector('[data-filtro-sucursales]').value = 'todos';
  aplicarFiltrosSucursales();
  raiz.querySelector('#busqueda-sucursales').focus();
}

export function aplicarFiltrosSucursales() {
  const raiz = document.querySelector('.sucursales-espacio');
  if (!raiz) return;
  interfaz.busqueda = raiz.querySelector('#busqueda-sucursales')?.value.trim() || '';
  interfaz.estado = raiz.querySelector('[data-filtro-sucursales]')?.value || 'todos';
  const propia = !esDemo && usuarioActual?.rol === 'profesional';
  const profesional = propia ? listarRegistros('professionals', estadoAplicacion.negocioId)[0] : null;
  raiz.querySelectorAll('[data-sucursal-limpiar]').forEach((boton) => { boton.disabled = !hayFiltrosCatalogo(interfaz); });
  const visibles = new Set(listarRegistros('branches', estadoAplicacion.negocioId).filter((sucursal) => (!propia || profesional?.branchIds.includes(sucursal.id)) && coincide(sucursal)).map((sucursal) => String(sucursal.id)));
  actualizarPaginaCatalogo('sucursal', true);
  const conteo = visibles.size;
  raiz.querySelector('#conteo-resultados-sucursales').textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`;
  const sinResultados = raiz.querySelector('#sin-resultados-sucursales');
  if (sinResultados) sinResultados.hidden = conteo > 0;
}
