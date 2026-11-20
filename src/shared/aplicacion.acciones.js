import { abrirEditorCatalogo } from './screens/catalogos/catalogos.acciones.js';
import { nuevoBloqueo, editarBloqueo } from './screens/disponibilidad/disponibilidad.acciones.js';
import { cambiarEspacioTrabajo, registrarNegocio } from './screens/plataforma/plataforma.acciones.js';
import { esDemo, mensajePendiente, api, usuarioActual, cargarDatosBackend, crearPayloadHorario } from '../connected/backend.js';
import { estadoAplicacion, render, navegar } from './aplicacion.nucleo.js';
import {
  datosAplicacion,
  listarRegistros,
  obtenerRecurso,
  obtenerNegocio,
  HOY,
  horaAMinutos,
  crearFecha,
} from './aplicacion.datos.js';
import { renderIcono } from './iconos.catalogo.js';
import { abrirDialogo, mostrarAviso, escaparHtml as esc } from './interfaz.componentes.js';
import { estadoReportes } from '../demo/screens/reportes/reportes.estado.js';
import { tablaCitas } from './screens/agenda/agenda.tabla.js';
import { renderFranjaHorario, cambiarAlcanceBloqueos } from './screens/disponibilidad/disponibilidad.vista.js';
import { leerFranjasHorario, cambiarEstadoFranja } from './screens/disponibilidad/disponibilidad.horario-franjas.js';
import { citaCubiertaPorHorarioDemo } from '../demo/demo.horario.js';
import { limpiarErroresDisponibilidad, limpiarCampoDisponibilidad, mostrarErroresDisponibilidad, mostrarErrorGeneralDisponibilidad, validarFranjasHorario, interpretarErroresHorario } from './screens/disponibilidad/disponibilidad.errores.js';
import { validarConfiguracionDemo, validarRangoInclusivo } from './screens/disponibilidad/disponibilidad.contrato-operativo.js';
let idBorradorFranja = -1;

