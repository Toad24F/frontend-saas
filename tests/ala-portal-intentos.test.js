import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicClient, PublicPortalError } from '../src/connected/public/http.js';
import { createSubmission } from '../src/connected/public/submission.js';
import { renderBooking } from '../src/connected/public/booking-view.js';
import { createAttemptStore } from '../src/connected/public/attempt-store.js';
import { memoryStorage } from './fixtures/memory-storage.js';

const marker = { negocio: 'centro', apartadoId: 8, clave: 'attempt_test_000001' };

// La API publica un código de cupo específico, sin datos de otras reservas.
// Un 409 ordinario debe conservar el tratamiento genérico.
test('FALA-T022: cupo telefónico se distingue del conflicto público genérico', async () => {
  for (const codigo of ['cupo_telefono_excedido', 'portal_409']) {
    const client = createPublicClient('centro', { fetchImpl: async () => new Response(JSON.stringify({
      codigo, mensaje: codigo === 'portal_409' ? 'Conflicto de horario.' : 'Límite de citas del teléfono.', accion: 'corregir',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } }) });
    await assert.rejects(client.request('catalogo'), (error) => {
      assert.ok(error instanceof PublicPortalError);
      assert.equal(error.code, codigo);
      assert.equal(error.message, codigo === 'portal_409' ? 'Conflicto de horario.' : 'Límite de citas del teléfono.');
      return true;
    });
  }
});

// Tras un 409 del escritor aún se consulta el intento propio: el rechazo HTTP
// no autoriza borrar la referencia ni editar el contenido congelado.
test('FALA-T021–T022: rechazo por cupo conserva marcador hasta resolución y explica su causa', async () => {
  const storage = memoryStorage();
  const store = createAttemptStore('centro', () => storage);
  const states = [], calls = [];
  const client = { async request(path, options) {
    calls.push({ path, body: options?.body });
    if (path === 'intentos') return { id: marker.clave, apartadoId: 8, estado: 'preparado' };
    if (path.endsWith('/reservar')) throw new PublicPortalError('http', 'Límite de citas del teléfono.',
      { status: 409, code: 'cupo_telefono_excedido', action: 'corregir' });
    return { estado: 'no_registrado', causa: 'cupo_telefono_excedido', puedeCorregir: true };
  } };
  const submission = createSubmission(client, { slug: 'centro', storage, attemptKey: () => marker.clave,
    onState: (state) => states.push(state), onBegin: () => {},
    onAbsent: async () => { throw Error('No es ausencia ordinaria.'); } });
  await submission.submit({ apartadoId: 8 }, { nombre: 'Ana', telefono: '6141234567', notas: null });
  assert.equal(states.at(-1).phase, 'uncertain');
  assert.deepEqual(store.read().marker, marker);
  assert.match(states.at(-1).notice, /teléfono/i);
  await submission.resolve();
  assert.equal(states.at(-1).submission.status, 'phone-quota');
  assert.match(states.at(-1).notice, /teléfono|cupo/i);
  assert.equal(states.at(-1).submission.canRepeat, false);
  assert.deepEqual(store.read().marker, marker);
  assert.equal(calls.filter(({ path }) => path.endsWith('/reservar')).length, 1);
  const html = renderBooking(states.at(-1));
  assert.match(html, /No se registró la reserva/);
  assert.doesNotMatch(html, /Reintentar el mismo envío|Reserva registrada|Mantendremos este intento hasta comprobar/);
  await submission.repeat();
  assert.equal(calls.filter(({ path }) => path.endsWith('/reservar')).length, 1);
});

// La ausencia terminal ordinaria exige nueva consulta de disponibilidad y
// no puede fabricar un folio o resultado histórico.
test('FALA-T020–T021: rechazo operativo terminal reinicia sin resultado inventado', async () => {
  const storage = memoryStorage();
  createAttemptStore('centro', () => storage).write(marker);
  const states = [];
  let absent = 0;
  const submission = createSubmission({ request: async () => ({ estado: 'no_registrado' }) },
    { slug: 'centro', storage, onState: (state) => states.push(state), onBegin: () => {},
      onAbsent: async () => { absent++; } });
  await submission.start();
  assert.equal(absent, 1);
  assert.equal(createAttemptStore('centro', () => storage).read().status, 'missing');
  assert.ok(states.every((state) => !state.result));
});
