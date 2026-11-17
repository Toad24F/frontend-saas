import { isDemo, api, user, catalogPayload } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource } from '../../data.js';
import { icon } from '../../icons.js';
import { toast, escape as esc } from '../../ui.js';
import { field, select, basicForm } from '../../forms.js';
import { loadEditableResource } from '../../../connected/modules/catalogos/detail.js';
import { validarProfesional, interpretarErrorProfesional, mostrarErroresProfesional, limpiarErroresProfesional, limpiarCampoProfesional } from '../profesionales/profesionales.errores.js';
import { validarServicio, interpretarErrorServicio } from '../servicios/servicios.errores.js';
import { validarSucursal, interpretarErrorSucursal } from '../sucursales/sucursales.errores.js';
import { ZONAS_HORARIAS_MEXICO } from '../sucursales/sucursales.zonas-horarias.js';
import { readOwnRoleQuota, ownQuotaNotice } from '../../../connected/screens/negocio/user-quota.js';

const campoMarcado = (...argumentos) => field(...argumentos).replace('class="form-field"', `class="form-field" data-campo-profesional="${argumentos[1]}"`);
const selectorMarcado = (...argumentos) => select(...argumentos).replace('class="form-field"', `class="form-field" data-campo-profesional="${argumentos[1]}"`);
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
      `${campoMarcado('Nombre del servicio', 'name', existing?.name, 'text', 'required maxlength="150"')}${campoMarcado('Descripción', 'description', existing?.description, 'text', isDemo ? 'required maxlength="200"' : 'maxlength="500"')}<div class="form-row-two">${campoMarcado('Duración en minutos', 'duration', existing?.duration || 45, 'number', isDemo ? 'required min="15" max="240" step="15"' : 'required min="1" step="1"')}${campoMarcado('Precio informativo (MXN)', 'price', existing?.price ?? 600, 'number', 'required min="0" max="99999" step="0.01"')}</div>`,
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
        drawer: true,
        validate(form) {
          const errors = validarServicio(new FormData(form), isDemo);
          if (!Object.keys(errors).length) { limpiarErroresProfesional(form); return true; }
          mostrarErroresProfesional(form, errors);
          return false;
        },
        onError(error, form) {
          const errors = interpretarErrorServicio(error);
          if (errors) mostrarErroresProfesional(form, errors);
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
    form.addEventListener('input', (event) => limpiarCampoProfesional(form, event.target));
    form.addEventListener('change', (event) => limpiarCampoProfesional(form, event.target));
  }
  if (type === 'branches') {
    const dialog = basicForm(
      existing ? 'Editar sucursal' : 'Nueva sucursal',
      `${campoMarcado('Nombre', 'name', existing?.name, 'text', 'required maxlength="150"')}${campoMarcado('Dirección', 'address', existing?.address, 'text', 'required maxlength="255"')}${campoMarcado('Teléfono', 'phone', existing?.phone, 'tel', isDemo ? 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"' : 'required minlength="7" maxlength="20"')}${campoMarcado('Indicaciones de llegada', 'notes', existing?.notes, 'text', 'maxlength="255"')}${isDemo ? '' : selectorMarcado('Zona horaria', 'timezone', ZONAS_HORARIAS_MEXICO, existing?.timezone || 'America/Chihuahua')}${campoMarcado('Enlace de Google Maps', 'maps', existing?.maps || '', 'url', 'maxlength="2048"')}`,
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
        drawer: true,
        validate(form) {
          const errors = validarSucursal(new FormData(form), isDemo);
          if (!Object.keys(errors).length) { limpiarErroresProfesional(form); return true; }
          mostrarErroresProfesional(form, errors);
          return false;
        },
        onError(error, form) {
          const errors = interpretarErrorSucursal(error);
          if (errors) mostrarErroresProfesional(form, errors);
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
    form.addEventListener('input', (event) => limpiarCampoProfesional(form, event.target));
    form.addEventListener('change', (event) => limpiarCampoProfesional(form, event.target));
  }
  if (type === 'professionals') {
    if (isDemo && (
      !list('services', state.tenantId).length ||
      !list('branches', state.tenantId).length
    )) {
      toast('Crea al menos un servicio y una sucursal primero.');
      return;
    }
    const propio = !isDemo && user.rol === 'profesional';
    let introduccionCupo = '';
    if (!isDemo && !existing && user.rol === 'admin_negocio') {
      // El alta muestra el cupo de la ruta propia; una lectura fallida no se
      // convierte en un límite local supuesto.
      try { introduccionCupo = ownQuotaNotice('profesionales', await readOwnRoleQuota('profesionales', api)); }
      catch { introduccionCupo = '<p class="form-intro">No se pudo consultar el cupo vigente. El servidor lo comprobará al guardar.</p>'; }
    }
    let idVigente = existing?.id;
    const dialogo = basicForm(
      existing ? 'Editar profesional' : 'Nuevo profesional',
      `${introduccionCupo}${campoMarcado('Nombre completo', 'name', existing?.name, 'text', propio ? 'readonly' : 'required maxlength="150"')}${propio ? '' : campoMarcado('Especialidad', 'specialty', existing?.specialty, 'text', 'required maxlength="150"')}${campoMarcado('Correo', 'email', existing?.email, 'email', propio ? 'readonly' : 'required maxlength="150"')}${isDemo || propio ? '' : campoMarcado(existing ? 'Nueva contraseña (opcional)' : 'Contraseña', 'password', '', 'password', existing ? 'autocomplete="new-password" minlength="12"' : 'required autocomplete="new-password" minlength="12"')}${isDemo ? `<div class="form-field profesionales-grupo-eleccion" data-campo-profesional="services" role="group" aria-labelledby="servicios-profesional-etiqueta" tabindex="-1"><span class="form-label" id="servicios-profesional-etiqueta">Servicios que ofrece</span><div class="checkbox-list">${(existing?.catalogServices || list(
        'services',
        state.tenantId,
      ))
        .map(
          (s) =>
            `<label><input type="checkbox" class="form-check-input" name="services" value="${s.id}" ${!isDemo && s.active === false && !existing?.serviceIds.includes(s.id) ? 'disabled' : ''} ${existing?.serviceIds.includes(s.id) ? 'checked' : ''}/> ${esc(s.name)}</label>`,
        )
        .join(
          '',
      )}</div></div><div class="form-field profesionales-grupo-eleccion" data-campo-profesional="branches" role="group" aria-labelledby="sucursales-profesional-etiqueta" tabindex="-1"><span class="form-label" id="sucursales-profesional-etiqueta">Sucursales</span><div class="checkbox-list">${(existing?.catalogBranches || list(
        'branches',
        state.tenantId,
      ))
        .map(
          (b) =>
            `<label><input type="checkbox" class="form-check-input" name="branches" value="${b.id}" ${propio ? 'disabled' : ''} ${existing?.branchIds.includes(b.id) ? 'checked' : ''}/> ${esc(b.name)}</label>`,
        )
        .join('')}</div></div>` : '<p class="field-hint">Después de guardar, abre Ver disponibilidad para asignar sucursales y configurar servicios.</p>'}`,
      async (datos) => {
        if (!isDemo) {
          const identidad = { nombre: datos.get('name').trim(), correo: datos.get('email').trim(), especialidad: datos.get('specialty').trim(), ...(datos.get('password') ? { password: datos.get('password') } : {}) };
          const guardado = await api(idVigente ? `/profesionales/${idVigente}` : '/profesionales', idVigente ? 'PATCH' : 'POST', identidad);
          idVigente = guardado.id;
          return;
        }
        const servicioIds = datos.getAll('services').map(Number),
          sucursalIds = datos.getAll('branches').map(Number);
        servicioIds.forEach((id) => resource('services', id, state.tenantId));
        sucursalIds.forEach((id) => resource('branches', id, state.tenantId));
        if (existing) {
          const vinculadas = list('appointments', state.tenantId).filter(
            (cita) =>
              cita.professionalId === existing.id &&
              !['cancelada', 'no_asistio', 'completada'].includes(cita.status),
          );
          if (vinculadas.some((cita) => !servicioIds.includes(cita.serviceId)))
            throw assignmentError('services', 'Hay citas activas con un servicio que quitaste. Conserva ese servicio hasta que terminen las citas.');
          if (vinculadas.some((cita) => !sucursalIds.includes(cita.branchId)))
            throw assignmentError('branches', 'Hay citas activas en una sucursal que quitaste. Conserva esa sucursal hasta que terminen las citas.');
        }
        const profesional = save('professionals', existing, {
          name: datos.get('name').trim(),
          specialty: datos.get('specialty'),
          email: datos.get('email'),
          initials: datos
            .get('name')
            .split(' ')
            .slice(-2)
            .map((x) => x[0])
            .join(''),
          color: existing?.color || 'peach',
          serviceIds: servicioIds,
          branchIds: sucursalIds,
        });
        if (!existing)
          for (let dia = 1; dia <= 6; dia++)
            db.schedules.push({
              id: Math.max(0, ...db.schedules.map((horario) => horario.id)) + 1,
              tenantId: state.tenantId,
              professionalId: profesional.id,
              day: dia,
              branchId: sucursalIds[(dia - 1) % sucursalIds.length],
              start: '09:00',
              breakStart: '13:00',
              breakEnd: '14:00',
              end: '18:00',
              enabled: dia < 6,
            });
        else
          list('schedules', state.tenantId)
            .filter(
              (horario) =>
                horario.professionalId === existing.id &&
                !sucursalIds.includes(horario.branchId),
            )
            .forEach((horario) => (horario.branchId = sucursalIds[0]));
      },
      true,
      {
        drawer: true,
        validate(form) {
          const errors = validarProfesional(new FormData(form), { propio, existente: Boolean(existing), demo: isDemo });
          if (!Object.keys(errors).length) { limpiarErroresProfesional(form); return true; }
          mostrarErroresProfesional(form, errors);
          return false;
        },
        onError(error, form) {
          const errors = interpretarErrorProfesional(error);
          if (errors) mostrarErroresProfesional(form, errors);
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
    dialogo.querySelector('#editor-form').addEventListener('input', (event) => limpiarCampoProfesional(event.currentTarget, event.target));
    dialogo.querySelector('#editor-form').addEventListener('change', (event) => limpiarCampoProfesional(event.currentTarget, event.target));
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
