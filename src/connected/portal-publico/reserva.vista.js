import { renderSeleccion, montarSeleccion } from './seleccion.vista.js';
import { etiquetaFecha, horaLocal, fechaLocal } from './portal.fechas.js';
import { enfocarControlPortal } from './portal.accesibilidad.js';
import { renderIcono } from '../../shared/iconos.catalogo.js';
import { escaparTextoPortal, renderEsqueletoPortal } from '../../shared/portal-publico/portal.opciones.js';

// Todo dato personal se escapa antes de generar HTML; no se consulta por teléfono.
export function etiquetaContador(ms) {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}
const segundosContador = (ms) => Math.min(300, Math.max(0, Math.ceil(ms / 1000)));
function renderContenido(estado) {
  // La región estable de mountSelection anuncia estos avisos; el texto visible
  // no es otra región viva que compita al reemplazar la pantalla.
  const aviso = estado.aviso ? `<p class="portal-aviso-apartado">${escaparTextoPortal(estado.aviso)}</p>` : '';
  if (estado.fase === 'seleccion') return `${aviso}${renderSeleccion(estado)}`;
  if (estado.fase === 'apartado') return `<h2 id="portal-titulo-paso" tabindex="-1">Apartar tu horario</h2>${aviso}
    ${estado.estadoApartado === 'error-solicitud' ? '<button class="btn btn-primary" type="button" data-seleccion-reintentar>Reintentar el mismo apartado</button>' : `<p>Espera mientras comprobamos el horario. Todavía no se ha creado una cita.</p>${renderEsqueletoPortal(true)}`}`;
  // Estas pantallas no dependen del apartado ni del catálogo: una recuperación
  // tras recarga puede no tener selecciones locales o contacto en memoria.
  if (estado.fase === 'enviando' || estado.fase === 'incierto') return `<h2 id="portal-titulo-paso" tabindex="-1">${estado.fase === 'enviando' ? 'Registrando tu reserva' : estado.envio?.estado === 'cupo-telefono' ? 'No se registró la reserva' : 'Comprueba tu envío'}</h2>
    ${aviso}<p class="portal-limite">${estado.envio?.estado === 'cupo-telefono'
      ? 'El rechazo ya se comprobó. No se iniciará otra reserva con este intento.'
      : 'Mantendremos este intento hasta comprobar su resultado. No inicies otra reserva para resolver una espera.'}</p>
    ${estado.fase === 'incierto' && estado.envio?.estado !== 'cupo-telefono' ? `<div class="portal-acciones-seleccion"><button class="btn btn-primary" type="button" data-resolver-envio ${estado.envio?.estado === 'resolviendo' ? 'disabled' : ''}>Comprobar resultado</button>
    ${estado.envio?.puedeRepetir ? '<button class="btn btn-light" type="button" data-repetir-envio>Reintentar el mismo envío</button>' : ''}</div>` : ''}`;
  if (estado.fase === 'resultado') {
    const resultado = estado.resultado;
    return `<h2 id="portal-titulo-paso" tabindex="-1">Reserva registrada</h2>${aviso}
      <p class="status-badge pendiente portal-resultado-estado">Pendiente</p>
      <p>Conserva el folio de tu reserva.</p><p class="portal-resultado-folio">${escaparTextoPortal(resultado.folio)}</p>
      <dl class="portal-resultado-detalles"><dt>Negocio</dt><dd>${escaparTextoPortal(resultado.nombreNegocio)}</dd>
      <dt>Servicio</dt><dd>${escaparTextoPortal(resultado.nombreServicio)}</dd><dt>Sucursal</dt><dd>${escaparTextoPortal(resultado.nombreSucursal)}</dd>
      <dt>Profesional</dt><dd>${escaparTextoPortal(resultado.nombreProfesional)}</dd>
      <dt>Fecha</dt><dd>${escaparTextoPortal(etiquetaFecha(fechaLocal(resultado.inicioUtc, resultado.zonaHoraria)))}</dd>
      <dt>Horario</dt><dd>${escaparTextoPortal(horaLocal(resultado.inicioUtc, resultado.zonaHoraria))}–${escaparTextoPortal(horaLocal(resultado.finUtc, resultado.zonaHoraria))}</dd>
      <dt>Zona horaria</dt><dd>${escaparTextoPortal(resultado.zonaHoraria)}</dd>${resultado.costo === undefined ? '' : `<dt>Costo</dt><dd>${escaparTextoPortal(resultado.costo)} MXN</dd>`}</dl>`;
  }
  const { contacto, erroresContacto: errores } = estado;
  const activo = estado.estadoApartado === 'vigente' && estado.milisegundosRestantes > 0;
  const entrada = (campo, titulo, tipo = 'text', ayuda = '') => `<div class="portal-campo-contacto"><label for="portal-contacto-${campo}">${titulo}</label>
    <input class="form-control" id="portal-contacto-${campo}" name="${campo}" type="${tipo}" data-campo-contacto="${campo}" autocomplete="off"
      value="${escaparTextoPortal(contacto[campo])}" aria-invalid="${Boolean(errores[campo])}" aria-describedby="portal-contacto-${campo}-ayuda portal-contacto-${campo}-error" ${campo !== 'notas' ? 'required' : ''}>
    <small id="portal-contacto-${campo}-ayuda">${ayuda}</small><p class="portal-error-campo" id="portal-contacto-${campo}-error">${escaparTextoPortal(errores[campo] || '')}</p></div>`;
  return `<h2 id="portal-titulo-paso" tabindex="-1">Completa tus datos</h2>
    <div class="portal-contador-apartado"><div class="portal-linea-contador-apartado"><span>Tiempo restante</span><strong id="portal-tiempo-apartado" role="timer" aria-live="off">${etiquetaContador(estado.milisegundosRestantes)}</strong></div>
      <progress class="portal-progreso-apartado" id="portal-progreso-apartado" max="300" value="${segundosContador(estado.milisegundosRestantes)}" aria-label="Tiempo restante del apartado"></progress></div>
    ${aviso}
    <form id="portal-formulario-contacto" data-formulario-contacto autocomplete="off" novalidate>
      ${entrada('nombre', 'Nombre completo', 'text', 'Hasta 150 caracteres.')}
      ${entrada('telefono', 'Teléfono mexicano', 'tel', 'Diez dígitos; puedes usar +52, espacios y guiones.')}
      <div class="portal-campo-contacto"><label for="portal-contacto-notas">Notas o motivo de consulta (opcional)</label>
        <textarea class="form-control" id="portal-contacto-notas" name="notas" rows="4" data-campo-contacto="notas" autocomplete="off" aria-invalid="${Boolean(errores.notas)}" aria-describedby="portal-contacto-notas-ayuda portal-contacto-notas-error">${escaparTextoPortal(contacto.notas)}</textarea>
        <small id="portal-contacto-notas-ayuda">Hasta 2000 caracteres. Se conservan solo mientras permanezcas en este flujo.</small><p class="portal-error-campo" id="portal-contacto-notas-error">${escaparTextoPortal(errores.notas || '')}</p></div>
      ${errores.formulario ? `<p class="portal-error-campo">${escaparTextoPortal(errores.formulario)}</p>` : ''}
      ${estado.contactoValidado ? '<p id="portal-contacto-validado">Los datos tienen un formato válido. Aún no se ha enviado una reserva.</p>' : ''}
      <p class="portal-limite">La reserva se registrará como pendiente. El apartado no se amplía al escribir, revisar los datos o reintentar.</p>
      <div class="portal-acciones-seleccion"><button class="btn btn-light" type="button" data-volver-disponibilidad ${estado.estadoApartado === 'liberando' ? 'disabled' : ''}>Volver a horarios</button>
        ${['sin-verificar', 'verificando'].includes(estado.estadoApartado) ? `<button class="btn btn-light" type="button" data-verificar-apartado ${estado.estadoApartado === 'verificando' ? 'disabled' : ''}>Comprobar vigencia</button>` : ''}
        <button class="btn btn-light" type="submit" data-revisar-contacto ${!activo ? 'disabled' : ''}>Revisar datos</button>
        <button class="btn btn-primary" type="button" data-enviar-reserva ${!activo ? 'disabled' : ''}>Reservar</button></div>
    </form>`;
}

