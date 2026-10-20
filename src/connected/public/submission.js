import { createAttemptStore } from './attempt-store.js';
import { PublicPortalError } from './http.js';
import { localDate } from './dates.js';

// El resumen procede exclusivamente del escritor/resolutor, nunca del catálogo vivo.
export function readReservationResult(data) {
  const names = ['folio', 'nombreNegocio', 'nombreServicio', 'nombreSucursal', 'nombreProfesional'];
  if (!data || data.estado !== 'pendiente' || names.some((key) => typeof data[key] !== 'string' || !data[key].trim()) ||
    !['inicioUtc', 'finUtc'].every((key) => typeof data[key] === 'string' && data[key].endsWith('Z')) ||
    !Number.isFinite(Date.parse(data.inicioUtc)) || !Number.isFinite(Date.parse(data.finUtc)) || Date.parse(data.finUtc) <= Date.parse(data.inicioUtc) ||
    typeof data.costoAceptado !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(data.costoAceptado) || !data.zonaHoraria) throw new Error('Resultado no válido.');
  localDate(data.inicioUtc, data.zonaHoraria);
  return Object.fromEntries([...names, 'estado', 'inicioUtc', 'finUtc', 'costoAceptado', 'zonaHoraria'].map((key) => [key, data[key]]));
}

// El contacto normalizado se congela solo en memoria. El marcador se confirma
// antes del primer POST; una incertidumbre impide cambiar clave, datos o reserva.
export function createSubmission(client, { slug, storage, attemptKey = () => crypto.randomUUID(),
  acquireMutation = async () => ({ release() {} }), onState, onAbsent, onBegin } = {}) {
  const store = createAttemptStore(slug, storage === undefined ? undefined : () => storage);
  let marker = null, payload = null, inFlight = false, initializing = false, exited = false, lease = null;
  const publish = (phase, notice, status, extra = {}) => onState({ phase, notice, submission: { status, canRepeat: Boolean(payload) && phase === 'uncertain' }, ...extra });
  const releaseLease = () => { lease?.release(); lease = null; };
  const uncertain = (error) => publish('uncertain', `${error instanceof PublicPortalError ? error.message : 'No se pudo determinar el resultado del envío.'} Comprueba este intento antes de iniciar otra reserva.`, 'uncertain');
  async function lock() {
    if (lease) return true;
    lease = await acquireMutation();
    if (!lease) return false;
    return true;
  }
  function accept(data) {
    const result = readReservationResult(data);
    const cleared = store.clear(marker);
    payload = null; releaseLease();
    publish('result', cleared ? '' : 'La reserva está guardada. Su recuperación seguirá disponible al recargar.', 'registered', { result });
  }
  async function resolveCurrent() {
    const data = await client.request(`intentos/${marker.clave}/resolver`, { method: 'POST', body: { apartadoId: marker.apartadoId } });
    if (data?.estado === 'registrado') { accept(data.resultado); return; }
    if (data?.estado !== 'no_registrado' || data.resultado !== undefined) throw new Error('Resolución no válida.');
    if (!store.clear(marker)) throw new Error('No se pudo limpiar el marcador terminal.');
    marker = null; payload = null; releaseLease();
    if (!exited) await onAbsent();
  }
  async function resolve() {
    if (inFlight || exited) return;
    if (!marker) {
      const saved = store.read();
      if (saved.status === 'missing') {
        // La ausencia local solo permite arrancar una página nueva; no prueba
        // que un envío previamente incierto haya quedado sin registrar.
        publish('uncertain', 'Falta el marcador necesario para comprobar este envío. Su ausencia local no confirma que no se haya registrado.', 'storage-error'); return;
      }
      if (saved.status !== 'valid') {
        publish('uncertain', 'No se puede leer el marcador del envío. Permite el almacenamiento de sesión o revisa el marcador existente antes de continuar.', 'storage-error'); return;
      }
      marker = saved.marker;
    }
    inFlight = true;
    publish('uncertain', 'Comprobando el resultado del envío anterior…', 'resolving'); onBegin();
    try {
      if (!await lock()) throw new Error('Otra pestaña está comprobando un envío.');
      await resolveCurrent();
    } catch (error) { uncertain(error); }
    finally { inFlight = false; }
  }
  async function send() {
    if (inFlight || exited || !marker || !payload) return;
    inFlight = true; publish('sending', 'Registrando tu reserva. Espera mientras comprobamos el resultado…', 'sending'); onBegin();
    try {
      const prepared = await client.request('intentos', { method: 'POST', body: { clave: marker.clave, apartadoId: marker.apartadoId } });
      if (prepared?.id !== marker.clave || prepared.apartadoId !== marker.apartadoId || !['preparado', 'registrado'].includes(prepared.estado)) throw new Error('Preparación no válida.');
      // Si la página sale durante preparación, no se inicia un escritor tardío.
      // El marcador queda para que el resolutor cierre o recupere el intento.
      if (exited) { uncertain(); return; }
      if (prepared.estado === 'registrado') { await resolveCurrent(); return; }
      const data = await client.request(`intentos/${marker.clave}/reservar`, { method: 'POST', body: { ...payload } });
      accept(data);
    } catch (error) { uncertain(error); }
    finally { inFlight = false; }
  }
  return {
    async start() {
      const saved = store.read();
      if (saved.status === 'missing') return false;
      await resolve(); return true;
    },
    async submit(hold, contact) {
      if (inFlight || initializing || exited || marker) return;
      const saved = store.read();
      if (saved.status !== 'missing') { await resolve(); return; }
      initializing = true;
      try {
        if (!await lock()) throw new Error('Otra pestaña tiene un envío pendiente.');
        if (exited) { releaseLease(); return; }
        const next = { negocio: slug, apartadoId: hold.apartadoId, clave: attemptKey() };
        store.write(next); marker = next; payload = Object.freeze({ ...contact });
      } catch {
        releaseLease(); publish('form', 'No se pudo guardar el envío o hay otra pestaña ocupada. Revisa el almacenamiento de sesión antes de reservar.', 'storage-error'); return;
      } finally { initializing = false; }
      await send();
    },
    repeat: send, resolve,
    exit() { exited = true; releaseLease(); },
  };
}
