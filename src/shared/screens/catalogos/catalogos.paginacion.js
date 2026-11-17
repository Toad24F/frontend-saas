import { paginarLocalmente, renderPaginacionLocal } from '../paginacion.local.js';
import { toast } from '../../ui.js';

const catalogos = new Map();

export function configurarPaginacionCatalogo(tipo, alcance, registros, filtrarFilas, renderFila, etiqueta) {
  const anterior = catalogos.get(tipo);
  const mismoAlcance = anterior?.alcance === alcance;
  const filtrados = filtrarFilas();
  const ids = new Set(registros.map((fila) => fila.id));
  if (mismoAlcance && registros.some((fila) => !anterior.ids.has(fila.id) && !filtrados.some((registro) => registro.id === fila.id))) {
    queueMicrotask(() => toast('Hay nuevos registros que no coinciden con los filtros actuales. Limpia los filtros para encontrarlos.'));
  }
  const resultado = paginarLocalmente(filtrados, mismoAlcance ? anterior.pagina : 1);
  catalogos.set(tipo, { alcance, ids, filtrarFilas, renderFila, etiqueta, pagina: resultado.pagina });
  return resultado;
}

export function renderPaginacionCatalogo(tipo, resultado) {
  return `<div data-paginacion-catalogo="${tipo}">${renderPaginacionLocal(resultado, catalogos.get(tipo).etiqueta, tipo)}</div>`;
}

export function actualizarPaginaCatalogo(tipo, reiniciar = false) {
  const contexto = catalogos.get(tipo);
  const destino = document.getElementById(`${tipo}-resultados`);
  if (!contexto || !destino) return;
  const resultado = paginarLocalmente(contexto.filtrarFilas(), reiniciar ? 1 : contexto.pagina);
  contexto.pagina = resultado.pagina;
  destino.innerHTML = resultado.filas.map(contexto.renderFila).join('');
  document.querySelector(`[data-paginacion-catalogo="${tipo}"]`).innerHTML = renderPaginacionLocal(resultado, contexto.etiqueta, tipo);
}

if (typeof document !== 'undefined') document.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-pagina-catalogo]');
  if (!boton || boton.disabled) return;
  const tipo = boton.dataset.tipoCatalogo;
  const contexto = catalogos.get(tipo);
  if (!contexto) return;
  contexto.pagina = Number(boton.dataset.paginaCatalogo);
  actualizarPaginaCatalogo(tipo);
  const destino = document.getElementById(`${tipo}-resultados`);
  destino.tabIndex = -1;
  destino.focus({ preventScroll: true });
  destino.scrollIntoView({ block: 'start' });
});
