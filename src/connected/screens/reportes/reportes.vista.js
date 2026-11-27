import { api, usuarioActual } from '../../backend.js';
import { fechaIso, formatearFecha, listarRegistros } from '../../../shared/aplicacion.datos.js';
import { escaparHtml, renderEncabezadoPagina, renderEstadoVacio } from '../../../shared/interfaz.componentes.js';
import { coincideCorteReporte, coincidenFiltrosReporte, LIMITE_REPORTE, reunirFilasParaImpresion, validarPaginaReporte } from './reportes.corte.js';
import { renderFilasReporte } from './reportes.resultados.js';
import { renderIndicadoresReporte } from '../../../shared/screens/reportes/reportes.indicadores.js';
import './reportes.estilos.css';

const estados = new WeakMap();
const rutaCortes = '/reportes/cortes';

const selectores = [
  ['sucursalId', 'Sucursal', 'Todas las sucursales', 'branches'],
  ['personalId', 'Profesional', 'Todo el personal', 'professionals'],
  ['servicioId', 'Servicio', 'Todos los servicios', 'services'],
];

function renderFiltro(negocioId, [campo, etiqueta, opcionInicial, coleccion]) {
  return `<label>${etiqueta}<select name="${campo}" class="form-select"><option value="">${opcionInicial}</option>${
    listarRegistros(coleccion, negocioId).map(({ id, name }) =>
      `<option value="${escaparHtml(id)}">${escaparHtml(name)}</option>`).join('')
  }</select></label>`;
}

export function renderReportesConectados() {
  const hoy = fechaIso(new Date());
  return `<section class="reportes-conectados">
    ${renderEncabezadoPagina('Reportes', 'Consulta citas e ingresos estimados por periodo.')}
    <form class="superficie reportes-filtros">
      <label>Desde<input type="date" name="desde" class="form-control" value="${hoy.slice(0, 7)}-01" required></label>
      <label>Hasta<input type="date" name="hasta" class="form-control" value="${hoy}" required></label>
      ${selectores.map((selector) => renderFiltro(usuarioActual.negocioId, selector)).join('')}
      <label>Agrupación<select name="agrupacion" class="form-select"><option value="semana">Por semana</option><option value="mes">Por mes</option></select></label>
      <button type="submit" class="btn btn-primary">Generar reporte</button>
    </form>
    <div class="reportes-barra">
      <div><div role="status" class="reportes-estado"></div><div class="reportes-meta"></div></div>
      <div class="reportes-acciones">
        <button type="button" class="btn btn-light" data-reporte="preparar" disabled>Preparar impresión</button>
        <button type="button" class="btn btn-primary" data-reporte="imprimir" disabled>Imprimir reporte</button>
      </div>
    </div>
    <p class="reportes-error" role="alert" hidden></p>
    <section class="reportes-aviso-impresion">
      <h1>Reporte no preparado</h1>
      <p>Vuelve a Reportes y elige «Preparar impresión» antes de imprimir o guardar como PDF.</p>
    </section>
    <div class="reportes-resultado">${renderEstadoVacio('Genera un reporte', 'Selecciona los filtros para consultar las citas del periodo.')}</div>
  </section>`;
}

function leerEstado(vista) {
  // Cada montaje tiene su propio estado. Una respuesta tardía no puede repintar otra ruta o sesión.
  if (!estados.has(vista)) estados.set(vista, { revision: 0, corte: null, pagina: null, completas: null, ocupado: false });
  return estados.get(vista);
}

function publicarEstado(vista, estado, mensaje = '', error = '') {
  vista.querySelector('.reportes-estado').textContent = mensaje;
  const alerta = vista.querySelector('.reportes-error');
  alerta.textContent = error;
  alerta.hidden = !error;
  vista.querySelector('[data-reporte="preparar"]').disabled = estado.ocupado || !estado.pagina;
  vista.querySelector('[data-reporte="imprimir"]').disabled = estado.ocupado || !estado.completas;
  for (const boton of vista.querySelectorAll('[data-pagina-reporte]')) {
    boton.disabled = estado.ocupado || (boton.dataset.paginaReporte === 'anterior' ? estado.pagina.pagina === 1 : !estado.pagina.hayMas);
  }
}

