import { isDemo, api, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, TODAY, minutes } from '../../data.js';
import { field, select, basicForm } from '../../forms.js';
export function newBlock() {
  basicForm(
    'Bloquear disponibilidad',
    `${field('Motivo del bloqueo', 'reason', '', 'text', 'required maxlength="255"')}<div class="form-row-two">${select(
      'Tipo',
      'type',
      [
        { id: 'vacaciones', name: 'Vacaciones' },
        { id: 'feriado', name: 'Día festivo' },
        { id: 'emergencia', name: 'Emergencia' },
      ],
    )}${select('Profesional', 'professionalId', [...(!isDemo && user.rol === 'profesional' ? [] : [{ id: '', name: 'Todo el equipo' }]), ...list('professionals', state.tenantId)])}</div>${select('Sucursal', 'branchId', [{ id: '', name: 'Todas las sucursales' }, ...list('branches', state.tenantId)])}<div class="form-row-two">${field('Desde', 'date', TODAY, 'date', 'required')}${field('Hasta', 'endDate', TODAY, 'date', 'required')}</div><div class="form-row-two">${field('Hora inicial (opcional)', 'start', '', 'time')}${field('Hora final (opcional)', 'end', '', 'time')}</div><p class="field-hint">Deja ambas horas vacías para bloquear el día completo. Las citas existentes se conservan.</p>`,
    (f) => {
      const b = {
        id: Math.max(0, ...db.blocks.map((x) => x.id)) + 1,
        tenantId: state.tenantId,
        professionalId: Number(f.get('professionalId')) || null,
        branchId: Number(f.get('branchId')) || null,
        date: f.get('date'),
        endDate: f.get('endDate'),
        start: f.get('start') || null,
        end: f.get('end') || null,
        type: f.get('type'),
        reason: f.get('reason'),
      };
      if (
        b.date > b.endDate ||
        Boolean(b.start) !== Boolean(b.end) ||
        (isDemo && b.start && b.start >= b.end)
      )
        throw new Error(
          'Verifica el rango de fechas y las dos horas del bloqueo.',
        );
      if (b.professionalId)
        resource('professionals', b.professionalId, state.tenantId);
      if (b.branchId) resource('branches', b.branchId, state.tenantId);
      if (!isDemo) return api('/bloqueos', 'POST', { personalId: b.professionalId, sucursalId: b.branchId, tipo: b.type === 'feriado' ? 'dia_festivo' : b.type, motivo: b.reason, fechaInicio: b.date, fechaFin: b.endDate, inicioMinutos: b.start ? minutes(b.start) : null, finMinutos: b.end ? minutes(b.end) : null });
      db.blocks.push(b);
    },
    true,
  );
  document.querySelector('#f-professionalId').required = false;
  document.querySelector('#f-branchId').required = false;
}