export async function handleClicAplicacion(evento) {
  try {
    // La agenda real usa sus propias lecturas; nunca abre diálogos de escritura de la demo.
    if (!esDemo && estadoAplicacion.pagina === 'agenda' &&
      (await import('../connected/screens/agenda/agenda.vista.js')).handleClicAgenda(evento)) return;
    // Solo los controles de la sección de inhabilitados cargan ese módulo;
    // navegación y acciones ordinarias conservan su flujo habitual.
    if (!esDemo && evento.target.closest('[data-inhabilitados-abrir], [data-inhabilitados-lista], [data-inhabilitados-detalle], [data-inhabilitados-restaurar], [data-inhabilitados-afectaciones]') &&
      await (await import('../connected/screens/recursos/inhabilitados.vista.js')).handleClicInhabilitados(evento)) return;
    if (esDemo && estadoAplicacion.pagina === 'disponibilidad') {
      const horario = evento.target.closest('[data-disponibilidad-horario]');
      const accionOperativa = evento.target.closest('[data-disponibilidad-accion]');
      if (horario) {
        (await import('../demo/screens/disponibilidad/disponibilidad.vista.js')).seleccionarHorarioDemo(horario.dataset.fechaHorario, horario.dataset.horaHorario);
        return;
      }
      if (accionOperativa?.dataset.disponibilidadAccion === 'cambiar-a-manual') {
        (await import('../demo/screens/disponibilidad/disponibilidad.vista.js')).cambiarAModalidadManualDemo();
        return;
      }
    }
    if (!esDemo && usuarioActual.rol === 'admin_negocio' && estadoAplicacion.pagina === 'servicios') {
      const servicio = evento.target.closest('[data-inhabilitar-servicio]');
      if (servicio) {
        (await import('../connected/screens/servicios/servicios.acciones.js')).confirmarInhabilitacionServicio(Number(servicio.dataset.inhabilitarServicio));
        return;
      }
    }
    if (!esDemo && usuarioActual.rol === 'admin_negocio' && estadoAplicacion.pagina === 'sucursales') {
      const sucursal = evento.target.closest('[data-inhabilitar-sucursal]');
      if (sucursal) {
        (await import('../connected/screens/sucursales/sucursales.acciones.js')).confirmarInhabilitacionSucursal(Number(sucursal.dataset.inhabilitarSucursal));
        return;
      }
    }
    if (!esDemo && usuarioActual.rol === 'admin_negocio' && estadoAplicacion.pagina === 'profesionales') {
      const profesional = evento.target.closest('[data-accion-profesional]');
      if (profesional) {
        // El diálogo espera el cupo vigente antes de abrir una reactivación.
        await (await import('../connected/screens/profesionales/profesionales.acciones.js')).accionProfesional(profesional.dataset.accionProfesional, Number(profesional.dataset.profesionalId));
        return;
      }
    }
    if (!esDemo && estadoAplicacion.pagina === 'disponibilidad') {
      const disponibilidad = await import('../connected/screens/disponibilidad/disponibilidad.acciones.js');
      if (await disponibilidad.handleClicDisponibilidad(evento)) return;
    }
    if (!esDemo && usuarioActual.rol === 'superadmin' && estadoAplicacion.pagina === 'negocio') {
      const reintentarLicencia = evento.target.closest('[data-licencia-reintentar]');
      if (reintentarLicencia) {
        reintentarLicencia.disabled = true;
        try { await (await import('../connected/screens/negocio/negocio.acciones.js')).reintentarOperacionLicencia(); }
        finally { reintentarLicencia.disabled = false; }
        return;
      }
      const accionNegocio = evento.target.closest('[data-accion-negocio]');
      const reintentarEnvio = evento.target.closest('[data-reintentar-envio]');
      if (accionNegocio || reintentarEnvio) {
        const { accionNegocio: ejecutarAccion } = await import('../connected/screens/negocio/negocio.acciones.js');
        ejecutarAccion(accionNegocio?.dataset.accionNegocio || 'reintentar', reintentarEnvio?.dataset.reintentarEnvio);
        return;
      }
    }
    if (!esDemo && usuarioActual.rol === 'admin_negocio' && estadoAplicacion.pagina === 'recepcionistas') {
      const accionCuenta = evento.target.closest('[data-accion-recepcionista]');
      if (accionCuenta) {
        const recepcion = await import('../connected/screens/recepcionistas/recepcionistas.acciones.js');
        // Esperar la lectura del cupo conserva el manejo de errores del clic.
        await recepcion.accionRecepcionista(accionCuenta.dataset.accionRecepcionista, Number(accionCuenta.dataset.recepcionistaId));
        return;
      }
    }
    const alternarServicio = evento.target.closest('[data-alternar-servicio]');
    if (alternarServicio) {
      const servicio = obtenerRecurso('services', Number(alternarServicio.dataset.alternarServicio), estadoAplicacion.negocioId);
      alternarServicio.disabled = true;
      try {
        if (esDemo) servicio.active = servicio.active === false;
        else if (usuarioActual.rol === 'profesional') {
          const profesional = listarRegistros('professionals', estadoAplicacion.negocioId)[0];
          const serviciosIds = profesional.serviceIds.includes(servicio.id)
            ? profesional.serviceIds.filter((id) => id !== servicio.id)
            : [...profesional.serviceIds, servicio.id];
          await api(`/profesionales/${usuarioActual.id}/servicios`, 'PUT', { servicioIds: serviciosIds });
        } else await api(`/servicios/${servicio.id}/${servicio.active === false ? 'reactivar' : 'desactivar'}`, 'POST', {});
        if (!esDemo) await cargarDatosBackend();
        render();
        mostrarAviso('Servicio actualizado.');
      } catch (error) { mostrarAviso(error.message); alternarServicio.disabled = false; }
      return;
    }
    const alternarSucursal = evento.target.closest('[data-alternar-sucursal]');
    if (alternarSucursal) {
      const sucursal = obtenerRecurso('branches', Number(alternarSucursal.dataset.alternarSucursal), estadoAplicacion.negocioId);
      alternarSucursal.disabled = true;
      try {
        if (esDemo) sucursal.active = sucursal.active === false;
        else if (usuarioActual.rol === 'profesional') {
          await api(`/profesionales/${usuarioActual.id}/sucursales/${sucursal.id}/atencion`, 'PUT', { activo: !sucursal.active });
        } else await api(`/sucursales/${sucursal.id}/${sucursal.active === false ? 'reactivar' : 'desactivar'}`, 'POST', {});
        if (!esDemo) await cargarDatosBackend();
        render();
        mostrarAviso(usuarioActual?.rol === 'profesional' && !esDemo ? 'Disponibilidad en sucursal actualizada.' : 'Sucursal actualizada.');
      } catch (error) { mostrarAviso(error.message); alternarSucursal.disabled = false; }
      return;
    }
    const agregarFranja = evento.target.closest('[data-agregar-franja]');
    if (agregarFranja) {
      const dia = Number(agregarFranja.dataset.agregarFranja);
      const franjasActuales = [...document.querySelectorAll(`[data-horario-franja][data-horario-dia="${dia}"]`)];
      const seleccionado = obtenerRecurso('professionals', document.querySelector('#profesional-horario').value, estadoAplicacion.negocioId);
      const franja = franjasActuales.at(-1);
      const id = idBorradorFranja--;
      franja.insertAdjacentHTML('afterend', renderFranjaHorario({ id, day: dia, enabled: true, branchId: Number(franja.querySelector('select').value), start: '', end: '', breakStart: '', breakEnd: '' }, seleccionado, estadoAplicacion.negocioId, true, franjasActuales.length));
      document.querySelector(`[data-horario-franja][data-id="${id}"] input[type="time"]`).focus();
      return;
    }
    const quitarFranja = evento.target.closest('[data-quitar-franja]');
    if (quitarFranja) {
      const franja = quitarFranja.closest('[data-horario-franja]');
      const franjasDelDia = document.querySelectorAll(`[data-horario-franja][data-horario-dia="${franja.dataset.horarioDia}"]`);
      if (!esDemo && franjasDelDia.length === 1 && Number(franja.dataset.id) > 0) {
        const seleccionado = obtenerRecurso('professionals', document.querySelector('#profesional-horario').value, estadoAplicacion.negocioId);
        franja.insertAdjacentHTML('afterend', renderFranjaHorario({ id: idBorradorFranja--, day: Number(franja.dataset.horarioDia), branchId: seleccionado.branchIds[0] || null, enabled: false, start: '', end: '', breakStart: '', breakEnd: '' }, seleccionado, estadoAplicacion.negocioId));
      }
      if (!esDemo || franjasDelDia.length > 1) franja.remove();
      return;
    }
    const accion = evento.target.closest('[data-action]')?.dataset.action;
    if (!esDemo && usuarioActual.rol === 'profesional' && accion === 'nuevo-profesional') { mostrarAviso('Tu cuenta puede editar sus servicios desde Editar profesional.'); return; }
    if (!esDemo && (['nueva-cita', 'nuevo-cliente', 'copiar-enlace', 'filtrar-reportes', 'imprimir-reporte'].includes(accion) || evento.target.closest('[data-horario-fecha], button[data-mode]'))) { mostrarAviso(mensajePendiente); return; }
    const acciones = {
      'nueva-recepcionista': async () => (await import('../connected/screens/recepcionistas/recepcionistas.acciones.js')).nuevaRecepcionista(),
      'cambiar-contrasena-cuenta': async () => (await import('../connected/screens/cuenta/cuenta.acciones.js')).cambiarContrasena(),
      'cerrar-sesion-cuenta': async () => (await import('../connected/screens/cuenta/cuenta.acciones.js')).cerrarSesionCuenta(),
      'consultar-licencia-propia': async () => (await import('../connected/screens/cuenta/cuenta.vista.js')).consultarLicenciaPropia(),
      'volver-plataforma': () => navegar('plataforma'),
      'consultar-detalle-negocio': async () => (await import('../connected/screens/negocio/negocio.vista.js')).consultarDetalleNegocio(),
      'nueva-cita': async () => (await import('./screens/agenda/agenda.acciones.js')).nuevaCitaManual(),
      'ir-agenda': () => navegar('agenda'),
      'nuevo-cliente': async () => (await import('../demo/screens/clientes/clientes.acciones.js')).nuevoCliente(),
      'nuevo-servicio': () => abrirEditorCatalogo('services'),
      'nueva-sucursal': () => abrirEditorCatalogo('branches'),
      'nuevo-profesional': () => abrirEditorCatalogo('professionals'),
      'nuevo-bloqueo': nuevoBloqueo,
      'cambiar-espacio-trabajo': cambiarEspacioTrabajo,
      'registrar-negocio': registrarNegocio,
      'copiar-enlace': async () => {
        const url = `${location.origin}/reservas/${obtenerNegocio(estadoAplicacion.negocioId).slug}`;
        try {
          await navigator.clipboard.writeText(url);
          mostrarAviso('Enlace copiado.');
        } catch {
          abrirDialogo(
            'Enlace de reservas',
            `<div class="dialogo-cuerpo"><label for="copy-url" class="form-label">Copia este enlace</label><input id="copy-url" class="form-control" readonly value="${esc(url)}"/></div>`,
          );
          document.querySelector('#copy-url').select();
        }
      },
      'filtrar-reportes': () => {
        const desde = document.querySelector('#reportes-desde').value,
          hasta = document.querySelector('#reportes-hasta').value;
        if (!desde || !hasta || desde > hasta) {
          mostrarAviso('Selecciona un rango válido de fechas.');
          return;
        }
        estadoReportes.desde = desde;
        estadoReportes.hasta = hasta;
        estadoReportes.sucursal = document.querySelector('#reportes-sucursal').value;
        render();
      },
      'imprimir-reporte': () => {
        mostrarAviso('Elige “Guardar como PDF” en el diálogo de impresión.');
        window.print();
      },
    };
    if (acciones[accion]) {
      await acciones[accion]();
      return;
    }
    const cita = evento.target.closest('[data-cita]');
    if (cita) {
      (await import('./screens/agenda/agenda.acciones.js')).abrirDetalleDemo(Number(cita.dataset.cita));
      return;
    }
    const celda = evento.target.closest('[data-horario-fecha]');
    if (celda) {
      (await import('./screens/agenda/agenda.acciones.js')).nuevaCitaManual(celda.dataset.horarioFecha, celda.dataset.horarioHora);
      return;
    }
    for (const [atributo, tipo] of [
      ['editarServicio', 'services'],
      ['editarSucursal', 'branches'],
      ['editarProfesional', 'professionals'],
    ]) {
      const selector = atributo.replace(/[A-Z]/g, (valor) => '-' + valor.toLowerCase());
      const dialogo = evento.target.closest(`[data-${selector}]`);
      if (dialogo) {
        await abrirEditorCatalogo(tipo, Number(dialogo.dataset[atributo]));
        return;
      }
    }
    const ficha = evento.target.closest('[data-ficha-demo-abrir]');
    if (ficha) {
      if (esDemo) {
        (await import('../demo/screens/clientes/clientes.acciones.js')).abrirFichaClienteDemo(Number(ficha.dataset.fichaDemoAbrir));
        return;
      }
      const cliente = obtenerRecurso(
        'clients',
        Number(ficha.dataset.fichaDemoAbrir),
        estadoAplicacion.negocioId,
      );
      abrirDialogo(
        esc(cliente.name),
        `<div class="dialogo-cuerpo"><p class="mb-4">${renderIcono('message')} ${esc(cliente.phone)} · Historial de citas</p>${tablaCitas(listarRegistros('appointments', estadoAplicacion.negocioId).filter((cita) => cita.clientId === cliente.id))}</div>`,
        true,
      );
      return;
    }
    const modo = evento.target.closest('[data-mode]');
    if (modo) {
      if (!['free', 'compact'].includes(modo.dataset.mode)) return;
      obtenerNegocio(estadoAplicacion.negocioId).mode = modo.dataset.mode;
      render();
      mostrarAviso('Modo de agenda actualizado para este negocio.');
      return;
    }
    const quitar = evento.target.closest('[data-eliminar-bloqueo]');
    if (quitar) {
      const negocio = obtenerRecurso(
        'blocks',
        Number(quitar.dataset.eliminarBloqueo),
        estadoAplicacion.negocioId,
      );
      const dialogo = abrirDialogo(
        'Eliminar bloqueo',
        `<div class="dialogo-cuerpo"><p>Se volverá a ofrecer disponibilidad durante “${esc(negocio.reason)}”.</p></div><div class="dialogo-pie"><button id="keep-block" class="btn btn-light">Conservar</button><button id="confirm-remove-block" class="btn btn-peligro-suave">Eliminar bloqueo</button></div>`,
      );
      dialogo.querySelector('#keep-block').onclick = () => dialogo.close();
      dialogo.querySelector('#confirm-remove-block').onclick = async () => {
        if (!esDemo) {
          const botonEnviar = dialogo.querySelector('#confirm-remove-block'); botonEnviar.disabled = true;
          try { await api(`/bloqueos/${negocio.id}`, 'DELETE'); (await import('../connected/screens/disponibilidad/disponibilidad.vista.js')).invalidarProyeccion(); dialogo.close(); await cargarDatosBackend(); render(); mostrarAviso('Bloqueo eliminado.'); } catch (error) { mostrarAviso(error.message); } finally { botonEnviar.disabled = false; }
          return;
        }
        datosAplicacion.blocks = datosAplicacion.blocks.filter(
          (registro) => !(registro.id === negocio.id && registro.tenantId === estadoAplicacion.negocioId),
        );
        dialogo.close();
        render();
        mostrarAviso('Bloqueo eliminado.');
      };
      return;
    }
    const editar = evento.target.closest('[data-editar-bloqueo]');
    if (editar) {
      const bloqueo = obtenerRecurso('blocks', Number(editar.dataset.editarBloqueo), estadoAplicacion.negocioId);
      if (!esDemo && usuarioActual.rol === 'profesional' && bloqueo.professionalId !== usuarioActual.id) throw new Error('Solo puedes editar tus propios bloqueos.');
      editarBloqueo(bloqueo);
      return;
    }
    const cambioEstado = evento.target.closest('[data-cambiar-estado-negocio]');
    if (cambioEstado) {
      const negocio = obtenerNegocio(cambioEstado.dataset.cambiarEstadoNegocio);
      const dialogo = abrirDialogo(
        negocio.suspended ? 'Reactivar negocio' : 'Suspender negocio',
        `<div class="dialogo-cuerpo"><p>${esc(negocio.name)} ${esDemo ? (negocio.suspended ? 'volverá a mostrar' : 'dejará de mostrar') + ' su portal público en esta simulación.' : (negocio.suspended ? 'reactivará su licencia.' : 'solicitará la suspensión de su licencia según el plazo del servidor.')}</p></div><div class="dialogo-pie"><button class="btn btn-light" id="volver-estado-negocio">Volver</button><button class="btn btn-primary" id="confirmar-estado-negocio">${negocio.suspended ? 'Reactivar' : 'Suspender'}</button></div>`,
      );
      dialogo.querySelector('#volver-estado-negocio').onclick = () => dialogo.close();
      dialogo.querySelector('#confirmar-estado-negocio').onclick = async () => {
        if (!esDemo) {
          const confirmacion = dialogo.querySelector('#confirmar-estado-negocio'); confirmacion.disabled = true;
          try { if (!negocio.licenseId) throw new Error('Este negocio aún no tiene una licencia disponible.'); const resultado = await api(`/licencias/${negocio.licenseId}/${negocio.suspended ? 'reactivar' : 'suspender'}`, 'POST', {}); dialogo.close(); await cargarDatosBackend(); render(); mostrarAviso('Licencia: ' + resultado.estado); } catch (error) { mostrarAviso(error.message); } finally { confirmacion.disabled = false; }
          return;
        }
        negocio.suspended = !negocio.suspended;
        dialogo.close();
        render();
        mostrarAviso('Estado del negocio actualizado.');
      };
      return;
    }
    const renovacion = evento.target.closest('[data-renovar-licencia]');
    if (renovacion) {
      if (!esDemo) {
        const negocio = obtenerNegocio(renovacion.dataset.renovarLicencia);
        if (!negocio.licenseId) throw new Error('Este negocio aún no tiene una licencia disponible.');
        const dialogo = abrirDialogo('Renovar licencia', `<div class="dialogo-cuerpo"><p>Se agregará un año calendario a la licencia de ${esc(negocio.name)}.</p></div><div class="dialogo-pie"><button class="btn btn-light" data-dismiss>Cancelar</button><button class="btn btn-primary" id="confirmar-renovacion-negocio">Renovar licencia</button></div>`);
        dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
        dialogo.querySelector('#confirmar-renovacion-negocio').onclick = async () => {
          const confirmacion = dialogo.querySelector('#confirmar-renovacion-negocio'); confirmacion.disabled = true;
          try { await api(`/licencias/${negocio.licenseId}/renovar`, 'POST', {}); dialogo.close(); await cargarDatosBackend(); render(); mostrarAviso('Licencia renovada.'); } catch (error) { mostrarAviso(error.message); } finally { confirmacion.disabled = false; }
        };
        return;
      }
      obtenerNegocio(renovacion.dataset.renovarLicencia).license = '90 días';
      render();
      mostrarAviso('Licencia de demostración renovada por 90 días.');
    }
  } catch (error) {
    mostrarAviso(error.message);
  }
}
document.addEventListener('input', (evento) => {
  if (evento.target.id === 'busqueda-directorio-demo') {
    estadoAplicacion.busqueda = evento.target.value;
    render();
    document.querySelector('#busqueda-directorio-demo').focus();
  }
});
document.addEventListener('change', (evento) => {
  if (evento.target.id === 'profesional-bloqueos') {
    cambiarAlcanceBloqueos(evento.target.value);
    if (evento.target.value) estadoAplicacion.profesionalHorario = Number(evento.target.value);
    render();
  } else if (['profesional-horario', 'profesional-oferta', 'profesional-proyeccion'].includes(evento.target.id)) {
    estadoAplicacion.profesionalHorario = Number(evento.target.value);
    render();
  }
});
document.addEventListener('submit', async (evento) => {
  const formulario = evento.target;
  if (esDemo && estadoAplicacion.pagina === 'disponibilidad' && formulario.id === 'formulario-asignaciones-sucursales') {
    evento.preventDefault();
    const botonEnviar = formulario.querySelector('[type="submit"]');
    if (botonEnviar.disabled) return;
    botonEnviar.disabled = true;
    try {
      const sucursalesIds = [...new FormData(formulario).getAll('branchIds')].map(Number);
      (await import('../demo/screens/disponibilidad/disponibilidad.vista.js')).guardarSucursalesAsignadasDemo(Number(formulario.dataset.personaId), sucursalesIds);
    } catch (error) {
      const destino = formulario.querySelector('[data-asignacion-error]');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally { botonEnviar.disabled = false; }
    return;
  }
  if (esDemo && estadoAplicacion.pagina === 'disponibilidad' && ['formulario-configuracion-agenda', 'formulario-consulta-horarios', 'formulario-validacion-horario', 'formulario-citas-afectadas'].includes(formulario.id)) {
    evento.preventDefault();
    const demo = await import('../demo/screens/disponibilidad/disponibilidad.vista.js');
    const datos = new FormData(formulario);
    if (formulario.id === 'formulario-configuracion-agenda') {
      const valores = { modo: datos.get('modo'), intervaloMinutos: Number(datos.get('intervaloMinutos')), anticipacionMinutos: Number(datos.get('anticipacionMinutos')), diasFuturos: Number(datos.get('diasFuturos')) };
      if (demo.guardarConfiguracionDemo(valores, validarConfiguracionDemo(valores))) mostrarAviso('Reglas guardadas en esta demostración.');
    } else if (formulario.id === 'formulario-consulta-horarios') {
      const valores = { personalId: Number(datos.get('personalId')), sucursalId: Number(datos.get('sucursalId')), servicioId: Number(datos.get('servicioId')), from: datos.get('from'), to: datos.get('to'), modalidad: datos.get('modalidad') };
      const errores = validarRangoInclusivo(valores.from, valores.to);
      for (const clave of ['personalId', 'sucursalId', 'servicioId']) if (!Number.isSafeInteger(valores[clave]) || valores[clave] <= 0) errores[clave] = 'Selecciona un identificador válido.';
      demo.consultarHorariosDemo(valores, errores);
    } else if (formulario.id === 'formulario-validacion-horario') {
      demo.validarHorarioDemo({ personalId: Number(datos.get('personalId')), sucursalId: Number(datos.get('sucursalId')), servicioId: Number(datos.get('servicioId')), fechaLocal: datos.get('fechaLocal'), horaInicio: datos.get('horaInicio'), modalidad: datos.get('modalidad') });
    } else {
      const valores = { personalId: datos.get('personalId') ? Number(datos.get('personalId')) : '', sucursalId: datos.get('sucursalId') ? Number(datos.get('sucursalId')) : '', from: datos.get('from'), to: datos.get('to') };
      demo.consultarAfectadasDemo(valores, validarRangoInclusivo(valores.from, valores.to));
    }
    return;
  }
  if (
    !['formulario-horario', 'formulario-negocio-demo', 'formulario-notificaciones-demo'].includes(formulario.id)
  )
    return;
  evento.preventDefault();
  if (!esDemo && formulario.id !== 'formulario-horario') { mostrarAviso(mensajePendiente); return; }
  const botonEnviar = formulario.querySelector('[type="submit"]');
  if (botonEnviar.disabled) return;
  botonEnviar.disabled = true;
  let franjasHorario = [];
  try {
    const datosFormulario = new FormData(formulario),
      negocio = obtenerNegocio(estadoAplicacion.negocioId);
    if (formulario.id === 'formulario-negocio-demo') {
      if (!datosFormulario.get('nombre').trim())
        throw new Error('El nombre del negocio es obligatorio.');
      negocio.name = datosFormulario.get('nombre').trim();
      negocio.email = datosFormulario.get('correo');
      negocio.phone = datosFormulario.get('telefono');
    }
    if (formulario.id === 'formulario-notificaciones-demo') {
      negocio.confirmacionesActivas = datosFormulario.has('confirmacion');
      negocio.recordatoriosActivos = datosFormulario.has('recordatorio');
      negocio.horasRecordatorio = Number(datosFormulario.get('horas'));
    }
    if (formulario.id === 'formulario-horario') {
      const profesionalId = Number(document.querySelector('#profesional-horario').value);
      const profesional = obtenerRecurso('professionals', profesionalId, estadoAplicacion.negocioId);
      const franjasActualizadas = leerFranjasHorario(formulario, estadoAplicacion.negocioId, profesionalId);
      franjasHorario = franjasActualizadas;
      const erroresHorario = validarFranjasHorario(franjasActualizadas, profesional.branchIds, esDemo);
      if (Object.keys(erroresHorario).length) {
        mostrarErroresDisponibilidad(formulario, erroresHorario);
        return;
      }
      limpiarErroresDisponibilidad(formulario);
      if (!esDemo) {
        await api(`/profesionales/${profesionalId}/horario`, 'PUT', crearPayloadHorario(franjasActualizadas));
        (await import('../connected/screens/disponibilidad/disponibilidad.vista.js')).invalidarProyeccion();
        try { await cargarDatosBackend(); render(); mostrarAviso('Horario guardado.'); } catch (error) { mostrarAviso('Horario guardado. No se pudo actualizar la vista: ' + error.message); }
        return;
      }
      const citasActivas = listarRegistros('appointments', estadoAplicacion.negocioId).filter((cita) =>
        cita.professionalId === profesionalId && cita.date >= HOY &&
        !['cancelada', 'no_asistio', 'completada'].includes(cita.status));
      if (citasActivas.some((cita) => !citaCubiertaPorHorarioDemo(cita, franjasActualizadas)))
        throw new Error('El cambio dejaría citas activas fuera del horario. Reprograma esas citas primero.');
      let siguienteId = Math.max(0, ...datosAplicacion.schedules.map((franja) => franja.id)) + 1;
      datosAplicacion.schedules = datosAplicacion.schedules.filter((franja) => !(franja.tenantId === estadoAplicacion.negocioId && franja.professionalId === profesionalId))
        .concat(franjasActualizadas.map((franja) => ({ ...franja, id: franja.id < 0 ? siguienteId++ : franja.id })));
    }
    render();
    mostrarAviso('Configuración guardada en esta demostración.');
  } catch (error) {
    if (formulario.id === 'formulario-horario') {
      const errores = interpretarErroresHorario(error, franjasHorario);
      if (errores) mostrarErroresDisponibilidad(formulario, errores);
      else mostrarErrorGeneralDisponibilidad(formulario, error, '#horario-error');
    } else mostrarAviso(error.message);
  } finally { botonEnviar.disabled = false; }
});

document.addEventListener('input', (evento) => {
  if (evento.target.closest('#formulario-horario')) limpiarCampoDisponibilidad(evento.target.form, evento.target);
});
document.addEventListener('change', (evento) => {
  if (evento.target.closest('#formulario-horario')) {
    if (evento.target.matches('input[type="checkbox"][name^="activo-"]')) {
      cambiarEstadoFranja(evento.target.closest('[data-horario-franja]'), evento.target.checked);
    }
    limpiarCampoDisponibilidad(evento.target.form, evento.target);
  }
});
