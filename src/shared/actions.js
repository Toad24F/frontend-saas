import { abrirEditorCatalogo } from './screens/catalogos/catalogos.acciones.js';
import { nuevoBloqueo, editarBloqueo } from './screens/disponibilidad/disponibilidad.acciones.js';
import { switchTenant, newTenant } from './screens/plataforma/actions.js';
import { isDemo, pending, api, user, loadBackendData, crearPayloadHorario } from '../connected/backend.js';
import { state, render, navigate } from './app.js';
import {
  db,
  list,
  resource,
  tenantById,
  TODAY,
  minutes,
  date,
} from './data.js';
import { icon } from './icons.js';
import { modal, toast, escape as esc } from './ui.js';
import { reportState } from '../demo/screens/reportes/state.js';
import { appointmentTable } from './screens/agenda/table.js';
import { renderFranjaHorario, cambiarAlcanceBloqueos } from './screens/disponibilidad/disponibilidad.vista.js';
import { leerFranjasHorario, cambiarEstadoFranja } from './screens/disponibilidad/disponibilidad.horario-franjas.js';
import { appointmentCovered } from '../demo/schedule.js';
import { limpiarErroresDisponibilidad, limpiarCampoDisponibilidad, mostrarErroresDisponibilidad, mostrarErrorGeneralDisponibilidad, validarFranjasHorario, interpretarErroresHorario } from './screens/disponibilidad/disponibilidad.errores.js';
import { validarConfiguracionDemo, validarRangoInclusivo } from './screens/disponibilidad/disponibilidad.contrato-operativo.js';
let draftScheduleId = -1;

