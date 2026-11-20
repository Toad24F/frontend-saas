import { renderIcono } from './iconos.catalogo.js';
import { etiquetasEstadoCita } from './aplicacion.datos.js';
export const escaparHtml = (valor = '') =>
  String(valor).replace(
    /[&<>"']/g,
    (caracter) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        caracter
      ],
  );
export const avatar = (iniciales, color = 'peach', clases = '') =>
  `<span class="avatar ${color} ${clases}">${escaparHtml(iniciales)}</span>`;
export const renderEtiquetaEstado = (estado) =>
  `<span class="status-badge ${estado}"><span></span>${etiquetasEstadoCita[estado]}</span>`;
export const renderEstadoVacio = (titulo, detalle, accion = '') =>
  `<div class="empty-state">${renderIcono('calendar')}<h3>${titulo}</h3><p>${detalle}</p>${accion}</div>`;
export function mostrarAviso(mensaje) {
  const elemento = document.createElement('div');
  elemento.className = 'app-toast glass-effect';
  elemento.textContent = mensaje;
  document.querySelector('#toast-region').append(elemento);
  setTimeout(() => {
    elemento.classList.add('is-leaving');
    setTimeout(() => elemento.remove(), 180);
  }, 4320);
}
let focoAnterior;
export function abrirDialogo(titulo, contenido, amplio = false) {
  const elemento = document.querySelector('#app-dialog');
  focoAnterior = document.activeElement;
  elemento.className = amplio ? 'app-dialog glass-effect wide' : 'app-dialog glass-effect';
  elemento.oncancel = null;
  elemento.innerHTML = `<header class="dialog-header"><div><span class="eyebrow">${document.documentElement.dataset.appMode === 'connected' ? 'MI NEGOCIO' : 'CLÍNICA · DEMOSTRACIÓN'}</span><h2 id="dialog-title">${titulo}</h2></div><button class="icon-btn" data-close aria-label="Cerrar">${renderIcono('x')}</button></header>${contenido}`;
  if (!elemento.open) elemento.showModal();
  elemento.querySelector('[data-close]').onclick = () => elemento.close();
  elemento.onclose = () => focoAnterior?.focus();
  elemento.onclick = (evento) => {
    if (
      evento.target === elemento &&
      (evento.clientX < elemento.getBoundingClientRect().left ||
        evento.clientX > elemento.getBoundingClientRect().right ||
        evento.clientY < elemento.getBoundingClientRect().top ||
        evento.clientY > elemento.getBoundingClientRect().bottom)
    )
      elemento.close();
  };
  return elemento;
}
export const renderEncabezadoPagina = (titulo, descripcion, acciones = '') =>
  `<div class="page-heading"><div><h1>${titulo}</h1><p>${descripcion}</p></div><div class="heading-actions">${acciones}</div></div>`;
export const renderBoton = (texto, accion, simbolo = 'plus', clases = 'btn-primary') =>
  `<button class="btn ${clases}" data-action="${accion}">${renderIcono(simbolo)}${texto}</button>`;
