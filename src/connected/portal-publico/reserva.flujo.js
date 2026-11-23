import { crearSeleccionPortal } from './seleccion.flujo.js';
import { validarContacto } from './reserva.contacto.js';
import { crearRelojApartado } from './apartado.reloj.js';
import { ErrorPortalPublico } from './portal.http.js';
import { fechaLocal } from './portal.fechas.js';
import { crearEnvio } from './reserva.envio.js';

const contactoVacio = () => ({ nombre: '', telefono: '', notas: '', autorizaWhatsapp: false });
const generacionValida = (valor) => typeof valor === 'string' && /^[1-9]\d*$/.test(valor);
const errorProtocolo = () => new ErrorPortalPublico('protocol', 'No se pudo comprobar el apartado. Reintenta antes de continuar.');

// Compone selección, apartado y envío. Solo el marcador mínimo del intento sale
// a sessionStorage; contacto y operaciones de apartado permanecen en memoria.
export function crearReservaPortal(client, { slug, alCambiar = () => {}, ahora,
  ahoraMonotono = () => performance.now(), generarClaveOperacion = () => crypto.randomUUID(), channel: canal,
  almacenamiento, generarClaveIntento, adquirirMutacion = async () => ({ liberar() {} }) } = {}) {
  const reloj = crearRelojApartado(ahoraMonotono);
  const reserva = { fase: 'seleccion', apartado: null, estadoApartado: 'ninguno', milisegundosRestantes: 0,
    contacto: contactoVacio(), erroresContacto: {}, contactoValidado: false, aviso: '', reservaDisponible: true };
  let estadoSeleccion;
  let operacion = null;
  let ocupado = false;
  let revisionReserva = 0;
  let verificacion = null;
  let revisionVerificada = -1;
  let saliendo = false;
  const liberadosAlSalir = new Set();
  const copiarEstado = () => structuredClone({ ...estadoSeleccion, ...reserva });
  const emitir = (tipo = 'render') => { if (!saliendo) alCambiar(copiarEstado(), tipo); };
  const seleccion = crearSeleccionPortal(client, { slug, ahora, alCambiar: (valor) => { estadoSeleccion = valor; emitir(); } });
  estadoSeleccion = seleccion.obtenerEstado();
  const envio = crearEnvio(client, { slug, almacenamiento, generarClaveIntento, adquirirMutacion,
    alComenzar: () => { revisionReserva++; },
    alCambiarEstado: (valor) => {
      Object.assign(reserva, valor);
      if (valor.fase === 'resultado') { reserva.apartado = null; reserva.estadoApartado = 'consumido'; reserva.contacto = contactoVacio(); }
      emitir();
    },
    alConfirmarAusencia: async () => {
      revisionReserva++; reserva.fase = 'seleccion'; reserva.apartado = null; reserva.estadoApartado = 'ninguno'; reserva.envio = null; operacion = null;
      // Un rechazo operativo ordinario obliga a consultar oferta y horario
      // vigentes; el contacto sigue en memoria para la siguiente elección.
      reserva.aviso = 'Se comprobó que el envío no quedó registrado. La oferta, el horario, la licencia o la ocupación pueden haber cambiado; consulta disponibilidad vigente y elige otro horario.';
      await seleccion.reiniciar(); emitir();
    },
  });
  const avisarPestanas = (datos) => {
    try { canal?.postMessage({ ...datos, slug }); } catch { /* El servidor sigue siendo autoridad. Se revalida al reenfocar. */ }
  };
  const textoError = (error) => error instanceof ErrorPortalPublico ? error.message : 'No se pudo comprobar la operación. Reintenta para continuar.';
  const mismoApartado = (a, b) => a && b && a.apartadoId === b.apartadoId && a.generacion === b.generacion;
  function leerConcesion(datos) {
    if (datos?.estado !== 'concedida' || !Number.isSafeInteger(datos.apartadoId) || datos.apartadoId < 1 || !generacionValida(datos.generacion) ||
      !Number.isFinite(Date.parse(datos.expiraEn)) || !Number.isFinite(Date.parse(datos.servidorAhora)) ||
      (datos.costo !== undefined && (typeof datos.costo !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(datos.costo))) || !datos.zonaHoraria) throw errorProtocolo();
    try { fechaLocal(new Date(), datos.zonaHoraria); } catch { throw errorProtocolo(); }
    return { apartadoId: datos.apartadoId, generacion: datos.generacion, expiraEn: datos.expiraEn,
      ...(datos.costo === undefined ? {} : { costo: datos.costo }), zonaHoraria: datos.zonaHoraria };
  }
  function aplicarApartadoPropio(datos, apartado, inicioPeticion) {
    if (!mismoApartado(datos, apartado) || !['vigente', 'vencido', 'sustituido', 'liberado'].includes(datos.estado) ||
      Date.parse(datos.expiraEn) !== Date.parse(apartado.expiraEn) || !Number.isFinite(Date.parse(datos.servidorAhora)) ||
      (datos.costo !== undefined && (typeof datos.costo !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(datos.costo)))) throw errorProtocolo();
    // La lectura propia usa la visibilidad vigente: una omisión retira un
    // precio entregado antes, sin cambiar el costo histórico del servidor.
    if (datos.costo === undefined) delete reserva.apartado.costo;
    else reserva.apartado.costo = datos.costo;
    reloj.sincronizar(apartado.expiraEn, datos.servidorAhora, inicioPeticion);
    reserva.milisegundosRestantes = reloj.restante();
    reserva.estadoApartado = datos.estado === 'vigente' && reserva.milisegundosRestantes > 0 ? 'vigente' : datos.estado === 'vencido' || !reserva.milisegundosRestantes ? 'vencido' : 'perdido';
    if (reserva.estadoApartado !== 'vigente') reserva.aviso = reserva.estadoApartado === 'vencido'
      ? 'El apartado venció. Conservamos tus datos en esta pestaña; consulta otro horario.'
      : 'El apartado ya no está disponible en esta pestaña. Conservamos tus datos; consulta otro horario.';
  }
  async function liberar(apartado, keepalive = false) {
    await client.solicitar(`apartados/${apartado.apartadoId}/liberar`, { method: 'POST', body: { generacion: apartado.generacion }, keepalive });
    avisarPestanas({ type: 'released', apartadoId: apartado.apartadoId, generacion: apartado.generacion });
  }
  function liberarAlSalir(apartado) {
    if (!apartado) return;
    const clave = `${apartado.apartadoId}:${apartado.generacion}`;
    if (liberadosAlSalir.has(clave)) return;
    liberadosAlSalir.add(clave);
    // Mejor esfuerzo: sin beacon, porque el endpoint exige X-CSRF-Token.
    void liberar(apartado, true).catch(() => {});
  }
  async function volverASeleccion() {
    reserva.apartado = null; reserva.estadoApartado = 'ninguno'; reserva.milisegundosRestantes = 0;
    reserva.fase = 'seleccion'; operacion = null; revisionReserva++;
    await seleccion.reintentar(); emitir();
  }
  async function apartarHorarioElegido() {
    if (ocupado || saliendo || !['seleccion', 'apartado'].includes(reserva.fase)) return;
    const estado = seleccion.obtenerEstado();
    if (!operacion) {
      if (estado.paso !== 3 || estado.consulta.estado !== 'lista' || !estado.seleccion.horario) return;
      const elegido = estado.seleccion;
      const clave = generarClaveOperacion();
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(clave)) { reserva.aviso = 'El navegador no pudo generar una operación segura.'; emitir(); return; }
      operacion = { clave, personalId: elegido.personalId, sucursalId: elegido.sucursalId,
        servicioId: elegido.servicioId, fechaLocal: elegido.horario.fechaLocal, horaInicio: elegido.horario.horaInicio };
    }
    ocupado = true; reserva.fase = 'apartado'; reserva.estadoApartado = 'solicitando'; reserva.aviso = 'Comprobando y apartando el horario…'; emitir();
    const actual = ++revisionReserva;
    const inicioPeticion = ahoraMonotono();
    let bloqueoConcesion;
    try {
      bloqueoConcesion = await adquirirMutacion();
      if (!bloqueoConcesion) throw new ErrorPortalPublico('coordination', 'Otra pestaña tiene un envío pendiente. Comprueba ese envío antes de apartar otro horario.');
      const datos = await client.solicitar('apartados', { method: 'POST', body: { ...operacion } });
      const apartado = leerConcesion(datos);
      const repetido = mismoApartado(reserva.apartado, apartado);
      if (repetido && Date.parse(reserva.apartado.expiraEn) !== Date.parse(apartado.expiraEn)) throw errorProtocolo();
      reserva.apartado = apartado;
      if (saliendo) { liberarAlSalir(apartado); return; }
      if (actual !== revisionReserva) return;
      if (repetido) reloj.sincronizar(apartado.expiraEn, datos.servidorAhora, inicioPeticion);
      else reloj.iniciar(apartado.expiraEn, datos.servidorAhora, inicioPeticion);
      avisarPestanas({ type: 'changed', apartadoId: apartado.apartadoId, generacion: apartado.generacion });
      const verificadoEn = ahoraMonotono();
      const propio = await client.solicitar(`apartados/${apartado.apartadoId}`);
      if (saliendo || actual !== revisionReserva) return;
      aplicarApartadoPropio(propio, apartado, verificadoEn);
      if (reserva.estadoApartado !== 'vigente') { await volverASeleccion(); return; }
      reserva.fase = 'formulario'; reserva.aviso = ''; reserva.contactoValidado = false; emitir();
    } catch (error) {
      // Incluso una concesión fallida puede haber sustituido un apartado de otra
      // pestaña. El aviso solo solicita una lectura propia, nunca decide su estado.
      avisarPestanas({ type: 'refresh' });
      if (saliendo || actual !== revisionReserva) return;
      if (!reserva.apartado && [400, 404, 409].includes(error.status)) {
        reserva.aviso = 'El horario cambió o ya no está disponible. Elige un horario vigente.';
        await volverASeleccion();
      } else {
        reserva.estadoApartado = 'error-solicitud'; reserva.aviso = `${textoError(error)} Se conservará la misma operación al reintentar.`; emitir();
      }
    } finally { bloqueoConcesion?.liberar(); ocupado = false; }
  }
  async function verificarVigencia() {
    if (saliendo || reserva.fase !== 'formulario' || !reserva.apartado || ['liberando', 'error-liberacion'].includes(reserva.estadoApartado)) return;
    if (verificacion && revisionVerificada === revisionReserva) return verificacion;
    const apartado = { ...reserva.apartado }, actual = revisionReserva, inicioPeticion = ahoraMonotono();
    revisionVerificada = actual;
    reserva.estadoApartado = 'verificando'; reserva.aviso = 'Comprobando la vigencia del apartado…'; emitir();
    verificacion = (async () => {
      try {
        const datos = await client.solicitar(`apartados/${apartado.apartadoId}`);
        if (actual !== revisionReserva || saliendo || !mismoApartado(apartado, reserva.apartado)) return;
        reserva.aviso = ''; aplicarApartadoPropio(datos, apartado, inicioPeticion);
      } catch (error) {
        if (actual !== revisionReserva || saliendo || !mismoApartado(apartado, reserva.apartado)) return;
        reserva.estadoApartado = 'sin-verificar'; reserva.aviso = textoError(error);
      } finally {
        if (revisionVerificada === actual) verificacion = null;
        if (actual === revisionReserva && !saliendo) emitir();
      }
    })();
    return verificacion;
  }
  async function handleMensaje(mensaje) {
    if (!mensaje || mensaje.slug !== slug || !reserva.apartado || reserva.fase !== 'formulario') return;
    if (mensaje.type === 'refresh') return verificarVigencia();
    if (!generacionValida(mensaje.generacion)) return;
    const masReciente = BigInt(mensaje.generacion) > BigInt(reserva.apartado.generacion);
    if ((mensaje.type === 'changed' && masReciente) || (mensaje.type === 'released' && mismoApartado(mensaje, reserva.apartado))) await verificarVigencia();
  }
  if (canal) canal.onmessage = (evento) => { void handleMensaje(evento.data); };
  return {
    obtenerEstado: copiarEstado, iniciar: async () => { if (!await envio.iniciar()) await seleccion.iniciar(); },
    elegir: (...argumentos) => { if (reserva.fase === 'seleccion') { operacion = null; reserva.aviso = ''; seleccion.elegir(...argumentos); } },
    elegirHorario: (...argumentos) => { if (reserva.fase === 'seleccion') { operacion = null; reserva.aviso = ''; seleccion.elegirHorario(...argumentos); } },
    seleccionarFecha: (...argumentos) => { if (reserva.fase === 'seleccion') { operacion = null; reserva.aviso = ''; return seleccion.seleccionarFecha(...argumentos); } },
    desplazarRangoFechas: (...argumentos) => { if (reserva.fase === 'seleccion') { operacion = null; reserva.aviso = ''; return seleccion.desplazarRangoFechas(...argumentos); } },
    actualizarFiltros: (...argumentos) => { if (reserva.fase === 'seleccion') seleccion.actualizarFiltros(...argumentos); },
    seleccionarPeriodo: (...argumentos) => { if (reserva.fase === 'seleccion') seleccion.seleccionarPeriodo(...argumentos); },
    continuar: () => reserva.fase === 'seleccion' ? seleccion.obtenerEstado().paso === 3 ? apartarHorarioElegido() : seleccion.continuar() : undefined,
    volver: () => reserva.fase === 'seleccion' ? seleccion.volver() : undefined,
    reintentar: () => reserva.fase === 'incierto' ? envio.resolver() : reserva.fase === 'seleccion' ? seleccion.reintentar() : reserva.fase === 'apartado' ? apartarHorarioElegido() : verificarVigencia(),
    apartarHorarioElegido, verificarVigencia, handleMensaje,
    async enviarReserva() {
      if (saliendo || reserva.fase !== 'formulario' || reserva.estadoApartado !== 'vigente' || reloj.restante() <= 0) return;
      const validado = validarContacto(reserva.contacto);
      reserva.erroresContacto = validado.errores;
      if (!validado.valido) { emitir(); return; }
      await envio.enviar(reserva.apartado, validado.valor);
    },
    repetirEnvio: () => reserva.fase === 'incierto' ? envio.repetir() : undefined,
    resolverEnvio: () => reserva.fase === 'incierto' ? envio.resolver() : undefined,
    actualizarContacto(campo, valor) {
      if (reserva.fase !== 'formulario' || !Object.hasOwn(reserva.contacto, campo)) return;
      reserva.contacto[campo] = valor; reserva.contactoValidado = false;
      delete reserva.erroresContacto[campo];
    },
    validarContacto(campo) {
      const resultado = validarContacto(reserva.contacto);
      reserva.erroresContacto = campo ? { ...reserva.erroresContacto, [campo]: resultado.errores[campo] || '' } : resultado.errores;
      const activo = reserva.estadoApartado === 'vigente' && reloj.restante() > 0;
      reserva.contactoValidado = resultado.valido && activo;
      emitir(); return { ...resultado, valido: resultado.valido && activo };
    },
    actualizarContador() {
      if (reserva.fase !== 'formulario' || !reserva.apartado || saliendo) return;
      reserva.milisegundosRestantes = reloj.restante();
      if (!reserva.milisegundosRestantes && reserva.estadoApartado === 'vigente') {
        reserva.estadoApartado = 'vencido'; reserva.contactoValidado = false;
        reserva.aviso = 'El apartado venció. Conservamos tus datos en esta pestaña; consulta otro horario.'; emitir();
      } else emitir('contador');
    },
    marcarSinVerificar() {
      if (reserva.fase === 'formulario' && reserva.estadoApartado === 'vigente') {
        reserva.estadoApartado = 'sin-verificar'; reserva.aviso = 'Al volver comprobaremos la vigencia del apartado.'; emitir();
      }
    },
    async volverADisponibilidad() {
      if (saliendo || reserva.fase !== 'formulario' || !reserva.apartado || reserva.estadoApartado === 'liberando') return;
      const apartado = { ...reserva.apartado }; const actual = ++revisionReserva;
      reserva.estadoApartado = 'liberando'; reserva.aviso = 'Liberando tu apartado antes de volver…'; emitir();
      try {
        await liberar(apartado);
        if (!saliendo && actual === revisionReserva) { reserva.aviso = ''; await volverASeleccion(); }
      } catch (error) {
        if (!saliendo && actual === revisionReserva) { reserva.estadoApartado = 'error-liberacion'; reserva.aviso = `${textoError(error)} Reintenta volver para confirmar la liberación.`; emitir(); }
      }
    },
    salir() {
      envio.salir();
      saliendo = true; revisionReserva++; reserva.contacto = contactoVacio(); reserva.erroresContacto = {}; reserva.contactoValidado = false;
      if (!['enviando', 'incierto', 'resultado'].includes(reserva.fase)) liberarAlSalir(reserva.apartado);
    },
    desmontar() { if (canal) { canal.onmessage = null; canal.close(); } },
  };
}
