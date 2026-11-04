import test from 'node:test';
import assert from 'node:assert/strict';
import { resourceStatus } from '../src/shared/resource-status.js';
import { canConsultRetired, readRetiredList, readRetiredDetail, disableReceptionist } from '../src/connected/modules/recursos/retired.js';

// La marca de inhabilitación tiene precedencia sobre activo; restaurar solo
// retira esa marca y el estado operativo sigue inactivo hasta otro comando.
test('FALA-T035: tres estados distintos y restaurado aún inactivo', () => {
  assert.equal(resourceStatus({ activo: true, inhabilitadoEn: null }).label, 'Activo');
  assert.equal(resourceStatus({ activo: false, inhabilitadoEn: null }).label, 'Inactivo');
  assert.equal(resourceStatus({ activo: false, inhabilitadoEn: '2026-11-04T10:00:00Z' }).label, 'Inhabilitado');
  assert.equal(resourceStatus({ activo: true, inhabilitadoEn: '2026-11-04T10:00:00Z' }).label, 'Inhabilitado');
});

test('FALA-T037: recepción inhabilita sin confundir desactivar o reactivar', async () => {
  const calls = [];
  await disableReceptionist(9, async (...args) => { calls.push(args); return { id: 9, activo: false }; });
  assert.deepEqual(calls, [['/recepcionistas/9/inhabilitar', 'POST', {}]]);
  assert.throws(() => disableReceptionist(0), /no válid/i);
});

test('FALA-T040: lista y detalle de inhabilitados usan solo rutas autorizadas', async () => {
  assert.equal(canConsultRetired('admin_negocio', 'servicios'), true);
  assert.equal(canConsultRetired('superadmin', 'servicios'), false);
  assert.equal(canConsultRetired('profesional', 'servicios'), false);
  assert.equal(canConsultRetired('admin_negocio', 'negocios'), false);
  const calls = [];
  const request = async (path) => { calls.push(path); return path.endsWith('/inhabilitados') ? [] : { id: 9, inhabilitadoEn: '2026-11-04' }; };
  for (const type of ['profesionales', 'recepcionistas', 'servicios', 'sucursales']) {
    assert.deepEqual(await readRetiredList(type, request), []);
    assert.equal((await readRetiredDetail(type, 9, request)).id, 9);
  }
  assert.deepEqual(calls, ['profesionales', 'recepcionistas', 'servicios', 'sucursales'].flatMap((type) =>
    [`/${type}/inhabilitados`, `/${type}/inhabilitados/9`]));
  await assert.rejects(readRetiredList('negocios', request), /no válid/i);
  await assert.rejects(readRetiredDetail('servicios', 0, request), /no válid/i);
});
