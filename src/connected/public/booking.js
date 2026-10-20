import { createPortalSelection } from './selection.js';
import { validateContact } from './contact.js';
import { createHoldClock } from './hold-clock.js';
import { PublicPortalError } from './http.js';
import { localDate } from './dates.js';
import { createSubmission } from './submission.js';

const blankContact = () => ({ nombre: '', telefono: '', notas: '' });
const generation = (value) => typeof value === 'string' && /^[1-9]\d*$/.test(value);
const protocolError = () => new PublicPortalError('protocol', 'No se pudo comprobar el apartado. Reintenta antes de continuar.');

// Compone selección, apartado y envío. Solo el marcador mínimo del intento sale
// a sessionStorage; contacto y operaciones de apartado permanecen en memoria.
export function createPortalBooking(client, { slug, onChange = () => {}, now,
  monotonicNow = () => performance.now(), operationKey = () => crypto.randomUUID(), channel,
  storage, attemptKey, acquireMutation = async () => ({ release() {} }) } = {}) {
  const clock = createHoldClock(monotonicNow);
  const booking = { phase: 'selection', hold: null, holdStatus: 'none', remainingMs: 0,
    contact: blankContact(), contactErrors: {}, contactChecked: false, notice: '', bookingAvailable: true };
  let selectionState;
  let operation = null;
  let busy = false;
  let epoch = 0;
  let checking = null;
  let checkingEpoch = -1;
  let exiting = false;
  const exitReleased = new Set();
  const snapshot = () => structuredClone({ ...selectionState, ...booking });
  const emit = (kind = 'render') => { if (!exiting) onChange(snapshot(), kind); };
  const selection = createPortalSelection(client, { slug, now, onChange: (value) => { selectionState = value; emit(); } });
  selectionState = selection.getState();
  const submission = createSubmission(client, { slug, storage, attemptKey, acquireMutation,
    onBegin: () => { epoch++; },
    onState: (value) => {
      Object.assign(booking, value);
      if (value.phase === 'result') { booking.hold = null; booking.holdStatus = 'consumed'; booking.contact = blankContact(); }
      emit();
    },
    onAbsent: async () => {
      epoch++; booking.phase = 'selection'; booking.hold = null; booking.holdStatus = 'none'; booking.submission = null; operation = null;
      booking.notice = 'Se comprobó que el envío no quedó registrado. Puedes elegir un nuevo horario.';
      await selection.reset(); emit();
    },
  });
  const notify = (data) => {
    try { channel?.postMessage({ ...data, slug }); } catch { /* El servidor sigue siendo autoridad. Se revalida al reenfocar. */ }
  };
  const errorText = (error) => error instanceof PublicPortalError ? error.message : 'No se pudo comprobar la operación. Reintenta para continuar.';
  const ownIdentity = (a, b) => a && b && a.apartadoId === b.apartadoId && a.generacion === b.generacion;
  function readGrant(data) {
    if (data?.estado !== 'concedida' || !Number.isSafeInteger(data.apartadoId) || data.apartadoId < 1 || !generation(data.generacion) ||
      !Number.isFinite(Date.parse(data.expiraEn)) || !Number.isFinite(Date.parse(data.servidorAhora)) ||
      typeof data.costoAceptado !== 'string' || !Number.isFinite(Number(data.costoAceptado)) || Number(data.costoAceptado) < 0 || !data.zonaHoraria) throw protocolError();
    try { localDate(new Date(), data.zonaHoraria); } catch { throw protocolError(); }
    return { apartadoId: data.apartadoId, generacion: data.generacion, expiraEn: data.expiraEn,
      costoAceptado: data.costoAceptado, zonaHoraria: data.zonaHoraria };
  }
  function applyOwn(data, hold, started) {
    if (!ownIdentity(data, hold) || !['vigente', 'vencido', 'sustituido', 'liberado'].includes(data.estado) ||
      Date.parse(data.expiraEn) !== Date.parse(hold.expiraEn) || !Number.isFinite(Date.parse(data.servidorAhora))) throw protocolError();
    clock.sync(hold.expiraEn, data.servidorAhora, started);
    booking.remainingMs = clock.remaining();
    booking.holdStatus = data.estado === 'vigente' && booking.remainingMs > 0 ? 'active' : data.estado === 'vencido' || !booking.remainingMs ? 'expired' : 'lost';
    if (booking.holdStatus !== 'active') booking.notice = booking.holdStatus === 'expired'
      ? 'El apartado venció. Conservamos tus datos en esta pestaña; consulta otro horario.'
      : 'El apartado ya no está disponible en esta pestaña. Conservamos tus datos; consulta otro horario.';
  }
  async function release(hold, keepalive = false) {
    await client.request(`apartados/${hold.apartadoId}/liberar`, { method: 'POST', body: { generacion: hold.generacion }, keepalive });
    notify({ type: 'released', apartadoId: hold.apartadoId, generacion: hold.generacion });
  }
  function releaseOnExit(hold) {
    if (!hold) return;
    const key = `${hold.apartadoId}:${hold.generacion}`;
    if (exitReleased.has(key)) return;
    exitReleased.add(key);
    // Mejor esfuerzo: sin beacon, porque el endpoint exige X-CSRF-Token.
    void release(hold, true).catch(() => {});
  }
  async function backToSelection() {
    booking.hold = null; booking.holdStatus = 'none'; booking.remainingMs = 0;
    booking.phase = 'selection'; operation = null; epoch++;
    await selection.retry(); emit();
  }
  async function reserveSelected() {
    if (busy || exiting || !['selection', 'hold'].includes(booking.phase)) return;
    const state = selection.getState();
    if (!operation) {
      if (state.step !== 3 || state.query.status !== 'ready' || !state.selection.slot) return;
      const chosen = state.selection;
      const clave = operationKey();
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(clave)) { booking.notice = 'El navegador no pudo generar una operación segura.'; emit(); return; }
      operation = { clave, personalId: chosen.personalId, sucursalId: chosen.sucursalId,
        servicioId: chosen.servicioId, fechaLocal: chosen.slot.fechaLocal, horaInicio: chosen.slot.horaInicio };
    }
    busy = true; booking.phase = 'hold'; booking.holdStatus = 'requesting'; booking.notice = 'Comprobando y apartando el horario…'; emit();
    const current = ++epoch;
    const started = monotonicNow();
    let grantLease;
    try {
      grantLease = await acquireMutation();
      if (!grantLease) throw new PublicPortalError('coordination', 'Otra pestaña tiene un envío pendiente. Comprueba ese envío antes de apartar otro horario.');
      const data = await client.request('apartados', { method: 'POST', body: { ...operation } });
      const hold = readGrant(data);
      const repeated = ownIdentity(booking.hold, hold);
      if (repeated && Date.parse(booking.hold.expiraEn) !== Date.parse(hold.expiraEn)) throw protocolError();
      booking.hold = hold;
      if (exiting) { releaseOnExit(hold); return; }
      if (current !== epoch) return;
      if (repeated) clock.sync(hold.expiraEn, data.servidorAhora, started);
      else clock.start(hold.expiraEn, data.servidorAhora, started);
      notify({ type: 'changed', apartadoId: hold.apartadoId, generacion: hold.generacion });
      const checkedAt = monotonicNow();
      const own = await client.request(`apartados/${hold.apartadoId}`);
      if (exiting || current !== epoch) return;
      applyOwn(own, hold, checkedAt);
      if (booking.holdStatus !== 'active') { await backToSelection(); return; }
      booking.phase = 'form'; booking.notice = ''; booking.contactChecked = false; emit();
    } catch (error) {
      // Incluso una concesión fallida puede haber sustituido un apartado de otra
      // pestaña. El aviso solo solicita una lectura propia, nunca decide su estado.
      notify({ type: 'refresh' });
      if (exiting || current !== epoch) return;
      if (!booking.hold && [400, 404, 409].includes(error.status)) {
        booking.notice = 'El horario cambió o ya no está disponible. Elige un horario vigente.';
        await backToSelection();
      } else {
        booking.holdStatus = 'request-error'; booking.notice = `${errorText(error)} Se conservará la misma operación al reintentar.`; emit();
      }
    } finally { grantLease?.release(); busy = false; }
  }
  async function recheck() {
    if (exiting || booking.phase !== 'form' || !booking.hold || ['releasing', 'release-error'].includes(booking.holdStatus)) return;
    if (checking && checkingEpoch === epoch) return checking;
    const hold = { ...booking.hold }, current = epoch, started = monotonicNow();
    checkingEpoch = current;
    booking.holdStatus = 'checking'; booking.notice = 'Comprobando la vigencia del apartado…'; emit();
    checking = (async () => {
      try {
        const data = await client.request(`apartados/${hold.apartadoId}`);
        if (current !== epoch || exiting || !ownIdentity(hold, booking.hold)) return;
        booking.notice = ''; applyOwn(data, hold, started);
      } catch (error) {
        if (current !== epoch || exiting || !ownIdentity(hold, booking.hold)) return;
        booking.holdStatus = 'unverified'; booking.notice = errorText(error);
      } finally {
        if (checkingEpoch === current) checking = null;
        if (current === epoch && !exiting) emit();
      }
    })();
    return checking;
  }
  async function handleMessage(message) {
    if (!message || message.slug !== slug || !booking.hold || booking.phase !== 'form') return;
    if (message.type === 'refresh') return recheck();
    if (!generation(message.generacion)) return;
    const newer = BigInt(message.generacion) > BigInt(booking.hold.generacion);
    if ((message.type === 'changed' && newer) || (message.type === 'released' && ownIdentity(message, booking.hold))) await recheck();
  }
  if (channel) channel.onmessage = (event) => { void handleMessage(event.data); };
  return {
    getState: snapshot, start: async () => { if (!await submission.start()) await selection.start(); },
    choose: (...args) => { if (booking.phase === 'selection') { operation = null; booking.notice = ''; selection.choose(...args); } },
    chooseSlot: (...args) => { if (booking.phase === 'selection') { operation = null; booking.notice = ''; selection.chooseSlot(...args); } },
    setDate: (...args) => { if (booking.phase === 'selection') { operation = null; booking.notice = ''; return selection.setDate(...args); } },
    next: () => booking.phase === 'selection' ? selection.getState().step === 3 ? reserveSelected() : selection.next() : undefined,
    back: () => booking.phase === 'selection' ? selection.back() : undefined,
    retry: () => booking.phase === 'uncertain' ? submission.resolve() : booking.phase === 'selection' ? selection.retry() : booking.phase === 'hold' ? reserveSelected() : recheck(),
    reserveSelected, recheck, handleMessage,
    async submitReservation() {
      if (exiting || booking.phase !== 'form' || booking.holdStatus !== 'active' || clock.remaining() <= 0) return;
      const checked = validateContact(booking.contact);
      booking.contactErrors = checked.errors;
      if (!checked.valid) { emit(); return; }
      await submission.submit(booking.hold, checked.value);
    },
    repeatSubmission: () => booking.phase === 'uncertain' ? submission.repeat() : undefined,
    resolveSubmission: () => booking.phase === 'uncertain' ? submission.resolve() : undefined,
    updateContact(field, value) {
      if (booking.phase !== 'form' || !Object.hasOwn(booking.contact, field)) return;
      booking.contact[field] = value; booking.contactChecked = false;
      delete booking.contactErrors[field];
    },
    validateContact(field) {
      const result = validateContact(booking.contact);
      booking.contactErrors = field ? { ...booking.contactErrors, [field]: result.errors[field] || '' } : result.errors;
      const active = booking.holdStatus === 'active' && clock.remaining() > 0;
      booking.contactChecked = result.valid && active;
      emit(); return { ...result, valid: result.valid && active };
    },
    tick() {
      if (booking.phase !== 'form' || !booking.hold || exiting) return;
      booking.remainingMs = clock.remaining();
      if (!booking.remainingMs && booking.holdStatus === 'active') {
        booking.holdStatus = 'expired'; booking.contactChecked = false;
        booking.notice = 'El apartado venció. Conservamos tus datos en esta pestaña; consulta otro horario.'; emit();
      } else emit('tick');
    },
    markUnverified() {
      if (booking.phase === 'form' && booking.holdStatus === 'active') {
        booking.holdStatus = 'unverified'; booking.notice = 'Al volver comprobaremos la vigencia del apartado.'; emit();
      }
    },
    async returnToAvailability() {
      if (exiting || booking.phase !== 'form' || !booking.hold || booking.holdStatus === 'releasing') return;
      const hold = { ...booking.hold }; const current = ++epoch;
      booking.holdStatus = 'releasing'; booking.notice = 'Liberando tu apartado antes de volver…'; emit();
      try {
        await release(hold);
        if (!exiting && current === epoch) { booking.notice = ''; await backToSelection(); }
      } catch (error) {
        if (!exiting && current === epoch) { booking.holdStatus = 'release-error'; booking.notice = `${errorText(error)} Reintenta volver para confirmar la liberación.`; emit(); }
      }
    },
    exit() {
      submission.exit();
      exiting = true; epoch++; booking.contact = blankContact(); booking.contactErrors = {}; booking.contactChecked = false;
      if (!['sending', 'uncertain', 'result'].includes(booking.phase)) releaseOnExit(booking.hold);
    },
    dispose() { if (channel) { channel.onmessage = null; channel.close(); } },
  };
}
