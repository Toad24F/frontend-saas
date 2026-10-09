import { isDemo, pending, api, user, roleLabel, logout, loadBackendData, schedulePayload, catalogPayload, modeUrl } from './backend.js';
import { state, render, navigate } from './app.js';
import {
  db,
  list,
  resource,
  tenantById,
  appointmentInfo,
  TODAY,
  formatDate,
  money,
  statuses,
  minutes,
  date,
} from './data.js';
import { icon } from './icons.js';
import { modal, toast, escape as esc, avatar, badge } from './ui.js';
import {
  slots,
  createAppointment,
  validateContact,
  overlaps,
} from './availability.js';
import { reportState, appointmentTable, scheduleRow } from './views.js';
import { validateSchedules, appointmentCovered } from './schedule.js';
let draftScheduleId = -1;

const field = (label, name, value = '', type = 'text', extra = '') =>
  `<div class="form-field"><label class="form-label" for="f-${name}">${label}</label><input class="form-control" id="f-${name}" name="${name}" value="${esc(value)}" type="${type}" ${extra}/></div>`;
const select = (label, name, items, selected = '') =>
  `<div class="form-field"><label class="form-label" for="f-${name}">${label}</label><select class="form-select" id="f-${name}" name="${name}" required>${items.map((x) => `<option value="${x.id}" ${String(x.id) === String(selected) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`;
const formError = (error) => {
  const target = document.querySelector('#form-error');
  if (target) {
    target.textContent = error.message;
    target.hidden = false;
    target.focus();
  } else toast(error.message);
};
const errorSlot =
  '<p id="form-error" class="form-error" role="alert" tabindex="-1" hidden></p>';
function basicForm(title, content, onSubmit, wide = false) {
  const el = modal(
    title,
    `<form id="editor-form"><div class="dialog-body">${content}${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="submit" class="btn btn-primary">${icon('check')}Guardar</button></div></form>`,
    wide,
  );
  el.querySelector('[data-dismiss]').onclick = () => el.close();
  el.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.target.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await onSubmit(new FormData(e.target));
      el.close();
      render();
      if (!isDemo) {
        try { await loadBackendData(); render(); } catch (error) { toast('Guardado completado. No se pudo actualizar la vista: ' + error.message); return; }
      }
      toast(isDemo ? 'Cambios guardados en esta demostración.' : 'Cambios guardados.');
    } catch (error) {
      formError(error);
    } finally { submit.disabled = false; }
  };
  return el;
}
function detail(id) {
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
function catalog(type, id) {
  const existing = id ? resource(type, id, state.tenantId) : null;
  if (type === 'services') {
    basicForm(
      existing ? 'Editar servicio' : 'Nuevo servicio',
      `${field('Nombre del servicio', 'name', existing?.name, 'text', 'required maxlength="150"')}${field('Descripción', 'description', isDemo ? existing?.description : pending, 'text', isDemo ? 'required maxlength="200"' : 'readonly')}<div class="form-row-two">${field('Duración en minutos', 'duration', existing?.duration || 45, 'number', isDemo ? 'required min="15" max="240" step="15"' : 'required min="1" step="1"')}${field('Precio informativo (MXN)', 'price', existing?.price ?? 600, 'number', 'required min="0" max="99999" step="0.01"')}</div>`,
      (f) =>
        save('services', existing, {
          name: f.get('name').trim(),
          description: f.get('description'),
          duration: Number(f.get('duration')),
          price: Number(f.get('price')),
          icon: existing?.icon || 'briefcase',
          color: existing?.color || 'blue',
        }),
    );
  }
  if (type === 'branches') {
    basicForm(
      existing ? 'Editar sucursal' : 'Nueva sucursal',
      `${field('Nombre', 'name', existing?.name, 'text', 'required maxlength="150"')}${field('Dirección', 'address', existing?.address, 'text', 'required maxlength="255"')}${field('Teléfono', 'phone', existing?.phone, 'tel', isDemo ? 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"' : 'required minlength="7" maxlength="20"')}${field('Indicaciones de llegada', 'notes', existing?.notes, 'text', 'maxlength="255"')}${isDemo ? '' : field('Zona horaria', 'timezone', existing?.timezone || 'America/Chihuahua', 'text', 'required') + field('Enlace de Google Maps', 'maps', existing?.maps || '', 'url')}`,
      (f) =>
        save('branches', existing, {
          name: f.get('name').trim(),
          address: f.get('address'),
          phone: f.get('phone'),
          notes: f.get('notes'), timezone: f.get('timezone'), maps: f.get('maps'),
          color: existing?.color || 'orange',
        }),
    );
  }
  if (type === 'professionals') {
    if (isDemo && (
      !list('services', state.tenantId).length ||
      !list('branches', state.tenantId).length
    )) {
      toast('Crea al menos un servicio y una sucursal primero.');
      return;
    }
    const own = !isDemo && user.rol === 'profesional';
    let liveId = existing?.id;
    basicForm(
      existing ? 'Editar profesional' : 'Nuevo profesional',
      `${field('Nombre completo', 'name', existing?.name, 'text', own ? 'readonly' : 'required maxlength="150"')}${field('Especialidad', 'specialty', isDemo ? existing?.specialty : pending, 'text', isDemo ? 'required maxlength="150"' : 'readonly')}${field('Correo', 'email', existing?.email, 'email', own ? 'readonly' : 'required')}${isDemo || own ? '' : field(existing ? 'Nueva contraseña (opcional)' : 'Contraseña', 'password', '', 'password', existing ? 'autocomplete="new-password"' : 'required autocomplete="new-password"')}<div class="form-field"><label class="form-label">Servicios que ofrece</label><div class="checkbox-list">${list(
        'services',
        state.tenantId,
      )
        .map(
          (s) =>
            `<label><input type="checkbox" class="form-check-input" name="services" value="${s.id}" ${!isDemo && s.active === false && !existing?.serviceIds.includes(s.id) ? 'disabled' : ''} ${existing?.serviceIds.includes(s.id) ? 'checked' : ''}/> ${esc(s.name)}</label>`,
        )
        .join(
          '',
        )}</div></div><div class="form-field"><label class="form-label">Sucursales</label><div class="checkbox-list">${list(
        'branches',
        state.tenantId,
      )
        .map(
          (b) =>
            `<label><input type="checkbox" class="form-check-input" name="branches" value="${b.id}" ${own ? 'disabled' : ''} ${existing?.branchIds.includes(b.id) ? 'checked' : ''}/> ${esc(b.name)}</label>`,
        )
        .join('')}</div></div>`,
      async (f) => {
        const serviceIds = f.getAll('services').map(Number),
          branchIds = f.getAll('branches').map(Number);
        if (!isDemo) {
          if (user.rol === 'profesional') { await api(`/profesionales/${liveId}/servicios`, 'PUT', { servicioIds: serviceIds }); return; }
          const identity = { nombre: f.get('name').trim(), correo: f.get('email').trim(), ...(f.get('password') ? { password: f.get('password') } : {}) };
          const saved = await api(liveId ? `/profesionales/${liveId}` : '/profesionales', liveId ? 'PATCH' : 'POST', identity);
          liveId = saved.id;
          try {
            await api(`/profesionales/${liveId}/sucursales`, 'PUT', { sucursalIds: branchIds });
            await api(`/profesionales/${liveId}/servicios`, 'PUT', { servicioIds: serviceIds });
          } catch (error) { throw new Error('Cuenta guardada. Falta completar las asignaciones; puedes reintentar: ' + error.message); }
          return;
        }
        if (!serviceIds.length || !branchIds.length)
          throw new Error('Selecciona al menos un servicio y una sucursal.');
        serviceIds.forEach((id) => resource('services', id, state.tenantId));
        branchIds.forEach((id) => resource('branches', id, state.tenantId));
        if (existing) {
          const linked = list('appointments', state.tenantId).filter(
            (a) =>
              a.professionalId === existing.id &&
              !['cancelada', 'no_asistio', 'completada'].includes(a.status),
          );
          if (
            linked.some(
              (a) =>
                !serviceIds.includes(a.serviceId) ||
                !branchIds.includes(a.branchId),
            )
          )
            throw new Error(
              'Hay citas activas asociadas. Conserva sus servicios y sucursales.',
            );
        }
        const p = save('professionals', existing, {
          name: f.get('name').trim(),
          specialty: f.get('specialty'),
          email: f.get('email'),
          initials: f
            .get('name')
            .split(' ')
            .slice(-2)
            .map((x) => x[0])
            .join(''),
          color: existing?.color || 'peach',
          serviceIds,
          branchIds,
        });
        if (!existing)
          for (let i = 1; i <= 6; i++)
            db.schedules.push({
              id: Math.max(0, ...db.schedules.map((s) => s.id)) + 1,
              tenantId: state.tenantId,
              professionalId: p.id,
              day: i,
              branchId: branchIds[(i - 1) % branchIds.length],
              start: '09:00',
              breakStart: '13:00',
              breakEnd: '14:00',
              end: '18:00',
              enabled: i < 6,
            });
        else
          list('schedules', state.tenantId)
            .filter(
              (s) =>
                s.professionalId === existing.id &&
                !branchIds.includes(s.branchId),
            )
            .forEach((s) => (s.branchId = branchIds[0]));
      },
      true,
    );
  }
}
function save(table, existing, values) {
  if (!isDemo) {
    const route = table === 'services' ? '/servicios' : '/sucursales';
    const body = catalogPayload(table, values);
    return api(existing ? `${route}/${existing.id}` : route, existing ? 'PATCH' : 'POST', body);
  }
  if (!values.name?.trim()) throw new Error('El nombre es obligatorio.');
  if (existing) {
    Object.assign(resource(table, existing.id, state.tenantId), values);
    return existing;
  }
  const item = {
    id: Math.max(0, ...db[table].map((x) => x.id)) + 1,
    tenantId: state.tenantId,
    ...values,
  };
  db[table].push(item);
  return item;
}
function newClient() {
  basicForm(
    'Nuevo cliente',
    `${field('Nombre completo', 'name', '', 'text', 'required maxlength="150"')}${field('Teléfono de WhatsApp', 'phone', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"')}<p class="field-hint">Usa datos ficticios en esta demostración.</p>`,
    (f) => {
      validateContact(f.get('name'), f.get('phone'));
      if (
        list('clients', state.tenantId).some((c) => c.phone === f.get('phone'))
      )
        throw new Error(
          'Ya existe un cliente con ese teléfono en este negocio.',
        );
      save('clients', null, {
        name: f.get('name').trim(),
        phone: f.get('phone'),
      });
    },
  );
}
function newBlock() {
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
function switchTenant() {
  if (!isDemo) { modal('Tu espacio de trabajo', `<div class="dialog-body"><p>${esc(user.nombre)} · ${esc(roleLabel(user.rol))}</p><a class="btn btn-light" href="${modeUrl(location.pathname, true)}">Ver demo para comparar</a><button class="btn btn-light" id="logout-session">Cerrar sesión</button></div>`); document.querySelector('#logout-session').onclick = async () => { try { await logout(); location.reload(); } catch (error) { toast(error.message); } }; return; }
  const el = modal(
    'Cambiar espacio de trabajo',
    `<div class="dialog-body"><p class="mb-4">Explora dos negocios independientes con datos ficticios. Este selector solo existe en el prototipo.</p><div class="tenant-options">${db.tenants.map((t) => `<button class="tenant-option ${t.id === state.tenantId ? 'selected' : ''}" data-choose-tenant="${t.id}" ${t.suspended ? 'disabled' : ''}>${avatar(t.initials, 'mint')}<span><strong>${esc(t.name)}</strong><small>${t.suspended ? 'Suspendido' : esc(t.category)}</small></span>${t.id === state.tenantId ? icon('check') : icon('chevron')}</button>`).join('')}</div></div>`,
  );
  el.querySelectorAll('[data-choose-tenant]').forEach(
    (btn) =>
      (btn.onclick = () => {
        state.tenantId = Number(btn.dataset.chooseTenant);
        state.branch = state.professional = state.status = 'all';
        state.scheduleProfessional = null;
        reportState.branch = 'all';
        el.close();
        render();
        toast(`Espacio actual: ${tenantById(state.tenantId).name}`);
      }),
  );
}
function newTenant() {
  basicForm(
    isDemo ? 'Registrar negocio de ejemplo' : 'Registrar negocio',
    `${field('Nombre del negocio', 'name', '', 'text', 'required maxlength="150"')}${field('Slug del portal', 'slug', '', 'text', 'required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="mi-consultorio"')}${field('Correo de contacto', 'email', '', 'email', 'required')}${isDemo ? '' : field('RFC', 'rfc', '', 'text', 'required maxlength="13"') + field('Límite de sucursales', 'limit', 1, 'number', 'required min="1" step="1"')}`,
    (f) => {
      if (!isDemo) return api('/negocios', 'POST', { nombre: f.get('name').trim(), identificadorPublico: f.get('slug'), emailAdministrador: f.get('email'), rfc: f.get('rfc'), limiteSucursales: Number(f.get('limit')) });
      if (db.tenants.some((t) => t.slug === f.get('slug')))
        throw new Error('Ese enlace ya está asignado a otro negocio.');
      const name = f.get('name').trim();
      if (!name) throw new Error('Escribe el nombre del negocio.');
      db.tenants.push({
        id: Math.max(...db.tenants.map((t) => t.id)) + 1,
        name,
        slug: f.get('slug'),
        email: f.get('email'),
        phone: '6145550300',
        category: 'Nuevo negocio',
        initials: name
          .split(' ')
          .slice(0, 2)
          .map((x) => x[0])
          .join(''),
        mode: 'free',
        reminder: 24,
      });
    },
  );
}
export async function handleClick(e) {
  try {
    const serviceToggle = e.target.closest('[data-toggle-service]');
    if (serviceToggle) {
      const service = resource('services', Number(serviceToggle.dataset.toggleService), state.tenantId);
      serviceToggle.disabled = true;
      try {
        if (isDemo) service.active = service.active === false;
        else if (user.rol === 'profesional') {
          const professional = list('professionals', state.tenantId)[0];
          const serviceIds = professional.serviceIds.includes(service.id)
            ? professional.serviceIds.filter((id) => id !== service.id)
            : [...professional.serviceIds, service.id];
          await api(`/profesionales/${user.id}/servicios`, 'PUT', { servicioIds });
        } else await api(`/servicios/${service.id}/${service.active === false ? 'reactivar' : 'desactivar'}`, 'POST', {});
        if (!isDemo) await loadBackendData();
        render();
        toast('Servicio actualizado.');
      } catch (error) { toast(error.message); serviceToggle.disabled = false; }
      return;
    }
    const branchToggle = e.target.closest('[data-toggle-branch]');
    if (branchToggle) {
      const branch = resource('branches', Number(branchToggle.dataset.toggleBranch), state.tenantId);
      branchToggle.disabled = true;
      try {
        if (isDemo) branch.active = branch.active === false;
        else if (user.rol === 'profesional') {
          const rows = list('schedules', state.tenantId).filter((s) => s.professionalId === user.id);
          const target = rows.filter((s) => s.branchId === branch.id);
          if (!target.length) throw new Error('Esta sucursal no tiene franjas de horario para activar.');
          const active = target.some((s) => s.enabled);
          await api(`/profesionales/${user.id}/horario`, 'PUT', schedulePayload(rows.map((s) => s.branchId === branch.id ? { ...s, enabled: !active } : s)));
        } else await api(`/sucursales/${branch.id}/${branch.active === false ? 'reactivar' : 'desactivar'}`, 'POST', {});
        if (!isDemo) await loadBackendData();
        render();
        toast(user?.rol === 'profesional' && !isDemo ? 'Disponibilidad en sucursal actualizada.' : 'Sucursal actualizada.');
      } catch (error) { toast(error.message); branchToggle.disabled = false; }
      return;
    }
    const addSchedule = e.target.closest('[data-add-schedule]');
    if (addSchedule) {
      const day = Number(addSchedule.dataset.addSchedule);
      const current = [...document.querySelectorAll(`[data-schedule-row][data-schedule-day="${day}"]`)];
      const selected = resource('professionals', document.querySelector('#schedule-professional').value, state.tenantId);
      const row = current.at(-1);
      const id = draftScheduleId--;
      row.insertAdjacentHTML('afterend', scheduleRow({ id, day, enabled: true, branchId: Number(row.querySelector('select').value), start: '', end: '', breakStart: '', breakEnd: '' }, selected, state.tenantId, true, current.length));
      document.querySelector(`[data-schedule-row][data-id="${id}"] input[type="time"]`).focus();
      return;
    }
    const removeSchedule = e.target.closest('[data-remove-schedule]');
    if (removeSchedule) {
      const row = removeSchedule.closest('[data-schedule-row]');
      if (document.querySelectorAll(`[data-schedule-row][data-schedule-day="${row.dataset.scheduleDay}"]`).length > 1) row.remove();
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!isDemo && user.rol === 'profesional' && action === 'new-professional') { toast('Tu cuenta puede editar sus servicios desde Editar profesional.'); return; }
    if (!isDemo && (['new-appointment', 'new-client', 'copy-link', 'filter-reports', 'export-report'].includes(action) || e.target.closest('[data-slot-date], button[data-mode]'))) { toast(pending); return; }
    const actionMap = {
      'new-appointment': () => manualAppointment(),
      'go-agenda': () => navigate('agenda'),
      'new-client': newClient,
      'new-service': () => catalog('services'),
      'new-branch': () => catalog('branches'),
      'new-professional': () => catalog('professionals'),
      'new-block': newBlock,
      'switch-tenant': switchTenant,
      'new-tenant': newTenant,
      'copy-link': async () => {
        const url = `${location.origin}/reservas/${tenantById(state.tenantId).slug}`;
        try {
          await navigator.clipboard.writeText(url);
          toast('Enlace copiado.');
        } catch {
          modal(
            'Enlace de reservas',
            `<div class="dialog-body"><label for="copy-url" class="form-label">Copia este enlace</label><input id="copy-url" class="form-control" readonly value="${esc(url)}"/></div>`,
          );
          document.querySelector('#copy-url').select();
        }
      },
      'filter-reports': () => {
        const from = document.querySelector('#report-from').value,
          to = document.querySelector('#report-to').value;
        if (!from || !to || from > to) {
          toast('Selecciona un rango válido de fechas.');
          return;
        }
        reportState.from = from;
        reportState.to = to;
        reportState.branch = document.querySelector('#report-branch').value;
        render();
      },
      'export-report': () => {
        toast('Elige “Guardar como PDF” en el diálogo de impresión.');
        window.print();
      },
    };
    if (actionMap[action]) {
      await actionMap[action]();
      return;
    }
    const app = e.target.closest('[data-appointment]');
    if (app) {
      detail(Number(app.dataset.appointment));
      return;
    }
    const cell = e.target.closest('[data-slot-date]');
    if (cell) {
      manualAppointment(cell.dataset.slotDate, cell.dataset.slotTime);
      return;
    }
    for (const [attr, type] of [
      ['editService', 'services'],
      ['editBranch', 'branches'],
      ['editProfessional', 'professionals'],
    ]) {
      const selector = attr.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
      const el = e.target.closest(`[data-${selector}]`);
      if (el) {
        catalog(type, Number(el.dataset[attr]));
        return;
      }
    }
    const client = e.target.closest('[data-client]');
    if (client) {
      const c = resource(
        'clients',
        Number(client.dataset.client),
        state.tenantId,
      );
      modal(
        esc(c.name),
        `<div class="dialog-body"><p class="mb-4">${icon('message')} ${esc(c.phone)} · Historial de citas</p>${appointmentTable(list('appointments', state.tenantId).filter((a) => a.clientId === c.id))}</div>`,
        true,
      );
      return;
    }
    const mode = e.target.closest('[data-mode]');
    if (mode) {
      if (!['free', 'compact'].includes(mode.dataset.mode)) return;
      tenantById(state.tenantId).mode = mode.dataset.mode;
      render();
      toast('Modo de agenda actualizado para este negocio.');
      return;
    }
    const remove = e.target.closest('[data-remove-block]');
    if (remove) {
      const b = resource(
        'blocks',
        Number(remove.dataset.removeBlock),
        state.tenantId,
      );
      const el = modal(
        'Eliminar bloqueo',
        `<div class="dialog-body"><p>Se volverá a ofrecer disponibilidad durante “${esc(b.reason)}”.</p></div><div class="dialog-footer"><button id="keep-block" class="btn btn-light">Conservar</button><button id="confirm-remove-block" class="btn btn-danger-soft">Eliminar bloqueo</button></div>`,
      );
      el.querySelector('#keep-block').onclick = () => el.close();
      el.querySelector('#confirm-remove-block').onclick = async () => {
        if (!isDemo) {
          const submit = el.querySelector('#confirm-remove-block'); submit.disabled = true;
          try { await api(`/bloqueos/${b.id}`, 'DELETE'); el.close(); await loadBackendData(); render(); toast('Bloqueo eliminado.'); } catch (error) { toast(error.message); } finally { submit.disabled = false; }
          return;
        }
        db.blocks = db.blocks.filter(
          (x) => !(x.id === b.id && x.tenantId === state.tenantId),
        );
        el.close();
        render();
        toast('Bloqueo eliminado.');
      };
      return;
    }
    const toggle = e.target.closest('[data-toggle-tenant]');
    if (toggle) {
      const t = tenantById(toggle.dataset.toggleTenant);
      const el = modal(
        t.suspended ? 'Reactivar negocio' : 'Suspender negocio',
        `<div class="dialog-body"><p>${esc(t.name)} ${isDemo ? (t.suspended ? 'volverá a mostrar' : 'dejará de mostrar') + ' su portal público en esta simulación.' : (t.suspended ? 'reactivará su licencia.' : 'solicitará la suspensión de su licencia según el plazo del servidor.')}</p></div><div class="dialog-footer"><button class="btn btn-light" id="dismiss-tenant">Volver</button><button class="btn btn-primary" id="confirm-tenant">${t.suspended ? 'Reactivar' : 'Suspender'}</button></div>`,
      );
      el.querySelector('#dismiss-tenant').onclick = () => el.close();
      el.querySelector('#confirm-tenant').onclick = async () => {
        if (!isDemo) {
          const submit = el.querySelector('#confirm-tenant'); submit.disabled = true;
          try { if (!t.licenseId) throw new Error('Este negocio aún no tiene una licencia disponible.'); const result = await api(`/licencias/${t.licenseId}/${t.suspended ? 'reactivar' : 'suspender'}`, 'POST', {}); el.close(); await loadBackendData(); render(); toast('Licencia: ' + result.estado); } catch (error) { toast(error.message); } finally { submit.disabled = false; }
          return;
        }
        t.suspended = !t.suspended;
        el.close();
        render();
        toast('Estado del negocio actualizado.');
      };
      return;
    }
    const license = e.target.closest('[data-license-tenant]');
    if (license) {
      if (!isDemo) {
        const t = tenantById(license.dataset.licenseTenant);
        if (!t.licenseId) throw new Error('Este negocio aún no tiene una licencia disponible.');
        const el = modal('Renovar licencia', `<div class="dialog-body"><p>Se agregará un año calendario a la licencia de ${esc(t.name)}.</p></div><div class="dialog-footer"><button class="btn btn-light" data-dismiss>Cancelar</button><button class="btn btn-primary" id="confirm-renew">Renovar licencia</button></div>`);
        el.querySelector('[data-dismiss]').onclick = () => el.close();
        el.querySelector('#confirm-renew').onclick = async () => {
          const submit = el.querySelector('#confirm-renew'); submit.disabled = true;
          try { await api(`/licencias/${t.licenseId}/renovar`, 'POST', {}); el.close(); await loadBackendData(); render(); toast('Licencia renovada.'); } catch (error) { toast(error.message); } finally { submit.disabled = false; }
        };
        return;
      }
      tenantById(license.dataset.licenseTenant).license = '90 días';
      render();
      toast('Licencia de demostración renovada por 90 días.');
    }
  } catch (error) {
    toast(error.message);
  }
}
document.addEventListener('input', (e) => {
  if (e.target.id === 'directory-search') {
    state.search = e.target.value;
    render();
    document.querySelector('#directory-search').focus();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'schedule-professional') {
    state.scheduleProfessional = Number(e.target.value);
    render();
  }
});
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (
    !['schedule-form', 'business-form', 'notification-form'].includes(form.id)
  )
    return;
  e.preventDefault();
  if (!isDemo && form.id !== 'schedule-form') { toast(pending); return; }
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  try {
    const f = new FormData(form),
      t = tenantById(state.tenantId);
    if (form.id === 'business-form') {
      if (!f.get('name').trim())
        throw new Error('El nombre del negocio es obligatorio.');
      t.name = f.get('name').trim();
      t.email = f.get('email');
      t.phone = f.get('phone');
    }
    if (form.id === 'notification-form') {
      t.confirmations = f.has('confirm');
      t.reminders = f.has('remind');
      t.reminder = Number(f.get('hours'));
    }
    if (form.id === 'schedule-form') {
      const p = Number(document.querySelector('#schedule-professional').value);
      const professional = resource('professionals', p, state.tenantId);
      const updates = [...form.querySelectorAll('[data-schedule-row]')].map((row) => {
        const id = Number(row.dataset.id);
        return {
          id, tenantId: state.tenantId, professionalId: p, day: Number(row.dataset.scheduleDay),
          enabled: f.has(`enabled-${id}`), branchId: Number(f.get(`branch-${id}`)),
          start: f.get(`start-${id}`), end: f.get(`end-${id}`),
          breakStart: f.get(`breakStart-${id}`), breakEnd: f.get(`breakEnd-${id}`),
        };
      });
      if (!isDemo) {
        await api(`/profesionales/${p}/horario`, 'PUT', schedulePayload(updates));
        try { await loadBackendData(); render(); toast('Horario guardado.'); } catch (error) { toast('Horario guardado. No se pudo actualizar la vista: ' + error.message); }
        return;
      }
      validateSchedules(updates, professional.branchIds);
      if (updates.some((s) => s.enabled && (s.start < '09:00' || s.end > '18:00')))
        throw new Error('Este prototipo admite atención de 09:00 a 18:00.');
      const active = list('appointments', state.tenantId).filter((a) =>
        a.professionalId === p && a.date >= TODAY &&
        !['cancelada', 'no_asistio', 'completada'].includes(a.status));
      if (active.some((a) => !appointmentCovered(a, updates)))
        throw new Error('El cambio dejaría citas activas fuera del horario. Reprograma esas citas primero.');
      let nextId = Math.max(0, ...db.schedules.map((s) => s.id)) + 1;
      db.schedules = db.schedules.filter((s) => !(s.tenantId === state.tenantId && s.professionalId === p))
        .concat(updates.map((s) => ({ ...s, id: s.id < 0 ? nextId++ : s.id })));
    }
    render();
    toast('Configuración guardada en esta demostración.');
  } catch (error) {
    if (form.id === 'schedule-form') {
      const target = form.querySelector('#schedule-error');
      target.textContent = error.message;
      target.hidden = false;
      target.focus();
    } else toast(error.message);
  } finally { submit.disabled = false; }
});
