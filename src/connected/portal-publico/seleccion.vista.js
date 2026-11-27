import { etiquetaFecha, fechaValida } from './portal.fechas.js';
import { anuncioPortal, crearAnunciador, enfocarControlPortal } from './portal.accesibilidad.js';
import { renderIcono } from '../../shared/iconos.catalogo.js';
import { escaparTextoPortal, crearFiltrosIniciales, paginarOpciones, renderFiltrosOpciones, renderPaginacionOpciones, renderEsqueletoPortal, horariosDelPeriodo } from '../../shared/portal-publico/portal.opciones.js';

// Escape local para no importar el módulo UI del panel ni sus datos de demo.
const nombres = ['Servicio', 'Sucursal', 'Profesional', 'Fecha y hora'];
const titulos = ['Elige un servicio', 'Elige una sucursal', 'Elige un profesional', 'Elige fecha y hora'];
const claves = ['servicioId', 'sucursalId', 'personalId'];
const listas = ['servicios', 'sucursales', 'profesionales'];
const monedaMostrada = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
function cintaFechas(seleccionado, fechasDisponibles = []) {
  if (!fechaValida(seleccionado)) return '';
  return `<div class="portal-cinta-fechas" aria-label="Días con horarios disponibles">${fechasDisponibles.map((valor) => {
    const dia = new Date(`${valor}T12:00:00Z`);
    const diaAbreviado = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short' }).format(dia);
    const mesAbreviado = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'short' }).format(dia);
    return `<button class="portal-boton-fecha ${valor === seleccionado ? 'seleccionado' : ''}" type="button" data-seleccion-fecha="${valor}" aria-pressed="${valor === seleccionado}" aria-label="Consultar ${escaparTextoPortal(etiquetaFecha(valor))}"><span>${escaparTextoPortal(diaAbreviado)}</span><strong>${dia.getUTCDate()}</strong><small>${escaparTextoPortal(mesAbreviado)}</small></button>`;
  }).join('')}</div>`;
}

function renderCalendarioDisponibilidad(estado) {
  const rango = estado.rangoFechas;
  if (!rango) return '';
  const disponibles = new Set(estado.fechasDisponibles);
  const primerDiaMes = `${rango.desde.slice(0, 7)}-01`;
  const iniciar = Date.parse(`${primerDiaMes}T12:00:00Z`);
  const cantidad = new Date(Date.UTC(Number(primerDiaMes.slice(0, 4)), Number(primerDiaMes.slice(5, 7)), 0)).getUTCDate();
  const desplazamiento = new Date(iniciar).getUTCDay();
  const mesEtiqueta = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(iniciar));
  const dias = Array.from({ length: cantidad }, (_, indice) => {
    const valor = new Date(iniciar + indice * 86400000).toISOString().slice(0, 10);
    const habilitado = disponibles.has(valor) && valor >= rango.desde && estado.consulta.estado !== 'cargando';
    const seleccionado = valor === estado.seleccion.fecha;
    return `<button class="portal-calendario-dia ${seleccionado ? 'seleccionado' : ''}" type="button" ${habilitado ? `data-seleccion-fecha="${valor}"` : 'disabled'} aria-label="${escaparTextoPortal(etiquetaFecha(valor))}${habilitado ? ', disponible' : ', no disponible'}" ${habilitado && seleccionado ? 'aria-current="date"' : ''}>${Number(valor.slice(-2))}</button>`;
  }).join('');
  return `<div class="portal-calendario" aria-label="Calendario de disponibilidad"><div class="portal-calendario-cabecera"><strong>${escaparTextoPortal(mesEtiqueta)}</strong><div><button class="btn btn-light" type="button" data-rango-fechas="-1" aria-label="Consultar fechas anteriores" ${primerDiaMes <= `${rango.hoy.slice(0, 7)}-01` || estado.consulta.estado === 'cargando' ? 'disabled' : ''}>‹</button><button class="btn btn-light" type="button" data-rango-fechas="1" aria-label="Consultar fechas siguientes" ${estado.consulta.estado === 'cargando' ? 'disabled' : ''}>›</button></div></div><p class="portal-calendario-ayuda">Solo se pueden elegir los días con horarios disponibles.</p><div class="portal-calendario-cuadricula" role="group" aria-label="Días de ${escaparTextoPortal(mesEtiqueta)}">${['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((dia) => `<span class="portal-calendario-dia-semana">${dia}</span>`).join('')}${Array.from({ length: desplazamiento }, () => '<span aria-hidden="true"></span>').join('')}${dias}</div></div>`;
}