const nombresPasos = ['Servicio', 'Sucursal', 'Profesional', 'Fecha y hora', 'Tus datos', 'Confirmación'];

export function renderReserva(estado) {
  const paso = estado.fase === 'seleccion' ? estado.paso : estado.fase === 'resultado' ? 5 : 4;
  const resultado = estado.fase === 'resultado' ? estado.resultado : null;
  const opciones = estado.opciones || { servicios: [], sucursales: [], profesionales: [] };
  const elegido = (lista, id) => opciones[lista]?.find((elemento) => elemento.id === id);
  const servicio = elegido('servicios', estado.seleccion?.servicioId);
  const sucursal = elegido('sucursales', estado.seleccion?.sucursalId);
  const profesional = elegido('profesionales', estado.seleccion?.personalId);
  const fecha = estado.seleccion?.fecha && estado.seleccion?.horario
    ? `${etiquetaFecha(estado.seleccion.fecha)} · ${estado.seleccion.horario.horaInicio}${estado.fase === 'formulario' && estado.apartado?.zonaHoraria ? ` · ${estado.apartado.zonaHoraria}` : ''}` : '';
  const resumen = [
    ['Servicio', resultado?.nombreServicio || servicio?.nombre || 'Selecciona un servicio', 'briefcase', Boolean(resultado?.nombreServicio || servicio?.nombre)],
    ['Sucursal', resultado?.nombreSucursal || sucursal?.nombre || 'Elige tu sucursal', 'pin', Boolean(resultado?.nombreSucursal || sucursal?.nombre)],
    ['Profesional', resultado?.nombreProfesional || profesional?.nombre || 'Elige un profesional', 'stethoscope', Boolean(resultado?.nombreProfesional || profesional?.nombre)],
    ['Fecha y hora', resultado ? `${etiquetaFecha(fechaLocal(resultado.inicioUtc, resultado.zonaHoraria))} · ${horaLocal(resultado.inicioUtc, resultado.zonaHoraria)}` : fecha || 'Encuentra tu horario', 'clock', Boolean(resultado || fecha)],
  ];
  // Cada fase usa su propia respuesta pública. Un costo antiguo del catálogo
  // nunca reemplaza una omisión posterior del apartado o resultado histórico.
  const precio = resultado ? resultado.costo : estado.fase === 'seleccion' ? servicio?.costo : estado.apartado?.costo;
  return `<nav class="portal-progreso" aria-label="Pasos de reserva"><ol class="portal-pasos">${nombresPasos.map((nombre, indice) => `<li class="${indice < paso ? 'is-complete' : ''}" ${paso === indice ? 'aria-current="step"' : ''}><span>${indice < paso ? '✓' : indice + 1}</span><strong>${nombre}</strong></li>`).join('')}</ol></nav>
    <div class="portal-reserva-columnas"><section class="portal-reserva-superficie">${renderContenido(estado)}</section>
      <aside class="portal-reserva-lateral" aria-label="Resumen de la reserva"><details class="portal-resumen-desplegable" ${typeof matchMedia === 'undefined' || matchMedia('(min-width: 901px)').matches ? 'open' : ''}><summary>Ver resumen de tu cita</summary><div class="portal-resumen-tarjeta"><div class="portal-resumen-contenido"><div class="portal-resumen-encabezado">${renderIcono('calendar')}<h3>Resumen de tu cita</h3></div><dl class="portal-resumen-elementos">${resumen.map(([etiqueta, valor, simbolo, completo]) => `<div class="${completo ? 'is-filled' : ''}"><dt class="visually-hidden">${etiqueta}</dt><dd>${renderIcono(simbolo)}<span>${escaparTextoPortal(valor)}</span></dd></div>`).join('')}</dl>${precio !== undefined ? `<div class="portal-resumen-precio"><span>${servicio?.duracionMinutos ? `${servicio.duracionMinutos} minutos` : 'Costo de la reserva'}</span><strong>${escaparTextoPortal(precio)} <small>MXN</small></strong></div><p class="portal-resumen-pago">Pago directamente en sucursal.</p>` : ''}</div><span class="portal-resumen-hoja" aria-hidden="true">${renderIcono('leaf')}</span></div>
      <p class="portal-reserva-privacidad">${resultado ? 'Reserva registrada, pendiente de confirmación.' : precio === undefined ? 'La disponibilidad se confirma con el servidor antes de registrar tu reserva.' : 'La disponibilidad y el costo se confirman con el servidor antes de registrar tu reserva.'}</p></details></aside></div>`;
}

