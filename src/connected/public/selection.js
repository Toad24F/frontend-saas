import { PublicPortalError } from './http.js';
import { localDate, localTime, validDate } from './dates.js';
import { browseDefaults, optionPage } from '../../shared/public/options.js';

// Las fases futuras tienen espacio propio; T101–T103 solo activan selección.
// Apartado, formulario, envío y resultado no se simulan ni se persisten aquí.
export const PORTAL_PHASES = Object.freeze(['selection', 'hold', 'form', 'sending', 'uncertain', 'result']);
const fields = ['servicioId', 'sucursalId', 'personalId'];
const lists = ['servicios', 'sucursales', 'profesionales'];
const id = (value) => Number.isSafeInteger(value) && value > 0;
const invalidResponse = () => new PublicPortalError('protocol', 'El portal devolvió una respuesta no válida. Reintente la consulta.');
const addDays = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

export function createPortalSelection(client, { slug, onChange = () => {}, now = () => new Date() } = {}) {
  const state = { phase: 'selection', step: 0,
    negocio: null,
    selection: { servicioId: null, sucursalId: null, personalId: null, date: '', slot: null },
    options: { servicios: [], sucursales: [], profesionales: [] }, slots: [], availableDates: [], timeZone: '',
    query: { status: 'idle', message: '' }, browse: Array.from({ length: 3 }, browseDefaults), period: 'all', automaticSteps: [], hold: null, form: null, submission: null, result: null };
  let revision = 0;
  let pending;
  const snapshot = () => structuredClone(state);
  const emit = () => onChange(snapshot());

  // Toda selección o navegación invalida la consulta previa aunque fetch ignore
  // abort(). La revisión también descarta errores atrasados, no solo éxitos.
  function invalidate() { revision++; pending?.abort(); pending = null; }
  function clearAfter(index) {
    state.automaticSteps = state.automaticSteps.filter((step) => step <= index);
    state.period = 'all';
    for (let i = index + 1; i < fields.length; i++) {
      state.selection[fields[i]] = null;
      state.options[lists[i]] = [];
      state.browse[i] = browseDefaults();
    }
    state.selection.date = '';
    state.selection.slot = null;
    state.slots = [];
    state.availableDates = [];
    state.timeZone = '';
  }
  function ensureSelection() {
    for (let i = 0; i < fields.length; i++) {
      const value = state.selection[fields[i]];
      if (value !== null && !state.options[lists[i]].some((option) => option.id === value)) {
        state.selection[fields[i]] = null;
        clearAfter(i);
        return;
      }
    }
  }
  function readCatalog(data) {
    if (data?.negocio?.slug !== slug || !lists.every((key) => Array.isArray(data[key]) &&
      data[key].every((item) => id(item.id) && typeof item.nombre === 'string'))) throw invalidResponse();
    // La publicación de precios elimina la clave, no envía cero ni null.
    if (!data.servicios.every((item) => (item.costo === undefined ||
      (typeof item.costo === 'string' && /^\d+(?:\.\d{1,2})?$/.test(item.costo))) &&
      id(item.duracionMinutos))) throw invalidResponse();
    for (const branch of data.sucursales) {
      if (typeof branch.direccion !== 'string') throw invalidResponse();
      try { localDate(now(), branch.zonaHoraria); } catch { throw invalidResponse(); }
      if (!branch.zonaHoraria) throw invalidResponse();
    }
    // Solo se conservan catálogos de etapas alcanzadas; nunca listas posteriores
    // procedentes de una selección anterior o de una respuesta inesperada.
    state.negocio = data.negocio;
    state.options.servicios = data.servicios;
    state.options.sucursales = state.step >= 1 ? data.sucursales : [];
    state.options.profesionales = state.step >= 2 ? data.profesionales : [];
    ensureSelection();
    state.automaticSteps = state.automaticSteps.filter((step) => state.options[lists[step]].length === 1 && state.selection[fields[step]] === state.options[lists[step]][0].id);
  }
  function readAvailability(data, query) {
    if (!data || fields.some((key) => data[key] !== query[key]) || data.desde !== query.desde || data.hasta !== query.hasta ||
      data.modalidad !== 'publica' || !Array.isArray(data.ranuras) || !data.zonaHoraria) throw invalidResponse();
    const slots = data.ranuras.map((slot) => {
      if (!Number.isFinite(Date.parse(slot.inicioUtc)) || !Number.isFinite(Date.parse(slot.finUtc)) ||
        Date.parse(slot.inicioUtc) >= Date.parse(slot.finUtc)) throw invalidResponse();
      try {
        const fechaLocal = localDate(slot.inicioUtc, data.zonaHoraria);
        if (fechaLocal < query.desde || fechaLocal > query.hasta) throw invalidResponse();
        return { inicioUtc: slot.inicioUtc, finUtc: slot.finUtc, fechaLocal,
          horaInicio: localTime(slot.inicioUtc, data.zonaHoraria), horaFin: localTime(slot.finUtc, data.zonaHoraria) };
      } catch { throw invalidResponse(); }
    });
    // Incluso sin ranuras se exige una zona IANA interpretable.
    try { localDate(now(), data.zonaHoraria); } catch { throw invalidResponse(); }
    state.availableDates = [...new Set(slots.map((slot) => slot.fechaLocal))].sort();
    state.slots = slots.filter((slot) => slot.fechaLocal === state.selection.date);
    state.timeZone = data.zonaHoraria;
  }
  function prepareDate() {
    if (state.step === 3 && !state.selection.date) {
      const branch = state.options.sucursales.find((item) => item.id === state.selection.sucursalId);
      if (branch) { state.timeZone = branch.zonaHoraria; state.selection.date = localDate(now(), branch.zonaHoraria); }
    }
  }
  async function load(autoAdvance = true) {
    invalidate();
    const current = revision;
    pending = new AbortController();
    state.selection.slot = null;
    state.slots = [];
    if (state.step === 3 && (!fields.every((key) => id(state.selection[key])) || !validDate(state.selection.date))) {
      state.query = { status: 'invalid', message: 'Seleccione una fecha válida y complete servicio, sucursal y profesional.' }; emit(); return;
    }
    state.query = { status: 'loading', message: state.step === 3 ? 'Buscando horarios disponibles…' : 'Consultando opciones disponibles…' }; emit();
    const availability = state.step === 3;
    const branch = state.options.sucursales.find((item) => item.id === state.selection.sucursalId);
    const today = availability ? localDate(now(), branch.zonaHoraria) : '';
    const rangeStart = availability ? [addDays(state.selection.date, -10), today].sort().at(-1) : '';
    const query = availability ? { servicioId: state.selection.servicioId, sucursalId: state.selection.sucursalId,
      personalId: state.selection.personalId, desde: rangeStart, hasta: addDays(rangeStart, 30) } : {
      ...(state.step >= 1 ? { servicioId: state.selection.servicioId } : {}),
      ...(state.step >= 2 ? { sucursalId: state.selection.sucursalId } : {}),
    };
    try {
      const data = await client.request(availability ? 'disponibilidad' : 'catalogo', { query, signal: pending.signal });
      if (current !== revision) return;
      if (availability) readAvailability(data, query); else readCatalog(data);
      if (!availability) {
        const missing = fields.findIndex((field, index) => index < state.step && !state.selection[field]);
        if (missing !== -1) { state.step = missing; return load(false); }
        state.browse[state.step].page = optionPage(state.options[lists[state.step]], state.step, state.browse[state.step]).page;
        if (autoAdvance && state.step > 0 && state.options[lists[state.step]].length === 1) {
          state.selection[fields[state.step]] = state.options[lists[state.step]][0].id;
          clearAfter(state.step);
          if (!state.automaticSteps.includes(state.step)) state.automaticSteps.push(state.step);
          state.step++; prepareDate(); return load();
        }
      }
      const count = availability ? state.slots.length : state.options[lists[state.step]].length;
      state.query = { status: count ? 'ready' : 'empty', message: count ? '' : availability
        ? 'No hay horarios disponibles para esta fecha. Elige otro día para consultar horarios.'
        : 'No hay opciones disponibles para esta selección. Puede volver y elegir otra opción.' };
    } catch (error) {
      if (current !== revision) return;
      state.slots = [];
      state.availableDates = [];
      state.query = { status: [400, 404, 409].includes(error.status) ? 'invalid' : 'error',
        message: error instanceof PublicPortalError ? error.message : availability ? 'No pudimos consultar los horarios. Reintenta para comprobar la disponibilidad.' : 'No se pudo consultar el portal. Reintente la consulta.' };
    }
    if (current === revision) emit();
  }
  return {
    getState: snapshot, start: () => load(), retry: () => load(),
    setBrowse(field, value) {
      if (state.step >= 3 || state.query.status !== 'ready') return;
      if (field === 'clear') state.browse[state.step] = browseDefaults();
      else if (['search', 'filter', 'page'].includes(field)) {
        state.browse[state.step][field] = field === 'page' ? Number(value) : String(value);
        if (field !== 'page') state.browse[state.step].page = 1;
      } else return;
      const browse = state.browse[state.step];
      browse.page = optionPage(state.options[lists[state.step]], state.step, browse).page;
      emit();
    },
    setPeriod(value) { if (['all', 'morning', 'afternoon'].includes(value)) { state.period = value; emit(); } },
    // Solo se reinicia después de que el resolutor confirme ausencia terminal.
    async reset() {
      invalidate(); state.step = 0;
      state.browse = Array.from({ length: 3 }, browseDefaults);
      state.selection.servicioId = null; state.options.servicios = []; clearAfter(0);
      await load();
    },
    choose(field, value) {
      const index = fields.indexOf(field);
      if (state.phase !== 'selection' || index !== state.step || !['ready', 'empty'].includes(state.query.status) ||
        !state.options[lists[index]]?.some((option) => option.id === value)) throw new Error('Selección no disponible.');
      if (state.selection[field] !== value) { invalidate(); state.selection[field] = value; clearAfter(index); }
      emit();
    },
    async next() {
      if (state.phase !== 'selection' || state.step >= 3 || state.query.status !== 'ready' || !state.selection[fields[state.step]]) return;
      state.step++;
      prepareDate();
      await load();
    },
    async back() {
      if (state.phase !== 'selection' || state.step === 0) return;
      do { state.step--; } while (state.step > 0 && state.automaticSteps.includes(state.step));
      await load(false);
    },
    async setDate(date) {
      if (state.phase !== 'selection' || state.step !== 3) return;
      if (!state.availableDates.includes(date)) state.availableDates = [];
      state.selection.date = date; state.period = 'all'; await load();
    },
    chooseSlot(start) {
      const slot = state.slots.find((item) => item.inicioUtc === start);
      if (state.phase !== 'selection' || state.step !== 3 || state.query.status !== 'ready' || !slot) throw new Error('Horario no disponible.');
      state.selection.slot = slot; emit();
    },
  };
}