// Radios nativos permiten selección con flechas y Tab. El controlador solo recibe
// IDs presentes en la respuesta pública vigente; el texto siempre se escapa.
export function renderSeleccion(estado) {
  const { paso, seleccion, consulta } = estado;
  const ocupado = consulta.estado === 'cargando';
  const utilizable = consulta.estado === 'lista';
  let contenido;
  if (paso < 3) {
    const elementos = estado.opciones[listas[paso]];
    const filtros = estado.filtros?.[paso] || crearFiltrosIniciales();
    const resultado = paginarOpciones(elementos, paso, filtros);
    contenido = ocupado ? renderEsqueletoPortal() : `${utilizable ? renderFiltrosOpciones(elementos, paso, filtros) : ''}<div id="portal-resultados-opciones" tabindex="-1"><fieldset class="portal-opciones" ${!utilizable ? 'disabled' : ''}><legend class="visually-hidden">${nombres[paso]}</legend>${(utilizable ? resultado.filas : []).map((elemento) => {
      // Un servicio sin costo publicado conserva su duración, sin fabricar $0.
      const detalles = paso === 0 ? [
        `${elemento.duracionMinutos} min`, ...(elemento.costo === undefined ? [] : [monedaMostrada(elemento.costo)]),
      ].join(' · ') : paso === 1 ? [elemento.direccion, elemento.telefono].filter(Boolean).join(' · ') : elemento.especialidad;
      const descripcion = paso === 0 ? elemento.descripcion : paso === 1 ? elemento.indicaciones : '';
      return `<label class="portal-opcion"><input type="radio" name="portal-opcion" data-seleccion="${claves[paso]}" value="${elemento.id}" ${seleccion[claves[paso]] === elemento.id ? 'checked' : ''}><span class="portal-opcion-simbolo" aria-hidden="true">${paso === 0 ? renderIcono('briefcase') : paso === 1 ? renderIcono('pin') : escaparTextoPortal(elemento.nombre.trim().charAt(0))}</span><span class="portal-opcion-texto"><strong>${escaparTextoPortal(elemento.nombre)}</strong>${descripcion ? `<span class="portal-opcion-descripcion">${escaparTextoPortal(descripcion)}</span>` : ''}${detalles ? `<small>${escaparTextoPortal(detalles)}</small>` : ''}</span><span class="portal-opcion-marca" aria-hidden="true">${renderIcono('check')}</span></label>`;
    }).join('')}</fieldset>${utilizable && !resultado.total ? '<div class="portal-vacio"><h3>No encontramos coincidencias</h3><p>Prueba otra búsqueda o limpia los filtros.</p><button type="button" class="btn btn-light" data-portal-limpiar>Limpiar filtros</button></div>' : ''}${utilizable ? renderPaginacionOpciones(resultado) : ''}</div>`;
  } else {
    const zona = estado.zonaHoraria || estado.opciones.sucursales.find((elemento) => elemento.id === seleccion.sucursalId)?.zonaHoraria;
    const horariosVisibles = horariosDelPeriodo(estado.horarios, estado.periodo);
    const siguienteFecha = (estado.fechasDisponibles || []).find((fecha) => fecha > seleccion.fecha);
    contenido = `<p class="portal-fecha-etiqueta">Fecha de tu cita${fechaValida(seleccion.fecha) ? `: ${escaparTextoPortal(etiquetaFecha(seleccion.fecha))}` : ''}</p>
      <p id="portal-zona" class="portal-zona">Horarios de la sucursal · ${escaparTextoPortal(zona)}</p>
      ${renderCalendarioDisponibilidad(estado)}
      ${cintaFechas(seleccion.fecha, estado.fechasDisponibles)}
      <h3 class="portal-dia">Horarios disponibles${fechaValida(seleccion.fecha) ? ` para ${escaparTextoPortal(etiquetaFecha(seleccion.fecha))}` : ''}</h3>
      ${ocupado ? renderEsqueletoPortal(true) : ''}
      ${utilizable ? `<div class="portal-periodos" role="group" aria-label="Filtrar horarios por parte del día">${[['todos', 'Todos'], ['manana', 'Mañana'], ['tarde', 'Tarde']].map(([valor, etiqueta]) => `<button class="btn btn-light" type="button" data-portal-periodo="${valor}" aria-pressed="${(estado.periodo || 'todos') === valor}">${etiqueta} (${horariosDelPeriodo(estado.horarios, valor).length})</button>`).join('')}</div>` : ''}
      <fieldset class="portal-horarios" ${!utilizable ? 'disabled' : ''}><legend class="visually-hidden">Horarios disponibles en la zona ${escaparTextoPortal(zona)}</legend>${(utilizable ? horariosVisibles : []).map((horario) =>
        `<label class="portal-horario"><input type="radio" name="portal-horario" value="${escaparTextoPortal(horario.inicioUtc)}" data-horario ${seleccion.horario?.inicioUtc === horario.inicioUtc ? 'checked' : ''}><span>${escaparTextoPortal(horario.horaInicio)}</span></label>`).join('')}</fieldset>
      ${seleccion.horario ? `<p class="portal-horario-elegido">Horario seleccionado: ${escaparTextoPortal(seleccion.horario.horaInicio)} · ${escaparTextoPortal(zona)}</p>` : ''}
      ${utilizable && !horariosVisibles.length ? '<div class="portal-vacio"><h3>No hay horarios en esta parte del día</h3><p>Consulta todos los horarios o elige otra fecha.</p><button class="btn btn-light" type="button" data-portal-periodo="todos">Ver todos los horarios</button></div>' : ''}
      ${consulta.estado === 'vacia' ? `<div class="portal-vacio"><h3>No hay horarios disponibles para esta fecha</h3><p>Elige otro día para consultar horarios.</p>${!estado.fechasDisponibles?.length ? '<p>No encontramos horarios disponibles en las fechas consultadas. Prueba otra fecha, sucursal o profesional.</p>' : ''}${siguienteFecha ? `<button class="btn btn-primary" type="button" data-seleccion-fecha="${siguienteFecha}">Ver siguiente día disponible</button>` : ''}<button class="btn btn-light" type="button" data-cambiar-fecha>Cambiar fecha</button></div>` : ''}
      <p class="portal-limite">${estado.reservaDisponible ? 'El horario se comprobará de nuevo antes de conceder un apartado de cinco minutos.' : 'La consulta de horarios no garantiza una reserva. El apartado y la captura de datos aún no están disponibles en esta entrega.'}</p>`;
  }
  return `<div class="portal-paso-encabezado"><span class="portal-paso-antetitulo" aria-current="step">PASO ${String(paso + 1).padStart(2, '0')} DE 06</span><h2 id="portal-titulo-paso" tabindex="-1">${titulos[paso]}</h2><p>${['Selecciona el servicio que necesitas.', 'Elige la ubicación más cómoda para ti.', 'Conoce al equipo disponible para tu servicio.', 'Selecciona la fecha y el horario que mejor te convengan.'][paso]}</p></div>
    <div aria-busy="${ocupado}">${contenido}</div>
    <p id="portal-estado-seleccion" ${paso === 3 && consulta.estado === 'vacia' ? 'class="visually-hidden"' : ''}>${escaparTextoPortal(consulta.mensaje)}</p>
    ${(estado.pasosAutomaticos || []).length ? `<p class="portal-nota-automatica">${estado.pasosAutomaticos.map((valor) => nombres[valor]).join(' y ')}: selección automática por ser la única opción disponible.</p>` : ''}
    <div class="portal-acciones-seleccion">${paso < 3 && seleccion[claves[paso]] ? `<p class="portal-opcion-elegida">Seleccionado: <strong>${escaparTextoPortal(estado.opciones[listas[paso]].find((elemento) => elemento.id === seleccion[claves[paso]])?.nombre || '')}</strong></p>` : ''}${paso ? '<button type="button" class="btn btn-light" data-seleccion-volver>Volver</button>' : ''}
      ${['error', 'invalida'].includes(consulta.estado) || (paso < 3 && consulta.estado === 'vacia') ? '<button type="button" class="btn btn-light" data-seleccion-reintentar>Reintentar consulta</button>' : ''}
      ${paso < 3 ? `<button type="button" class="btn btn-primary" data-seleccion-continuar ${!utilizable || !seleccion[claves[paso]] ? 'disabled' : ''}>Continuar</button>` : estado.reservaDisponible ? `<button type="button" class="btn btn-primary" data-seleccion-continuar ${!utilizable || !seleccion.horario ? 'disabled' : ''}>Apartar este horario</button>` : ''}</div>`;
}

