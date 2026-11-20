import { esDemo, cargarDatosBackend } from '../connected/backend.js';
import { render } from './aplicacion.nucleo.js';
import { renderIcono } from './iconos.catalogo.js';
import { abrirDialogo, mostrarAviso, escaparHtml as esc } from './interfaz.componentes.js';
export const renderCampo = (etiqueta, nombre, valor = '', tipo = 'text', atributos = '') =>
  `<div class="campo-formulario"><label class="form-label" for="f-${nombre}">${etiqueta}</label><input class="form-control" id="f-${nombre}" name="${nombre}" value="${esc(valor)}" type="${tipo}" ${atributos}/></div>`;
export const renderSelector = (etiqueta, nombre, opciones, seleccionado = '') =>
  `<div class="campo-formulario"><label class="form-label" for="f-${nombre}">${etiqueta}</label><select class="form-select" id="f-${nombre}" name="${nombre}" required>${opciones.map((opcion) => `<option value="${opcion.id}" ${String(opcion.id) === String(seleccionado) ? 'selected' : ''}>${esc(opcion.name)}</option>`).join('')}</select></div>`;
export const mostrarErrorFormulario = (error) => {
  const destino = document.querySelector('#error-formulario');
  if (destino) {
    destino.textContent = error.message;
    destino.hidden = false;
    destino.focus();
  } else mostrarAviso(error.message);
};
export const espacioErrorFormulario =
  '<p id="error-formulario" class="error-formulario" role="alert" tabindex="-1" hidden></p>';
export function abrirFormulario(titulo, contenido, alEnviar, amplio = false, configuracion = {}) {
  const dialogo = abrirDialogo(
    titulo,
    `<form id="editor-form"><div class="dialogo-cuerpo">${contenido}${espacioErrorFormulario}</div><div class="dialogo-pie"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="submit" class="btn btn-primary">${renderIcono('check')}Guardar</button></div></form>`,
    amplio,
  );
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  const formulario = dialogo.querySelector('form');
  let enviando = false;
  if (configuracion.panelLateral) {
    dialogo.classList.add('formulario-lateral');
    const capturarValores = () => JSON.stringify([...formulario.elements].filter((campo) => campo.name).map((campo) => [campo.name, campo.type === 'checkbox' || campo.type === 'radio' ? campo.checked : campo.value]));
    // No almacenamiento: el borrador y su comparación existen solo en este formulario.
    const valoresOriginales = capturarValores();
    const pie = formulario.querySelector('.dialogo-pie');
    pie.insertAdjacentHTML('afterbegin', '<div class="confirmacion-descarte" data-discard-confirm role="group" aria-label="Cambios sin guardar" hidden><p>Tienes cambios sin guardar. ¿Quieres descartarlos?</p><button type="button" class="btn btn-light" data-keep-editing>Seguir editando</button><button type="button" class="btn accion-peligro" data-discard>Descartar cambios</button></div>');
    const confirmacion = pie.querySelector('[data-discard-confirm]');
    let origenCierre;
    const solicitarCierre = () => {
      if (enviando) return;
      if (capturarValores() === valoresOriginales) { dialogo.close(); return; }
      origenCierre = document.activeElement;
      confirmacion.hidden = false;
      confirmacion.querySelector('[data-keep-editing]').focus();
    };
    dialogo.querySelector('[data-close]').onclick = solicitarCierre;
    dialogo.querySelector('[data-dismiss]').onclick = solicitarCierre;
    dialogo.oncancel = (evento) => { evento.preventDefault(); solicitarCierre(); };
    dialogo.onclick = (evento) => {
      if (evento.target !== dialogo) return;
      const rectangulo = dialogo.getBoundingClientRect();
      if (evento.clientX < rectangulo.left || evento.clientX > rectangulo.right || evento.clientY < rectangulo.top || evento.clientY > rectangulo.bottom) solicitarCierre();
    };
    confirmacion.querySelector('[data-keep-editing]').onclick = () => { confirmacion.hidden = true; origenCierre?.focus(); };
    confirmacion.querySelector('[data-discard]').onclick = () => { if (!enviando) dialogo.close(); };
  }
  if (configuracion.validar) formulario.noValidate = true;
  formulario.onsubmit = async (evento) => {
    evento.preventDefault();
    if (configuracion.validar && !configuracion.validar(evento.target)) return;
    const botonEnviar = evento.target.querySelector('[type="submit"]');
    enviando = true;
    botonEnviar.disabled = true;
    try {
      await alEnviar(new FormData(evento.target));
      dialogo.close();
      render();
      if (!esDemo) {
        try { await cargarDatosBackend(); render(); } catch (error) { mostrarAviso('Guardado completado. No se pudo actualizar la vista: ' + error.message); return; }
      }
      mostrarAviso(esDemo ? 'Cambios guardados en esta demostración.' : 'Cambios guardados.');
    } catch (error) {
      if (configuracion.alFallar) configuracion.alFallar(error, evento.target);
      else mostrarErrorFormulario(error);
    } finally { botonEnviar.disabled = false; enviando = false; }
  };
  return dialogo;
}
