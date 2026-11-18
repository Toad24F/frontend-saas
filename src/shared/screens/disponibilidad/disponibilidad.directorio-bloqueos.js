import { escape, empty } from '../../ui.js';
import { paginarLocalmente, renderPaginacionLocal } from '../paginacion.local.js';
import { filtrarBloqueos, errorRangoBloqueos, TIPOS_BLOQUEO, hayFiltrosBloqueos } from './disponibilidad.filtros-bloqueos.js';
const filtrosIniciales = () => ({ busqueda: '', tipo: 'todos', sucursal: 'todos', desde: '', hasta: '' });
let filtros = filtrosIniciales();
let contexto = null;
let pagina = 1;

function renderResultados() {
  const resultado = paginarLocalmente(filtrarBloqueos(contexto.blocks, filtros, contexto.scope), pagina);
  pagina = resultado.pagina;
  const error = errorRangoBloqueos(filtros);
  const cantidadEnAlcance = filtrarBloqueos(contexto.blocks, filtrosIniciales(), contexto.scope).length;
  return error ? `<p role="alert">${error}</p>` : resultado.total ? `<div class="blocks-list">${resultado.filas.map(contexto.row).join('')}</div>${renderPaginacionLocal(resultado, 'bloqueos', 'bloqueos', 'data-pagina-bloqueos')}`
    : empty(cantidadEnAlcance ? 'Sin coincidencias' : 'Sin bloqueos en esta vista', cantidadEnAlcance ? 'Prueba otra búsqueda o cambia los filtros.' : 'No hay bloqueos para la selección actual.', hayFiltrosBloqueos(filtros) ? '<button type="button" class="btn btn-light" data-limpiar-bloqueos>Limpiar filtros</button>' : '');
}

export function renderDirectorioBloqueos(negocioId, alcance, bloqueos, sucursales, renderFila) {
  if (contexto?.tenantId !== negocioId) { filtros = filtrosIniciales(); pagina = 1; }
  else if (contexto.scope !== alcance) pagina = 1;
  contexto = { tenantId: negocioId, scope: alcance, blocks: bloqueos, row: renderFila };
  return `<div class="bloqueos-directorio"><div class="bloqueos-filtros"><label>Buscar bloqueo<input class="form-control" type="search" data-filtro-bloqueos="busqueda" placeholder="Motivo del bloqueo" value="${escape(filtros.busqueda)}"></label><label>Tipo<select class="form-select" data-filtro-bloqueos="tipo"><option value="todos">Todos</option>${Object.entries(TIPOS_BLOQUEO).map(([valor, etiqueta]) => `<option value="${valor}" ${valor === filtros.tipo ? 'selected' : ''}>${etiqueta}</option>`).join('')}</select></label><label>Sucursal<select class="form-select" data-filtro-bloqueos="sucursal"><option value="todos">Todas</option>${sucursales.map((sucursal) => `<option value="${sucursal.id}" ${String(sucursal.id) === filtros.sucursal ? 'selected' : ''}>${escape(sucursal.name)}</option>`).join('')}</select></label><label>Desde<input type="date" class="form-control" data-filtro-bloqueos="desde" value="${filtros.desde}"></label><label>Hasta<input type="date" class="form-control" data-filtro-bloqueos="hasta" value="${filtros.hasta}"></label><button type="button" class="btn btn-light" data-limpiar-bloqueos ${hayFiltrosBloqueos(filtros) ? '' : 'disabled'}>Limpiar filtros</button></div><p class="disponibilidad-nota">La selección incluye los bloqueos de todo el equipo y de todas las sucursales que le correspondan. El rango incluye cualquier bloqueo que coincida con esas fechas.</p><div data-resultados-bloqueos>${renderResultados()}</div></div>`;
}
function actualizarDirectorio(raiz, enfocar = false) {
  const destino = raiz.querySelector('[data-resultados-bloqueos]');
  destino.innerHTML = renderResultados();
  raiz.querySelectorAll('[data-limpiar-bloqueos]').forEach((boton) => { boton.disabled = !hayFiltrosBloqueos(filtros); });
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
    actualizarDirectorio(entrada.closest('.bloqueos-directorio'));
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
      actualizarDirectorio(raiz); raiz.querySelector('[data-filtro-bloqueos="busqueda"]').focus();
    }
    const control = evento.target.closest('[data-pagina-bloqueos]');
    if (control && !control.disabled) { pagina = Number(control.dataset.paginaBloqueos); actualizarDirectorio(raiz, true); }
  });
}