// Los eventos delegados sobreviven al render. Tras cambiar de paso el foco va al
// título; al refrescar una consulta conserva fecha/radio/botón cuando aún existe.
export function montarSeleccion(contenedor, controlador, renderVista = renderSeleccion) {
  // Una única región viva sobrevive a los cambios de pantalla. El contenido
  // visible conserva sus ayudas por ID, sin generar anuncios duplicados.
  const contenido = document.createElement('div');
  const anuncioEnVivo = document.createElement('p');
  anuncioEnVivo.className = 'visually-hidden';
  anuncioEnVivo.setAttribute('role', 'status'); anuncioEnVivo.setAttribute('aria-live', 'polite'); anuncioEnVivo.setAttribute('aria-atomic', 'true');
  contenedor.append(contenido, anuncioEnVivo);
  const anunciar = crearAnunciador(anuncioEnVivo);
  const actualizarFiltro = (evento) => {
    if (evento.isComposing) return;
    if (evento.target.matches('[data-portal-filtro]')) controlador.actualizarFiltros(evento.target.dataset.portalFiltro, evento.target.value);
  };
  contenedor.addEventListener('input', (evento) => { if (evento.target.type === 'search') actualizarFiltro(evento); });
  contenedor.addEventListener('compositionend', actualizarFiltro);
  contenedor.addEventListener('change', (evento) => {
    const entrada = evento.target;
    if (entrada.matches('[data-seleccion]')) controlador.elegir(entrada.dataset.seleccion, Number(entrada.value));
    else if (entrada.matches('[data-horario]')) controlador.elegirHorario(entrada.value);
    else if (entrada.matches('select[data-portal-filtro]')) actualizarFiltro(evento);
  });
  contenedor.addEventListener('click', (evento) => {
    const pagina = evento.target.closest('[data-portal-pagina]');
    if (pagina && !pagina.disabled) { controlador.actualizarFiltros('pagina', pagina.dataset.portalPagina); enfocarControlPortal(contenedor.querySelector('#portal-resultados-opciones')); return; }
    if (evento.target.closest('[data-portal-limpiar]')) { controlador.actualizarFiltros('limpiar'); enfocarControlPortal(contenedor.querySelector('#portal-busqueda') || contenedor.querySelector('#portal-titulo-paso')); return; }
    const periodo = evento.target.closest('[data-portal-periodo]');
    if (periodo) { controlador.seleccionarPeriodo(periodo.dataset.portalPeriodo); return; }
    if (evento.target.closest('[data-cambiar-fecha]')) { enfocarControlPortal(contenedor.querySelector('.portal-calendario-dia:not(:disabled)') || contenedor.querySelector('.portal-calendario-cabecera button:not(:disabled)')); return; }
    const rango = evento.target.closest('[data-rango-fechas]');
    if (rango && !rango.disabled) { void controlador.desplazarRangoFechas(Number(rango.dataset.rangoFechas)); return; }
    if (evento.target.closest('[data-seleccion-continuar]')) void controlador.continuar();
    else if (evento.target.closest('[data-seleccion-volver]')) void controlador.volver();
    else if (evento.target.closest('[data-seleccion-reintentar]')) void controlador.reintentar();
    else if (evento.target.closest('[data-seleccion-fecha]')) void controlador.seleccionarFecha(evento.target.closest('[data-seleccion-fecha]').dataset.seleccionFecha);
  });
  let ultimoPaso;
  let ultimaFechaSeleccionada;
  return (estado) => {
    const activo = document.activeElement;
    const dentro = contenedor.contains(activo);
    const idPrevio = dentro ? activo.id : '';
    const nombrePrevio = dentro ? activo.getAttribute('name') : '';
    const valorPrevio = dentro ? activo.getAttribute('value') : '';
    const fechaPrevia = dentro ? activo.dataset.seleccionFecha : '';
    const rangoPrevio = dentro ? activo.dataset.rangoFechas : '';
    const periodoPrevio = dentro ? activo.dataset.portalPeriodo : '';
    const resumenEstabaAbierto = contenido.querySelector('.portal-resumen-desplegable')?.open;
    const acciones = ['seleccion-continuar', 'seleccion-volver', 'seleccion-reintentar', 'volver-disponibilidad', 'verificar-apartado', 'enviar-reserva', 'resolver-envio', 'repetir-envio', 'revisar-contacto'];
    const accionPrevia = dentro ? acciones.find((clave) => activo.hasAttribute(`data-${clave}`)) : null;
    const clavePaso = `${estado.fase}:${estado.paso}`;
    const cambioPaso = ultimoPaso !== clavePaso;
    const rango = dentro && typeof activo.selectionStart === 'number' ? [activo.selectionStart, activo.selectionEnd] : null;
    const cintaFechasAnterior = contenido.querySelector('.portal-cinta-fechas');
    const desplazamientoFechas = cintaFechasAnterior?.scrollLeft || 0;
    const fechaSeleccionadaPrevia = cintaFechasAnterior?.querySelector('.portal-boton-fecha.seleccionado')?.dataset.seleccionFecha;
    contenido.innerHTML = renderVista(estado);
    const resumen = contenido.querySelector('.portal-resumen-desplegable');
    if (resumen && resumenEstabaAbierto !== undefined) resumen.open = resumenEstabaAbierto;
    const cintaFechas = contenido.querySelector('.portal-cinta-fechas');
    if (cintaFechas) {
      const fechaElegida = cintaFechas.querySelector('.portal-boton-fecha.seleccionado');
      const primeraFecha = cintaFechas.querySelector('.portal-boton-fecha');
      if (fechaElegida && primeraFecha && (ultimaFechaSeleccionada !== estado.seleccion?.fecha || fechaSeleccionadaPrevia !== estado.seleccion.fecha)) {
        const fechaAnterior = fechaElegida.previousElementSibling;
        cintaFechas.scrollLeft = fechaElegida.offsetLeft - primeraFecha.offsetLeft - (fechaAnterior ? fechaAnterior.offsetWidth + 9 : 0);
      } else cintaFechas.scrollLeft = desplazamientoFechas;
    }
    const cinta = contenedor.querySelector('.portal-pasos');
    const pasoActual = cinta?.querySelector('[aria-current="step"]');
    if (pasoActual && cinta.scrollWidth > cinta.clientWidth) {
      const rectanguloCinta = cinta.getBoundingClientRect();
      const rectanguloPaso = pasoActual.getBoundingClientRect();
      cinta.scrollLeft += rectanguloPaso.left - rectanguloCinta.left - (cinta.clientWidth - rectanguloPaso.width) / 2;
    }
    if (cambioPaso) enfocarControlPortal(contenedor.querySelector('#portal-titulo-paso'));
    else if (dentro) {
      const destino = idPrevio ? contenedor.querySelector(`#${idPrevio}`) : rangoPrevio
        ? contenedor.querySelector(`[data-rango-fechas="${rangoPrevio}"]`)
        : fechaPrevia
        ? [...contenedor.querySelectorAll('[data-seleccion-fecha]')].find((boton) => boton.dataset.seleccionFecha === fechaPrevia)
        : periodoPrevio ? [...contenedor.querySelectorAll('[data-portal-periodo]')].find((boton) => boton.dataset.portalPeriodo === periodoPrevio)
        : nombrePrevio
        ? [...contenedor.querySelectorAll('input')].find((entrada) => entrada.name === nombrePrevio && entrada.value === valorPrevio)
        : accionPrevia ? contenedor.querySelector(`[data-${accionPrevia}]`) : null;
      if (destino && !destino.disabled) enfocarControlPortal(destino, rango);
      else enfocarControlPortal(contenedor.querySelector('#portal-titulo-paso'));
    }
    ultimoPaso = clavePaso;
    ultimaFechaSeleccionada = estado.seleccion?.fecha;
    const mostrandoOpciones = estado.fase === 'seleccion' && estado.paso < 3 && estado.consulta.estado === 'lista';
    const resultado = mostrandoOpciones ? paginarOpciones(estado.opciones[listas[estado.paso]], estado.paso, estado.filtros?.[estado.paso]) : null;
    anunciar(mostrandoOpciones ? `${resultado.total} opciones encontradas. Página ${resultado.pagina} de ${resultado.paginas}.${estado.pasosAutomaticos?.length ? ' Se seleccionaron automáticamente las etapas con una única opción disponible.' : ''}` : anuncioPortal(estado));
  };
}
