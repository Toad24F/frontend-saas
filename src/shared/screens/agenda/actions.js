import { state, render, navigate } from '../../app.js';
import { db, list, resource, tenantById, appointmentInfo, TODAY, formatDate, money, statuses } from '../../data.js';
import { icon } from '../../icons.js';
import { modal, toast, escape as esc, avatar, badge } from '../../ui.js';
import { field, select, formError, errorSlot } from '../../forms.js';
import { slots, createAppointment, overlaps } from '../../../demo/availability.js';
export function detail(id) {
  const a = resource('appointments', id, state.tenantId),
    e = appointmentInfo(a);
  const el = modal(
    'Detalle de la cita',
    `<div class="dialog-body"><div class="appointment-identity">${avatar(
      e.client.name
        .split(' ')
        .map((x) => x[0])
        .slice(0, 2)
        .join(''),
      'mint',
      'avatar-large',
    )}<div><h3>${esc(e.client.name)}</h3><p>${a.folio}</p></div>${badge(a.status)}</div><div class="detail-list"><div>${icon('briefcase')}<span><small>Servicio</small><strong>${esc(e.service.name)}</strong></span><b>${money(e.service.price)}</b></div><div>${icon('stethoscope')}<span><small>Profesional</small><strong>${esc(e.professional.name)}</strong></span></div><div>${icon('calendar')}<span><small>Fecha y hora</small><strong>${formatDate(a.date)} · ${a.start} – ${a.end}</strong></span></div><div>${icon('pin')}<span><small>Sucursal</small><strong>${esc(e.branch.name)}</strong></span></div><div>${icon('message')}<span><small>WhatsApp</small><strong>${esc(e.client.phone)}</strong></span></div></div>${a.reason ? `<div class="appointment-reason"><strong>Motivo de consulta</strong><p>${esc(a.reason)}</p></div>` : ''}<label class="form-label" for="appointment-status">Estado de la cita</label><select id="appointment-status" class="form-select">${Object.entries(
      statuses,
    )
      .map(
        ([s, l]) =>
          `<option value="${s}" ${a.status === s ? 'selected' : ''}>${l}</option>`,
      )
      .join(
        '',
      )}</select>${errorSlot}<p class="field-hint mt-3">Origen: ${a.origin === 'manual' ? 'Agendamiento manual' : 'Portal de reservas'} · Solo datos ficticios</p></div><div class="dialog-footer"><button class="btn btn-danger-soft" id="cancel-appointment" ${a.status === 'cancelada' ? 'disabled' : ''}>Cancelar cita</button><button class="btn btn-primary" id="save-status">Guardar estado</button></div>`,
  );
  el.querySelector('#save-status').onclick = () => {
    try {
      const current = resource('appointments', id, state.tenantId),
        next = el.querySelector('#appointment-status').value;
      if (!statuses[next]) throw new Error('Estado inválido.');
      if (
        ['cancelada', 'no_asistio'].includes(current.status) &&
        !['cancelada', 'no_asistio'].includes(next)
      ) {
        const conflict = list('appointments', state.tenantId).some(
          (b) =>
            b.id !== current.id &&
            b.professionalId === current.professionalId &&
            b.date === current.date &&
            !['cancelada', 'no_asistio'].includes(b.status) &&
            overlaps(current.start, current.end, b.start, b.end),
        );
        if (conflict)
          throw new Error('No se puede reactivar: el horario está ocupado.');
      }
      if (next === 'cancelada') {
        confirmCancel(id);
        return;
      }
      current.status = next;
      el.close();
      render();
      toast('Estado de la cita actualizado.');
    } catch (error) {
      formError(error);
    }
  };
  el.querySelector('#cancel-appointment').onclick = () => confirmCancel(id);
}
function confirmCancel(id) {
  const a = resource('appointments', id, state.tenantId);
  const el = modal(
    'Cancelar esta cita',
    `<div class="dialog-body"><p>La cita de <strong>${esc(appointmentInfo(a).client.name)}</strong> del ${formatDate(a.date)} a las ${a.start} cambiará a Cancelada y liberará el horario.</p></div><div class="dialog-footer"><button class="btn btn-light" id="keep-appointment">Conservar cita</button><button class="btn btn-danger-soft" id="confirm-cancel">Sí, cancelar cita</button></div>`,
  );
  el.querySelector('#keep-appointment').onclick = () => detail(id);
  el.querySelector('#confirm-cancel').onclick = () => {
    resource('appointments', id, state.tenantId).status = 'cancelada';
    el.close();
    render();
    toast('Cita cancelada. El horario vuelve a estar disponible.');
  };
}
export function manualAppointment(day = state.date, start = '') {
  if (
    !list('services', state.tenantId).length ||
    !list('professionals', state.tenantId).length ||
    !list('branches', state.tenantId).length
  ) {
    toast(
      'Agrega servicios, sucursales y profesionales antes de crear una cita.',
    );
    return;
  }
  const el = modal(
    'Nueva cita',
    `<form id="manual-form"><div class="dialog-body"><p class="form-intro">Agenda una atención para tu paciente.</p><div class="form-row-two">${select('Servicio', 'serviceId', list('services', state.tenantId))}${select('Sucursal', 'branchId', list('branches', state.tenantId), state.branch !== 'all' ? state.branch : '')}</div><div class="form-row-two">${select('Profesional', 'professionalId', list('professionals', state.tenantId))}${field('Fecha', 'day', day < TODAY ? TODAY : day, 'date', `required min="${TODAY}"`)}</div><div class="form-field"><label for="f-start" class="form-label">Horario disponible</label><select id="f-start" name="start" class="form-select" required></select><p class="field-hint" id="manual-availability-hint"></p></div><div class="form-separator"><span>DATOS DEL PACIENTE</span></div><div class="form-row-two">${field('Nombre completo', 'name', '', 'text', 'required maxlength="150" placeholder="Nombre y apellidos" autocomplete="off"')}${field('Teléfono de WhatsApp', 'phone', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric" placeholder="10 dígitos" autocomplete="off"')}</div><div class="form-field"><label class="form-label" for="f-reason">Motivo de consulta <span class="optional">(opcional)</span></label><textarea class="form-control" id="f-reason" name="reason" rows="2" maxlength="500" placeholder="Información útil para el profesional"></textarea></div>${errorSlot}<div class="information-note compact-note">${icon('info')} Usa datos ficticios. Esta reserva solo se guarda durante la sesión.</div></div><div class="dialog-footer"><button type="button" class="btn btn-light" id="manual-cancel">Cancelar</button><button type="submit" class="btn btn-primary" id="manual-save">${icon('check')}Confirmar cita</button></div></form>`,
    true,
  );
  const form = el.querySelector('form');
  const refresh = () => {
    const serviceId = Number(form.elements.serviceId.value),
      branchId = Number(form.elements.branchId.value),
      previous = form.elements.professionalId.value;
    const people = list('professionals', state.tenantId).filter(
      (p) => p.serviceIds.includes(serviceId) && p.branchIds.includes(branchId),
    );
    form.elements.professionalId.innerHTML = people
      .map(
        (p) =>
          `<option value="${p.id}" ${String(p.id) === previous ? 'selected' : ''}>${esc(p.name)}</option>`,
      )
      .join('');
    let choices = [];
    if (people.length)
      choices = slots({
        tenantId: state.tenantId,
        serviceId,
        branchId,
        professionalId: Number(form.elements.professionalId.value),
        day: form.elements.day.value,
        mode: 'free',
      });
    form.elements.start.innerHTML = choices.length
      ? choices
          .map((t) => `<option ${t === start ? 'selected' : ''}>${t}</option>`)
          .join('')
      : '<option value="">Sin horarios disponibles</option>';
    el.querySelector('#manual-save').disabled = !choices.length;
    el.querySelector('#manual-availability-hint').textContent = choices.length
      ? `${choices.length} horarios · Se respetan descansos, duración y citas existentes.`
      : 'Prueba otra fecha o sucursal. El profesional puede atender en una ubicación diferente según el día.';
  };
  ['serviceId', 'branchId', 'professionalId', 'day'].forEach((key) =>
    form.elements[key].addEventListener('change', refresh),
  );
  refresh();
  el.querySelector('#manual-cancel').onclick = () => el.close();
  form.onsubmit = (e) => {
    e.preventDefault();
    try {
      const f = new FormData(form);
      const a = createAppointment(
        {
          tenantId: state.tenantId,
          serviceId: Number(f.get('serviceId')),
          branchId: Number(f.get('branchId')),
          professionalId: Number(f.get('professionalId')),
          day: f.get('day'),
          start: f.get('start'),
          origin: 'manual',
        },
        { name: f.get('name'), phone: f.get('phone'), reason: f.get('reason') },
      );
      state.date = a.date;
      el.close();
      navigate('agenda');
      toast(`Cita creada · Folio ${a.folio}`);
    } catch (error) {
      formError(error);
    }
  };
}
