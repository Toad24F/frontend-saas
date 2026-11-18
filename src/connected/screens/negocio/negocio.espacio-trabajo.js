import { renderResultadosCorreo } from './correo.historial.js';

export const estadoEspacioNegocio = { pestana: 'general', correo: { estado: '', tipo: '', pagina: 1 } };

export function vincularEspacioNegocio(obtenerDetalle, actualizar) {
  function seleccionarPestana(raiz, id, enfocar = false) {
    estadoEspacioNegocio.pestana = id;
    raiz.querySelectorAll('[data-negocio-pestana]').forEach((pestana) => {
      const seleccionada = pestana.dataset.negocioPestana === id;
      pestana.setAttribute('aria-selected', String(seleccionada));
      pestana.tabIndex = seleccionada ? 0 : -1;
      pestana.classList.toggle('is-selected', seleccionada);
      if (seleccionada && enfocar) { pestana.focus(); pestana.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    });
    raiz.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== `negocio-panel-${id}`; });
  }
  function actualizarResultados(raiz, enfocar = false) {
    const resultados = raiz.querySelector('[data-correo-resultados]');
    resultados.innerHTML = renderResultadosCorreo(obtenerDetalle().envios, estadoEspacioNegocio.correo);
    if (enfocar) { resultados.tabIndex = -1; resultados.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', async (evento) => {
    const raiz = evento.target.closest('.negocio-espacio-trabajo');
    if (!raiz || !obtenerDetalle()) return;
    const pestana = evento.target.closest('[data-negocio-pestana]');
    if (pestana) return seleccionarPestana(raiz, pestana.dataset.negocioPestana);
    const pagina = evento.target.closest('[data-correo-pagina]');
    if (pagina) { estadoEspacioNegocio.correo.pagina = Number(pagina.dataset.correoPagina); actualizarResultados(raiz, true); }
    if (evento.target.closest('[data-correo-limpiar]')) {
      estadoEspacioNegocio.correo = { estado: '', tipo: '', pagina: 1 };
      raiz.querySelectorAll('[data-correo-filtro]').forEach((selector) => { selector.value = ''; });
      actualizarResultados(raiz);
      raiz.querySelector('[data-correo-filtro]').focus();
    }
    const botonActualizar = evento.target.closest('[data-correo-actualizar]');
    if (botonActualizar) {
      botonActualizar.disabled = true;
      botonActualizar.textContent = 'Actualizando…';
      await actualizar();
      document.querySelector('.negocio-espacio-trabajo [data-correo-actualizar], [data-action="consultar-detalle-negocio"]')?.focus({ preventScroll: true });
    }
  });
  document.addEventListener('change', (evento) => {
    const raiz = evento.target.closest('.negocio-espacio-trabajo');
    const filtro = evento.target.closest('[data-correo-filtro]');
    if (!raiz || !filtro || !obtenerDetalle()) return;
    estadoEspacioNegocio.correo[filtro.dataset.correoFiltro] = filtro.value;
    estadoEspacioNegocio.correo.pagina = 1;
    actualizarResultados(raiz);
  });
  document.addEventListener('keydown', (evento) => {
    const pestana = evento.target.closest('[data-negocio-pestana]');
    if (!pestana || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const raiz = pestana.closest('.negocio-espacio-trabajo');
    const pestanas = [...raiz.querySelectorAll('[data-negocio-pestana]')];
    const indice = pestanas.indexOf(pestana);
    const siguiente = evento.key === 'Home' ? 0 : evento.key === 'End' ? pestanas.length - 1 : (indice + (evento.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length;
    seleccionarPestana(raiz, pestanas[siguiente].dataset.negocioPestana, true);
  });
}
