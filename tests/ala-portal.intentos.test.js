import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPortalClient, ErrorPortalPublico } from '../src/connected/portal-publico/portal.http.js';
import { crearEnvio } from '../src/connected/portal-publico/reserva.envio.js';
import { renderReserva } from '../src/connected/portal-publico/reserva.vista.js';
import { crearIntentoStore } from '../src/connected/portal-publico/intento.store.js';
import { crearAlmacenamientoEnMemoria } from './datos-prueba/memoria.almacenamiento.js';

const marcador = { negocio: 'centro', apartadoId: 8, clave: 'attempt_test_000001' };

// La API publica un código de cupo específico, sin datos de otras reservas.
// Un 409 ordinario debe conservar el tratamiento genérico.
test('FALA-T022: cupo telefónico se distingue del conflicto público genérico', async () => {
  for (const codigo of ['cupo_telefono_excedido', 'portal_409']) {
    const client = crearPortalClient('centro', { ejecutarFetch: async () => new Response(JSON.stringify({
      codigo, mensaje: codigo === 'portal_409' ? 'Conflicto de horario.' : 'Límite de citas del teléfono.', accion: 'corregir',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } }) });
    await assert.rejects(client.solicitar('catalogo'), (error) => {
      assert.ok(error instanceof ErrorPortalPublico);
      assert.equal(error.codigo, codigo);
      assert.equal(error.message, codigo === 'portal_409' ? 'Conflicto de horario.' : 'Límite de citas del teléfono.');
      return true;
    });
  }
});

// Tras un 409 del escritor aún se consulta el intento propio: el rechazo HTTP
// no autoriza borrar la referencia ni editar el contenido congelado.
test('FALA-T021–T022: rechazo por cupo conserva marcador hasta resolución y explica su causa', async () => {
  const almacenamiento = crearAlmacenamientoEnMemoria();
  const store = crearIntentoStore('centro', () => almacenamiento);
  const estados = [], llamadas = [];
  const client = { async solicitar(ruta, opciones) {
    llamadas.push({ path: ruta, body: opciones?.body });
    if (ruta === 'intentos') return { id: marcador.clave, apartadoId: 8, estado: 'preparado' };
    if (ruta.endsWith('/reservar')) throw new ErrorPortalPublico('http', 'Límite de citas del teléfono.',
      { status: 409, codigo: 'cupo_telefono_excedido', accion: 'corregir' });
    return { estado: 'no_registrado', causa: 'cupo_telefono_excedido', puedeCorregir: true };
  } };
  const envio = crearEnvio(client, { slug: 'centro', almacenamiento, generarClaveIntento: () => marcador.clave,
    alCambiarEstado: (estado) => estados.push(estado), alComenzar: () => {},
    alConfirmarAusencia: async () => { throw Error('No es ausencia ordinaria.'); } });
  await envio.enviar({ apartadoId: 8 }, { nombre: 'Ana', telefono: '6141234567', notas: null });
  assert.equal(estados.at(-1).fase, 'incierto');
  assert.deepEqual(store.leer().marcador, marcador);
  assert.match(estados.at(-1).aviso, /teléfono/i);
  await envio.resolver();
  assert.equal(estados.at(-1).envio.estado, 'cupo-telefono');
  assert.match(estados.at(-1).aviso, /teléfono|cupo/i);
  assert.equal(estados.at(-1).envio.puedeRepetir, false);
  assert.deepEqual(store.leer().marcador, marcador);
  assert.equal(llamadas.filter(({ path: ruta }) => ruta.endsWith('/reservar')).length, 1);
  const html = renderReserva(estados.at(-1));
  assert.match(html, /No se registró la reserva/);
  assert.doesNotMatch(html, /Reintentar el mismo envío|Reserva registrada|Mantendremos este intento hasta comprobar/);
  await envio.repetir();
  assert.equal(llamadas.filter(({ path: ruta }) => ruta.endsWith('/reservar')).length, 1);
});

// La ausencia terminal ordinaria exige nueva consulta de disponibilidad y
// no puede fabricar un resultado histórico.
test('FALA-T020–T021: rechazo operativo terminal reinicia sin resultado inventado', async () => {
  const almacenamiento = crearAlmacenamientoEnMemoria();
  crearIntentoStore('centro', () => almacenamiento).guardar(marcador);
  const estados = [];
  let ausente = 0;
  const envio = crearEnvio({ solicitar: async () => ({ estado: 'no_registrado' }) },
    { slug: 'centro', almacenamiento, alCambiarEstado: (estado) => estados.push(estado), alComenzar: () => {},
      alConfirmarAusencia: async () => { ausente++; } });
  await envio.iniciar();
  assert.equal(ausente, 1);
  assert.equal(crearIntentoStore('centro', () => almacenamiento).leer().estado, 'ausente');
  assert.ok(estados.every((estado) => !estado.resultado));
});
