import { escaparHtml } from '../../interfaz.componentes.js';

export function renderEncabezadoCatalogo(titulo, descripcion, acciones, cupo = '') {
  return `<div class="encabezado-pagina catalogo-encabezado"><div><h1>${escaparHtml(titulo)}</h1><p>${escaparHtml(descripcion)}</p></div>${cupo ? `<div class="catalogo-cupo">${cupo}</div>` : ''}<div class="acciones-encabezado">${acciones}</div></div>`;
}

export function renderCupoCatalogo(etiqueta, datos) {
  if (!datos) return `<p class="catalogo-cupo-error">${escaparHtml(etiqueta)}: cupo no disponible.</p>`;
  return `<div class="catalogo-indicador-cupo"><div><span>${escaparHtml(etiqueta)}</span><strong>${datos.activos} de ${datos.limite}</strong></div><progress max="${Math.max(1, datos.limite, datos.activos)}" value="${datos.activos}" aria-label="${escaparHtml(etiqueta)}"></progress><small>${datos.disponibles} ${datos.disponibles === 1 ? 'disponible' : 'disponibles'}</small></div>`;
}

export function hayFiltrosCatalogo(filtros) {
  return Boolean(filtros.busqueda?.trim() || Object.entries(filtros).some(([clave, valor]) => clave !== 'busqueda' && valor !== 'todos'));
}

export function renderBotonLimpiarCatalogo(tipo, filtros) {
  return `<button type="button" class="btn btn-light catalogo-limpiar" data-${tipo}-limpiar ${hayFiltrosCatalogo(filtros) ? '' : 'disabled'}>Limpiar filtros</button>`;
}
