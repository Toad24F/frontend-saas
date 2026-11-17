import { escape } from '../ui.js';

const TAMANO_PAGINA = 10;

export function paginarLocalmente(registros, pagina = 1) {
  const paginas = Math.max(1, Math.ceil(registros.length / TAMANO_PAGINA));
  const actual = Math.min(paginas, Math.max(1, Number.isSafeInteger(pagina) ? pagina : 1));
  return {
    filas: registros.slice((actual - 1) * TAMANO_PAGINA, actual * TAMANO_PAGINA),
    total: registros.length,
    pagina: actual,
    paginas,
  };
}

export function renderPaginacionLocal(resultado, etiqueta, tipo, atributo = 'data-pagina-catalogo') {
  if (!resultado.total) return '';
  const primeraFila = (resultado.pagina - 1) * TAMANO_PAGINA + 1;
  const ultimaFila = Math.min(resultado.pagina * TAMANO_PAGINA, resultado.total);
  return `<div class="paginacion-local"><p role="status">Mostrando ${primeraFila}–${ultimaFila} de ${resultado.total} ${escape(etiqueta)}</p>${resultado.total > TAMANO_PAGINA ? `<nav aria-label="Paginación de ${escape(etiqueta)}"><button type="button" class="btn btn-light" ${atributo}="${resultado.pagina - 1}" data-tipo-catalogo="${escape(tipo)}" ${resultado.pagina === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${resultado.pagina} de ${resultado.paginas}</span><button type="button" class="btn btn-light" ${atributo}="${resultado.pagina + 1}" data-tipo-catalogo="${escape(tipo)}" ${resultado.pagina === resultado.paginas ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
}
