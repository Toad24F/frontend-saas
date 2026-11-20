import { escape as escapar, avatar } from '../../ui.js';
import { icon } from '../../icons.js';
import { paginarDirectorio, opcionesSeguimiento, etiquetasLicencia, coincideSeguimiento, textoTiempoRestante } from './plataforma.modelo-directorio.js';

export const estadoDirectorio = { busqueda: '', estadoLicencia: '', seguimiento: '', pagina: 1 };
const hayFiltros = () => Boolean(estadoDirectorio.busqueda.trim() || estadoDirectorio.estadoLicencia || estadoDirectorio.seguimiento);

export function renderResultadosDirectorio(negocios, opciones = estadoDirectorio, demostracion = false) {
  const resultado = paginarDirectorio(negocios, opciones);
  if (!resultado.total) return `<div class="plataforma-vacio"><h3>${negocios.length ? 'No hay negocios con estos filtros' : 'Aún no hay negocios'}</h3><p>${negocios.length ? 'Prueba otra búsqueda o limpia los filtros.' : 'Registra el primero para iniciar su invitación.'}</p>${negocios.length ? '<button type="button" class="btn btn-light" data-plataforma-limpiar>Limpiar filtros</button>' : ''}</div>`;
  return `<table class="table app-table plataforma-tabla"><caption class="visually-hidden">Negocios de la plataforma</caption><thead><tr>${['Negocio', 'Administrador', 'Estado de licencia', 'Tiempo restante', 'Administración'].map((etiqueta) => `<th scope="col">${etiqueta}</th>`).join('')}</tr></thead><tbody>${resultado.filas.map((negocio) => `<tr><td data-etiqueta="Negocio"><div class="person-cell">${avatar(negocio.initials, 'mint')}<span><strong>${escapar(negocio.name)}</strong><small>${escapar(negocio.slug)}</small></span></div></td><td data-etiqueta="Administrador">${escapar(negocio.email || 'Sin correo')}</td><td data-etiqueta="Estado de licencia"><span class="plataforma-licencia plataforma-licencia-${Object.hasOwn(etiquetasLicencia, negocio.license) ? negocio.license : 'desconocida'}">${escapar(etiquetasLicencia[negocio.license] || 'Sin licencia')}</span></td><td data-etiqueta="Tiempo restante">${escapar(textoTiempoRestante(negocio))}</td><td data-etiqueta="Administración">${demostracion ? `<div class="plataforma-acciones-demo"><button type="button" class="btn btn-light" data-cambiar-estado-negocio="${escapar(negocio.id)}">${negocio.suspended ? 'Reactivar' : 'Suspender'}</button><button type="button" class="btn btn-light" data-renovar-licencia="${escapar(negocio.id)}">Renovar licencia</button></div>` : `<button type="button" class="btn btn-light" data-detalle-negocio="${escapar(negocio.id)}" aria-label="Administrar ${escapar(negocio.name)}">Administrar ${icon('arrow')}</button>`}</td></tr>`).join('')}</tbody></table><div class="plataforma-pie"><p role="status">Mostrando ${(resultado.pagina - 1) * 10 + 1}–${Math.min(resultado.pagina * 10, resultado.total)} de ${resultado.total} negocios</p>${resultado.total > 10 ? `<nav aria-label="Paginación de negocios"><button type="button" class="btn btn-light" data-plataforma-pagina="${resultado.pagina - 1}" ${resultado.pagina === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${resultado.pagina} de ${resultado.paginas}</span><button type="button" class="btn btn-light" data-plataforma-pagina="${resultado.pagina + 1}" ${resultado.pagina === resultado.paginas ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
}

export function renderDirectorio(negocios, demostracion = false) {
  const indicadores = [
    ['', 'Negocios registrados', 'Todos los negocios de la plataforma', 'grid'],
    ['por-activar', 'Por activar', demostracion ? 'Activación no simulada' : 'Invitaciones pendientes', 'clock'],
    ['por-vencer', 'Próximas a vencer', demostracion ? 'Vigencia no simulada' : 'Licencias vigentes con menos de 30 días', 'calendar'],
    ['acceso-bloqueado', 'Acceso bloqueado', 'Negocios sin acceso habilitado', 'lock'],
  ];
  const renderSelector = (campo, etiqueta, valores) => `<label>${etiqueta}<select class="form-select" data-plataforma-filtro="${campo}"><option value="">Todos</option>${Object.entries(valores).map(([valor, texto]) => `<option value="${valor}" ${estadoDirectorio[campo] === valor ? 'selected' : ''}>${texto}</option>`).join('')}</select></label>`;
  return `<div class="plataforma-directorio" data-plataforma-demo="${demostracion}"><div class="stats-grid">${indicadores.map(([filtro, etiqueta, leyenda, simbolo]) => `<div class="stat-card plataforma-indicador"><span class="stat-top">${etiqueta}<span class="stat-icon">${icon(simbolo)}</span></span><span class="stat-number">${demostracion && ['por-activar', 'por-vencer'].includes(filtro) ? '—' : negocios.filter((negocio) => coincideSeguimiento(negocio, filtro)).length}</span><span class="stat-caption">${leyenda}</span></div>`).join('')}</div><section class="plataforma-lista" aria-labelledby="plataforma-negocios"><h2 id="plataforma-negocios">Negocios</h2><p>${demostracion ? 'Explora negocios ficticios y prueba sus acciones de licencia en esta sesión.' : 'Busca un negocio y abre su administración para gestionar la licencia, los límites y el acceso del administrador.'}</p>${demostracion ? '<p class="information-note">Demostración con datos ficticios. La activación y los días restantes no están simulados; las acciones de licencia solo cambian esta sesión.</p>' : ''}<div class="plataforma-filtros"><label class="plataforma-busqueda">Buscar negocio<input class="form-control" type="search" data-plataforma-busqueda value="${escapar(estadoDirectorio.busqueda)}" placeholder="Nombre, identificador o correo" /></label>${renderSelector('estadoLicencia', 'Estado de licencia', etiquetasLicencia)}${renderSelector('seguimiento', 'Seguimiento', demostracion ? { 'acceso-bloqueado': opcionesSeguimiento['acceso-bloqueado'] } : opcionesSeguimiento)}<button type="button" class="btn btn-light" data-plataforma-limpiar ${hayFiltros() ? '' : 'disabled'}>Limpiar filtros</button><button type="button" class="btn btn-light" data-plataforma-actualizar>Actualizar</button></div><p class="plataforma-aviso" role="alert" hidden></p><div data-plataforma-resultados>${renderResultadosDirectorio(negocios, estadoDirectorio, demostracion)}</div></section></div>`;
}

export function vincularDirectorio(obtenerNegocios, actualizar, demostracion) {
  function actualizarResultados(contenedor, enfocar = false) {
    const resultado = contenedor.querySelector('[data-plataforma-resultados]');
    resultado.innerHTML = renderResultadosDirectorio(obtenerNegocios(), estadoDirectorio, demostracion);
    contenedor.querySelectorAll('[data-plataforma-limpiar]').forEach((boton) => { boton.disabled = !hayFiltros(); });
    if (enfocar) { resultado.tabIndex = -1; resultado.focus({ preventScroll: true }); }
  }
  function limpiarFiltros(contenedor, seguimiento = '') {
    Object.assign(estadoDirectorio, { busqueda: '', estadoLicencia: '', seguimiento, pagina: 1 });
    contenedor.querySelector('[data-plataforma-busqueda]').value = '';
    contenedor.querySelectorAll('[data-plataforma-filtro]').forEach((selector) => { selector.value = estadoDirectorio[selector.dataset.plataformaFiltro]; });
    actualizarResultados(contenedor);
  }
  document.addEventListener('input', (evento) => {
    const contenedor = evento.target.closest('.plataforma-directorio');
    if (!contenedor || !evento.target.matches('[data-plataforma-busqueda]')) return;
    estadoDirectorio.busqueda = evento.target.value;
    estadoDirectorio.pagina = 1;
    actualizarResultados(contenedor);
  });
  document.addEventListener('change', (evento) => {
    const contenedor = evento.target.closest('.plataforma-directorio');
    if (!contenedor || !evento.target.matches('[data-plataforma-filtro]')) return;
    estadoDirectorio[evento.target.dataset.plataformaFiltro] = evento.target.value;
    estadoDirectorio.pagina = 1;
    actualizarResultados(contenedor);
  });
  document.addEventListener('click', async (evento) => {
    const contenedor = evento.target.closest('.plataforma-directorio');
    if (!contenedor) return;
    if (evento.target.closest('[data-plataforma-limpiar]')) { limpiarFiltros(contenedor); contenedor.querySelector('[data-plataforma-busqueda]').focus(); return; }
    const pagina = evento.target.closest('[data-plataforma-pagina]');
    if (pagina) { estadoDirectorio.pagina = Number(pagina.dataset.plataformaPagina); actualizarResultados(contenedor, true); return; }
    const boton = evento.target.closest('[data-plataforma-actualizar]');
    if (!boton) return;
    boton.disabled = true;
    boton.textContent = 'Actualizando…';
    const aviso = contenedor.querySelector('.plataforma-aviso');
    aviso.hidden = true;
    try {
      await actualizar();
      if (!contenedor.isConnected) return;
      contenedor.outerHTML = renderDirectorio(obtenerNegocios(), demostracion);
      document.querySelector('[data-plataforma-actualizar]')?.focus({ preventScroll: true });
    } catch (error) {
      if (!contenedor.isConnected) return;
      aviso.textContent = `No se pudo actualizar: ${error.message} Se conserva la última consulta.`;
      aviso.hidden = false;
      boton.disabled = false;
      boton.textContent = 'Actualizar';
    }
  });
}
