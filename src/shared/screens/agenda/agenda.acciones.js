import { confirmarCancelacion } from './agenda.menu-estado.js';
import { estadoAplicacion as estado, render, navegar } from '../../aplicacion.nucleo.js';
import { datosAplicacion, listarRegistros, obtenerRecurso, obtenerNegocio, ampliarDatosCita, HOY, formatearFecha, formatearMoneda, etiquetasEstadoCita } from '../../aplicacion.datos.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { mostrarAviso, escaparHtml as esc, avatar, renderEtiquetaEstado } from '../../interfaz.componentes.js';
import { panelAgenda as modal, borradorAgenda, guardarBorradorAgenda, borrarBorradorAgenda } from './agenda.paneles.js';
import { renderCampo as campo, renderSelector as selectorCampo, mostrarErrorFormulario as errorFormulario, espacioErrorFormulario as espacioError } from '../../formularios.componentes.js';
import { buscarHorariosDemo, crearCitaDemo, seEmpalman } from '../../../demo/disponibilidad.motor.js';
import { moverCitaDemo } from '../../../demo/clientes.horario.js';
export function abrirDetalleDemo(id) {
  const a = obtenerRecurso('appointments', id, estado.negocioId),
    e = ampliarDatosCita(a);
  const el = modal(
    'Detalle de la cita',
    `<div class="dialogo-cuerpo"><div class="cita-identidad">${avatar(
      e.client.name
        .split(' ')
        .map((x) => x[0])
        .slice(0, 2)
        .join(''),
      'menta',
      'avatar-grande',
    )}<div><h3>${esc(e.client.name)}</h3><p>${a.folio}</p></div>${renderEtiquetaEstado(a.status)}</div><div class="lista-detalle"><div>${renderIcono('briefcase')}<span><small>Servicio</small><strong>${esc(e.service.name)}</strong></span><b>${formatearMoneda(e.service.price)}</b></div><div>${renderIcono('stethoscope')}<span><small>Profesional</small><strong>${esc(e.professional.name)}</strong></span></div><div>${renderIcono('calendar')}<span><small>Fecha y hora</small><strong>${formatearFecha(a.date)} · ${a.start} – ${a.end}</strong></span></div><div>${renderIcono('pin')}<span><small>Sucursal</small><strong>${esc(e.branch.name)}</strong></span></div><div>${renderIcono('message')}<span><small>WhatsApp</small><strong>${esc(e.client.phone)}</strong></span></div></div>${a.reason ? `<div class="cita-motivo"><strong>Motivo de consulta</strong><p>${esc(a.reason)}</p></div>` : ''}<label class="form-label" for="appointment-status">Estado de la cita</label><select id="appointment-status" class="form-select">${Object.entries(
      etiquetasEstadoCita,
    )
      .map(
        ([s, l]) =>
          `<option value="${s}" ${a.status === s ? 'selected' : ''}>${l}</option>`,
      )
      .join(
        '',
      )}</select>${espacioError}<p class="ayuda-campo mt-3">Origen: ${a.origin === 'manual' ? 'Agendamiento manual' : 'Portal de reservas'} · Solo datos ficticios</p></div><div class="dialogo-pie"><button class="btn btn-peligro-suave" id="cancel-appointment" ${a.status === 'cancelada' ? 'disabled' : ''}>Cancelar cita</button><button class="btn btn-primary" id="save-status">Guardar estado</button></div>`,
  );
  el.querySelector('#save-status').onclick = () => {
    try {
      const vigente = obtenerRecurso('appointments', id, estado.negocioId),
        siguiente = el.querySelector('#appointment-status').value;
      if (!etiquetasEstadoCita[siguiente]) throw new Error('Estado inválido.');
      if (
        ['cancelada', 'no_asistio'].includes(vigente.status) &&
        !['cancelada', 'no_asistio'].includes(siguiente)
      ) {
        const conflicto = listarRegistros('appointments', estado.negocioId).some(
          (b) =>
            b.id !== vigente.id &&
            b.professionalId === vigente.professionalId &&
            b.date === vigente.date &&
            !['cancelada', 'no_asistio'].includes(b.status) &&
            seEmpalman(vigente.start, vigente.end, b.start, b.end),
        );
        if (conflicto)
          throw new Error('No se puede reactivar: el horario está ocupado.');
      }
      if (siguiente === 'cancelada') {
        confirmarCancelar(id);
        return;
      }
      vigente.status = siguiente;
      el.close();
      render();
      mostrarAviso('Estado de la cita actualizado.');
    } catch (error) {
      errorFormulario(error);
    }
  };
  el.querySelector('#cancel-appointment').onclick = () => confirmarCancelar(id);
  // Propuesta de fecha/hora local de la demo; la versión conectada realiza todas las comprobaciones en el servidor.
  el.querySelector('.dialogo-cuerpo').insertAdjacentHTML('beforeend', `<form data-demo-horario class="agenda-editor-estado"><h3>Cambiar horario</h3><div class="formulario-dos-columnas">${campo('Nueva fecha', 'fechaLocal', a.date, 'date', 'required')}${campo('Nueva hora', 'horaInicio', a.start, 'time', 'required')}</div><p class="ayuda-campo">Simulación local de horario y ocupación; conserva folio y duración. No reproduce las transacciones UTC del servidor.</p><p class="error-formulario" role="alert" data-demo-error-horario hidden></p><button type="submit" class="btn btn-primary" ${a.status === 'cancelada' || a.date < HOY ? 'disabled' : ''}>Guardar horario</button></form>`);
  el.querySelector('[data-demo-horario]').onsubmit = (evento) => {
    evento.preventDefault();
    try {
      moverCitaDemo(id, estado.negocioId, Object.fromEntries(new FormData(evento.target)));
      estado.fecha = a.date; render(); abrirDetalleDemo(id); mostrarAviso('Horario actualizado en esta demostración.');
    } catch (error) { const objetivo = el.querySelector('[data-demo-error-horario]'); objetivo.textContent = error.message; objetivo.hidden = false; }
  };
}
async function confirmarCancelar(id) {
  const a = obtenerRecurso('appointments', id, estado.negocioId), e = ampliarDatosCita(a);
  const confirmacion = await confirmarCancelacion({ nombreContacto: e.client.name, nombreServicio: e.service.name,
    nombreSucursal: e.branch.name, fechaLocal: a.date, horaInicio: a.start, zonaHoraria: 'America/Chihuahua' });
  if (!confirmacion) return;
  a.status = 'cancelada';
  document.querySelector('#dialogo-app')?.close();
  render();
  mostrarAviso('Demostración: cita cancelada. El horario vuelve a estar disponible.');
}
export function nuevaCitaManual(dia = estado.fecha, inicio = '') {
  if (
    !listarRegistros('services', estado.negocioId).length ||
    !listarRegistros('professionals', estado.negocioId).length ||
    !listarRegistros('branches', estado.negocioId).length
  ) {
    mostrarAviso(
      'Agrega servicios, sucursales y profesionales antes de crear una cita.',
    );
    return;
  }
  const el = modal(
    'Nueva cita',
    `<form id="manual-form"><div class="dialogo-cuerpo"><p class="introduccion-formulario">Agenda una atención para tu paciente.</p><div class="formulario-dos-columnas">${selectorCampo('Servicio', 'serviceId', listarRegistros('services', estado.negocioId))}${selectorCampo('Sucursal', 'branchId', listarRegistros('branches', estado.negocioId), estado.sucursal !== 'all' ? estado.sucursal : '')}</div><div class="formulario-dos-columnas">${selectorCampo('Profesional', 'professionalId', listarRegistros('professionals', estado.negocioId))}${campo('Fecha', 'day', dia < HOY ? HOY : dia, 'date', `required min="${HOY}"`)}</div><div class="campo-formulario"><label for="f-start" class="form-label">Horario disponible</label><select id="f-start" name="start" class="form-select" required></select><p class="ayuda-campo" id="manual-availability-hint"></p></div><div class="separador-formulario"><span>DATOS DEL PACIENTE</span></div><div class="campo-formulario"><label class="form-label" for="demo-customer-mode">Tipo de cliente</label><select id="demo-customer-mode" name="customerMode" class="form-select"><option value="nuevo">Cliente nuevo</option><option value="existente">Cliente existente</option></select></div><div data-demo-existente hidden>${selectorCampo('Cliente existente', 'clientId', listarRegistros('clients', estado.negocioId))}</div><div class="formulario-dos-columnas" data-demo-nuevo>${campo('Nombre completo', 'name', '', 'text', 'required maxlength="150" placeholder="Nombre y apellidos" autocomplete="off"')}${campo('Teléfono de WhatsApp', 'phone', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric" placeholder="10 dígitos" autocomplete="off"')}</div><div class="campo-formulario"><label class="form-label" for="f-reason">Motivo de consulta <span class="opcional">(opcional)</span></label><textarea class="form-control" id="f-reason" name="reason" rows="2" maxlength="500" placeholder="Información útil para el profesional"></textarea></div>${espacioError}<div class="nota-informativa nota-compacta">${renderIcono('info')} Usa datos ficticios. Esta reserva solo se guarda durante la sesión. La recuperación tras recarga y la auditoría reales se comprueban en la versión conectada.</div></div><div class="dialogo-pie"><button type="button" class="btn btn-light" id="manual-cancel">Cancelar</button><button type="submit" class="btn btn-primary" id="manual-save">${renderIcono('check')}Confirmar cita</button></div></form>`,
    true,
  );
  const formulario = el.querySelector('form');
  const claveBorrador = `demo-manual:${estado.negocioId}`, borrador = borradorAgenda(claveBorrador);
  let guardado = false;
  if (borrador) {
    for (const [nombre, valor] of Object.entries(borrador)) if (formulario.elements[nombre]) formulario.elements[nombre].value = valor;
    inicio = borrador.start || inicio;
  }
  el.addEventListener('close', () => {
    if (!formulario.isConnected) return;
    if (guardado) borrarBorradorAgenda(claveBorrador);
    else guardarBorradorAgenda(claveBorrador, Object.fromEntries(new FormData(formulario)));
  }, { once: true });
  // La selección es explícita y solo usa fichas ficticias del negocio de la demo.
  const sincronizarCliente = () => {
    const existente = formulario.elements.customerMode.value === 'existente';
    formulario.querySelector('[data-demo-existente]').hidden = !existente;
    formulario.querySelector('[data-demo-nuevo]').hidden = existente;
    formulario.elements.clientId.disabled = !existente;
    if (existente) {
      const persona = obtenerRecurso('clients', Number(formulario.elements.clientId.value), estado.negocioId);
      formulario.elements.name.value = persona.name; formulario.elements.phone.value = persona.phone;
    }
  };
  formulario.elements.customerMode.addEventListener('change', sincronizarCliente);
  formulario.elements.clientId.addEventListener('change', sincronizarCliente);
  sincronizarCliente();
  const refrescar = () => {
    const serviceId = Number(formulario.elements.serviceId.value),
      idSucursal = Number(formulario.elements.branchId.value),
      anterior = formulario.elements.professionalId.value;
    const personas = listarRegistros('professionals', estado.negocioId).filter(
      (p) => p.serviceIds.includes(serviceId) && p.branchIds.includes(idSucursal),
    );
    formulario.elements.professionalId.innerHTML = personas
      .map(
        (p) =>
          `<option value="${p.id}" ${String(p.id) === anterior ? 'selected' : ''}>${esc(p.name)}</option>`,
      )
      .join('');
    let opcionesDisponibles = [];
    if (personas.length)
      opcionesDisponibles = buscarHorariosDemo({
        tenantId: estado.negocioId,
        serviceId,
        branchId: idSucursal,
        professionalId: Number(formulario.elements.professionalId.value),
        day: formulario.elements.day.value,
        mode: 'free',
      });
    formulario.elements.start.innerHTML = opcionesDisponibles.length
      ? opcionesDisponibles
          .map((t) => `<option ${t === inicio ? 'selected' : ''}>${t}</option>`)
          .join('')
      : '<option value="">Sin horarios disponibles</option>';
    el.querySelector('#manual-save').disabled = !opcionesDisponibles.length;
    el.querySelector('#manual-availability-hint').textContent = opcionesDisponibles.length
      ? `${opcionesDisponibles.length} horarios · Se respetan descansos, duración y citas existentes.`
      : 'Prueba otra fecha o sucursal. El profesional puede atender en una ubicación diferente según el día.';
  };
  ['serviceId', 'branchId', 'professionalId', 'day'].forEach((claveInterna) =>
    formulario.elements[claveInterna].addEventListener('change', refrescar),
  );
  refrescar();
  el.querySelector('#manual-cancel').onclick = () => el.close();
  formulario.onsubmit = (e) => {
    e.preventDefault();
    try {
      const f = new FormData(formulario);
      const a = crearCitaDemo(
        {
          tenantId: estado.negocioId,
          serviceId: Number(f.get('serviceId')),
          branchId: Number(f.get('branchId')),
          professionalId: Number(f.get('professionalId')),
          day: f.get('day'),
          start: f.get('start'),
          origin: 'manual',
          ...(f.get('customerMode') === 'existente' ? { clientId: Number(f.get('clientId')) } : { newClient: true }),
        },
        { name: f.get('name'), phone: f.get('phone'), reason: f.get('reason') },
      );
      estado.fecha = a.date;
      guardado = true;
      el.close();
      navegar('agenda');
      mostrarAviso(`Cita creada · Folio ${a.folio}`);
    } catch (error) {
      errorFormulario(error);
    }
  };
}
