import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../ui.js';
import './style.css';
export function scheduleRow(s, selected, tenantId, removable = false, blockIndex = 0) {
  const day = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][s.day];
  const branches = list('branches', tenantId).filter((b) => selected.branchIds.includes(b.id));
  return `<tr data-schedule-row data-schedule-day="${s.day}" data-id="${s.id}" class="schedule-day-${s.day} ${blockIndex > 0 ? 'schedule-repeat' : ''} ${s.enabled ? '' : 'schedule-disabled'}">
    <td><label class="form-check form-switch"><input class="form-check-input" type="checkbox" name="enabled-${s.id}" ${s.enabled ? 'checked' : ''} aria-label="Activar ${day}"/><span class="schedule-day-label">${day}</span></label></td>
    <td data-label="Sucursal"><select class="form-select form-select-sm" name="branch-${s.id}" aria-label="Sucursal del ${day}">${!isDemo ? `<option value="" ${s.branchId == null ? 'selected' : ''}>Selecciona sucursal</option>` : ''}${branches.map((b) => `<option value="${b.id}" ${s.branchId === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></td>
    <td data-label="Entrada"><input class="form-control form-control-sm" type="time" name="start-${s.id}" value="${s.start}" aria-label="Entrada del ${day}"/></td>
    <td data-label="Descanso opcional"><div class="time-pair"><input class="form-control form-control-sm" type="time" name="breakStart-${s.id}" value="${s.breakStart || ''}" aria-label="Inicio de descanso del ${day}"/><span>–</span><input class="form-control form-control-sm" type="time" name="breakEnd-${s.id}" value="${s.breakEnd || ''}" aria-label="Fin de descanso del ${day}"/></div></td>
    <td data-label="Salida"><input class="form-control form-control-sm" type="time" name="end-${s.id}" value="${s.end}" aria-label="Salida del ${day}"/></td>
    <td data-label="Franjas"><div class="schedule-actions"><button type="button" class="btn btn-light schedule-add" data-add-schedule="${s.day}" aria-label="Agregar franja al ${day}" title="Agregar franja">+</button>${removable ? `<button type="button" class="icon-btn" data-remove-schedule="${s.id}" aria-label="Quitar franja del ${day}">${icon('x')}</button>` : ''}</div></td>
  </tr>`;
}
export function availability() {
  const tenant = tenantById(state.tenantId),
    p = list('professionals', state.tenantId);
  const selected =
    p.find((p) => p.id === Number(state.scheduleProfessional)) || p[0];
  if (!selected)
    return empty(
      'Agrega a tu primer profesional',
      'Después podrás configurar sus horarios.',
    );
  const schedules = list('schedules', state.tenantId).filter((s) => s.professionalId === selected.id);
  if (!isDemo) for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    if (!schedules.some((s) => s.day === day)) schedules.push({ id: -100 - day, day, branchId: selected.branchIds[0], enabled: false, start: '', end: '', breakStart: '', breakEnd: '' });
  }
  const rows = schedules.sort((a, b) => (isDemo ? a.day - b.day : (a.day || 7) - (b.day || 7)) || a.start.localeCompare(b.start))
    .map((s) => scheduleRow(s, selected, state.tenantId, schedules.filter((x) => x.day === s.day).length > 1, schedules.filter((x) => x.day === s.day && x.start < s.start).length)).join('');
  return `${pageHead('Disponibilidad', 'Un horario bien pensado deja espacio para todo.')}<section class="surface mode-section"><div><h2>Cómo se llena tu agenda</h2><p>${isDemo ? 'Elige qué horarios podrán reservar tus pacientes.' : pending}</p></div><div class="mode-options"><button data-mode="free" class="mode-card ${tenant.mode === 'free' ? 'selected' : ''}">${icon('grid')}<span><strong>Ventana libre</strong><small>Muestra todos los espacios disponibles.</small></span><i>${tenant.mode === 'free' ? icon('check') : ''}</i></button><button data-mode="compact" class="mode-card ${tenant.mode === 'compact' ? 'selected' : ''}">${icon('calendar')}<span><strong>Agenda compacta</strong><small>Prioriza citas consecutivas, día por día.</small></span><i>${tenant.mode === 'compact' ? icon('check') : ''}</i></button></div></section><section class="surface"><div class="section-heading"><div><h2>Horario semanal</h2><p>Agrega varias franjas por día; cada una puede tener otra sucursal.</p></div><select class="form-select professional-select" id="schedule-professional" aria-label="Profesional del horario">${p.map((person) => `<option value="${person.id}" ${person.id === selected.id ? 'selected' : ''}>${esc(person.name)}</option>`).join('')}</select></div><form id="schedule-form"><div class="table-responsive"><table class="table app-table schedule-table align-middle"><thead><tr><th>Día</th><th>Sucursal</th><th>Entrada</th><th>Descanso opcional</th><th>Salida</th><th>Franjas</th></tr></thead><tbody>${rows}</tbody></table></div><p class="schedule-help">Para comer y volver en otra sucursal, termina una franja antes de comer y agrega otra después. Las franjas pueden ser consecutivas si no se empalman.</p><p id="schedule-error" class="form-error" role="alert" tabindex="-1" hidden></p><div class="section-form-footer"><span>${icon('coffee')} Los descansos y huecos entre franjas quedan fuera de las citas disponibles.</span><button class="btn btn-primary" type="submit">${icon('check')}Guardar horario</button></div></form></section><section class="surface mt-4"><div class="section-heading"><div><h2>Bloqueos excepcionales</h2><p>Vacaciones, festivos o cambios de último momento.</p></div>${button('Agregar bloqueo', 'new-block', 'plus', 'btn-light')}</div>${list('blocks', state.tenantId).length ? `<div class="blocks-list">${list('blocks', state.tenantId).map((b) => `<div class="block-item"><span class="stat-icon amber">${icon('lock')}</span><div><strong>${esc(b.reason)}</strong><small>${formatDate(b.date, { day: 'numeric', month: 'short' })}${b.endDate !== b.date ? ` – ${formatDate(b.endDate, { day: 'numeric', month: 'short' })}` : ''} · ${b.start ? b.start + ' – ' + b.end : 'Todo el día'} · ${b.professionalId ? esc(resource('professionals', b.professionalId, state.tenantId).name) : 'Todo el equipo'}</small></div><button class="icon-btn" data-edit-block="${b.id}" ${!isDemo && user.rol === 'profesional' && b.professionalId !== user.id ? 'disabled' : ''} aria-label="Editar bloqueo ${esc(b.reason)}">${icon('edit')}</button><button class="icon-btn" data-remove-block="${b.id}" ${!isDemo && user.rol === 'profesional' && b.professionalId !== user.id ? 'disabled' : ''} aria-label="Eliminar bloqueo ${esc(b.reason)}">${icon('x')}</button></div>`).join('')}</div>` : empty('Sin bloqueos programados', 'Tu equipo mantiene su horario habitual.')}</section>`;
}

