import { isDemo, api, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, TODAY, minutes } from '../../data.js';
import { field, select, basicForm } from '../../forms.js';
import { getBlockScope } from './view.js';
import { blockApiErrors, clearAvailabilityErrors, clearAvailabilityField, showAvailabilityErrors, showAvailabilityGeneralError, validateBlock } from './errors.js';

const markedField = (...args) => field(...args).replace('class="form-field"', `class="form-field" data-availability-field="${args[1]}"`);
const markedSelect = (...args) => select(...args).replace('class="form-field"', `class="form-field" data-availability-field="${args[1]}"`);

function blockForm(existing = null) {
  const editing = Boolean(existing);
  const canTargetTeam = isDemo || user.rol === 'admin_negocio';
  const professionals = list('professionals', state.tenantId);
  const professionalOptions = [...(canTargetTeam ? [{ id: '', name: 'Todo el equipo' }] : []), ...professionals];
  const branches = [{ id: '', name: 'Todas las sucursales' }, ...list('branches', state.tenantId)];
  const dialog = basicForm(
    editing ? 'Editar bloqueo' : 'Bloquear disponibilidad',
    `${markedField('Motivo del bloqueo', 'reason', existing?.reason || '', 'text', 'required maxlength="500"')}
    <div class="form-row-two">${markedSelect('Tipo', 'type', [
      { id: 'vacaciones', name: 'Vacaciones' },
      { id: 'dia_festivo', name: 'Día festivo' },
      { id: 'emergencia', name: 'Emergencia' },
    ], existing?.type === 'feriado' ? 'dia_festivo' : existing?.type || 'vacaciones')}
    ${markedSelect('Profesional', 'professionalId', professionalOptions, existing ? existing.professionalId ?? '' : (canTargetTeam ? getBlockScope() : user.id))}</div>
    ${markedSelect('Sucursal', 'branchId', branches, existing?.branchId ?? '')}
    <div class="form-row-two">${markedField('Desde', 'date', existing?.date || TODAY, 'date', 'required')}${markedField('Hasta', 'endDate', existing?.endDate || TODAY, 'date', 'required')}</div>
    <div class="form-row-two">${markedField('Hora inicial (opcional)', 'start', existing?.start || '', 'time')}${markedField('Hora final (opcional)', 'end', existing?.end || '', 'time')}</div>
    <p class="field-hint">Deja ambas horas vacías para bloquear días completos. Las citas existentes se conservan.</p>`,
    async (form) => {
      const block = {
        professionalId: !isDemo && user.rol === 'profesional' ? user.id : Number(form.get('professionalId')) || null,
        branchId: Number(form.get('branchId')) || null,
        date: form.get('date'), endDate: form.get('endDate'),
        start: form.get('start') || null, end: form.get('end') || null,
        type: form.get('type'), reason: form.get('reason').trim(),
      };
      if (!isDemo && user.rol === 'profesional' && block.professionalId !== user.id)
        throw new Error('Solo puedes gestionar bloqueos de tu propio perfil.');
      if (block.professionalId) resource('professionals', block.professionalId, state.tenantId);
      if (block.branchId) resource('branches', block.branchId, state.tenantId);
      if (!isDemo) {
        const payload = { personalId: block.professionalId, sucursalId: block.branchId, tipo: block.type, motivo: block.reason, fechaInicio: block.date, fechaFin: block.endDate, inicioMinutos: block.start ? minutes(block.start) : null, finMinutos: block.end ? minutes(block.end) : null };
        await api(editing ? `/bloqueos/${existing.id}` : '/bloqueos', editing ? 'PATCH' : 'POST', payload);
        (await import('../../../connected/screens/disponibilidad/view.js')).invalidateProjection();
        return;
      }
      if (editing) Object.assign(resource('blocks', existing.id, state.tenantId), block);
      else db.blocks.push({ id: Math.max(0, ...db.blocks.map((item) => item.id)) + 1, tenantId: state.tenantId, ...block });
    }, true, {
      validate(form) {
        const errors = validateBlock(new FormData(form));
        if (!Object.keys(errors).length) { clearAvailabilityErrors(form); return true; }
        showAvailabilityErrors(form, errors);
        return false;
      },
      onError(error, form) {
        const errors = blockApiErrors(error);
        if (errors) showAvailabilityErrors(form, errors);
        else showAvailabilityGeneralError(form, error, '#form-error');
      },
    },
  );
  dialog.querySelector('#f-professionalId').required = false;
  dialog.querySelector('#f-branchId').required = false;
  if (!isDemo && user.rol === 'profesional') dialog.querySelector('#f-professionalId').disabled = true;
  const form = dialog.querySelector('#editor-form');
  form.addEventListener('input', (event) => clearAvailabilityField(form, event.target));
  form.addEventListener('change', (event) => clearAvailabilityField(form, event.target));
}

export function newBlock() { blockForm(); }
export function editBlock(block) { blockForm(block); }
