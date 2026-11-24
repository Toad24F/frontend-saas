import { crearIntentoStore } from './intento.store.js';
import { ErrorPortalPublico } from './portal.http.js';
import { fechaLocal } from './portal.fechas.js';

// El resumen procede exclusivamente del escritor/resolutor, nunca del catálogo vivo.
export function leerResultadoReserva(datos) {
  // El intento conserva la identidad durable en el servidor; el resumen no exige código visible.
  const nombres = ['nombreNegocio', 'nombreServicio', 'nombreSucursal', 'nombreProfesional'];
  if (!datos || datos.estado !== 'pendiente' || nombres.some((clave) => typeof datos[clave] !== 'string' || !datos[clave].trim()) ||
    !['inicioUtc', 'finUtc'].every((clave) => typeof datos[clave] === 'string' && datos[clave].endsWith('Z')) ||
    !Number.isFinite(Date.parse(datos.inicioUtc)) || !Number.isFinite(Date.parse(datos.finUtc)) || Date.parse(datos.finUtc) <= Date.parse(datos.inicioUtc) ||
    (datos.costo !== undefined && (typeof datos.costo !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(datos.costo))) || !datos.zonaHoraria) throw new Error('Resultado no válido.');
  fechaLocal(datos.inicioUtc, datos.zonaHoraria);
  // Un plazo se conserva en UTC; su presentación usa la zona histórica de la cita.
  const hayCondicion = Object.hasOwn(datos, 'vencimientoConfirmacionUtc') || Object.hasOwn(datos, 'seguimientoManual');
  if (hayCondicion && (typeof datos.seguimientoManual !== 'boolean' ||
    !(datos.vencimientoConfirmacionUtc === null ||
      (typeof datos.vencimientoConfirmacionUtc === 'string' && datos.vencimientoConfirmacionUtc.endsWith('Z') && Number.isFinite(Date.parse(datos.vencimientoConfirmacionUtc)))) ||
    datos.seguimientoManual !== (datos.vencimientoConfirmacionUtc === null))) throw new Error('Condición de confirmación no válida.');
  // El resumen HTTP ya proyectó la visibilidad actual; no se rellena desde
  // catálogo ni se interpreta la omisión como costo cero.
  return Object.fromEntries([...nombres, 'estado', 'inicioUtc', 'finUtc', 'zonaHoraria',
    ...(datos.costo === undefined ? [] : ['costo']),
    ...(hayCondicion ? ['vencimientoConfirmacionUtc', 'seguimientoManual'] : [])].map((clave) => [clave, datos[clave]]));
}

