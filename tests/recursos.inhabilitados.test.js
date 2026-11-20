import test from 'node:test';
import assert from 'node:assert/strict';
import { resourceStatus } from '../src/shared/resource-status.js';
import { puedeConsultarInhabilitados, listarInhabilitados, consultarDetalleInhabilitado, inhabilitarRecepcionista,
  restaurarInhabilitado } from '../src/connected/modules/recursos/recursos.inhabilitados.js';
import { consultarCitasAfectadas, motivosAfectacion } from '../src/connected/modules/recursos/recursos.afectaciones.js';

// La marca de inhabilitación tiene precedencia sobre activo; restaurar solo
// retira esa marca y el estado operativo sigue inactivo hasta otro comando.
test('FALA-T035: tres estados distintos y restaurado aún inactivo', () => {
  assert.equal(resourceStatus({ activo: true, inhabilitadoEn: null }).label, 'Activo');
  assert.equal(resourceStatus({ activo: false, inhabilitadoEn: null }).label, 'Inactivo');
  assert.equal(resourceStatus({ activo: false, inhabilitadoEn: '2026-11-04T10:00:00Z' }).label, 'Inhabilitado');
  assert.equal(resourceStatus({ activo: true, inhabilitadoEn: '2026-11-04T10:00:00Z' }).label, 'Inhabilitado');
});

test('FALA-T037: recepción inhabilita sin confundir desactivar o reactivar', async () => {
  const llamadas = [];
  await inhabilitarRecepcionista(9, async (...argumentos) => { llamadas.push(argumentos); return { id: 9, activo: false }; });
  assert.deepEqual(llamadas, [['/recepcionistas/9/inhabilitar', 'POST', {}]]);
  assert.throws(() => inhabilitarRecepcionista(0), /no válid/i);
});

test('FALA-T040: lista y detalle de inhabilitados usan solo rutas autorizadas', async () => {
  assert.equal(puedeConsultarInhabilitados('admin_negocio', 'servicios'), true);
  assert.equal(puedeConsultarInhabilitados('superadmin', 'servicios'), false);
  assert.equal(puedeConsultarInhabilitados('profesional', 'servicios'), false);
  assert.equal(puedeConsultarInhabilitados('admin_negocio', 'negocios'), false);
  const llamadas = [];
  const solicitar = async (ruta) => { llamadas.push(ruta); return ruta.endsWith('/inhabilitados') ? [] : { id: 9, inhabilitadoEn: '2026-11-04' }; };
  for (const tipo of ['profesionales', 'recepcionistas', 'servicios', 'sucursales']) {
    assert.equal(puedeConsultarInhabilitados('admin_negocio', tipo), true);
    assert.equal(puedeConsultarInhabilitados('recepcionista', tipo), false);
    assert.deepEqual(await listarInhabilitados(tipo, solicitar), []);
    assert.equal((await consultarDetalleInhabilitado(tipo, 9, solicitar)).id, 9);
  }
  assert.deepEqual(llamadas, ['profesionales', 'recepcionistas', 'servicios', 'sucursales'].flatMap((tipo) =>
    [`/${tipo}/inhabilitados`, `/${tipo}/inhabilitados/9`]));
  await assert.rejects(listarInhabilitados('negocios', solicitar), /no válid/i);
  await assert.rejects(consultarDetalleInhabilitado('servicios', 0, solicitar), /no válid/i);
});

// Restaurar solo recupera visibilidad. El cuerpo vacío y el estado inactivo
// se comprueban para los cuatro contratos, sin llamar rutas de reactivación.
test('FALA-T041: cuatro restauraciones usan POST y quedan inactivas', async () => {
  const llamadas = [];
  const solicitar = async (...argumentos) => { llamadas.push(argumentos); return { id: 9, activo: false, inhabilitadoEn: null }; };
  for (const tipo of ['profesionales', 'recepcionistas', 'servicios', 'sucursales']) {
    assert.equal((await restaurarInhabilitado(tipo, 9, solicitar)).activo, false);
  }
  assert.deepEqual(llamadas, ['profesionales', 'recepcionistas', 'servicios', 'sucursales']
    .map((tipo) => [`/${tipo}/9/restaurar`, 'POST', {}]));
  await assert.rejects(restaurarInhabilitado('servicios', 9, async () => ({ id: 9, activo: true,
    inhabilitadoEn: null })), /inactivo|respuesta/i);
  await assert.rejects(restaurarInhabilitado('servicios', 0, solicitar), /no válid/i);
});

test('FALA-T042: causas futuras proceden del servidor sin escritores de citas', async () => {
  const llamadas = [];
  const respuesta = { desde: '2026-11-04', hasta: '2026-12-04', citas: [
    { citaId: 14, causas: [{ codigo: 'servicio_inhabilitado', referenciaTipo: 'servicio', referenciaId: 9 },
      { codigo: 'sucursal_inactiva', referenciaTipo: 'sucursal', referenciaId: 8 }] },
    { citaId: 15, causas: [{ codigo: 'sucursal_inhabilitada', referenciaTipo: 'sucursal', referenciaId: 8 }] },
  ] };
  const solicitar = async (...argumentos) => { llamadas.push(argumentos); return respuesta; };
  const servicio = await consultarCitasAfectadas('servicios', 9, '2026-11-04', '2026-12-04', solicitar);
  assert.deepEqual(servicio.citas.map((cita) => cita.citaId), [14]);
  assert.deepEqual(motivosAfectacion(servicio.citas[0]), ['Servicio inhabilitado']);
  assert.match(llamadas[0][0], /^\/disponibilidad\/citas-afectadas\?desde=2026-11-04&hasta=2026-12-04$/);
  const sucursal = await consultarCitasAfectadas('sucursales', 8, '2026-11-04', '2026-12-04', solicitar);
  assert.deepEqual(sucursal.citas.map((cita) => cita.citaId), [14, 15]);
  assert.match(llamadas[1][0], /sucursalId=8/);
  assert.equal(llamadas.every(([, metodo]) => metodo === undefined), true);
  assert.deepEqual(motivosAfectacion(sucursal.citas[0]), ['Sucursal inactiva']);
  assert.deepEqual(motivosAfectacion(sucursal.citas[1]), ['Sucursal inhabilitada']);
  await assert.rejects(consultarCitasAfectadas('recepcionistas', 9, '2026-11-04', '2026-12-04', solicitar), /oferta/i);
});