function limpiarCorte(vista, estado) {
  estado.revision += 1;
  estado.corte = estado.resumen = estado.pagina = estado.completas = null;
  estado.ocupado = false;
  vista.querySelector('.reportes-resultado').replaceChildren();
  vista.querySelector('.reportes-meta').replaceChildren();
  vista.classList.remove('reporte-listo');
}

function leerFiltros(formulario) {
  const { desde, hasta, agrupacion, sucursalId, personalId, servicioId } = Object.fromEntries(new FormData(formulario));
  const id = (valor) => valor ? Number(valor) : null;
  return { desde, hasta, agrupacion, sucursalId: id(sucursalId), personalId: id(personalId), servicioId: id(servicioId) };
}

function fechaDelCorte(corte) {
  return new Date(corte.fechaCorte).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
}

function detalleCorte(corte) {
  return `<p>Del ${formatearFecha(corte.filtros.desde)} al ${formatearFecha(corte.filtros.hasta)} · Corte del ${fechaDelCorte(corte)} (UTC)</p>`;
}

function renderCabeceraImpresion(corte, filtrosAplicados) {
  const { desde, hasta, agrupacion } = corte.filtros;
  const datos = [
    ['Periodo', `${formatearFecha(desde)} al ${formatearFecha(hasta)}`],
    ['Fecha de corte', `${fechaDelCorte(corte)} (UTC)`],
    ...filtrosAplicados,
    ['Agrupación', agrupacion === 'mes' ? 'Mensual' : 'Semanal'],
  ];
  return `<header class="reportes-cabecera-impresion">
    <h1>Reporte de citas</h1>
    <p>Negocio: ${escaparHtml(usuarioActual.nombreNegocio || 'Mi negocio')}</p>
    <dl>${datos.map(([etiqueta, valor]) => `<div><dt>${etiqueta}</dt><dd>${escaparHtml(valor)}</dd></div>`).join('')}</dl>
  </header>`;
}

function renderPagina(vista, estado, enfocar = false) {
  const { pagina } = estado;
  const paginas = Math.max(1, Math.ceil(pagina.total / pagina.limite));
  const destino = vista.querySelector('.reportes-pagina');
  destino.innerHTML = `${renderFilasReporte(pagina.filas)}
    <nav class="reportes-paginacion" aria-label="Páginas de citas del corte">
      <button type="button" class="btn btn-light" data-pagina-reporte="anterior">Anterior</button>
      <span tabindex="-1">Página ${pagina.pagina} de ${paginas}</span>
      <button type="button" class="btn btn-light" data-pagina-reporte="siguiente">Siguiente</button>
    </nav>`;
  if (enfocar) destino.querySelector('.reportes-paginacion span').focus({ preventScroll: true });
}

function renderResultado(vista, estado, filtrosAplicados) {
  const { corte, resumen } = estado;
  vista.querySelector('.reportes-meta').innerHTML = detalleCorte(corte);
  vista.querySelector('.reportes-resultado').innerHTML = `${renderCabeceraImpresion(corte, filtrosAplicados)}
    ${resumen.totalCitas === 0 ? '<p>No hay citas para estos filtros.</p>' : ''}
    ${renderIndicadoresReporte(resumen)}<div class="reportes-pagina"></div><div class="reportes-impresion"></div>`;
  renderPagina(vista, estado);
}

function consultarPagina(corte, numero) {
  return api(`${rutaCortes}/${encodeURIComponent(corte.id)}/filas?pagina=${numero}&limite=${LIMITE_REPORTE}`);
}

