import test from 'node:test';
import assert from 'node:assert/strict';
import { resourceStatus } from '../src/shared/resource-status.js';
import { canConsultRetired, readRetiredList, readRetiredDetail, disableReceptionist,
  restoreRetired } from '../src/connected/modules/recursos/retired.js';
import { readResourceEffects, effectReasons } from '../src/connected/modules/recursos/affected.js';

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

// Restaurar solo recupera visibilidad. El cuerpo vacío y el estado inactivo
// se comprueban para los cuatro contratos, sin llamar rutas de reactivación.
test('FALA-T041: cuatro restauraciones usan POST y quedan inactivas', async () => {
  const calls = [];
  const request = async (...args) => { calls.push(args); return { id: 9, activo: false, inhabilitadoEn: null }; };
  for (const type of ['profesionales', 'recepcionistas', 'servicios', 'sucursales']) {
    assert.equal((await restoreRetired(type, 9, request)).activo, false);
  }
  assert.deepEqual(calls, ['profesionales', 'recepcionistas', 'servicios', 'sucursales']
    .map((type) => [`/${type}/9/restaurar`, 'POST', {}]));
  await assert.rejects(restoreRetired('servicios', 9, async () => ({ id: 9, activo: true,
    inhabilitadoEn: null })), /inactivo|respuesta/i);
  await assert.rejects(restoreRetired('servicios', 0, request), /no válid/i);
});

test('FALA-T042: causas futuras proceden del servidor sin escritores de citas', async () => {
  const calls = [];
  const response = { desde: '2026-11-04', hasta: '2026-12-04', citas: [
    { citaId: 14, causas: [{ codigo: 'servicio_inhabilitado', referenciaTipo: 'servicio', referenciaId: 9 },
      { codigo: 'sucursal_inactiva', referenciaTipo: 'sucursal', referenciaId: 8 }] },
    { citaId: 15, causas: [{ codigo: 'sucursal_inhabilitada', referenciaTipo: 'sucursal', referenciaId: 8 }] },
  ] };
  const request = async (...args) => { calls.push(args); return response; };
  const service = await readResourceEffects('servicios', 9, '2026-11-04', '2026-12-04', request);
  assert.deepEqual(service.citas.map((item) => item.citaId), [14]);
  assert.deepEqual(effectReasons(service.citas[0]), ['Servicio inhabilitado']);
  assert.match(calls[0][0], /^\/disponibilidad\/citas-afectadas\?desde=2026-11-04&hasta=2026-12-04$/);
  const branch = await readResourceEffects('sucursales', 8, '2026-11-04', '2026-12-04', request);
  assert.deepEqual(branch.citas.map((item) => item.citaId), [14, 15]);
  assert.match(calls[1][0], /sucursalId=8/);
  assert.equal(calls.every(([, method]) => method === undefined), true);
  assert.deepEqual(effectReasons(branch.citas[0]), ['Sucursal inactiva']);
  assert.deepEqual(effectReasons(branch.citas[1]), ['Sucursal inhabilitada']);
  await assert.rejects(readResourceEffects('recepcionistas', 9, '2026-11-04', '2026-12-04', request), /oferta/i);
});
