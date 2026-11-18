import test from 'node:test';
import assert from 'node:assert/strict';
import { formatearEnZonaHoraria, textoMotivoDisponibilidad, validarConfiguracionDemo, validarRangoInclusivo, partesEnZonaHoraria } from '../src/shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';

test('la configuración acepta los dos modos y los seis intervalos del contrato', () => {
  for (const modo of ['ventana_libre', 'agenda_compacta']) {
    for (const intervaloMinutos of [5, 10, 15, 20, 30, 60]) {
      assert.deepEqual(validarConfiguracionDemo({ modo, intervaloMinutos, anticipacionMinutos: 0, diasFuturos: 0 }), {});
    }
  }
  assert.deepEqual(validarConfiguracionDemo({ modo: 'otro', intervaloMinutos: 12, anticipacionMinutos: 7, diasFuturos: 1.5 }), {
    modo: 'Selecciona un modo de agenda.',
    intervaloMinutos: 'Selecciona un intervalo permitido.',
    anticipacionMinutos: 'Usa minutos enteros, no negativos y múltiplos de 5.',
    diasFuturos: 'Usa un número entero de días igual o mayor que cero.',
  });
});

test('las consultas admiten como máximo 31 fechas inclusivas', () => {
  assert.deepEqual(validarRangoInclusivo('2026-10-01', '2026-10-31'), {});
  assert.match(validarRangoInclusivo('2026-10-01', '2026-11-01').to, /31 fechas/);
  assert.match(validarRangoInclusivo('2026-10-20', '2026-10-19').to, /posterior/);
  assert.match(validarRangoInclusivo('2026-02-30', '2026-03-01').from, /válida/);
});

test('los instantes UTC se presentan en la zona IANA de la sucursal', () => {
  assert.deepEqual(partesEnZonaHoraria('2026-10-17T16:30:00.000Z', 'America/Chihuahua'), { date: '2026-10-17', time: '10:30' });
  assert.match(formatearEnZonaHoraria('2026-10-17T16:30:00.000Z', 'America/Chihuahua'), /10:30/);
  assert.equal(textoMotivoDisponibilidad('fuera_de_horizonte'), 'Fuera del horizonte de reservas');
});

