import { api, usuarioActual } from '../../backend.js';
import { escaparHtml as esc } from '../../../shared/interfaz.componentes.js';
import { panelAgenda as modal, borradorAgenda, guardarBorradorAgenda, borrarBorradorAgenda } from '../../../shared/screens/agenda/agenda.paneles.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { formatearEnZonaHoraria } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';
import { crearAgendaClient } from '../../modules/agenda/agenda.client.js';
import { puedeGestionarAgenda, crearClientCitaManual, seleccionManual, horariosManuales } from '../../modules/agenda/agenda.contrato-manual.js';
import { crearOperacionManual } from '../../modules/agenda/agenda.operacion-manual.js';
import { errorSeguro } from '../../modules/agenda/agenda.errores.js';

const client = crearClientCitaManual(api), directorio = crearAgendaClient(api);
const almacenamiento = () => { try { return sessionStorage; } catch { return { getItem() { throw new Error('Almacenamiento no disponible.'); } }; } };
const operacionPara = (usuarioAgenda) => crearOperacionManual({ scope: { actorId: usuarioAgenda.id, negocioId: usuarioAgenda.negocioId }, storage: almacenamiento(), client });
export function hayAltaManualPendiente(usuarioAgenda) {
  return puedeGestionarAgenda(usuarioAgenda?.rol) && operacionPara(usuarioAgenda).state.status !== 'idle';
}
const campo = (etiqueta, nombre, valor = '', tipo = 'text', extra = '') => `<div class="campo-formulario"><label class="form-label" for="manual-${nombre}">${etiqueta}</label><input class="form-control" id="manual-${nombre}" name="${nombre}" type="${tipo}" value="${esc(valor)}" ${extra}></div>`;
function campoRecurso(etiqueta, nombre, elementos, rol) {
  // Recepción conserva el contrato existente de Disponibilidad: IDs provistos por el negocio,
  // nunca llamadas a catálogos que ese rol no tiene autorizados.
  if (rol === 'recepcionista') return campo(`Identificador ${etiqueta === 'Sucursal' ? 'de sucursal' : etiqueta === 'Servicio' ? 'del servicio' : 'del profesional'}`, nombre, '', 'number', 'min="1" max="4294967295" step="1" required');
  return `<div class="campo-formulario"><label class="form-label" for="manual-${nombre}">${etiqueta}</label><select class="form-select" id="manual-${nombre}" name="${nombre}" required><option value="">Selecciona ${etiqueta.toLowerCase()}</option>${elementos.filter((elemento) => elemento.active !== false).map((elemento) => `<option value="${elemento.id}">${esc(elemento.name)}</option>`).join('')}</select></div>`;
}