async function generarReporte(formulario, vista) {
  const estado = leerEstado(vista);
  const filtros = leerFiltros(formulario);
  // Capturar las etiquetas junto con los IDs para que el papel identifique los filtros de esta petición.
  const filtrosAplicados = selectores.map(([campo, etiqueta]) =>
    [etiqueta, formulario.elements[campo].selectedOptions[0].textContent]);
  limpiarCorte(vista, estado);
  if (filtros.desde > filtros.hasta) {
    publicarEstado(vista, estado, '', 'La fecha inicial debe ser anterior o igual a la final.');
    formulario.elements.desde.focus();
    return;
  }

  estado.ocupado = true;
  const revision = estado.revision;
  const vigente = () => vista.isConnected && estado.revision === revision;
  publicarEstado(vista, estado, 'Generando reporte…');
  try {
    // Publicar resumen y primera página juntos. Un error intermedio no equivale a un corte vacío.
    const corte = await api(rutaCortes, 'POST', filtros);
    if (!vigente()) return;
    if (!corte?.id || !coincidenFiltrosReporte(filtros, corte.filtros)) throw new Error('Corte incoherente.');
    const [resumen, respuesta] = await Promise.all([
      api(`${rutaCortes}/${encodeURIComponent(corte.id)}`),
      consultarPagina(corte, 1),
    ]);
    if (!vigente()) return;
    if (!coincideCorteReporte(corte, resumen)) throw new Error('Resumen incoherente.');
    estado.pagina = validarPaginaReporte(corte, resumen.totalCitas, 1, respuesta);
    estado.corte = corte;
    estado.resumen = resumen;
    renderResultado(vista, estado, filtrosAplicados);
    estado.ocupado = false;
    publicarEstado(vista, estado, 'Reporte generado.');
  } catch {
    if (!vigente()) return;
    limpiarCorte(vista, estado);
    publicarEstado(vista, estado, '', 'No se pudo generar el reporte. Reintenta o acota los filtros.');
  }
}

async function actualizarReporte(vista, estado, accion) {
  const { corte, pagina, resumen, revision } = estado;
  const esImpresion = accion === 'preparar';
  estado.ocupado = true;
  const vigente = () => vista.isConnected && estado.revision === revision;
  if (esImpresion) {
    estado.completas = null;
    vista.classList.remove('reporte-listo');
    vista.querySelector('.reportes-impresion').replaceChildren();
  }
  publicarEstado(vista, estado, esImpresion ? 'Preparando impresión…' : 'Cargando página…');
  try {
    if (esImpresion) {
      const filas = await reunirFilasParaImpresion(corte, resumen.totalCitas, (numero) => {
        if (!vigente()) throw new Error('El reporte cambió durante la preparación.');
        return consultarPagina(corte, numero);
      });
      if (!vigente()) return;
      vista.querySelector('.reportes-impresion').innerHTML = renderFilasReporte(filas, true);
      // El botón y el menú nativo comparten la marca, publicada con la colección y las fuentes listas.
      await document.fonts.ready;
      if (!vigente()) return;
      estado.completas = filas;
      vista.classList.add('reporte-listo');
    } else {
      const numero = pagina.pagina + (accion === 'siguiente' ? 1 : -1);
      const respuesta = await consultarPagina(corte, numero);
      if (!vigente()) return;
      estado.pagina = validarPaginaReporte(corte, resumen.totalCitas, numero, respuesta);
      renderPagina(vista, estado, true);
    }
    estado.ocupado = false;
    publicarEstado(vista, estado, esImpresion ? 'Impresión preparada. Puedes elegir «Guardar como PDF».' : 'Página cargada.');
  } catch (error) {
    if (!vigente()) return;
    estado.ocupado = false;
    if (error.status === 404) {
      // La API usa el mismo 404 para expiración y falta de acceso. Descartar el corte completo.
      limpiarCorte(vista, estado);
      publicarEstado(vista, estado, '', 'El corte ya no está disponible. Genera otro reporte.');
    } else {
      publicarEstado(vista, estado, '', esImpresion
        ? 'No se pudo preparar la impresión completa. Reintenta.'
        : 'No se pudo cargar la página solicitada. Reintenta.');
    }
  }
}

// Delegar eventos permite renovar la tabla sin reemplazar los filtros ni perder sus valores.
document.addEventListener('submit', (evento) => {
  const formulario = evento.target;
  const vista = formulario.closest('.reportes-conectados');
  if (!vista) return;
  evento.preventDefault();
  void generarReporte(formulario, vista);
});

document.addEventListener('input', (evento) => {
  const vista = evento.target.closest('.reportes-conectados .reportes-filtros')?.closest('.reportes-conectados');
  if (!vista) return;
  const estado = leerEstado(vista);
  limpiarCorte(vista, estado);
  publicarEstado(vista, estado, 'Genera un reporte para aplicar los filtros.');
});

document.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-reporte], [data-pagina-reporte]');
  const vista = boton?.closest('.reportes-conectados');
  if (!vista || boton.disabled) return;
  const estado = leerEstado(vista);
  if (estado.ocupado || !estado.pagina) return;
  const accion = boton.dataset.reporte ?? boton.dataset.paginaReporte;
  if (accion === 'imprimir') {
    if (estado.completas) window.print();
    return;
  }
  void actualizarReporte(vista, estado, accion);
});