export async function handleClick(e) {
  try {
    // La agenda real usa sus propias lecturas; nunca abre diálogos de escritura de la demo.
    if (!isDemo && state.page === 'agenda' &&
      (await import('../connected/screens/agenda/view.js')).handleAgendaClick(e)) return;
    // Solo los controles de la sección de inhabilitados cargan ese módulo;
    // navegación y acciones ordinarias conservan su flujo habitual.
    if (!isDemo && e.target.closest('[data-retired-open], [data-retired-list], [data-retired-detail], [data-retired-restore], [data-retired-effects]') &&
      await (await import('../connected/screens/recursos/retired-view.js')).handleRetiredClick(e)) return;
    if (isDemo && state.page === 'disponibilidad') {
      const slot = e.target.closest('[data-disponibilidad-horario]');
      const operationalAction = e.target.closest('[data-disponibilidad-accion]');
      if (slot) {
        (await import('../demo/screens/disponibilidad/disponibilidad.vista.js')).seleccionarHorarioDemo(slot.dataset.fechaHorario, slot.dataset.horaHorario);
        return;
      }
      if (operationalAction?.dataset.disponibilidadAccion === 'cambiar-a-manual') {
        (await import('../demo/screens/disponibilidad/disponibilidad.vista.js')).cambiarAModalidadManualDemo();
        return;
      }
    }
    if (!isDemo && user.rol === 'admin_negocio' && state.page === 'servicios') {
      const servicio = e.target.closest('[data-inhabilitar-servicio]');
      if (servicio) {
        (await import('../connected/screens/servicios/servicios.acciones.js')).confirmarInhabilitacionServicio(Number(servicio.dataset.inhabilitarServicio));
        return;
      }
    }
    if (!isDemo && user.rol === 'admin_negocio' && state.page === 'sucursales') {
      const sucursal = e.target.closest('[data-inhabilitar-sucursal]');
      if (sucursal) {
        (await import('../connected/screens/sucursales/sucursales.acciones.js')).confirmarInhabilitacionSucursal(Number(sucursal.dataset.inhabilitarSucursal));
        return;
      }
    }
    if (!isDemo && user.rol === 'admin_negocio' && state.page === 'profesionales') {
      const profesional = e.target.closest('[data-accion-profesional]');
      if (profesional) {
        // El diálogo espera el cupo vigente antes de abrir una reactivación.
        await (await import('../connected/screens/profesionales/profesionales.acciones.js')).accionProfesional(profesional.dataset.accionProfesional, Number(profesional.dataset.profesionalId));
        return;
      }
    }
    if (!isDemo && state.page === 'disponibilidad') {
      const availability = await import('../connected/screens/disponibilidad/disponibilidad.acciones.js');
      if (await availability.handleClicDisponibilidad(e)) return;
    }
    if (!isDemo && user.rol === 'superadmin' && state.page === 'negocio') {
      const licenseRetry = e.target.closest('[data-license-retry]');
      if (licenseRetry) {
        licenseRetry.disabled = true;
        try { await (await import('../connected/screens/negocio/actions.js')).retryLicenseOperation(); }
        finally { licenseRetry.disabled = false; }
        return;
      }
      const businessAction = e.target.closest('[data-business-action]');
      const retryDelivery = e.target.closest('[data-retry-delivery]');
      if (businessAction || retryDelivery) {
        const { businessAction: run } = await import('../connected/screens/negocio/actions.js');
        run(businessAction?.dataset.businessAction || 'retry', retryDelivery?.dataset.retryDelivery);
        return;
      }
    }
    if (!isDemo && user.rol === 'admin_negocio' && state.page === 'recepcionistas') {
      const accionCuenta = e.target.closest('[data-accion-recepcionista]');
      if (accionCuenta) {
        const recepcion = await import('../connected/screens/recepcionistas/recepcionistas.acciones.js');
        // Esperar la lectura del cupo conserva el manejo de errores del clic.
        await recepcion.accionRecepcionista(accionCuenta.dataset.accionRecepcionista, Number(accionCuenta.dataset.recepcionistaId));
        return;
      }
    }
    const alternarServicio = e.target.closest('[data-alternar-servicio]');
    if (alternarServicio) {
      const servicio = resource('services', Number(alternarServicio.dataset.alternarServicio), state.tenantId);
      alternarServicio.disabled = true;
      try {
        if (isDemo) servicio.active = servicio.active === false;
        else if (user.rol === 'profesional') {
          const professional = list('professionals', state.tenantId)[0];
          const serviceIds = professional.serviceIds.includes(servicio.id)
            ? professional.serviceIds.filter((id) => id !== servicio.id)
            : [...professional.serviceIds, servicio.id];
          await api(`/profesionales/${user.id}/servicios`, 'PUT', { servicioIds: serviceIds });
        } else await api(`/servicios/${servicio.id}/${servicio.active === false ? 'reactivar' : 'desactivar'}`, 'POST', {});
        if (!isDemo) await loadBackendData();
        render();
        toast('Servicio actualizado.');
      } catch (error) { toast(error.message); alternarServicio.disabled = false; }
      return;
    }
    const alternarSucursal = e.target.closest('[data-alternar-sucursal]');
    if (alternarSucursal) {
      const sucursal = resource('branches', Number(alternarSucursal.dataset.alternarSucursal), state.tenantId);
      alternarSucursal.disabled = true;
      try {
        if (isDemo) sucursal.active = sucursal.active === false;
        else if (user.rol === 'profesional') {
          await api(`/profesionales/${user.id}/sucursales/${sucursal.id}/atencion`, 'PUT', { activo: !sucursal.active });
        } else await api(`/sucursales/${sucursal.id}/${sucursal.active === false ? 'reactivar' : 'desactivar'}`, 'POST', {});
        if (!isDemo) await loadBackendData();
        render();
        toast(user?.rol === 'profesional' && !isDemo ? 'Disponibilidad en sucursal actualizada.' : 'Sucursal actualizada.');
      } catch (error) { toast(error.message); alternarSucursal.disabled = false; }
      return;
    }
    const addSchedule = e.target.closest('[data-agregar-franja]');
    if (addSchedule) {
      const day = Number(addSchedule.dataset.agregarFranja);
      const current = [...document.querySelectorAll(`[data-horario-franja][data-horario-dia="${day}"]`)];
      const selected = resource('professionals', document.querySelector('#profesional-horario').value, state.tenantId);
      const row = current.at(-1);
      const id = draftScheduleId--;
      row.insertAdjacentHTML('afterend', renderFranjaHorario({ id, day, enabled: true, branchId: Number(row.querySelector('select').value), start: '', end: '', breakStart: '', breakEnd: '' }, selected, state.tenantId, true, current.length));
      document.querySelector(`[data-horario-franja][data-id="${id}"] input[type="time"]`).focus();
      return;
    }
    const removeSchedule = e.target.closest('[data-quitar-franja]');
    if (removeSchedule) {
      const row = removeSchedule.closest('[data-horario-franja]');
      const siblings = document.querySelectorAll(`[data-horario-franja][data-horario-dia="${row.dataset.horarioDia}"]`);
      if (!isDemo && siblings.length === 1 && Number(row.dataset.id) > 0) {
        const selected = resource('professionals', document.querySelector('#profesional-horario').value, state.tenantId);
        row.insertAdjacentHTML('afterend', renderFranjaHorario({ id: draftScheduleId--, day: Number(row.dataset.horarioDia), branchId: selected.branchIds[0] || null, enabled: false, start: '', end: '', breakStart: '', breakEnd: '' }, selected, state.tenantId));
      }
      if (!isDemo || siblings.length > 1) row.remove();
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!isDemo && user.rol === 'profesional' && action === 'nuevo-profesional') { toast('Tu cuenta puede editar sus servicios desde Editar profesional.'); return; }
    if (!isDemo && (['new-appointment', 'nuevo-cliente', 'copy-link', 'filter-reports', 'export-report'].includes(action) || e.target.closest('[data-slot-date], button[data-mode]'))) { toast(pending); return; }
    const actionMap = {
      'nueva-recepcionista': async () => (await import('../connected/screens/recepcionistas/recepcionistas.acciones.js')).nuevaRecepcionista(),
      'change-password': async () => (await import('../connected/screens/cuenta/actions.js')).changePassword(),
      'logout-account': async () => (await import('../connected/screens/cuenta/actions.js')).closeAccountSession(),
      'refresh-license': async () => (await import('../connected/screens/cuenta/view.js')).refreshOwnLicense(),
      'back-platform': () => navigate('plataforma'),
      'retry-business-detail': async () => (await import('../connected/screens/negocio/view.js')).refreshBusinessDetail(),
      'new-appointment': async () => (await import('./screens/agenda/actions.js')).manualAppointment(),
      'go-agenda': () => navigate('agenda'),
      'nuevo-cliente': async () => (await import('../demo/screens/clientes/clientes.acciones.js')).nuevoCliente(),
      'nuevo-servicio': () => abrirEditorCatalogo('services'),
      'nueva-sucursal': () => abrirEditorCatalogo('branches'),
      'nuevo-profesional': () => abrirEditorCatalogo('professionals'),
      'nuevo-bloqueo': nuevoBloqueo,
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
      (await import('./screens/agenda/actions.js')).detail(Number(app.dataset.appointment));
      return;
    }
    const cell = e.target.closest('[data-slot-date]');
    if (cell) {
      (await import('./screens/agenda/actions.js')).manualAppointment(cell.dataset.slotDate, cell.dataset.slotTime);
      return;
    }
    for (const [attr, type] of [
      ['editarServicio', 'services'],
      ['editarSucursal', 'branches'],
      ['editarProfesional', 'professionals'],
    ]) {
      const selector = attr.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
      const el = e.target.closest(`[data-${selector}]`);
      if (el) {
        await abrirEditorCatalogo(type, Number(el.dataset[attr]));
        return;
      }
    }
    const ficha = e.target.closest('[data-ficha-demo-abrir]');
    if (ficha) {
      if (isDemo) {
        (await import('../demo/screens/clientes/clientes.acciones.js')).abrirFichaClienteDemo(Number(ficha.dataset.fichaDemoAbrir));
        return;
      }
      const cliente = resource(
        'clients',
        Number(ficha.dataset.fichaDemoAbrir),
        state.tenantId,
      );
      modal(
        esc(cliente.name),
        `<div class="dialog-body"><p class="mb-4">${icon('message')} ${esc(cliente.phone)} · Historial de citas</p>${appointmentTable(list('appointments', state.tenantId).filter((a) => a.clientId === cliente.id))}</div>`,
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
    const remove = e.target.closest('[data-eliminar-bloqueo]');
    if (remove) {
      const b = resource(
        'blocks',
        Number(remove.dataset.eliminarBloqueo),
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
          try { await api(`/bloqueos/${b.id}`, 'DELETE'); (await import('../connected/screens/disponibilidad/disponibilidad.vista.js')).invalidarProyeccion(); el.close(); await loadBackendData(); render(); toast('Bloqueo eliminado.'); } catch (error) { toast(error.message); } finally { submit.disabled = false; }
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
    const edit = e.target.closest('[data-editar-bloqueo]');
    if (edit) {
      const block = resource('blocks', Number(edit.dataset.editarBloqueo), state.tenantId);
      if (!isDemo && user.rol === 'profesional' && block.professionalId !== user.id) throw new Error('Solo puedes editar tus propios bloqueos.');
      editarBloqueo(block);
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
  if (e.target.id === 'busqueda-directorio-demo') {
    state.search = e.target.value;
    render();
    document.querySelector('#busqueda-directorio-demo').focus();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'profesional-bloqueos') {
    cambiarAlcanceBloqueos(e.target.value);
    if (e.target.value) state.profesionalHorario = Number(e.target.value);
    render();
  } else if (['profesional-horario', 'profesional-oferta', 'profesional-proyeccion'].includes(e.target.id)) {
    state.profesionalHorario = Number(e.target.value);
    render();
  }
});
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (isDemo && state.page === 'disponibilidad' && form.id === 'formulario-asignaciones-sucursales') {
    e.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      const branchIds = [...new FormData(form).getAll('branchIds')].map(Number);
      (await import('../demo/screens/disponibilidad/disponibilidad.vista.js')).guardarSucursalesAsignadasDemo(Number(form.dataset.personaId), branchIds);
    } catch (error) {
      const target = form.querySelector('[data-asignacion-error]');
      target.textContent = error.message;
      target.hidden = false;
      target.focus();
    } finally { submit.disabled = false; }
    return;
  }
  if (isDemo && state.page === 'disponibilidad' && ['formulario-configuracion-agenda', 'formulario-consulta-horarios', 'formulario-validacion-horario', 'formulario-citas-afectadas'].includes(form.id)) {
    e.preventDefault();
    const demo = await import('../demo/screens/disponibilidad/disponibilidad.vista.js');
    const data = new FormData(form);
    if (form.id === 'formulario-configuracion-agenda') {
      const values = { modo: data.get('modo'), intervaloMinutos: Number(data.get('intervaloMinutos')), anticipacionMinutos: Number(data.get('anticipacionMinutos')), diasFuturos: Number(data.get('diasFuturos')) };
      if (demo.guardarConfiguracionDemo(values, validarConfiguracionDemo(values))) toast('Reglas guardadas en esta demostración.');
    } else if (form.id === 'formulario-consulta-horarios') {
      const values = { personalId: Number(data.get('personalId')), sucursalId: Number(data.get('sucursalId')), servicioId: Number(data.get('servicioId')), from: data.get('from'), to: data.get('to'), modalidad: data.get('modalidad') };
      const errors = validarRangoInclusivo(values.from, values.to);
      for (const key of ['personalId', 'sucursalId', 'servicioId']) if (!Number.isSafeInteger(values[key]) || values[key] <= 0) errors[key] = 'Selecciona un identificador válido.';
      demo.consultarHorariosDemo(values, errors);
    } else if (form.id === 'formulario-validacion-horario') {
      demo.validarHorarioDemo({ personalId: Number(data.get('personalId')), sucursalId: Number(data.get('sucursalId')), servicioId: Number(data.get('servicioId')), fechaLocal: data.get('fechaLocal'), horaInicio: data.get('horaInicio'), modalidad: data.get('modalidad') });
    } else {
      const values = { personalId: data.get('personalId') ? Number(data.get('personalId')) : '', sucursalId: data.get('sucursalId') ? Number(data.get('sucursalId')) : '', from: data.get('from'), to: data.get('to') };
      demo.consultarAfectadasDemo(values, validarRangoInclusivo(values.from, values.to));
    }
    return;
  }
  if (
    !['formulario-horario', 'business-form', 'notification-form'].includes(form.id)
  )
    return;
  e.preventDefault();
  if (!isDemo && form.id !== 'formulario-horario') { toast(pending); return; }
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  let scheduleRows = [];
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
    if (form.id === 'formulario-horario') {
      const p = Number(document.querySelector('#profesional-horario').value);
      const professional = resource('professionals', p, state.tenantId);
      const updates = leerFranjasHorario(form, state.tenantId, p);
      scheduleRows = updates;
      const scheduleErrors = validarFranjasHorario(updates, professional.branchIds, isDemo);
      if (Object.keys(scheduleErrors).length) {
        mostrarErroresDisponibilidad(form, scheduleErrors);
        return;
      }
      limpiarErroresDisponibilidad(form);
      if (!isDemo) {
        await api(`/profesionales/${p}/horario`, 'PUT', crearPayloadHorario(updates));
        (await import('../connected/screens/disponibilidad/disponibilidad.vista.js')).invalidarProyeccion();
        try { await loadBackendData(); render(); toast('Horario guardado.'); } catch (error) { toast('Horario guardado. No se pudo actualizar la vista: ' + error.message); }
        return;
      }
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
    if (form.id === 'formulario-horario') {
      const errors = interpretarErroresHorario(error, scheduleRows);
      if (errors) mostrarErroresDisponibilidad(form, errors);
      else mostrarErrorGeneralDisponibilidad(form, error, '#horario-error');
    } else toast(error.message);
  } finally { submit.disabled = false; }
});

document.addEventListener('input', (event) => {
  if (event.target.closest('#formulario-horario')) limpiarCampoDisponibilidad(event.target.form, event.target);
});
document.addEventListener('change', (event) => {
  if (event.target.closest('#formulario-horario')) {
    if (event.target.matches('input[type="checkbox"][name^="activo-"]')) {
      cambiarEstadoFranja(event.target.closest('[data-horario-franja]'), event.target.checked);
    }
    limpiarCampoDisponibilidad(event.target.form, event.target);
  }
});
