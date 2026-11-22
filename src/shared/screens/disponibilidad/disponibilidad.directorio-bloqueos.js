import { escaparHtml, renderEstadoVacio } from '../../interfaz.componentes.js';
import { paginarLocalmente, renderPaginacionLocal } from '../paginacion.local.js';
import { filtrarBloqueos, errorRangoBloqueos, TIPOS_BLOQUEO, hayFiltrosBloqueos } from './disponibilidad.filtros-bloqueos.js';
const filtrosIniciales = () => ({ busqueda: '', tipo: 'todos', sucursal: 'todos', desde: '', hasta: '', vigencia: 'vigentes_proximos' });
let filtros = filtrosIniciales();
let contexto = null;
let pagina = 1;
let consultaConectada = null;
let solicitudActual = 0;

/** La carga conectada entrega una página real; la demo mantiene su directorio local. */
export function configurarConsultaBloqueos(consultar, primeraPagina, esAdmin, alAceptar = () => {}) {
  consultaConectada = { consultar, respuesta: primeraPagina, esAdmin, alAceptar, error: '', requiereAlcance: true };
  filtros = filtrosIniciales();
  pagina = 1;
  solicitudActual++;
}

function renderResultados() {
  if (contexto.conectado) {
    const error = errorRangoBloqueos(filtros);
    if (error) return `<p role="alert">${error}</p>`;
    if (consultaConectada.error) return `<p role="alert">${consultaConectada.error}</p><button type="button" class="btn btn-light" data-reintentar-bloqueos>Reintentar</button>`;
    const respuesta = consultaConectada.respuesta;
    if (!respuesta?.total) return renderEstadoVacio('Sin bloqueos en esta vista', 'Prueba otros filtros o actualiza la consulta.');
    const paginas = Math.ceil(respuesta.total / respuesta.limite);
    return `<div class="blocks-list">${respuesta.bloqueos.map(contexto.row).join('')}</div><div class="correo-pie"><p role="status">Mostrando ${(respuesta.pagina - 1) * respuesta.limite + 1}–${Math.min(respuesta.pagina * respuesta.limite, respuesta.total)} de ${respuesta.total} bloqueos</p>${paginas > 1 ? `<nav aria-label="Paginación de bloqueos"><button type="button" class="btn btn-light" data-pagina-bloqueos="${respuesta.pagina - 1}" ${respuesta.pagina === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${respuesta.pagina} de ${paginas}</span><button type="button" class="btn btn-light" data-pagina-bloqueos="${respuesta.pagina + 1}" ${respuesta.pagina === paginas ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
  }
  const resultado = paginarLocalmente(filtrarBloqueos(contexto.blocks, filtros, contexto.scope), pagina);
  pagina = resultado.pagina;
  const error = errorRangoBloqueos(filtros);
  const cantidadEnAlcance = filtrarBloqueos(contexto.blocks, filtrosIniciales(), contexto.scope).length;
  return error ? `<p role="alert">${error}</p>` : resultado.total ? `<div class="blocks-list">${resultado.filas.map(contexto.row).join('')}</div>${renderPaginacionLocal(resultado, 'bloqueos', 'bloqueos', 'data-pagina-bloqueos')}`
    : renderEstadoVacio(cantidadEnAlcance ? 'Sin coincidencias' : 'Sin bloqueos en esta vista', cantidadEnAlcance ? 'Prueba otra búsqueda o cambia los filtros.' : 'No hay bloqueos para la selección actual.', hayFiltrosBloqueos(filtros) ? '<button type="button" class="btn btn-light" data-limpiar-bloqueos>Limpiar filtros</button>' : '');
}

export function renderDirectorioBloqueos(negocioId, alcance, bloqueos, sucursales, renderFila, conectado = false) {
  const cambioAlcance = contexto?.tenantId === negocioId && contexto.scope !== alcance;
  if (contexto?.tenantId !== negocioId) { filtros = filtrosIniciales(); pagina = 1; }
  else if (contexto.scope !== alcance) pagina = 1;
  contexto = { tenantId: negocioId, scope: alcance, blocks: bloqueos, row: renderFila, conectado: conectado && Boolean(consultaConectada) };
  if ((cambioAlcance || consultaConectada?.requiereAlcance && alcance) && contexto.conectado && typeof document !== 'undefined') {
    // El selector externo cambia el alcance; consulta después de montar la vista nueva.
    queueMicrotask(() => { const raiz = document.querySelector('.bloqueos-directorio'); if (raiz) void consultarDirectorio(raiz); });
  }
  if (contexto.conectado) consultaConectada.requiereAlcance = false;
  return `<div class="bloqueos-directorio"><div class="bloqueos-filtros"><label>Buscar bloqueo<input class="form-control" type="search" data-filtro-bloqueos="busqueda" placeholder="Motivo del bloqueo" value="${escaparHtml(filtros.busqueda)}"></label><label>Tipo<select class="form-select" data-filtro-bloqueos="tipo"><option value="todos">Todos</option>${Object.entries(TIPOS_BLOQUEO).map(([valor, etiqueta]) => `<option value="${valor}" ${valor === filtros.tipo ? 'selected' : ''}>${etiqueta}</option>`).join('')}</select></label><label>Sucursal<select class="form-select" data-filtro-bloqueos="sucursal"><option value="todos">Todas</option>${sucursales.map((sucursal) => `<option value="${sucursal.id}" ${String(sucursal.id) === filtros.sucursal ? 'selected' : ''}>${escaparHtml(sucursal.name)}</option>`).join('')}</select></label>${contexto.conectado && consultaConectada.esAdmin ? `<label>Vigencia<select class="form-select" data-filtro-bloqueos="vigencia"><option value="vigentes_proximos" ${filtros.vigencia === 'vigentes_proximos' ? 'selected' : ''}>Vigentes y próximos</option><option value="anteriores" ${filtros.vigencia === 'anteriores' ? 'selected' : ''}>Anteriores</option><option value="todos" ${filtros.vigencia === 'todos' ? 'selected' : ''}>Todos</option></select></label>` : ''}<label>Desde<input type="date" class="form-control" data-filtro-bloqueos="desde" value="${filtros.desde}"></label><label>Hasta<input type="date" class="form-control" data-filtro-bloqueos="hasta" value="${filtros.hasta}"></label><button type="button" class="btn btn-light" data-limpiar-bloqueos ${hayFiltrosBloqueos(filtros) || filtros.vigencia !== 'vigentes_proximos' ? '' : 'disabled'}>Limpiar filtros</button></div><p class="disponibilidad-nota">La selección incluye los bloqueos de todo el equipo y de todas las sucursales que le correspondan. El rango incluye cualquier bloqueo que coincida con esas fechas.</p><div data-resultados-bloqueos>${renderResultados()}</div></div>`;
}
async function consultarDirectorio(raiz, enfocar = false) {
  if (!contexto?.conectado) return actualizarDirectorio(raiz, enfocar);
  const destino = raiz.querySelector('[data-resultados-bloqueos]');
  const solicitud = ++solicitudActual;
  if (errorRangoBloqueos(filtros)) return actualizarDirectorio(raiz, enfocar);
  consultaConectada.error = '';
  destino.innerHTML = '<p role="status">Consultando bloqueos…</p>';
  try {
    const respuesta = await consultaConectada.consultar({ ...filtros, pagina, personalId: contexto.scope || '' });
    if (solicitud !== solicitudActual || !destino.isConnected) return;
    consultaConectada.alAceptar(respuesta);
    consultaConectada.respuesta = respuesta;
    actualizarDirectorio(raiz, enfocar);
  } catch (error) {
    if (solicitud !== solicitudActual || !destino.isConnected) return;
    consultaConectada.error = error.status === 403 || error.status === 404 ? 'Bloqueos no disponibles.' : 'No pudimos cargar los bloqueos.';
    actualizarDirectorio(raiz, enfocar);
  }
}
function actualizarDirectorio(raiz, enfocar = false) {
  const destino = raiz.querySelector('[data-resultados-bloqueos]');
  destino.innerHTML = renderResultados();
  raiz.querySelectorAll('[data-limpiar-bloqueos]').forEach((boton) => { boton.disabled = !hayFiltrosBloqueos(filtros) && filtros.vigencia === 'vigentes_proximos'; });
  const invalido = Boolean(errorRangoBloqueos(filtros));
  raiz.querySelectorAll('[data-filtro-bloqueos="desde"], [data-filtro-bloqueos="hasta"]').forEach((entrada) => { entrada.setAttribute('aria-invalid', String(invalido)); });
  if (enfocar) { destino.tabIndex = -1; destino.focus({ preventScroll: true }); destino.scrollIntoView({ block: 'start' }); }
}
if (typeof document !== 'undefined') {
  const aplicarFiltro = (evento) => {
    const entrada = evento.target.closest('[data-filtro-bloqueos]');
    if (!entrada || !contexto) return;
    filtros[entrada.dataset.filtroBloqueos] = entrada.value;
    pagina = 1;
    void consultarDirectorio(entrada.closest('.bloqueos-directorio'));
  };
  document.addEventListener('input', aplicarFiltro);
  document.addEventListener('change', aplicarFiltro);
  document.addEventListener('click', (evento) => {
    const raiz = evento.target.closest('.bloqueos-directorio');
    if (!raiz) return;
    const limpiar = evento.target.closest('[data-limpiar-bloqueos]');
    if (limpiar && !limpiar.disabled) {
      filtros = filtrosIniciales(); pagina = 1;
      raiz.querySelectorAll('[data-filtro-bloqueos]').forEach((entrada) => { entrada.value = filtros[entrada.dataset.filtroBloqueos]; });
      void consultarDirectorio(raiz); raiz.querySelector('[data-filtro-bloqueos="busqueda"]').focus();
    }
    const control = evento.target.closest('[data-pagina-bloqueos]');
    if (control && !control.disabled) { pagina = Number(control.dataset.paginaBloqueos); void consultarDirectorio(raiz, true); }
    if (evento.target.closest('[data-reintentar-bloqueos]')) void consultarDirectorio(raiz, true);
  });
}
