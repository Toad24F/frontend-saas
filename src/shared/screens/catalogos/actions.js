import { isDemo, api, user, catalogPayload } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource } from '../../data.js';
import { icon } from '../../icons.js';
import { toast, escape as esc } from '../../ui.js';
import { field, basicForm } from '../../forms.js';
import { loadEditableResource } from '../../../connected/modules/catalogos/detail.js';
export async function catalog(type, id) {
  const cached = id ? resource(type, id, state.tenantId) : null;
  const existing = cached && !isDemo && (type !== 'professionals' || user.rol === 'admin_negocio') ? await loadEditableResource(type, cached) : cached;
  if (type === 'services') {
    if (!isDemo && user.rol === 'profesional' && existing && existing.creatorId !== user.id) {
      toast('Solo puedes editar los servicios que creaste.');
      return;
    }
    basicForm(
      existing ? 'Editar servicio' : 'Nuevo servicio',
      `${field('Nombre del servicio', 'name', existing?.name, 'text', 'required maxlength="150"')}${field('Descripción', 'description', existing?.description, 'text', isDemo ? 'required maxlength="200"' : 'maxlength="500"')}<div class="form-row-two">${field('Duración en minutos', 'duration', existing?.duration || 45, 'number', isDemo ? 'required min="15" max="240" step="15"' : 'required min="1" step="1"')}${field('Precio informativo (MXN)', 'price', existing?.price ?? 600, 'number', 'required min="0" max="99999" step="0.01"')}</div>`,
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
      `${field('Nombre completo', 'name', existing?.name, 'text', own ? 'readonly' : 'required maxlength="150"')}${own ? '' : field('Especialidad', 'specialty', existing?.specialty, 'text', 'required maxlength="150"')}${field('Correo', 'email', existing?.email, 'email', own ? 'readonly' : 'required')}${isDemo || own ? '' : field(existing ? 'Nueva contraseña (opcional)' : 'Contraseña', 'password', '', 'password', existing ? 'autocomplete="new-password" minlength="12"' : 'required autocomplete="new-password" minlength="12"')}<div class="form-field"><label class="form-label">Servicios que ofrece</label><div class="checkbox-list">${(existing?.catalogServices || list(
        'services',
        state.tenantId,
      ))
        .map(
          (s) =>
            `<label><input type="checkbox" class="form-check-input" name="services" value="${s.id}" ${!isDemo && s.active === false && !existing?.serviceIds.includes(s.id) ? 'disabled' : ''} ${existing?.serviceIds.includes(s.id) ? 'checked' : ''}/> ${esc(s.name)}</label>`,
        )
        .join(
          '',
      )}</div></div><div class="form-field"><label class="form-label">Sucursales</label><div class="checkbox-list">${(existing?.catalogBranches || list(
        'branches',
        state.tenantId,
      ))
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
          const identity = { nombre: f.get('name').trim(), correo: f.get('email').trim(), especialidad: f.get('specialty').trim(), ...(f.get('password') ? { password: f.get('password') } : {}) };
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
