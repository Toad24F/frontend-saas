import { renderResultadosCorreoServidor } from './correo.historial.js';

export const estadoEspacioNegocio = { pestana: 'general', correo: { estado: '', tipo: '', desde: '', hasta: '', pagina: 1 } };

export function vincularEspacioNegocio(obtenerDetalle, actualizar, consultarCorreo) {
  let solicitudActual = 0;
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
  async function actualizarResultados(raiz, enfocar = false) {
    const resultados = raiz.querySelector('[data-correo-resultados]');
    const solicitud = ++solicitudActual;
    resultados.innerHTML = '<p role="status">Consultando correos…</p>';
    try {
      const respuesta = await consultarCorreo();
      if (solicitud !== solicitudActual || !resultados.isConnected) return;
      resultados.innerHTML = renderResultadosCorreoServidor(respuesta, estadoEspacioNegocio.correo);
    } catch (error) {
      if (solicitud !== solicitudActual || !resultados.isConnected) return;
      resultados.innerHTML = `<p role="alert">${error.status === 403 || error.status === 404 ? 'Historial no disponible.' : 'No pudimos cargar el historial.'}</p><button type="button" class="btn btn-light" data-correo-actualizar>Reintentar</button>`;
    }
    if (enfocar) { resultados.tabIndex = -1; resultados.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', async (evento) => {
    const raiz = evento.target.closest('.negocio-espacio-trabajo');
    if (!raiz || !obtenerDetalle()) return;
    const pestana = evento.target.closest('[data-negocio-pestana]');
    if (pestana) return seleccionarPestana(raiz, pestana.dataset.negocioPestana);
    const pagina = evento.target.closest('[data-correo-pagina]');
    if (pagina) { estadoEspacioNegocio.correo.pagina = Number(pagina.dataset.correoPagina); void actualizarResultados(raiz, true); }
    if (evento.target.closest('[data-correo-limpiar]')) {
      estadoEspacioNegocio.correo = { estado: '', tipo: '', desde: '', hasta: '', pagina: 1 };
      raiz.querySelectorAll('[data-correo-filtro]').forEach((selector) => { selector.value = ''; });
      void actualizarResultados(raiz);
      raiz.querySelector('[data-correo-filtro]').focus();
    }
    const botonActualizar = evento.target.closest('[data-correo-actualizar]');
    if (botonActualizar) {
      botonActualizar.disabled = true;
      botonActualizar.textContent = 'Actualizando…';
      await actualizarResultados(raiz, true);
      botonActualizar.disabled = false;
      botonActualizar.textContent = 'Actualizar';
    }
  });
  document.addEventListener('change', (evento) => {
    const raiz = evento.target.closest('.negocio-espacio-trabajo');
    const filtro = evento.target.closest('[data-correo-filtro]');
    if (!raiz || !filtro || !obtenerDetalle()) return;
    estadoEspacioNegocio.correo[filtro.dataset.correoFiltro] = filtro.value;
    estadoEspacioNegocio.correo.pagina = 1;
    void actualizarResultados(raiz);
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
