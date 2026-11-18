// Navegación local sobre catálogos públicos ya cargados; nunca consulta el panel.
export const crearFiltrosIniciales = () => ({ busqueda: '', filtro: 'todos', pagina: 1 });
export const normalizarBusqueda = (valor = '') => String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const escaparTextoPortal = (valor = '') => String(valor).replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);
export function paginarOpciones(elementos, paso, filtros = crearFiltrosIniciales()) {
  const consulta = normalizarBusqueda(filtros.busqueda);
  const filtrados = elementos.filter((elemento) => normalizarBusqueda([elemento.nombre, paso === 0 ? elemento.descripcion : paso === 1 ? elemento.direccion : elemento.especialidad].filter(Boolean).join(' ')).includes(consulta)
    && (filtros.filtro === 'todos' || (paso === 0 ? filtros.filtro === 'corta' ? elemento.duracionMinutos <= 30 : filtros.filtro === 'media' ? elemento.duracionMinutos > 30 && elemento.duracionMinutos <= 60 : elemento.duracionMinutos > 60 : paso === 2 ? elemento.especialidad === filtros.filtro : true)));
  const paginas = Math.max(1, Math.ceil(filtrados.length / 6));
  const pagina = Math.min(paginas, Math.max(1, Number.isSafeInteger(filtros.pagina) ? filtros.pagina : 1));
  return { filas: filtrados.slice((pagina - 1) * 6, pagina * 6), total: filtrados.length, paginas, pagina };
}
export function renderFiltrosOpciones(elementos, paso, filtros = crearFiltrosIniciales()) {
  const escapar = escaparTextoPortal;
  if (elementos.length <= 6 && !filtros.busqueda && filtros.filtro === 'todos') return '';
  const especialidades = [...new Set(elementos.map((elemento) => elemento.especialidad).filter(Boolean))].sort();
  const filtro = paso === 0 ? [['corta', 'Hasta 30 minutos'], ['media', 'De 31 a 60 minutos'], ['larga', 'Más de 60 minutos']] : paso === 2 && especialidades.length > 1 ? especialidades.map((valor) => [valor, valor]) : [];
  return `<div class="portal-filtros-opciones"><label for="portal-busqueda">Buscar ${['servicio', 'sucursal', 'profesional'][paso]}<input class="form-control" type="search" id="portal-busqueda" data-portal-filtro="busqueda" value="${escapar(filtros.busqueda)}" placeholder="${['Nombre o descripción', 'Nombre o dirección', 'Nombre o especialidad'][paso]}" autocomplete="off"></label>${filtro.length ? `<label for="portal-filtro">${paso === 0 ? 'Duración' : 'Especialidad'}<select id="portal-filtro" class="form-select" data-portal-filtro="filtro"><option value="todos">Todas</option>${filtro.map(([valor, etiqueta]) => `<option value="${escapar(valor)}" ${valor === filtros.filtro ? 'selected' : ''}>${escapar(etiqueta)}</option>`).join('')}</select></label>` : ''}<button class="btn btn-light" type="button" data-portal-limpiar ${filtros.busqueda.trim() || filtros.filtro !== 'todos' ? '' : 'disabled'}>Limpiar filtros</button></div>`;
}
export function renderPaginacionOpciones(resultado, anuncioEnVivo = false) {
  if (!resultado.total) return '';
  return `<div class="portal-paginacion"><p${anuncioEnVivo ? ' role="status"' : ''}>Mostrando ${(resultado.pagina - 1) * 6 + 1}–${Math.min(resultado.pagina * 6, resultado.total)} de ${resultado.total} opciones</p>${resultado.total > 6 ? `<nav aria-label="Paginación de opciones"><button class="btn btn-light" type="button" data-portal-pagina="${resultado.pagina - 1}" ${resultado.pagina === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${resultado.pagina} de ${resultado.paginas}</span><button class="btn btn-light" type="button" data-portal-pagina="${resultado.pagina + 1}" ${resultado.pagina === resultado.paginas ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
}
export function renderEsqueletoPortal(horarios = false) {
  return `<div class="portal-esqueleto ${horarios ? 'portal-esqueleto-horarios' : ''}" aria-hidden="true">${Array.from({ length: horarios ? 6 : 3 }, () => '<span></span>').join('')}</div>`;
}
export const horariosDelPeriodo = (horarios, periodo = 'todos') => horarios.filter((horario) => periodo === 'todos' || (periodo === 'manana' ? horario.horaInicio < '12:00' : horario.horaInicio >= '12:00'));