// El contador se actualiza sin recrear inputs, para conservar foco, cursor e IME.
export function actualizarTiempoApartado(contenedor, estado) {
  const contador = contenedor.querySelector('#portal-tiempo-apartado');
  if (contador) contador.textContent = etiquetaContador(estado.milisegundosRestantes);
  const progreso = contenedor.querySelector('#portal-progreso-apartado');
  if (progreso) progreso.value = segundosContador(estado.milisegundosRestantes);
}
export function montarReserva(contenedor, flujo) {
  const render = montarSeleccion(contenedor, flujo, renderReserva);
  const amplio = matchMedia('(min-width: 901px)');
  amplio.addEventListener('change', () => { const detalles = contenedor.querySelector('.portal-resumen-desplegable'); if (detalles) detalles.open = amplio.matches; });
  contenedor.addEventListener('input', (evento) => {
    const campo = evento.target.dataset.campoContacto;
    if (campo) {
      flujo.actualizarContacto(campo, evento.target.value);
      // Edición sin render: no interrumpe el cursor, IME o un click en otro campo.
      evento.target.setAttribute('aria-invalid', 'false');
      contenedor.querySelector(`#portal-contacto-${campo}-error`).textContent = '';
      const validado = contenedor.querySelector('#portal-contacto-validado');
      if (validado) validado.hidden = true;
    }
  });
  contenedor.addEventListener('submit', (evento) => {
    if (!evento.target.matches('[data-formulario-contacto]')) return;
    evento.preventDefault(); flujo.validarContacto();
    enfocarControlPortal(contenedor.querySelector('[aria-invalid="true"]'));
  });
  contenedor.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-volver-disponibilidad]')) void flujo.volverADisponibilidad();
    else if (evento.target.closest('[data-verificar-apartado]')) void flujo.verificarVigencia();
    else if (evento.target.closest('[data-enviar-reserva]')) {
      void flujo.enviarReserva().then(() => enfocarControlPortal(contenedor.querySelector('[aria-invalid="true"]')));
    } else if (evento.target.closest('[data-resolver-envio]')) void flujo.resolverEnvio();
    else if (evento.target.closest('[data-repetir-envio]')) void flujo.repetirEnvio();
  });
  return (estado, tipo) => tipo === 'contador' ? actualizarTiempoApartado(contenedor, estado) : render(estado);
}
