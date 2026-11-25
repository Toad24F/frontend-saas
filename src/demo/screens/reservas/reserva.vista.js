import './reserva.estilos.css';
import '../../../shared/portal-publico/portal.opciones.css';
import { crearFiltrosIniciales, paginarOpciones, renderFiltrosOpciones, renderPaginacionOpciones, horariosDelPeriodo } from '../../../shared/portal-publico/portal.opciones.js';
import {
  datosAplicacion,
  listarRegistros as lista,
  obtenerRecurso as recurso,
  obtenerNegocio as negocioPorId,
  HOY,
  formatearFecha,
  crearFecha,
  formatearMoneda,
  ampliarDatosCita as informacionCita,
} from '../../../shared/aplicacion.datos.js';
import { estadoAplicacion as estado, montarSelectorTema } from '../../../shared/aplicacion.nucleo.js';
import { renderIcono as icono } from '../../../shared/iconos.catalogo.js';
import { escaparHtml as escapar, avatar, renderEstadoVacio as renderVacio, mostrarAviso } from '../../../shared/interfaz.componentes.js';
import {
  buscarFechasDemo,
  apartarHorarioDemo,
  liberarApartadoDemo,
  crearCitaDemo,
} from '../../disponibilidad.motor.js';

let reserva = {
  negocioId: null,
  paso: 1,
  servicioId: null,
  sucursalId: null,
  profesionalId: null,
  fecha: HOY,
  horaElegida: null,
  apartado: null,
  contacto: { nombre: '', telefono: '', motivo: '' },
  citaConfirmada: null,
};
let ultimaClavePaso = '';
let filtros = Array.from({ length: 3 }, crearFiltrosIniciales);
let pasosAutomaticos = [];
let periodo = 'todos';
const nombresPasos = [
  'Servicio',
  'Sucursal',
  'Profesional',
  'Fecha y hora',
  'Tus datos',
  'Confirmación',
];
const titulosPasos = [
  'Elige un servicio',
  'Elige una sucursal',
  'Elige un profesional',
  'Elige fecha y hora',
  'Completa tus datos',
  // La cita simulada nace pendiente, igual que el resultado del portal conectado.
  'Tu cita está pendiente',
];
const descripcionesPasos = [
  'Selecciona el servicio que necesitas.',
  'Elige la ubicación más cómoda para ti.',
  'Conoce al equipo disponible para tu servicio.',
  // La demo conserva su motor local; no presenta estos horarios como respuesta de la API.
  'Selecciona la fecha y el horario que mejor te convengan. Los horarios de esta demo son simulados.',
  // La exclusión entre pestañas y el reloj de servidor pertenecen al portal conectado.
  'Solo necesitamos algunos datos para preparar tu visita. Este apartado es simulado y solo funciona en esta pestaña.',
  'Esta reserva de demostración está pendiente de confirmación.',
];
function opciones() {
  return {
    tenantId: reserva.negocioId,
    serviceId: reserva.servicioId,
    branchId: reserva.sucursalId,
    professionalId: reserva.profesionalId,
    day: reserva.fecha,
  };
}
function reiniciar(id) {
  filtros = Array.from({ length: 3 }, crearFiltrosIniciales); pasosAutomaticos = []; periodo = 'todos';
  if (reserva.apartado) liberarApartadoDemo(reserva.apartado.id);
  reserva = {
    negocioId: id,
    paso: 1,
    servicioId: null,
    sucursalId: null,
    profesionalId: null,
    fecha: HOY,
    horaElegida: null,
    apartado: null,
    contacto: { nombre: '', telefono: '', motivo: '' },
    citaConfirmada: null,
  };
}
export function renderPortalReservas(slug) {
  const negocio = datosAplicacion.tenants.find((t) => t.slug === slug);
  if (!negocio || negocio.suspended) {
    document.querySelector('#app').innerHTML =
      `<div class="portal-demo-no-disponible"><a class="marca portal-demo-marca" href="/admin/agenda" data-nav="agenda" aria-label="Citalendar: volver al panel"><img class="logo-marca-claro" src="/brand/citalendar-logo.svg" alt=""/><img class="logo-marca-oscuro" src="/brand/citalendar-logo-light.svg" alt=""/></a>${renderVacio('Este portal no está disponible', 'Revisa el enlace o comunícate directamente con el negocio.', '<a href="/admin/agenda" data-nav="agenda" class="btn btn-light">Volver a la demostración</a>')}</div>`;
    return;
  }
  if (reserva.negocioId !== negocio.id) reiniciar(negocio.id);
  if (estado.negocioId !== negocio.id) {
    estado.sucursal = estado.profesional = estado.estadoCita = 'all';
    estado.profesionalHorario = null;
  }
  estado.negocioId = negocio.id;
  const pasoAnterior = Number(ultimaClavePaso.split(':')[1]);
  document.body.dataset.direccionAnimacion = reserva.paso < pasoAnterior ? 'retroceso' : 'avance';
  const clavePaso = `${negocio.id}:${reserva.paso}`;
  const animarPaso = clavePaso !== ultimaClavePaso;
  ultimaClavePaso = clavePaso;
  document.querySelector('#app').innerHTML =
    `<div class="reserva-demo"><header class="portal-demo-barra"><a class="marca portal-demo-marca" href="/reservas/${negocio.slug}" data-reserva-demo-reiniciar aria-label="Citalendar: reiniciar reserva"><img class="logo-marca-claro" src="/brand/citalendar-logo.svg" alt=""/><img class="logo-marca-oscuro" src="/brand/citalendar-logo-light.svg" alt=""/></a><span class="portal-demo-subtitulo">Un momento para tu bienestar</span><a class="boton-texto" href="/admin/agenda" data-nav="agenda">${icono('left')} Volver al panel <span class="indicador-demo">Demo</span></a></header><main class="reserva-demo-contenido"><div class="reserva-demo-negocio">${avatar(negocio.initials, 'menta', 'avatar-grande')}<div><h1>${escapar(negocio.name)}</h1><p>${escapar(negocio.category)} <span>·</span> Chihuahua, México</p></div><span class="etiqueta-suave">Reservas en línea</span></div><nav class="reserva-demo-pasos" aria-label="Pasos de reserva">${nombresPasos.map((nombre, i) => `<div class="reserva-demo-paso ${reserva.paso === i + 1 ? 'actual' : ''} ${reserva.paso > i + 1 ? 'done' : ''}" ${reserva.paso === i + 1 ? 'aria-current="step"' : ''}><span>${reserva.paso > i + 1 ? icono('check') : i + 1}</span><strong>${nombre}</strong></div>`).join('')}</nav><div class="reserva-demo-columnas"><section class="reserva-demo-superficie ${reserva.paso === 6 ? 'reserva-demo-confirmacion-superficie' : ''} ${animarPaso ? 'animar-entrada' : ''}"><div class="reserva-demo-titulo"><span class="sobretitulo">${reserva.paso === 6 ? 'NOS VEMOS PRONTO' : `PASO ${String(reserva.paso).padStart(2, '0')} DE 06`}</span><h2>${titulosPasos[reserva.paso - 1]}</h2><p>${descripcionesPasos[reserva.paso - 1]}</p></div>${renderContenidoPaso()}${reserva.paso < 5 ? `<div class="reserva-demo-controles"><button class="btn btn-discreto" data-reserva-demo-volver ${reserva.paso === 1 ? 'disabled' : ''}>${icono('left')}Atrás</button><button class="btn btn-primary" data-reserva-demo-continuar ${puedeContinuar() ? '' : 'disabled'}>Continuar ${icono('arrow')}</button></div>` : ''}</section><aside class="reserva-demo-lateral"><details class="reserva-demo-resumen-desplegable" ${matchMedia('(min-width: 768px)').matches ? 'open' : ''}><summary>Ver resumen de tu cita</summary>${reserva.paso === 6 ? renderNotaVisita(negocio) : resumen(negocio)}<div class="reserva-demo-privacidad">${icono('shield')}<p>Este es un prototipo. Usa datos ficticios; no se realiza una reserva real ni se envían mensajes.</p></div></details></aside></div></main><footer class="portal-demo-pie"><span>Reservas con <strong>Citalendar</strong></span></footer></div>`;
  montarSelectorTema();
  const cintaPasos = document.querySelector('.reserva-demo-pasos');
  const pasoActivo = cintaPasos?.querySelector('.reserva-demo-paso.actual');
  if (pasoActivo && cintaPasos.scrollWidth > cintaPasos.clientWidth) {
    const rectanguloCinta = cintaPasos.getBoundingClientRect();
    const rectanguloActivo = pasoActivo.getBoundingClientRect();
    cintaPasos.scrollLeft += rectanguloActivo.left - rectanguloCinta.left
      - (cintaPasos.clientWidth - rectanguloActivo.width) / 2;
  }
}
function puedeContinuar() {
  return Boolean(
    [
      null,
      reserva.servicioId,
      reserva.sucursalId,
      reserva.profesionalId,
      reserva.horaElegida,
    ][reserva.paso],
  );
}
function opcion(id, tipo, contenido, seleccionado) {
  return `<button class="reserva-demo-opcion ${seleccionado === id ? 'seleccionado' : ''}" data-reserva-demo-opcion="${tipo}" data-valor-opcion="${id}" aria-pressed="${seleccionado === id}">${contenido}<span class="reserva-demo-opcion-marca">${seleccionado === id ? icono('check') : ''}</span></button>`;
}
function opcionesDemo(paso) {
  const profesionales = lista('professionals', reserva.negocioId).filter((p) => p.active !== false && p.serviceIds.includes(reserva.servicioId));
  if (paso === 1) return lista('services', reserva.negocioId).filter((s) => s.active !== false).map((s) => ({ id: s.id, nombre: s.name, descripcion: s.description, duracionMinutos: s.duration, entity: s }));
  if (paso === 2) return lista('branches', reserva.negocioId).filter((b) => b.active !== false && profesionales.some((p) => p.branchIds.includes(b.id))).map((b) => ({ id: b.id, nombre: b.name, direccion: b.address, entity: b }));
  return profesionales.filter((p) => p.branchIds.includes(reserva.sucursalId)).map((p) => ({ id: p.id, nombre: p.name, especialidad: p.specialty, entity: p }));
}
function renderCatalogoDemo() {
  const indice = reserva.paso - 1, elementos = opcionesDemo(reserva.paso), resultado = paginarOpciones(elementos, indice, filtros[indice]);
  filtros[indice].pagina = resultado.pagina;
  const clave = ['servicioId', 'sucursalId', 'profesionalId'][indice];
  const seleccionado = elementos.find((elemento) => elemento.id === reserva[clave]);
  return `${renderFiltrosOpciones(elementos, indice, filtros[indice])}<div id="portal-resultados-opciones" tabindex="-1"><div class="reserva-demo-opciones">${resultado.filas.map(({ entity: elemento, id, nombre }) => opcion(id, clave, `<span class="icono-servicio naranja">${icono(indice === 0 ? 'briefcase' : indice === 1 ? 'pin' : 'stethoscope')}</span><span class="reserva-demo-opcion-texto"><strong>${escapar(nombre)}</strong><p>${escapar(indice === 0 ? elemento.description : indice === 1 ? elemento.address : elemento.specialty)}</p>${indice === 0 ? `<small>${elemento.duration} min · ${formatearMoneda(elemento.price)} MXN</small>` : ''}</span>`, reserva[clave])).join('') || renderVacio(elementos.length ? 'No encontramos coincidencias' : 'No hay opciones disponibles', 'Prueba otra búsqueda o cambia tu selección.')}</div>${renderPaginacionOpciones(resultado, true)}</div>${seleccionado ? `<p class="portal-opcion-elegida">Seleccionado: <strong>${escapar(seleccionado.nombre)}</strong></p>` : ''}${pasosAutomaticos.length ? '<p class="portal-nota-automatica">Se seleccionaron automáticamente las etapas con una única opción disponible.</p>' : ''}`;
}
function renderContenidoPaso() {
  const t = negocioPorId(reserva.negocioId);
  if (reserva.paso <= 3) return renderCatalogoDemo();
  if (reserva.paso === 4) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reserva.fecha)) return '<p id="reserva-demo-error-fecha" role="alert">Elige una fecha válida para consultar horarios.</p>';
    let fechas = buscarFechasDemo({ ...opciones(), from: HOY }, 45);
    if (t.mode === 'compact') fechas = fechas.slice(0, 1);

    const disponibles = fechas.find((d) => d.day === reserva.fecha)?.slots || [];
    const mostrados = horariosDelPeriodo(disponibles.map((horaInicio) => ({ horaInicio })), periodo).map((horario) => horario.horaInicio);
    const siguienteDia = fechas.find((d) => d.day > reserva.fecha)?.day;
    const diasDisponibles = new Set(fechas.map((elemento) => elemento.day));
    const marcaInicio = Date.parse(`${HOY}T12:00:00Z`);
    const calendario = Array.from({ length: 45 }, (_, indice) => {
      const dia = new Date(marcaInicio + indice * 86400000).toISOString().slice(0, 10);
      const habilitado = diasDisponibles.has(dia);
      return `<button class="reserva-demo-calendario-dia ${reserva.fecha === dia ? 'seleccionado' : ''}" type="button" ${habilitado ? `data-reserva-demo-fecha="${dia}"` : 'disabled'} aria-label="${formatearFecha(dia)}${habilitado ? ', disponible en esta demostración' : ', no disponible en esta demostración'}">${crearFecha(dia).getDate()}</button>`;
    }).join('');
    return `<p class="form-label">Fecha de tu cita: ${formatearFecha(reserva.fecha)}</p><div class="reserva-demo-encabezado-fecha"><h3>Próximos 45 días</h3><span>${icono('clock')} Hora de Chihuahua · Demo</span></div><p class="reserva-demo-calendario-ayuda">Los días grises no tienen horarios en esta simulación.</p><div class="reserva-demo-calendario-cuadricula" role="group" aria-label="Días de demostración">${['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((dia) => `<span class="reserva-demo-calendario-dia-semana">${dia}</span>`).join('')}${Array.from({ length: new Date(marcaInicio).getUTCDay() }, () => '<span aria-hidden="true"></span>').join('')}${calendario}</div><div class="reserva-demo-cinta-fechas">${fechas
      .slice(0, 14)
      .map(
        (d) =>
          `<button class="reserva-demo-fecha ${d.day === reserva.fecha ? 'seleccionado' : ''}" data-reserva-demo-fecha="${d.day}" aria-label="${formatearFecha(d.day)}" aria-pressed="${d.day === reserva.fecha}"><span>${formatearFecha(d.day, { weekday: 'short' })}</span><strong>${crearFecha(d.day).getDate()}</strong><small>${formatearFecha(d.day, { month: 'short' })}</small></button>`,
      )
      .join(
        '',
      )}</div>${t.mode === 'compact' ? '<div class="nota-informativa nota-compacta">Mostramos el primer día disponible y horarios contiguos para aprovechar mejor la jornada.</div>' : ''}<h3 class="reserva-demo-encabezado-horarios">Horarios disponibles</h3><div class="portal-periodos" role="group" aria-label="Filtrar horarios por parte del día">${[['todos', 'Todos'], ['manana', 'Mañana'], ['tarde', 'Tarde']].map(([valor, etiqueta]) => `<button class="btn btn-light" type="button" data-portal-periodo="${valor}" aria-pressed="${periodo === valor}">${etiqueta} (${horariosDelPeriodo(disponibles.map((horaInicio) => ({ horaInicio })), valor).length})</button>`).join('')}</div><div class="reserva-demo-cuadricula-horarios">${mostrados.map((soloHora) => `<button class="reserva-demo-horario ${reserva.horaElegida === soloHora ? 'seleccionado' : ''}" data-reserva-demo-horario="${soloHora}" aria-pressed="${reserva.horaElegida === soloHora}">${soloHora}</button>`).join('')}</div>${reserva.horaElegida ? `<p class="portal-horario-elegido">Horario seleccionado: ${reserva.horaElegida} · Hora de Chihuahua</p>` : ''}${disponibles.length && !mostrados.length ? renderVacio('No hay horarios en esta parte del día', 'Consulta todos los horarios o elige otra fecha.') : ''}${disponibles.length ? '' : renderVacio('No hay horarios disponibles para esta fecha', 'Elige otro día para consultar horarios. La búsqueda simulada cubre los próximos 45 días.', siguienteDia ? `<button type="button" class="btn btn-light" data-reserva-demo-fecha="${siguienteDia}">Ver siguiente día disponible</button>` : '')}<p class="ayuda-campo mt-4">${icono('info')} Tu horario se apartará durante 5 minutos en el siguiente paso.</p>`;
  }
  if (reserva.paso === 5)
    return `<form id="reserva-demo-formulario"><div class="reserva-demo-aviso-apartado">${icono('lock')}<span>Estamos guardando tu horario.<br/><small>Completa tus datos en <strong id="reserva-demo-contador">05:00</strong></small></span><progress class="reserva-demo-progreso-apartado" id="reserva-demo-progreso-apartado" max="300" value="300" aria-label="Tiempo restante del apartado"></progress></div><div class="campo-formulario"><label class="form-label" for="reserva-demo-nombre">Nombre completo <span>*</span></label><input class="form-control" id="reserva-demo-nombre" name="nombre" required maxlength="150" placeholder="Tu nombre y apellidos" value="${escapar(reserva.contacto.nombre)}" autocomplete="off"/></div><div class="campo-formulario"><label class="form-label" for="reserva-demo-telefono">Teléfono de WhatsApp <span>*</span></label><div class="reserva-demo-campo-telefono"><span>MX +52</span><input class="form-control" id="reserva-demo-telefono" name="telefono" type="tel" inputmode="numeric" pattern="[0-9]{10}" minlength="10" maxlength="10" required placeholder="614 000 0000" value="${escapar(reserva.contacto.telefono)}" autocomplete="off"/></div><p class="ayuda-campo">10 dígitos, sin espacios ni código de país.</p></div><div class="campo-formulario"><label class="form-label" for="reserva-demo-motivo">Motivo de consulta <span class="opcional">(opcional)</span></label><textarea class="form-control" id="reserva-demo-motivo" name="motivo" rows="3" maxlength="500" placeholder="¿Hay algo que debamos saber?">${escapar(reserva.contacto.motivo)}</textarea></div><p class="reserva-demo-nota-privacidad">Usa información ficticia. Tus datos solo se conservarán mientras esta demostración esté abierta.</p><p class="error-formulario" id="reserva-demo-error" role="alert" hidden></p><div class="reserva-demo-controles"><button type="button" class="btn btn-discreto" data-reserva-demo-volver>${icono('left')}Atrás</button><button type="submit" class="btn btn-primary">Confirmar mi cita ${icono('check')}</button></div></form>`;
  const a = informacionCita(reserva.citaConfirmada);
  // La confirmación de demostración comparte la información visible del portal conectado.
  return `<div class="reserva-demo-confirmacion-contenido"><span class="reserva-demo-confirmacion-marca">${icono('check')}</span><h3>¡Listo, ${escapar(a.client.name.split(' ')[0])}!</h3><p>Esta cita de demostración está pendiente de confirmación.</p><div class="reserva-demo-confirmacion-detalles"><span>${icono('briefcase')}<strong>${escapar(a.service.name)}</strong></span><span>${icono('calendar')}${formatearFecha(a.date)} · ${a.start} h</span><span>${icono('stethoscope')}${escapar(a.professional.name)}</span><span>${icono('pin')}${escapar(a.branch.name)}</span></div><div class="nota-informativa nota-compacta">${icono('info')} No se ha realizado ningún cobro. No se enviará WhatsApp en este prototipo.</div><button class="btn btn-primary w-100 mt-4" data-reserva-demo-reiniciar>Reservar otra cita ${icono('arrow')}</button><a href="/admin/agenda" data-nav="agenda" class="boton-texto reserva-demo-confirmacion-panel">Ver cita en el panel ${icono('external')}</a></div>`;
}
function resumen(t) {
  const s = reserva.servicioId
      ? recurso('services', reserva.servicioId, t.id)
      : null,
    b = reserva.sucursalId ? recurso('branches', reserva.sucursalId, t.id) : null,
    p = reserva.profesionalId
      ? recurso('professionals', reserva.profesionalId, t.id)
      : null;
  return `<div class="reserva-demo-resumen efecto-cristal"><div class="reserva-demo-resumen-encabezado">${icono('calendar')}<h3>Tu próxima visita</h3></div><p>Un espacio reservado para ti.</p><div class="reserva-demo-resumen-elementos">${[
    [s?.name, 'Selecciona un servicio', 'briefcase'],
    [b?.name, 'Elige tu sucursal', 'pin'],
    [p?.name, 'Elige un profesional', 'stethoscope'],
    [
      reserva.horaElegida
        ? `${formatearFecha(reserva.fecha, { day: 'numeric', month: 'short' })} · ${reserva.horaElegida} h`
        : null,
      'Encuentra tu horario',
      'clock',
    ],
  ]
    .map(
      ([valor, alternativo, i]) =>
        `<div class="${valor ? 'con-valor' : ''}">${icono(i)}<span>${escapar(valor || alternativo)}</span></div>`,
    )
    .join(
      '',
    )}</div>${s ? `<div class="reserva-demo-resumen-precio"><span>${s.duration} minutos</span><strong>${formatearMoneda(s.price)} <small>MXN</small></strong></div><p class="reserva-demo-resumen-pago">Pago directamente en sucursal.</p>` : ''}<div class="reserva-demo-resumen-flor" aria-hidden="true">${icono('leaf')}</div></div>`;
}
function renderNotaVisita(t) {
  return `<div class="reserva-demo-resumen efecto-cristal"><div class="reserva-demo-resumen-encabezado">${icono('heart')}<h3>Antes de tu visita</h3></div><p>Te recomendamos llegar 10 minutos antes de tu cita.</p><div class="reserva-demo-resumen-elementos"><div class="con-valor">${icono('pin')}<span>${escapar(recurso('branches', reserva.sucursalId, t.id).notes)}</span></div><div class="con-valor">${icono('message')}<span>${escapar(t.phone)}</span></div></div></div>`;
}
const redibujar = () => renderPortalReservas(negocioPorId(reserva.negocioId).slug);
document.addEventListener('click', (evento) => {
  if (!location.pathname.startsWith('/reservas/') || !reserva.negocioId) return;
  const controlPagina = evento.target.closest('[data-portal-pagina]');
  const limpiar = evento.target.closest('[data-portal-limpiar]');
  if ((controlPagina || limpiar) && reserva.paso <= 3) {
    if (controlPagina?.disabled || limpiar?.disabled) return;
    if (limpiar) filtros[reserva.paso - 1] = crearFiltrosIniciales();
    else filtros[reserva.paso - 1].pagina = Number(controlPagina.dataset.portalPagina);
    redibujar(); document.querySelector('#portal-resultados-opciones')?.focus(); return;
  }
  const controlPeriodo = evento.target.closest('[data-portal-periodo]');
  if (controlPeriodo) { periodo = controlPeriodo.dataset.portalPeriodo; redibujar(); return; }
  const controlReinicio = evento.target.closest('[data-reserva-demo-reiniciar]');
  if (controlReinicio) {
    evento.preventDefault();
    reiniciar(reserva.negocioId);
    redibujar();
    return;
  }
  const opcion = evento.target.closest('[data-reserva-demo-opcion]');
  if (opcion) {
    const clave = opcion.dataset.reservaDemoOpcion,
      id = Number(opcion.dataset.valorOpcion);
    const colecciones = {
      servicioId: 'services',
      sucursalId: 'branches',
      profesionalId: 'professionals',
    };
    if (!colecciones[clave]) return;
    recurso(colecciones[clave], id, reserva.negocioId);
    reserva[clave] = id;
    if (clave === 'servicioId') {
      reserva.sucursalId = reserva.profesionalId = null;
      filtros[1] = crearFiltrosIniciales(); filtros[2] = crearFiltrosIniciales(); pasosAutomaticos = [];
    }
    if (clave === 'sucursalId') { reserva.profesionalId = null; filtros[2] = crearFiltrosIniciales(); pasosAutomaticos = pasosAutomaticos.filter((paso) => paso < 3); }
    reserva.horaElegida = null;
    redibujar();
    return;
  }
  const controlFecha = evento.target.closest('[data-reserva-demo-fecha]');
  if (controlFecha) {
    reserva.fecha = controlFecha.dataset.reservaDemoFecha;
    periodo = 'todos';
    reserva.horaElegida = null;
    redibujar();
    return;
  }
  const controlHorario = evento.target.closest('[data-reserva-demo-horario]');
  if (controlHorario) {
    reserva.horaElegida = controlHorario.dataset.reservaDemoHorario;
    redibujar();
    return;
  }
  if (evento.target.closest('[data-reserva-demo-volver]')) {
    if (reserva.apartado) {
      liberarApartadoDemo(reserva.apartado.id);
      reserva.apartado = null;
    }
    do { reserva.paso = Math.max(1, reserva.paso - 1); } while (reserva.paso > 1 && pasosAutomaticos.includes(reserva.paso));
    redibujar();
    return;
  }
  if (evento.target.closest('[data-reserva-demo-continuar]')) {
    if (!puedeContinuar()) return;
    try {
      if (reserva.paso === 4) reserva.apartado = apartarHorarioDemo(opciones(), reserva.horaElegida);
      reserva.paso++;
      while ([2, 3].includes(reserva.paso) && opcionesDemo(reserva.paso).length === 1) {
        reserva[reserva.paso === 2 ? 'sucursalId' : 'profesionalId'] = opcionesDemo(reserva.paso)[0].id;
        if (!pasosAutomaticos.includes(reserva.paso)) pasosAutomaticos.push(reserva.paso);
        reserva.paso++;
      }
      redibujar();
    } catch (error) {
      reserva.horaElegida = null;
      mostrarAviso(error.message);
      redibujar();
    }
    return;
  }
});
document.addEventListener('change', (evento) => {
  if (!location.pathname.startsWith('/reservas/') || !reserva.negocioId) return;
  if (evento.target.matches('select[data-portal-filtro]') && reserva.paso <= 3) { filtros[reserva.paso - 1].filtro = evento.target.value; filtros[reserva.paso - 1].pagina = 1; redibujar(); document.querySelector('#portal-filtro')?.focus(); }
});
document.addEventListener('input', (evento) => {
  if (evento.target.id === 'portal-busqueda' && reserva.paso <= 3 && !evento.isComposing) {
    filtros[reserva.paso - 1].busqueda = evento.target.value; filtros[reserva.paso - 1].pagina = 1;
    const cursor = evento.target.selectionStart; redibujar(); const entrada = document.querySelector('#portal-busqueda'); entrada?.focus(); entrada?.setSelectionRange(cursor, cursor); return;
  }
  if (
    evento.target.closest('#reserva-demo-formulario') &&
    ['nombre', 'telefono', 'motivo'].includes(evento.target.name)
  )
    reserva.contacto[evento.target.name] = evento.target.value;
});
document.addEventListener('compositionend', (evento) => {
  if (evento.target.id !== 'portal-busqueda' || reserva.paso > 3) return;
  filtros[reserva.paso - 1].busqueda = evento.target.value; filtros[reserva.paso - 1].pagina = 1;
  redibujar(); document.querySelector('#portal-busqueda')?.focus();
});
document.addEventListener('submit', (evento) => {
  if (evento.target.id !== 'reserva-demo-formulario') return;
  evento.preventDefault();
  try {
    reserva.citaConfirmada = crearCitaDemo(
      { ...opciones(), start: reserva.horaElegida },
      { name: reserva.contacto.nombre, phone: reserva.contacto.telefono, reason: reserva.contacto.motivo },
      reserva.apartado?.id,
    );
    reserva.apartado = null;
    reserva.paso = 6;
    estado.fecha = reserva.fecha;
    estado.sucursal = String(reserva.citaConfirmada.branchId);
    estado.profesional = estado.estadoCita = 'all';
    redibujar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    const avisoError = document.querySelector('#reserva-demo-error');
    avisoError.hidden = false;
    avisoError.textContent = error.message;
  }
});
setInterval(() => {
  if (!reserva.apartado) return;
  if (!location.pathname.startsWith('/reservas/')) {
    liberarApartadoDemo(reserva.apartado.id);
    reserva.apartado = null;
    reserva.paso = 4;
    return;
  }
  const restante = Math.max(
    0,
    Math.ceil((reserva.apartado.expiresAt - Date.now()) / 1000),
  );
  const temporizador = document.querySelector('#reserva-demo-contador');
  if (temporizador)
    temporizador.textContent = `${String(Math.floor(restante / 60)).padStart(2, '0')}:${String(restante % 60).padStart(2, '0')}`;
  const progreso = document.querySelector('#reserva-demo-progreso-apartado');
  if (progreso) progreso.value = Math.min(300, restante);
  if (!restante) {
    liberarApartadoDemo(reserva.apartado.id);
    reserva.apartado = null;
    reserva.paso = 4;
    reserva.horaElegida = null;
    redibujar();
    mostrarAviso('El tiempo de reserva terminó. Puedes seleccionar otro horario.');
  }
}, 1000);
