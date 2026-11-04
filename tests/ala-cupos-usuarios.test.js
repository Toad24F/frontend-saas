import test from 'node:test';
import assert from 'node:assert/strict';
import { readUserQuota, validateUserLimits, saveUserLimits, quotaHtml,
  readOwnRoleQuota, ownQuotaNotice } from '../src/connected/screens/negocio/user-quota.js';

const quota = { profesionales: { limite: 5, activos: 2, disponibles: 3 },
  recepcionistas: { limite: 3, activos: 1, disponibles: 2 } };

// La vista de superadmin consume la proyección del servidor y no cuenta filas
// del catálogo local, que puede estar desactualizado o filtrado por permisos.
test('FALA-T031: lectura muestra límites y consumo de los dos roles desde API', async () => {
  const paths = [];
  const result = await readUserQuota(7, async (path) => { paths.push(path); return quota; });
  assert.deepEqual(paths, ['/negocios/7/cupo-usuarios']);
  assert.deepEqual(result, quota);
  assert.match(quotaHtml(result), /2 \/ 5|1 \/ 3/);
  await assert.rejects(readUserQuota(7, async () => ({ profesionales: { limite: 5 } })), /respuesta|cupo/i);
});

test('FALA-T032: PATCH entrega juntos ambos límites y rechaza valores menores a uno', async () => {
  const calls = [];
  const request = async (...args) => { calls.push(args); return quota; };
  await saveUserLimits(7, { profesionales: 5, recepcionistas: 3 }, request);
  assert.deepEqual(calls, [['/negocios/7/limites-usuarios', 'PATCH',
    { limiteProfesionalesActivos: 5, limiteRecepcionistasActivos: 3 }]]);
  for (const value of [0, -1, 1.5, '5', null]) {
    assert.throws(() => validateUserLimits({ profesionales: value, recepcionistas: 3 }));
  }
});

test('FALA-T032–T034: un 409 de reducción no se transforma en guardado', async () => {
  const conflict = Object.assign(Error('El límite no puede ser menor al consumo activo.'), { status: 409 });
  await assert.rejects(saveUserLimits(7, { profesionales: 1, recepcionistas: 3 }, async () => { throw conflict; }),
    (error) => error === conflict);
});

test('FALA-T033: administrador lee solo el cupo propio autorizado de cada rol', async () => {
  const paths = [];
  const request = async (path) => { paths.push(path); return { limite: 5, activos: 2, disponibles: 3 }; };
  const professional = await readOwnRoleQuota('profesionales', request);
  const receptionist = await readOwnRoleQuota('recepcionistas', request);
  assert.deepEqual(paths, ['/profesionales/cupo', '/recepcionistas/cupo']);
  assert.match(ownQuotaNotice('profesionales', professional), /2 de 5|3 disponibles/);
  assert.match(ownQuotaNotice('recepcionistas', receptionist), /2 de 5|3 disponibles/);
  await assert.rejects(readOwnRoleQuota('profesionales', async () => ({ limite: 5 })), /cupo|respuesta/i);
});