// El contacto normalizado se congela solo en memoria. El marcador se confirma
// antes del primer POST; una incertidumbre impide cambiar clave, datos o reserva.
export function crearEnvio(client, { slug, almacenamiento, generarClaveIntento = () => crypto.randomUUID(),
  adquirirMutacion = async () => ({ liberar() {} }), alCambiarEstado, alConfirmarAusencia, alComenzar } = {}) {
  const store = crearIntentoStore(slug, almacenamiento === undefined ? undefined : () => almacenamiento);
  let marcador = null, payload = null, enCurso = false, inicializando = false, salio = false, bloqueoAdquirido = null, cupoTelefono = false;
  const publicar = (fase, aviso, estado, extra = {}) => alCambiarEstado({ fase, aviso,
    envio: { estado, puedeRepetir: Boolean(payload) && fase === 'incierto' && !cupoTelefono }, ...extra });
  const liberarBloqueo = () => { bloqueoAdquirido?.liberar(); bloqueoAdquirido = null; };
  const publicarIncertidumbre = (error) => publicar('incierto', `${error instanceof ErrorPortalPublico ? error.message : 'No se pudo determinar el resultado del envío.'} Comprueba este intento antes de iniciar otra reserva.`, 'incierto');
  async function bloqueo() {
    if (bloqueoAdquirido) return true;
    bloqueoAdquirido = await adquirirMutacion();
    if (!bloqueoAdquirido) return false;
    return true;
  }
  function aceptarResultado(datos) {
    const resultado = leerResultadoReserva(datos);
    const eliminado = store.limpiar(marcador);
    payload = null; liberarBloqueo();
    publicar('resultado', eliminado ? '' : 'La reserva está guardada. Su recuperación seguirá disponible al recargar.', 'registrado', { resultado });
  }
  async function resolverIntentoActual() {
    const datos = await client.solicitar(`intentos/${marcador.clave}/resolver`, { method: 'POST', body: { apartadoId: marcador.apartadoId } });
    if (datos?.estado === 'registrado') { aceptarResultado(datos.resultado); return; }
    if (datos?.estado !== 'no_registrado' || datos.resultado !== undefined) throw new Error('Resolución no válida.');
    if (datos.causa === 'cupo_telefono_excedido' && typeof datos.puedeCorregir === 'boolean') {
      // El rechazo es terminal, pero no se crea otro intento: el contrato que
      // entrega la referencia propia para un sucesor aún está pendiente.
      cupoTelefono = true;
      publicar('incierto', 'Se confirmó que no se registró la reserva por el límite de citas de este teléfono en esta sucursal. Contacta al negocio para continuar.', 'cupo-telefono');
      return;
    }
    if (datos.causa !== undefined || datos.puedeCorregir !== undefined) throw new Error('Resolución no válida.');
    if (!store.limpiar(marcador)) throw new Error('No se pudo limpiar el marcador terminal.');
    marcador = null; payload = null; liberarBloqueo();
    if (!salio) await alConfirmarAusencia();
  }
  async function resolver() {
    if (enCurso || salio) return;
    if (!marcador) {
      const guardado = store.leer();
      if (guardado.estado === 'ausente') {
        // La ausencia local solo permite arrancar una página nueva; no prueba
        // que un envío previamente incierto haya quedado sin registrar.
        publicar('incierto', 'Falta el marcador necesario para comprobar este envío. Su ausencia local no confirma que no se haya registrado.', 'error-almacenamiento'); return;
      }
      if (guardado.estado !== 'valido') {
        publicar('incierto', 'No se puede leer el marcador del envío. Permite el almacenamiento de sesión o revisa el marcador existente antes de continuar.', 'error-almacenamiento'); return;
      }
      marcador = guardado.marcador;
    }
    enCurso = true;
    publicar('incierto', 'Comprobando el resultado del envío anterior…', 'resolviendo'); alComenzar();
    try {
      if (!await bloqueo()) throw new Error('Otra pestaña está comprobando un envío.');
      await resolverIntentoActual();
    } catch (error) { publicarIncertidumbre(error); }
    finally { enCurso = false; }
  }
  async function enviar() {
    if (enCurso || salio || !marcador || !payload || cupoTelefono) return;
    enCurso = true; publicar('enviando', 'Registrando tu reserva. Espera mientras comprobamos el resultado…', 'enviando'); alComenzar();
    try {
      const preparado = await client.solicitar('intentos', { method: 'POST', body: { clave: marcador.clave, apartadoId: marcador.apartadoId } });
      if (preparado?.id !== marcador.clave || preparado.apartadoId !== marcador.apartadoId || !['preparado', 'registrado'].includes(preparado.estado)) throw new Error('Preparación no válida.');
      // Si la página sale durante preparación, no se inicia un escritor tardío.
      // El marcador queda para que el resolutor cierre o recupere el intento.
      if (salio) { publicarIncertidumbre(); return; }
      if (preparado.estado === 'registrado') { await resolverIntentoActual(); return; }
      const datos = await client.solicitar(`intentos/${marcador.clave}/reservar`, { method: 'POST', body: { ...payload } });
      aceptarResultado(datos);
    } catch (error) { publicarIncertidumbre(error); }
    finally { enCurso = false; }
  }
  return {
    async iniciar() {
      const guardado = store.leer();
      if (guardado.estado === 'ausente') return false;
      await resolver(); return true;
    },
    async enviar(apartado, contacto) {
      if (enCurso || inicializando || salio || marcador) return;
      const guardado = store.leer();
      if (guardado.estado !== 'ausente') { await resolver(); return; }
      inicializando = true;
      try {
        if (!await bloqueo()) throw new Error('Otra pestaña tiene un envío pendiente.');
        if (salio) { liberarBloqueo(); return; }
        const continuar = { negocio: slug, apartadoId: apartado.apartadoId, clave: generarClaveIntento() };
        store.guardar(continuar); marcador = continuar; payload = Object.freeze({ ...contacto });
      } catch {
        liberarBloqueo(); publicar('formulario', 'No se pudo guardar el envío o hay otra pestaña ocupada. Revisa el almacenamiento de sesión antes de reservar.', 'error-almacenamiento'); return;
      } finally { inicializando = false; }
      await enviar();
    },
    repetir: enviar, resolver,
    salir() { salio = true; liberarBloqueo(); },
  };
}
