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
export const avatar = (iniciales, color = 'durazno', clases = '') =>
  `<span class="avatar ${color} ${clases}">${escaparHtml(iniciales)}</span>`;
export const renderEtiquetaEstado = (estado) =>
  `<span class="distintivo-estado ${estado}"><span></span>${etiquetasEstadoCita[estado]}</span>`;
export const renderEstadoVacio = (titulo, detalle, accion = '') =>
  `<div class="estado-vacio">${renderIcono('calendar')}<h3>${titulo}</h3><p>${detalle}</p>${accion}</div>`;
export function mostrarAviso(mensaje) {
  const elemento = document.createElement('div');
  elemento.className = 'aviso-app efecto-cristal';
  elemento.textContent = mensaje;
  document.querySelector('#region-avisos').append(elemento);
  setTimeout(() => {
    elemento.classList.add('esta-saliendo');
    setTimeout(() => elemento.remove(), 180);
  }, 4320);
}
let focoAnterior;
export function abrirDialogo(titulo, contenido, amplio = false) {
  const elemento = document.querySelector('#dialogo-app');
  focoAnterior = document.activeElement;
  elemento.className = amplio ? 'dialogo-app efecto-cristal amplio' : 'dialogo-app efecto-cristal';
  elemento.oncancel = null;
  elemento.innerHTML = `<header class="dialogo-cabecera"><div><span class="sobretitulo">${document.documentElement.dataset.appMode === 'connected' ? 'MI NEGOCIO' : 'CLÍNICA · DEMOSTRACIÓN'}</span><h2 id="dialog-title">${titulo}</h2></div><button class="boton-icono" data-close aria-label="Cerrar">${renderIcono('x')}</button></header>${contenido}`;
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
  `<div class="encabezado-pagina"><div><h1>${titulo}</h1><p>${descripcion}</p></div><div class="acciones-encabezado">${acciones}</div></div>`;
export const renderBoton = (texto, accion, simbolo = 'plus', clases = 'btn-primary') =>
  `<button class="btn ${clases}" data-action="${accion}">${renderIcono(simbolo)}${texto}</button>`;
