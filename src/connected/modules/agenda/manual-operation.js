import { manualSelection, validManualResult } from './manual-contract.js';

// El resolutor exige la MISMA selección tras una recarga. Se guarda solo en esta pestaña,
// aislada por actor/negocio y se elimina únicamente después de un resultado terminal reconocido.
export function createManualOperation({ scope, storage, client, keyFactory = () => crypto.randomUUID() }) {
  const storageKey = `citalendar:manual:v1:${scope.negocioId}:${scope.actorId}`;
  const state = { status: 'idle', busy: false, marker: null, result: null, error: null };
  let inFlight = false;
  function read() {
    try {
      const raw = storage.getItem(storageKey);
      if (raw == null) return;
      const marker = JSON.parse(raw);
      if (marker.v !== 1 || marker.actorId !== scope.actorId || marker.negocioId !== scope.negocioId || !/^[A-Za-z0-9_-]{16,64}$/.test(marker.clave)) throw new Error('Marcador inválido.');
      const selection = manualSelection(marker.seleccion);
      if (JSON.stringify(selection) !== JSON.stringify(marker.seleccion)) throw new Error('Contenido inválido.');
      state.marker = marker; state.status = 'uncertain';
    } catch { state.status = 'storage_error'; state.error = new Error('No se puede leer el envío pendiente. No crees otra cita hasta recuperar el almacenamiento de esta pestaña.'); }
  }
  read();
  async function run(action) {
    if (inFlight) return;
    inFlight = true; state.busy = true; state.error = null;
    try { await action(); }
    catch (error) { state.status = 'uncertain'; state.error = error; }
    finally { state.busy = false; inFlight = false; }
  }
  const accept = (result) => {
    if (!validManualResult(result)) throw new Error('No se pudo comprobar la respuesta de registro.');
    state.result = result; state.status = 'registered';
  };
  async function resolve() {
    if (!state.marker || state.status === 'storage_error' || ['registered', 'not_registered'].includes(state.status)) return;
    await run(async () => {
      const response = await client.resolve(state.marker.clave, state.marker.seleccion);
      if (response?.estado === 'registrado') accept(response.resultado);
      else if (response?.estado === 'no_registrado') state.status = 'not_registered';
      else throw new Error('El resultado sigue sin poder comprobarse.');
    });
  }
  return {
    state, storageKey,
    async start() { if (state.marker) await resolve(); },
    async submit(values) {
      if (inFlight || state.status === 'storage_error' || ['registered', 'not_registered'].includes(state.status)) return;
      // Otra apertura del formulario pudo persistir una clave desde que se construyó este controlador.
      // Releer antes de escribir evita sobrescribirla con una selección distinta.
      if (!state.marker) read();
      if (state.status === 'storage_error') return;
      if (state.marker) { await resolve(); return; }
      const seleccion = manualSelection(values);
      const marker = { v: 1, ...scope, clave: keyFactory(), seleccion };
      try {
        if (!/^[A-Za-z0-9_-]{16,64}$/.test(marker.clave)) throw new Error('Clave inválida.');
        // Persistir y releer ANTES de preparar impide enviar una operación que no pueda recuperarse.
        storage.setItem(storageKey, JSON.stringify(marker));
        if (storage.getItem(storageKey) !== JSON.stringify(marker)) throw new Error('No se guardó el marcador.');
        state.marker = marker;
      } catch { state.status = 'storage_error'; state.error = new Error('No se pudo guardar el envío. No se ha enviado una nueva cita.'); return; }
      await run(async () => {
        state.status = 'sending';
        const prepared = await client.prepare(marker.clave, marker.seleccion);
        if (prepared?.clave !== marker.clave || !['preparado', 'registrado'].includes(prepared.estado)) throw new Error('No se pudo comprobar la preparación.');
        if (prepared.estado === 'registrado') {
          const response = await client.resolve(marker.clave, marker.seleccion);
          if (response?.estado !== 'registrado') throw new Error('No se pudo recuperar la cita preparada.');
          accept(response.resultado);
        } else accept(await client.register(marker.clave, marker.seleccion));
      });
    },
    resolve,
    acknowledge() {
      if (inFlight || !['registered', 'not_registered'].includes(state.status)) throw new Error('Comprueba el resultado antes de iniciar otra cita.');
      try { storage.removeItem(storageKey); if (storage.getItem(storageKey) != null) throw new Error(); }
      catch { state.error = new Error('No se pudo retirar el envío ya comprobado. Reintenta.'); return false; }
      Object.assign(state, { status: 'idle', marker: null, result: null, error: null }); return true;
    },
  };
}
