import { abrirEditorCatalogo } from './screens/catalogos/catalogos.acciones.js';
import { nuevoBloqueo, editarBloqueo } from './screens/disponibilidad/disponibilidad.acciones.js';
import { cambiarEspacioTrabajo, registrarNegocio } from './screens/plataforma/plataforma.acciones.js';
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
import { estadoReportes } from '../demo/screens/reportes/reportes.estado.js';
import { tablaCitas } from './screens/agenda/agenda.tabla.js';
import { renderFranjaHorario, cambiarAlcanceBloqueos } from './screens/disponibilidad/disponibilidad.vista.js';
import { leerFranjasHorario, cambiarEstadoFranja } from './screens/disponibilidad/disponibilidad.horario-franjas.js';
import { citaCubiertaPorHorarioDemo } from '../demo/demo.horario.js';
import { limpiarErroresDisponibilidad, limpiarCampoDisponibilidad, mostrarErroresDisponibilidad, mostrarErrorGeneralDisponibilidad, validarFranjasHorario, interpretarErroresHorario } from './screens/disponibilidad/disponibilidad.errores.js';
import { validarConfiguracionDemo, validarRangoInclusivo } from './screens/disponibilidad/disponibilidad.contrato-operativo.js';
let draftScheduleId = -1;

export async function handleClick(e) {
  try {
    // La agenda real usa sus propias lecturas; nunca abre diálogos de escritura de la demo.
    if (!isDemo && state.page === 'agenda' &&
      (await import('../connected/screens/agenda/agenda.vista.js')).handleClicAgenda(e)) return;
    // Solo los controles de la sección de inhabilitados cargan ese módulo;
    // navegación y acciones ordinarias conservan su flujo habitual.
    if (!isDemo && e.target.closest('[data-inhabilitados-abrir], [data-inhabilitados-lista], [data-inhabilitados-detalle], [data-inhabilitados-restaurar], [data-inhabilitados-afectaciones]') &&
      await (await import('../connected/screens/recursos/inhabilitados.vista.js')).handleClicInhabilitados(e)) return;
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
      const reintentarLicencia = e.target.closest('[data-licencia-reintentar]');
      if (reintentarLicencia) {
        reintentarLicencia.disabled = true;
        try { await (await import('../connected/screens/negocio/negocio.acciones.js')).reintentarOperacionLicencia(); }
        finally { reintentarLicencia.disabled = false; }
        return;
      }
      const accionNegocio = e.target.closest('[data-accion-negocio]');
      const reintentarEnvio = e.target.closest('[data-reintentar-envio]');
      if (accionNegocio || reintentarEnvio) {
        const { accionNegocio: ejecutarAccion } = await import('../connected/screens/negocio/negocio.acciones.js');
        ejecutarAccion(accionNegocio?.dataset.accionNegocio || 'reintentar', reintentarEnvio?.dataset.reintentarEnvio);
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
    if (!isDemo && (['nueva-cita', 'nuevo-cliente', 'copy-link', 'filtrar-reportes', 'imprimir-reporte'].includes(action) || e.target.closest('[data-horario-fecha], button[data-mode]'))) { toast(pending); return; }
    const actionMap = {
      'nueva-recepcionista': async () => (await import('../connected/screens/recepcionistas/recepcionistas.acciones.js')).nuevaRecepcionista(),
      'cambiar-contrasena-cuenta': async () => (await import('../connected/screens/cuenta/cuenta.acciones.js')).cambiarContrasena(),
      'cerrar-sesion-cuenta': async () => (await import('../connected/screens/cuenta/cuenta.acciones.js')).cerrarSesionCuenta(),
      'consultar-licencia-propia': async () => (await import('../connected/screens/cuenta/cuenta.vista.js')).consultarLicenciaPropia(),
      'back-platform': () => navigate('plataforma'),
      'consultar-detalle-negocio': async () => (await import('../connected/screens/negocio/negocio.vista.js')).consultarDetalleNegocio(),
      'nueva-cita': async () => (await import('./screens/agenda/agenda.acciones.js')).nuevaCitaManual(),
      'go-agenda': () => navigate('agenda'),
      'nuevo-cliente': async () => (await import('../demo/screens/clientes/clientes.acciones.js')).nuevoCliente(),
      'nuevo-servicio': () => abrirEditorCatalogo('services'),
      'nueva-sucursal': () => abrirEditorCatalogo('branches'),
      'nuevo-profesional': () => abrirEditorCatalogo('professionals'),
      'nuevo-bloqueo': nuevoBloqueo,
      'cambiar-espacio-trabajo': cambiarEspacioTrabajo,
      'registrar-negocio': registrarNegocio,
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
      'filtrar-reportes': () => {
        const desde = document.querySelector('#reportes-desde').value,
          hasta = document.querySelector('#reportes-hasta').value;
        if (!desde || !hasta || desde > hasta) {
          toast('Selecciona un rango válido de fechas.');
          return;
        }
        estadoReportes.desde = desde;
        estadoReportes.hasta = hasta;
        estadoReportes.sucursal = document.querySelector('#reportes-sucursal').value;
        render();
      },
      'imprimir-reporte': () => {
        toast('Elige “Guardar como PDF” en el diálogo de impresión.');
        window.print();
      },
    };
    if (actionMap[action]) {
      await actionMap[action]();
      return;
    }
    const app = e.target.closest('[data-cita]');
    if (app) {
      (await import('./screens/agenda/agenda.acciones.js')).abrirDetalleDemo(Number(app.dataset.cita));
      return;
    }
    const cell = e.target.closest('[data-horario-fecha]');
    if (cell) {
      (await import('./screens/agenda/agenda.acciones.js')).nuevaCitaManual(cell.dataset.horarioFecha, cell.dataset.horarioHora);
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
        `<div class="dialog-body"><p class="mb-4">${icon('message')} ${esc(cliente.phone)} · Historial de citas</p>${tablaCitas(list('appointments', state.tenantId).filter((a) => a.clientId === cliente.id))}</div>`,
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
    const cambioEstado = e.target.closest('[data-cambiar-estado-negocio]');
    if (cambioEstado) {
      const negocio = tenantById(cambioEstado.dataset.cambiarEstadoNegocio);
      const dialogo = modal(
        negocio.suspended ? 'Reactivar negocio' : 'Suspender negocio',
        `<div class="dialog-body"><p>${esc(negocio.name)} ${isDemo ? (negocio.suspended ? 'volverá a mostrar' : 'dejará de mostrar') + ' su portal público en esta simulación.' : (negocio.suspended ? 'reactivará su licencia.' : 'solicitará la suspensión de su licencia según el plazo del servidor.')}</p></div><div class="dialog-footer"><button class="btn btn-light" id="volver-estado-negocio">Volver</button><button class="btn btn-primary" id="confirmar-estado-negocio">${negocio.suspended ? 'Reactivar' : 'Suspender'}</button></div>`,
      );
      dialogo.querySelector('#volver-estado-negocio').onclick = () => dialogo.close();
      dialogo.querySelector('#confirmar-estado-negocio').onclick = async () => {
        if (!isDemo) {
          const confirmacion = dialogo.querySelector('#confirmar-estado-negocio'); confirmacion.disabled = true;
          try { if (!negocio.licenseId) throw new Error('Este negocio aún no tiene una licencia disponible.'); const resultado = await api(`/licencias/${negocio.licenseId}/${negocio.suspended ? 'reactivar' : 'suspender'}`, 'POST', {}); dialogo.close(); await loadBackendData(); render(); toast('Licencia: ' + resultado.estado); } catch (error) { toast(error.message); } finally { confirmacion.disabled = false; }
          return;
        }
        negocio.suspended = !negocio.suspended;
        dialogo.close();
        render();
        toast('Estado del negocio actualizado.');
      };
      return;
    }
    const renovacion = e.target.closest('[data-renovar-licencia]');
    if (renovacion) {
      if (!isDemo) {
        const negocio = tenantById(renovacion.dataset.renovarLicencia);
        if (!negocio.licenseId) throw new Error('Este negocio aún no tiene una licencia disponible.');
        const dialogo = modal('Renovar licencia', `<div class="dialog-body"><p>Se agregará un año calendario a la licencia de ${esc(negocio.name)}.</p></div><div class="dialog-footer"><button class="btn btn-light" data-dismiss>Cancelar</button><button class="btn btn-primary" id="confirmar-renovacion-negocio">Renovar licencia</button></div>`);
        dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
        dialogo.querySelector('#confirmar-renovacion-negocio').onclick = async () => {
          const confirmacion = dialogo.querySelector('#confirmar-renovacion-negocio'); confirmacion.disabled = true;
          try { await api(`/licencias/${negocio.licenseId}/renovar`, 'POST', {}); dialogo.close(); await loadBackendData(); render(); toast('Licencia renovada.'); } catch (error) { toast(error.message); } finally { confirmacion.disabled = false; }
        };
        return;
      }
      tenantById(renovacion.dataset.renovarLicencia).license = '90 días';
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
    !['formulario-horario', 'formulario-negocio-demo', 'formulario-notificaciones-demo'].includes(form.id)
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
    if (form.id === 'formulario-negocio-demo') {
      if (!f.get('nombre').trim())
        throw new Error('El nombre del negocio es obligatorio.');
      t.name = f.get('nombre').trim();
      t.email = f.get('correo');
      t.phone = f.get('telefono');
    }
    if (form.id === 'formulario-notificaciones-demo') {
      t.confirmacionesActivas = f.has('confirmacion');
      t.recordatoriosActivos = f.has('recordatorio');
      t.horasRecordatorio = Number(f.get('horas'));
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
      if (active.some((a) => !citaCubiertaPorHorarioDemo(a, updates)))
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
