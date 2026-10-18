import { isDemo, api, user, catalogPayload } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource } from '../../data.js';
import { icon } from '../../icons.js';
import { toast, escape as esc } from '../../ui.js';
import { field, select, basicForm } from '../../forms.js';
import { loadEditableResource } from '../../../connected/modules/catalogos/detail.js';
import { validateProfessional, professionalError, showProfessionalErrors, clearProfessionalErrors, clearProfessionalField } from '../profesionales/errors.js';
import { validateService, serviceError } from '../servicios/errors.js';
import { validateBranch, branchError } from '../sucursales/errors.js';
import { MEXICO_TIMEZONES } from '../sucursales/timezones.js';

const professionalField = (...args) => field(...args).replace('class="form-field"', `class="form-field" data-professional-field="${args[1]}"`);
const professionalSelect = (...args) => select(...args).replace('class="form-field"', `class="form-field" data-professional-field="${args[1]}"`);
const assignmentError = (field, message) => Object.assign(new Error(message), { field });
export async function catalog(type, id) {
  const cached = id ? resource(type, id, state.tenantId) : null;
  const existing = cached && !isDemo && (type !== 'professionals' || user.rol === 'admin_negocio') ? await loadEditableResource(type, cached) : cached;
  if (type === 'services') {
    if (!isDemo && user.rol === 'profesional' && existing && existing.creatorId !== user.id) {
      toast('Solo puedes editar los servicios que creaste.');
      return;
    }
    const dialog = basicForm(
      existing ? 'Editar servicio' : 'Nuevo servicio',
      `${professionalField('Nombre del servicio', 'name', existing?.name, 'text', 'required maxlength="150"')}${professionalField('Descripción', 'description', existing?.description, 'text', isDemo ? 'required maxlength="200"' : 'maxlength="500"')}<div class="form-row-two">${professionalField('Duración en minutos', 'duration', existing?.duration || 45, 'number', isDemo ? 'required min="15" max="240" step="15"' : 'required min="1" step="1"')}${professionalField('Precio informativo (MXN)', 'price', existing?.price ?? 600, 'number', 'required min="0" max="99999" step="0.01"')}</div>`,
      (f) =>
        save('services', existing, {
          name: f.get('name').trim(),
          description: f.get('description'),
          duration: Number(f.get('duration')),
          price: Number(f.get('price')),
          icon: existing?.icon || 'briefcase',
          color: existing?.color || 'blue',
        }),
      false,
      {
        validate(form) {
          const errors = validateService(new FormData(form), isDemo);
          if (!Object.keys(errors).length) { clearProfessionalErrors(form); return true; }
          showProfessionalErrors(form, errors);
          return false;
        },
        onError(error, form) {
          const errors = serviceError(error);
          if (errors) showProfessionalErrors(form, errors);
          else {
            const target = form.querySelector('#form-error');
            target.textContent = error.message || 'No se pudo guardar el servicio. Inténtalo de nuevo.';
            target.hidden = false;
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus({ preventScroll: true });
          }
        },
      },
    );
    const form = dialog.querySelector('#editor-form');
    form.addEventListener('input', (event) => clearProfessionalField(form, event.target));
    form.addEventListener('change', (event) => clearProfessionalField(form, event.target));
  }
  if (type === 'branches') {
    const dialog = basicForm(
      existing ? 'Editar sucursal' : 'Nueva sucursal',
      `${professionalField('Nombre', 'name', existing?.name, 'text', 'required maxlength="150"')}${professionalField('Dirección', 'address', existing?.address, 'text', 'required maxlength="255"')}${professionalField('Teléfono', 'phone', existing?.phone, 'tel', isDemo ? 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"' : 'required minlength="7" maxlength="20"')}${professionalField('Indicaciones de llegada', 'notes', existing?.notes, 'text', 'maxlength="255"')}${isDemo ? '' : professionalSelect('Zona horaria', 'timezone', MEXICO_TIMEZONES, existing?.timezone || 'America/Chihuahua')}${professionalField('Enlace de Google Maps', 'maps', existing?.maps || '', 'url', 'maxlength="2048"')}`,
      (f) =>
        save('branches', existing, {
          name: f.get('name').trim(),
          address: f.get('address'),
          phone: f.get('phone'),
          notes: f.get('notes'), timezone: f.get('timezone'), maps: f.get('maps'),
          color: existing?.color || 'orange',
        }),
      false,
      {
        validate(form) {
          const errors = validateBranch(new FormData(form), isDemo);
          if (!Object.keys(errors).length) { clearProfessionalErrors(form); return true; }
          showProfessionalErrors(form, errors);
          return false;
        },
        onError(error, form) {
          const errors = branchError(error);
          if (errors) showProfessionalErrors(form, errors);
          else {
            const target = form.querySelector('#form-error');
            target.textContent = error.message || 'No se pudo guardar la sucursal. Inténtalo de nuevo.';
            target.hidden = false;
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus({ preventScroll: true });
          }
        },
      },
    );
    const form = dialog.querySelector('#editor-form');
    form.addEventListener('input', (event) => clearProfessionalField(form, event.target));
    form.addEventListener('change', (event) => clearProfessionalField(form, event.target));
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
    const dialog = basicForm(
      existing ? 'Editar profesional' : 'Nuevo profesional',
      `${professionalField('Nombre completo', 'name', existing?.name, 'text', own ? 'readonly' : 'required maxlength="150"')}${own ? '' : professionalField('Especialidad', 'specialty', existing?.specialty, 'text', 'required maxlength="150"')}${professionalField('Correo', 'email', existing?.email, 'email', own ? 'readonly' : 'required maxlength="150"')}${isDemo || own ? '' : professionalField(existing ? 'Nueva contraseña (opcional)' : 'Contraseña', 'password', '', 'password', existing ? 'autocomplete="new-password" minlength="12"' : 'required autocomplete="new-password" minlength="12"')}${isDemo ? `<div class="form-field professional-choice-group" data-professional-field="services" role="group" aria-labelledby="professional-services-label" tabindex="-1"><span class="form-label" id="professional-services-label">Servicios que ofrece</span><div class="checkbox-list">${(existing?.catalogServices || list(
        'services',
        state.tenantId,
      ))
        .map(
          (s) =>
            `<label><input type="checkbox" class="form-check-input" name="services" value="${s.id}" ${!isDemo && s.active === false && !existing?.serviceIds.includes(s.id) ? 'disabled' : ''} ${existing?.serviceIds.includes(s.id) ? 'checked' : ''}/> ${esc(s.name)}</label>`,
        )
        .join(
          '',
      )}</div></div><div class="form-field professional-choice-group" data-professional-field="branches" role="group" aria-labelledby="professional-branches-label" tabindex="-1"><span class="form-label" id="professional-branches-label">Sucursales</span><div class="checkbox-list">${(existing?.catalogBranches || list(
        'branches',
        state.tenantId,
      ))
        .map(
          (b) =>
            `<label><input type="checkbox" class="form-check-input" name="branches" value="${b.id}" ${own ? 'disabled' : ''} ${existing?.branchIds.includes(b.id) ? 'checked' : ''}/> ${esc(b.name)}</label>`,
        )
        .join('')}</div></div>` : '<p class="field-hint">Después de guardar, abre Ver disponibilidad para asignar sucursales y configurar servicios.</p>'}`,
      async (f) => {
        if (!isDemo) {
          const identity = { nombre: f.get('name').trim(), correo: f.get('email').trim(), especialidad: f.get('specialty').trim(), ...(f.get('password') ? { password: f.get('password') } : {}) };
          const saved = await api(liveId ? `/profesionales/${liveId}` : '/profesionales', liveId ? 'PATCH' : 'POST', identity);
          liveId = saved.id;
          return;
        }
        const serviceIds = f.getAll('services').map(Number),
          branchIds = f.getAll('branches').map(Number);
        serviceIds.forEach((id) => resource('services', id, state.tenantId));
        branchIds.forEach((id) => resource('branches', id, state.tenantId));
        if (existing) {
          const linked = list('appointments', state.tenantId).filter(
            (a) =>
              a.professionalId === existing.id &&
              !['cancelada', 'no_asistio', 'completada'].includes(a.status),
          );
          if (linked.some((a) => !serviceIds.includes(a.serviceId)))
            throw assignmentError('services', 'Hay citas activas con un servicio que quitaste. Conserva ese servicio hasta que terminen las citas.');
          if (linked.some((a) => !branchIds.includes(a.branchId)))
            throw assignmentError('branches', 'Hay citas activas en una sucursal que quitaste. Conserva esa sucursal hasta que terminen las citas.');
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
      {
        validate(form) {
          const errors = validateProfessional(new FormData(form), { own, existing: Boolean(existing), demo: isDemo });
          if (!Object.keys(errors).length) { clearProfessionalErrors(form); return true; }
          showProfessionalErrors(form, errors);
          return false;
        },
        onError(error, form) {
          const errors = professionalError(error);
          if (errors) showProfessionalErrors(form, errors);
          else {
            const target = form.querySelector('#form-error');
            target.textContent = error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
            target.hidden = false;
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus({ preventScroll: true });
          }
        },
      },
    );
    dialog.querySelector('#editor-form').addEventListener('input', (event) => clearProfessionalField(event.currentTarget, event.target));
    dialog.querySelector('#editor-form').addEventListener('change', (event) => clearProfessionalField(event.currentTarget, event.target));
  }
}
export function save(table, existing, values) {
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