// El formulario mantiene la composición de la demo; todo cálculo de oferta/fin/costo queda en servidor.
export async function abrirAltaManual({ day: dia, catalogs: catalogos, onSaved: alGuardar, onCleared: alLimpiar }) {
  if (!puedeGestionarAgenda(usuarioActual?.rol)) return;
  const usuarioAgenda = { ...usuarioActual }, operacion = operacionPara(usuarioAgenda);
  const claveBorrador = `manual:${usuarioAgenda.negocioId}:${usuarioAgenda.id}:${usuarioAgenda.sesionId || ''}`;
  const borrador = operacion.state.marker ? null : borradorAgenda(claveBorrador);
  // El Profesional ve su perfil fijo y captura contacto; no recibe buscador ni ID de ficha.
  const campoProfesional = usuarioAgenda.rol === 'profesional'
    ? `<div class="campo-formulario"><span class="form-label">Profesional</span><p>${esc(usuarioAgenda.nombre)}</p><input type="hidden" name="personalId" value="${esc(usuarioAgenda.id)}"></div>`
    : campoRecurso('Profesional', 'personalId', catalogos.people, usuarioAgenda.rol);
  const modoCliente = usuarioAgenda.rol === 'profesional'
    ? '<p class="ayuda-campo">Captura el contacto para esta cita. La ficha se resuelve en el servidor sin consultar el directorio.</p>'
    : '<div class="agenda-modo-cliente" role="group" aria-label="Tipo de cliente"><label><input type="radio" name="clienteModo" value="nuevo" checked> Cliente nuevo</label><label><input type="radio" name="clienteModo" value="existente"> Cliente existente</label></div>';
  const campoClienteExistente = usuarioAgenda.rol === 'profesional' ? '' : `<div data-cliente-existente hidden>${campo('Buscar cliente', 'busquedaCliente', '', 'search', 'maxlength="150" autocomplete="off"')}<button type="button" class="btn btn-light" data-cliente-busqueda>Buscar clientes</button><div data-cliente-resultados aria-live="polite"></div></div>`;
  const dialogo = modal('Nueva cita', `<form id="connected-manual-form" novalidate><div class="dialogo-cuerpo"><fieldset data-manual-campos><p class="introduccion-formulario">Agenda una atención para tu paciente.</p>${usuarioAgenda.rol === 'recepcionista' ? '<p class="ayuda-campo">Introduce los identificadores de servicio, sucursal y profesional proporcionados por tu negocio.</p>' : ''}<div class="formulario-dos-columnas">${campoRecurso('Servicio', 'servicioId', catalogos.services, usuarioAgenda.rol)}${campoRecurso('Sucursal', 'sucursalId', catalogos.branches, usuarioAgenda.rol)}</div><div class="formulario-dos-columnas">${campoProfesional}${campo('Fecha', 'fechaLocal', dia, 'date', 'required')}</div><button type="button" class="btn btn-light" data-manual-consulta>${renderIcono('search')}Consultar horarios</button><div class="campo-formulario"><label class="form-label" for="manual-horario">Horario disponible</label><select id="manual-horario" name="horario" class="form-select" disabled><option value="">Consulta primero los horarios</option></select><p class="ayuda-campo" data-manual-disponibilidad role="status"></p></div><div class="separador-formulario"><span>DATOS DEL PACIENTE</span></div>${modoCliente}<div data-cliente-nuevo><div class="formulario-dos-columnas">${campo('Nombre completo', 'nombreCompleto', '', 'text', 'maxlength="150" autocomplete="off"')}${campo('Teléfono', 'telefono', '', 'tel', 'maxlength="30" autocomplete="off"')}</div></div>${campoClienteExistente}<div class="campo-formulario"><label class="form-label" for="manual-notas">Notas de consulta <span class="opcional">(opcional)</span></label><textarea class="form-control" name="notas" id="manual-notas" rows="2" maxlength="2000"></textarea></div><p class="ayuda-campo">Consultar horarios no los aparta. El servidor vuelve a comprobar la disponibilidad al confirmar.</p></fieldset><p class="error-formulario" data-manual-error role="alert" tabindex="-1" hidden></p><div data-manual-operacion aria-live="polite"></div></div><div class="dialogo-pie"><button class="btn btn-light" type="button" data-manual-cerrar>Cerrar</button><button class="btn btn-primary" type="submit" data-manual-guardar disabled>${renderIcono('check')}Confirmar cita</button></div></form>`, true);
  dialogo.classList.add('agenda-dialogo-cita');
  const formulario = dialogo.querySelector('form'), campos = formulario.querySelector('[data-manual-campos]');
  // El personal registra la respuesta comunicada por el paciente; desmarcado no bloquea el alta.
  formulario.querySelector('#manual-notas').closest('.campo-formulario').insertAdjacentHTML('afterend',
    '<div class="form-check campo-formulario"><input class="form-check-input" type="checkbox" id="manual-autoriza-whatsapp" name="autorizaWhatsapp"><label class="form-check-label" for="manual-autoriza-whatsapp">El paciente autorizó recibir mensajes de esta cita por WhatsApp</label><p class="ayuda-campo">Opcional; sin autorización se hará seguimiento manual.</p></div>');
  const selectorHorarios = formulario.elements.horario, enviar = formulario.querySelector('[data-manual-guardar]');
  const contenedorError = formulario.querySelector('[data-manual-error]'), panel = formulario.querySelector('[data-manual-operacion]');
  let generacion = 0, generacionClientes = 0, horarios = [], disponibilidad = null, identidadConsulta = '', paginaBusqueda = 1, terminoBusqueda = '', guardadoNotificado = false, opcionesClientes = [];
  const activo = () => dialogo.open && formulario.isConnected && usuarioActual?.id === usuarioAgenda.id && usuarioActual?.negocioId === usuarioAgenda.negocioId;
  const valoresConsulta = () => ({ personalId: formulario.elements.personalId.value, sucursalId: formulario.elements.sucursalId.value, servicioId: formulario.elements.servicioId.value, fechaLocal: formulario.elements.fechaLocal.value });
  const fallar = (error) => { if (!activo()) return; const info = errorSeguro(error); contenedorError.textContent = typeof error.status === 'number' ? `${info.title}. ${info.message}` : error.message; contenedorError.hidden = false; contenedorError.focus(); };
  const limpiarError = () => { contenedorError.hidden = true; contenedorError.textContent = ''; };
  const cerrar = () => { if (!operacion.state.busy) dialogo.close(); };
  dialogo.querySelector('[data-close]').onclick = cerrar;
  dialogo.oncancel = (evento) => { evento.preventDefault(); cerrar(); };
  dialogo.onclick = (evento) => { if (evento.target === dialogo) { const rectangulo = dialogo.getBoundingClientRect(); if (evento.clientX < rectangulo.left || evento.clientX > rectangulo.right || evento.clientY < rectangulo.top || evento.clientY > rectangulo.bottom) cerrar(); } };
  formulario.querySelector('[data-manual-cerrar]').onclick = cerrar;
  dialogo.addEventListener('close', () => {
    // Cerrar un borrador no lo descarta; solo la memoria de esta sesión lo conserva.
    if (formulario.isConnected && usuarioActual?.id === usuarioAgenda.id) {
      if (guardadoNotificado) borrarBorradorAgenda(claveBorrador);
      else if (operacion.state.status === 'idle') {
        const valores = Object.fromEntries(new FormData(formulario)); delete valores.horario;
        guardarBorradorAgenda(claveBorrador, { values: valores, customers: opcionesClientes });
      }
    }
    generacion++; generacionClientes++; document.querySelector('[data-agenda-nueva]')?.focus();
  }, { once: true });
  function invalidarHorarios() {
    generacion++; horarios = []; disponibilidad = null; identidadConsulta = '';
    selectorHorarios.innerHTML = '<option value="">Consulta primero los horarios</option>'; selectorHorarios.disabled = true;
    formulario.querySelector('[data-manual-consulta]').disabled = false;
    formulario.querySelector('[data-manual-disponibilidad]').textContent = ''; enviar.disabled = true;
  }
  // Una selección manual no tiene versión propia: un cambio externo invalida sus ranuras, nunca su envío pendiente.
  const alActualizarAgenda = () => {
    if (!activo() || operacion.state.status !== 'idle' || operacion.state.busy) return;
    invalidarHorarios(); actualizarVista();
    contenedorError.textContent = 'La agenda cambió en otra sesión. Conservamos tus datos; consulta los horarios nuevamente antes de confirmar.';
    contenedorError.hidden = false;
  };
  window.addEventListener('agenda-actualizada', alActualizarAgenda);
  dialogo.addEventListener('close', () => window.removeEventListener('agenda-actualizada', alActualizarAgenda), { once: true });
  function actualizarVista() {
    const estado = operacion.state, inactivo = estado.status === 'idle';
    campos.disabled = !inactivo; campos.hidden = estado.status === 'registered';
    enviar.disabled = !inactivo || !horarios[Number(selectorHorarios.value)] || selectorHorarios.value === '' || JSON.stringify(valoresConsulta()) !== identidadConsulta;
    enviar.hidden = !inactivo;
    formulario.querySelector('[data-manual-cerrar]').disabled = estado.busy;
    dialogo.querySelector('[data-close]').disabled = estado.busy;
    if (estado.busy) panel.innerHTML = '<p role="status">Comprobando el envío de la cita…</p>';
    else if (estado.status === 'registered') panel.innerHTML = `<div class="nota-informativa"><strong>Cita registrada · ${esc(estado.result.folio)}</strong><p>${esc(formatearEnZonaHoraria(estado.result.inicioUtc, estado.result.zonaHoraria))} · ${esc(estado.result.zonaHoraria)}</p><p>Costo aceptado: ${esc(estado.result.costoAceptado)}</p><button type="button" class="btn btn-primary" data-manual-finalizar>Volver a la agenda</button></div>`;
    else if (estado.status === 'not_registered') panel.innerHTML = '<p>No se registró la cita. Puedes corregir los datos y consultar otro horario.</p><button type="button" class="btn btn-light" data-manual-editar>Corregir datos</button>';
    else if (estado.status === 'uncertain') panel.innerHTML = `<p role="status">Hay un envío pendiente de comprobar. Comprueba el resultado antes de crear otra cita.</p>${estado.error ? `<p>${esc(typeof estado.error.status === 'number' ? `${errorSeguro(estado.error).title}. ${errorSeguro(estado.error).message}` : estado.error.message)}</p>` : ''}<button type="button" class="btn btn-primary" data-manual-resolver>Comprobar resultado</button>`;
    else if (estado.status === 'storage_error') panel.innerHTML = `<p role="alert">${esc(estado.error.message)}</p>`;
    else panel.innerHTML = '';
    panel.querySelector('[data-manual-resolver]')?.addEventListener('click', () => void ejecutar(() => operacion.resolve()));
    panel.querySelector('[data-manual-finalizar]')?.addEventListener('click', () => { if (operacion.acknowledge()) { dialogo.close(); alLimpiar?.(); } else fallar(operacion.state.error); });
    panel.querySelector('[data-manual-editar]')?.addEventListener('click', () => { if (operacion.acknowledge()) { invalidarHorarios(); actualizarVista(); campos.querySelector('input,select')?.focus(); } else fallar(operacion.state.error); });
  }
  async function ejecutar(accion) {
    try {
      const promesa = accion(); actualizarVista(); await promesa;
      if (!activo()) return;
      actualizarVista();
      if (operacion.state.status === 'registered' && !guardadoNotificado) {
        guardadoNotificado = true;
        try { await alGuardar?.(operacion.state.result); } catch { fallar(new Error('La cita quedó registrada, pero no se pudo actualizar la agenda.')); }
      }
    } catch (error) { fallar(error); }
  }
  formulario.querySelector('[data-manual-consulta]').onclick = async () => {
    limpiarError(); invalidarHorarios(); const vigente = ++generacion, valores = valoresConsulta();
    const button = formulario.querySelector('[data-manual-consulta]'); button.disabled = true;
    formulario.querySelector('[data-manual-disponibilidad]').textContent = 'Consultando horarios disponibles…';
    try {
      const respuesta = await client.consultarDisponibilidad(valores);
      if (!activo() || vigente !== generacion) return;
      horarios = horariosManuales(respuesta, valores); disponibilidad = respuesta; identidadConsulta = JSON.stringify(valores);
      selectorHorarios.innerHTML = '<option value="">Selecciona un horario</option>' + horarios.map((horario, indice) => `<option value="${indice}">${esc(formatearEnZonaHoraria(horario.inicioUtc, respuesta.zonaHoraria))} – ${esc(formatearEnZonaHoraria(horario.finUtc, respuesta.zonaHoraria))}</option>`).join('');
      selectorHorarios.disabled = !horarios.length;
      formulario.querySelector('[data-manual-disponibilidad]').textContent = horarios.length ? `${horarios.length} horarios · ${respuesta.zonaHoraria}` : 'Sin horarios disponibles para esta combinación y fecha.';
    } catch (error) { if (activo() && vigente === generacion) { formulario.querySelector('[data-manual-disponibilidad]').textContent = ''; fallar(new Error(`No se pudo consultar la disponibilidad. ${errorSeguro(error).title}. ${errorSeguro(error).message}`)); } }
    finally { if (activo() && vigente === generacion) { button.disabled = false; actualizarVista(); } }
  };
  async function buscarClientes(paginaActual = 1) {
    const version = ++generacionClientes, objetivo = formulario.querySelector('[data-cliente-resultados]');
    if (paginaActual === 1) terminoBusqueda = formulario.elements.busquedaCliente.value.trim();
    objetivo.innerHTML = '<p role="status">Buscando clientes…</p>';
    try {
      const respuesta = await directorio.listarClientes({ busqueda: terminoBusqueda, pagina: paginaActual, limite: 50 });
      if (!activo() || version !== generacionClientes) return;
      if (!respuesta || !Array.isArray(respuesta.clientes) || respuesta.pagina !== paginaActual || typeof respuesta.hayMas !== 'boolean') throw new Error('El directorio recibido no es válido.');
      opcionesClientes = respuesta.clientes;
      paginaBusqueda = paginaActual;
      objetivo.innerHTML = respuesta.clientes.length ? respuesta.clientes.map((cliente) => `<label class="agenda-opcion-cliente"><input type="radio" name="clienteId" value="${esc(cliente.id)}"><span><strong>${esc(cliente.nombreCompleto)}</strong><small>${esc(cliente.telefono)} · Ficha #${esc(cliente.id)}</small></span></label>`).join('') : '<p>No se encontraron clientes.</p>';
      objetivo.insertAdjacentHTML('beforeend', `<div class="agenda-paginas-historial"><button type="button" class="btn btn-light" data-cliente-anterior ${paginaActual === 1 ? 'disabled' : ''}>Clientes anteriores</button><span>Página ${paginaActual}</span><button type="button" class="btn btn-light" data-cliente-siguiente ${!respuesta.hayMas ? 'disabled' : ''}>Más clientes</button></div>`);
      objetivo.querySelector('[data-cliente-anterior]').onclick = () => void buscarClientes(paginaBusqueda - 1);
      objetivo.querySelector('[data-cliente-siguiente]').onclick = () => void buscarClientes(paginaBusqueda + 1);
    } catch (error) { if (activo() && version === generacionClientes) { objetivo.innerHTML = ''; fallar(error); } }
  }
  formulario.querySelector('[data-cliente-busqueda]')?.addEventListener('click', () => { limpiarError(); void buscarClientes(); });
  formulario.addEventListener('input', (evento) => { if (['servicioId', 'sucursalId', 'personalId', 'fechaLocal'].includes(evento.target.name)) invalidarHorarios(); });
  formulario.addEventListener('change', (evento) => {
    if (['servicioId', 'sucursalId', 'personalId', 'fechaLocal'].includes(evento.target.name)) invalidarHorarios();
    if (evento.target.name === 'clienteModo') { formulario.querySelector('[data-cliente-nuevo]').hidden = evento.target.value !== 'nuevo'; formulario.querySelector('[data-cliente-existente]').hidden = evento.target.value !== 'existente'; }
    actualizarVista();
  });
  formulario.onsubmit = (evento) => {
    evento.preventDefault(); limpiarError();
    if (operacion.state.status !== 'idle') return;
    try {
      const horario = horarios[Number(selectorHorarios.value)];
      if (!horario || selectorHorarios.value === '' || !disponibilidad || JSON.stringify(valoresConsulta()) !== identidadConsulta) throw new Error('Consulta y selecciona un horario vigente antes de confirmar.');
      const valores = new FormData(formulario), existente = valores.get('clienteModo') === 'existente';
      const seleccion = seleccionManual({ ...valoresConsulta(), fechaLocal: horario.fechaLocal, horaInicio: horario.horaInicio, notas: valores.get('notas'), autorizaWhatsapp: valores.has('autorizaWhatsapp'),
        ...(existente ? { clienteId: valores.get('clienteId') } : { clienteNuevo: { nombreCompleto: valores.get('nombreCompleto'), telefono: valores.get('telefono') } }) }, usuarioAgenda);
      void ejecutar(() => operacion.submit(seleccion));
    } catch (error) { fallar(error); }
  };
  // Restituir el contenido requerido para resolver; no reintentar registrar al abrir o recargar.
  const pendiente = operacion.state.marker?.seleccion;
  if (pendiente) {
    for (const nombre of ['servicioId', 'sucursalId', 'personalId', 'fechaLocal', 'notas']) formulario.elements[nombre].value = pendiente[nombre] ?? '';
    formulario.elements.autorizaWhatsapp.checked = pendiente.autorizaWhatsapp === true;
    if (pendiente.clienteNuevo) { formulario.elements.nombreCompleto.value = pendiente.clienteNuevo.nombreCompleto; formulario.elements.telefono.value = pendiente.clienteNuevo.telefono; }
    else if (usuarioAgenda.rol !== 'profesional') { formulario.elements.clienteModo.value = 'existente'; formulario.querySelector('[data-cliente-nuevo]').hidden = true; formulario.querySelector('[data-cliente-existente]').hidden = false; formulario.querySelector('[data-cliente-resultados]').innerHTML = `<p>Cliente seleccionado: ficha #${esc(pendiente.clienteId)}.</p>`; }
  }
  if (!pendiente && borrador) {
    for (const [nombre, valor] of Object.entries(borrador.values)) if (formulario.elements[nombre] && !['clienteId', 'autorizaWhatsapp'].includes(nombre)) formulario.elements[nombre].value = valor;
    // FormData omite los checkbox desmarcados; su borrador restaura checked, no value.
    formulario.elements.autorizaWhatsapp.checked = borrador.values.autorizaWhatsapp === 'on';
    opcionesClientes = borrador.customers || [];
    const elegido = opcionesClientes.find((elemento) => String(elemento.id) === borrador.values.clienteId);
    if (elegido && usuarioAgenda.rol !== 'profesional') formulario.querySelector('[data-cliente-resultados]').innerHTML = `<label class="agenda-opcion-cliente"><input type="radio" name="clienteId" value="${esc(elegido.id)}" checked><span><strong>${esc(elegido.nombreCompleto)}</strong><small>${esc(elegido.telefono)} · Ficha #${esc(elegido.id)}</small></span></label>`;
    const existente = formulario.elements.clienteModo?.value === 'existente';
    formulario.querySelector('[data-cliente-nuevo]').hidden = existente;
    if (formulario.querySelector('[data-cliente-existente]')) formulario.querySelector('[data-cliente-existente]').hidden = !existente;
    if (usuarioAgenda.rol === 'profesional') formulario.elements.personalId.value = String(usuarioAgenda.id);
    // Las ranuras anteriores nunca se reutilizan: al reabrir se exige otra consulta al motor.
    invalidarHorarios();
  }
  actualizarVista(); if (operacion.state.marker) await ejecutar(() => operacion.start());
}
