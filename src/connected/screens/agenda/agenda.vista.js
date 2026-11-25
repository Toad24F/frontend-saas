import { renderSeguimientoCita, textoActorCita } from './agenda.seguimiento.js';
import { atencionEquipo } from '../../../shared/screens/agenda/agenda.utilidades.js';
import { resolverSucursalesAgenda } from '../../../shared/screens/agenda/agenda.filtros.js';
import { instalarEstadoRapido } from './agenda.estado-rapido.js';
import '../../../shared/screens/agenda/agenda.menu-estado.css';
import { estructuraAgenda } from '../../../shared/screens/agenda/agenda.estructura.js';
import { api, usuarioActual } from '../../backend.js';
import { estadoAplicacion as estado, render } from '../../../shared/aplicacion.nucleo.js';
import { listarRegistros, etiquetasEstadoCita, obtenerNegocio } from '../../../shared/aplicacion.datos.js';
import { escaparHtml as esc, renderEncabezadoPagina, renderEtiquetaEstado } from '../../../shared/interfaz.componentes.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { textoMotivoDisponibilidad } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';
import { crearAgendaClient } from '../../modules/agenda/agenda.client.js';
import { crearAgendaStore } from '../../modules/agenda/agenda.store.js';
import { periodoCalendario, sumarDiasCiviles, moverFechaCalendario, hoyCivil } from '../../modules/agenda/agenda.calendario.js';
import { tituloCalendario, renderLineaTiempo, renderMes } from './agenda.presentacion.js';
import { puedeGestionarAgenda } from '../../modules/agenda/agenda.contrato-manual.js';
import { hayAltaManualPendiente, abrirAltaManual } from './agenda.vista-manual.js';
import { montarEditorEstado } from './agenda.editor-estado.js';
import { montarEditorHorario } from './agenda.editor-horario.js';
import { partesEnZonaHoraria } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';
import '../../../shared/screens/agenda/agenda.estilos.css';
import './agenda.estilos.css';
import '../../../shared/screens/agenda/agenda.refinamientos.css';
import { esqueletoCalendario } from '../../../shared/screens/agenda/agenda.presentacion.js';
import { panelAgenda as modal } from '../../../shared/screens/agenda/agenda.paneles.js';
import { registrarRefrescoVivo, observarRegistro } from './agenda.actualizacion-viva.js';
import { errorSeguro } from '../../modules/agenda/agenda.errores.js';
import { crearCacheAgenda } from '../../modules/agenda/agenda.cache.js';
import { consultarAtencionAgenda } from '../../modules/agenda/agenda.atencion.js';
import { aplicarEfectosAgenda, reiniciarNavegacionAgenda, renderAgendaConservandoPosicion, anclaDesplazamientoAgenda, restaurarDesplazamientoAgenda } from '../../../shared/screens/agenda/agenda.navegacion.js';
import '../../../shared/screens/agenda/agenda.utilidades.css';

const client = crearAgendaClient(api);
const cache = crearCacheAgenda(client.listar);
const store = crearAgendaStore(cache.read);
const atencion = crearAgendaStore((consulta) => consultarAtencionAgenda(api, consulta.personalId, { desde: consulta.desde, hasta: consulta.hasta }));
const atencionColumnas = crearAgendaStore(async (consulta) => {
  const resultados = await Promise.allSettled(consulta.ids.map((id) => consultarAtencionAgenda(api, id, { desde: consulta.desde, hasta: consulta.hasta })));
  return Object.fromEntries(consulta.ids.map((id, indice) => [id, resultados[indice].status === 'fulfilled' ? { data: resultados[indice].value } : { error: 'No se pudo consultar la atención. Usa Actualizar agenda.' }]));
});
function consultaAtencionColumnas() {
  if (!['day', 'week'].includes(estado.vistaCalendario) || (estado.vistaCalendario === 'week' && usuarioActual?.rol === 'recepcionista') || estado.profesional !== 'all' || usuarioActual?.rol === 'profesional' || estado.sucursal === 'none' || !store.state.data || store.state.busy) return null;
  const ids = new Set(listarRegistros('professionals', estado.negocioId).filter((p) => p.active !== false && (estado.sucursal === 'all' || p.branchIds?.includes(Number(estado.sucursal)))).map((p) => p.id));
  for (const elemento of store.state.data.citas) ids.add(elemento.personalId);
  return { ...periodoCalendario(estado.vistaCalendario, estado.fecha), branch: estado.sucursal, ids: [...ids].sort((a, b) => a - b) };
}
function modelosAtencionColumnas() {
  const consulta = consultaAtencionColumnas();
  if (!consulta) return undefined;
  return atencionColumnas.state.key === JSON.stringify(consulta) && atencionColumnas.state.data || Object.fromEntries(consulta.ids.map((id) => [id, { busy: true }]));
}
async function cargarAtencionColumnas(forzar) {
  const consulta = consultaAtencionColumnas();
  if (!consulta) { if (atencionColumnas.state.key) atencionColumnas.reset(); return; }
  if (!forzar && atencionColumnas.state.key === JSON.stringify(consulta)) return;
  const ambito = identidad, claveAnterior = atencionColumnas.state.key, anterior = JSON.stringify(atencionColumnas.state.data);
  if (await atencionColumnas.load(consulta)) {
    if (ambito === identidad && estado.pagina === 'agenda' && (claveAnterior !== atencionColumnas.state.key || anterior !== JSON.stringify(atencionColumnas.state.data))) renderAgendaConservandoPosicion(render);
  }
}
let soloAfectadas = false;
let identidad = null;
let opcionesDisponibles = { branches: new Map(), people: new Map() };
let generacionDetalle = 0;
let focoRetornoCita;
const valorHistorico = (valor) => valor == null ? 'Sin registro histórico' : String(valor);
const panelError = (error, accion) => { const info = errorSeguro(error); return `<div class="agenda-error" data-agenda-error role="alert"><strong>${info.title}</strong><p>${esc(info.message)}</p>${info.retry ? `<button class="btn btn-light" ${accion}>Reintentar consulta</button>` : ''}</div>`; };

// La sesión forma parte de la caché: ninguna lectura de una cuenta se reutiliza al entrar con otra.
function reiniciar() {
  cache.clear(); atencion.reset(); atencionColumnas.reset(); soloAfectadas = false; reiniciarNavegacionAgenda();
  store.reset(); opcionesDisponibles = { branches: new Map(), people: new Map() }; identidad = null; generacionDetalle++;
}
window.addEventListener('cita-sesion-expirada', reiniciar);
function comprobarSesion() {
  const siguiente = `${usuarioActual?.id}:${usuarioActual?.negocioId}:${usuarioActual?.sesionId}`;
  if (identidad !== siguiente) { reiniciar(); identidad = siguiente; estado.fecha = hoyCivil(); estado.sucursal = estado.profesional = estado.estadoCita = 'all'; estado.busqueda = ''; estado.historialAgenda = false; if (usuarioActual.rol !== 'recepcionista') sincronizarSucursal(true); }
}
function sincronizarSucursal(inicial = false) {
  const resultado = resolverSucursalesAgenda({ sucursales: [...opcionesDisponibles.branches].map(([id, nombre]) => ({ id, name: nombre })), profesionales: listarRegistros('professionals', estado.negocioId), profesional: usuarioActual.rol === 'profesional' ? String(usuarioActual.id) : estado.profesional, sucursal: estado.sucursal, historial: estado.historialAgenda, inicial });
  if (inicial) {
    const catalogo = listarRegistros('branches', estado.negocioId);
    const modeloInicial = resolverSucursalesAgenda({ sucursales: catalogo, profesionales: listarRegistros('professionals', estado.negocioId), profesional: usuarioActual.rol === 'profesional' ? String(usuarioActual.id) : estado.profesional, sucursal: estado.sucursal, inicial: true });
    // Sin catálogo autorizado no hay una sede predeterminada que podamos afirmar.
    if (catalogo.length) estado.sucursal = modeloInicial.sucursal;
  } else estado.sucursal = resultado.sucursal;
  return resultado;
}
const filtros = () => ({ ...periodoCalendario(estado.vistaCalendario, estado.fecha), sucursalId: estado.sucursal, personalId: usuarioActual.rol === 'profesional' ? 'all' : estado.profesional, estado: estado.estadoCita, busqueda: estado.busqueda, afectadas: soloAfectadas });
function recordarOpciones(datos) {
  // Recepción no tiene rutas de catálogos. Sus opciones proceden de resúmenes autorizados ya recibidos.
  for (const elemento of datos?.citas || []) {
    opcionesDisponibles.branches.set(elemento.sucursalId, valorHistorico(elemento.nombreSucursal));
    opcionesDisponibles.people.set(elemento.personalId, valorHistorico(elemento.nombreProfesional));
  }
  for (const elemento of listarRegistros('branches', estado.negocioId)) opcionesDisponibles.branches.set(elemento.id, elemento.name);
  for (const elemento of listarRegistros('professionals', estado.negocioId)) opcionesDisponibles.people.set(elemento.id, elemento.name);
}
async function cargar(forzar = false, segundoPlano = false) {
  const consulta = filtros();
  if (estado.sucursal === 'none') { store.use(consulta, { ...periodoCalendario(estado.vistaCalendario, estado.fecha), citas: [] }); return; }
  if (!forzar && store.state.key === JSON.stringify(consulta)) return;
  if (forzar && !segundoPlano) { cache.clear(); atencion.reset(); }
  const enCache = !forzar && cache.peek(consulta);
  if (enCache) { store.use(consulta, enCache); recordarOpciones(enCache); return; }
  const identidadVigente = identidad;
  const anterior = store.state.data;
  const avisoAnterior = store.state.refreshError;
  if (await store.load(consulta, { background: segundoPlano || store.state.key === JSON.stringify(consulta), force: forzar })) {
    if (!usuarioActual || identidadVigente !== identidad) return;
    recordarOpciones(store.state.data);
    if (segundoPlano && !avisoAnterior && !store.state.error && !store.state.refreshError && JSON.stringify(anterior) === JSON.stringify(store.state.data)) {
      const control = document.querySelector('[data-agenda-actualizar]');
      if (control) { control.disabled = false; control.setAttribute('aria-busy', 'false'); control.querySelector('span').textContent = 'Actualizar'; }
      return;
    }
    if (estado.pagina === 'agenda') {
      // La respuesta no borra un filtro que se está escribiendo ni pierde el foco por reconstruir la carcasa.
      const formulario = document.querySelector('#agenda-filtros-conectados');
      const borrador = formulario ? new FormData(formulario) : null;
      const enfocado = document.activeElement;
      const nombreFoco = enfocado?.name;
      const seleccion = enfocado && 'selectionStart' in enfocado ? [enfocado.selectionStart, enfocado.selectionEnd] : null;
      const control = enfocado?.outerHTML;
      const contenedorDesplazable = document.querySelector('.agenda-conectada .calendario-desplazamiento, .agenda-conectada .mes-desplazamiento');
      const limiteSuperior = window.scrollY;
      const ancla = anclaDesplazamientoAgenda();
      const posicion = contenedorDesplazable && { left: contenedorDesplazable.scrollLeft, top: contenedorDesplazable.scrollTop, focused: enfocado === contenedorDesplazable };
      render();
      // Reconstruir el calendario no cambia la columna/hora que se estaba explorando con teclado o en móvil.
      const contenedorSiguiente = document.querySelector('.agenda-conectada .calendario-desplazamiento, .agenda-conectada .mes-desplazamiento');
      if (posicion && contenedorSiguiente) {
        contenedorSiguiente.scrollLeft = posicion.left; contenedorSiguiente.scrollTop = posicion.top;
        if (posicion.focused) contenedorSiguiente.focus({ preventScroll: true });
      }
      restaurarDesplazamientoAgenda(ancla, limiteSuperior);
      const formularioSiguiente = document.querySelector('#agenda-filtros-conectados');
      for (const [claveInterna, valor] of borrador || []) if (formularioSiguiente?.elements[claveInterna]) formularioSiguiente.elements[claveInterna].value = valor;
      if (document.querySelector('#dialogo-app')?.open) {
        if (segundoPlano && anterior && store.state.data && JSON.stringify(anterior) !== JSON.stringify(store.state.data)) window.dispatchEvent(new Event('agenda-actualizada'));
        return;
      }
      if (nombreFoco) {
        const siguiente = formularioSiguiente?.elements[nombreFoco]; siguiente?.focus({ preventScroll: true });
        if (seleccion?.[0] != null && siguiente?.setSelectionRange) siguiente.setSelectionRange(...seleccion);
      }
      else if (control) {
        // Buscar el mismo control por sus atributos propios, sin insertar HTML de la respuesta.
        const attr = [...(enfocado?.attributes || [])].find((elemento) => elemento.name.startsWith('data-agenda-'));
        if (attr) document.querySelector(`[${attr.name}="${attr.value}"]`)?.focus({ preventScroll: true });
        else if (enfocado?.type === 'submit') formularioSiguiente?.querySelector('[type="submit"]')?.focus({ preventScroll: true });
      }
    }
    if (segundoPlano && anterior && store.state.data && JSON.stringify(anterior) !== JSON.stringify(store.state.data)) window.dispatchEvent(new Event('agenda-actualizada'));
  }
}
// La actualización periódica usa los filtros aplicados; no convierte texto aún sin aplicar en otra consulta.
registrarRefrescoVivo(() => {
  if (usuarioActual && estado.pagina === 'agenda' && !store.state.busy && !store.state.refreshing) return Promise.all([cargar(true, true), cargarAtencion(true)]);
});
// Mismos filtros compactos e iconos que la demo; cambian únicamente los nombres del contrato HTTP.
const selectorCampo = (nombre, etiqueta, etiquetaTodas, opciones, valor, imagen) => `<label class="selector-filtro">${renderIcono(imagen)}<select name="${nombre}" aria-label="${etiqueta}">${valor === 'none' ? '<option value="none" selected>Sin sucursales asignadas</option>' : ''}<option value="all" ${valor === 'all' ? 'selected' : ''}>${etiquetaTodas}</option>${[...opciones].map(([id, texto]) => `<option value="${esc(id)}" ${String(id) === String(valor) ? 'selected' : ''}>${esc(texto)}</option>`).join('')}</select>${renderIcono('down')}</label>`;

function calendario(datos) {
  const periodo = periodoCalendario(estado.vistaCalendario, estado.fecha);
  const dias = Array.from({ length: estado.vistaCalendario === 'day' ? 1 : 7 }, (_, indice) => sumarDiasCiviles(periodo.desde, indice));
  const equipo = estado.vistaCalendario === 'week' && estado.profesional === 'all' && usuarioActual?.rol !== 'profesional' ? atencionEquipo(modelosAtencionColumnas(), usuarioActual?.rol !== 'recepcionista') : undefined;
  // Las acciones se ofrecen en la agenda propia; el servidor decide de nuevo la pertenencia al escribir.
  const opciones = { atencionEquipo: equipo, atencionPorProfesional: modelosAtencionColumnas(), profesional: usuarioActual.rol === 'profesional' ? String(usuarioActual.id) : estado.profesional, profesionales: listarRegistros('professionals', estado.negocioId), permitirCambiosEstado: puedeGestionarAgenda(usuarioActual?.rol), atencion: atencion.state.key === JSON.stringify(consultaAtencion()) ? atencion.state.data : null, sucursal: estado.sucursal, anchoColumna: Math.max(160, ((document.querySelector('.agenda-calendario')?.clientWidth || window.innerWidth - 300) - 58) / 7) };
  const contenido = estado.vistaCalendario === 'month' ? renderMes(estado.fecha, datos.citas, hoyCivil(), opciones) : renderLineaTiempo(dias, datos.citas, hoyCivil(), opciones);
  // Incluso un periodo vacío mantiene la cuadrícula para conservar la referencia temporal de la demo.
  return `${!datos.citas.length ? '<p class="agenda-resumen-vacio" role="status">Sin citas en este periodo</p>' : ''}${contenido}`;
}
function consultaAtencion() {
  const persona = usuarioActual?.rol === 'profesional' ? usuarioActual.id : estado.profesional;
  return estado.vistaCalendario !== 'month' && persona && persona !== 'all' && estado.sucursal !== 'none'
    ? { ...periodoCalendario(estado.vistaCalendario, estado.fecha), personalId: persona, sucursalId: estado.sucursal } : null;
}
async function cargarAtencion(forzar = false) {
  await cargarAtencionColumnas(forzar);
  const consulta = consultaAtencion();
  if (!consulta) { if (atencion.state.key) atencion.reset(); return; }
  if (!forzar && atencion.state.key === JSON.stringify(consulta)) return;
  const ambito = identidad;
  const claveAnterior = atencion.state.key;
  const datosAnteriores = atencion.state.data;
  const errorAnterior = atencion.state.error;
  if (await atencion.load(consulta)) {
    if (claveAnterior === atencion.state.key && !errorAnterior && !atencion.state.error && JSON.stringify(datosAnteriores) === JSON.stringify(atencion.state.data)) return;
    if (ambito === identidad && estado.pagina === 'agenda') renderAgendaConservandoPosicion(render);
  }
}
export function agenda() {
  comprobarSesion();
  recordarOpciones(null);
  const modeloSucursales = sincronizarSucursal();
  void cargar();
  const modelo = store.state;
  const negocio = obtenerNegocio(estado.negocioId);
  const portal = (negocio?.slug ? `<a class="btn btn-light" href="/reservas/${esc(negocio.slug)}" target="_blank" rel="noopener">${renderIcono('external')}Portal de reservas</a>` : '') +
    (puedeGestionarAgenda(usuarioActual?.rol) ? `<button type="button" class="btn btn-primary" data-agenda-nueva>${renderIcono('plus')}${hayAltaManualPendiente(usuarioActual) ? 'Comprobar envío pendiente' : 'Nueva cita'}</button>` : '');
  const zonas = [...new Set((modelo.data?.citas || []).map((elemento) => elemento.zonaHoraria))];
  void cargarAtencion(); aplicarEfectosAgenda();
  const modeloAtencion = consultaAtencion() ? atencion.state : null;
  const avisoAtencion = consultaAtencionColumnas() ? "" : !modeloAtencion ? "" : modeloAtencion.busy ? `<p class="agenda-aviso-atencion" role="status">Consultando atención…</p>` : modeloAtencion.error ? `<div class="agenda-aviso-atencion" role="status">No se pudo comprobar la atención. ${esc(errorSeguro(modeloAtencion.error).message)}</div>` : modeloAtencion.data?.omisiones.some((x) => (estado.sucursal === 'all' || String(x.sucursalId) === String(estado.sucursal))) ? `<p class="agenda-aviso-atencion" role="status">Atención incompleta en algunas fechas por cambios de hora local. Esas fechas no se sombrean.</p>` : "";
  const htmlFiltros = (usuarioActual.rol !== "profesional" ? selectorCampo("personalId", "Profesional", "Todos los profesionales", opcionesDisponibles.people, estado.profesional, "users") : "") + selectorCampo("sucursalId", "Sucursal", "Todas las sucursales", new Map(modeloSucursales.opciones.map((b) => [b.id, b.name])), estado.sucursal, "pin") + selectorCampo("estado", "Estado", "Todos los estados", new Map(Object.entries(etiquetasEstadoCita)), estado.estadoCita, "circleCheck") + ((estado.profesional !== "all" || usuarioActual.rol === "profesional") && modeloSucursales.conocido ? `<label class="agenda-filtro-historial"><input type="checkbox" data-agenda-ver-historial ${estado.historialAgenda ? "checked" : ""}> Consultar otras sucursales (histórico)</label>` : "");
  const avisoRefresco = modelo.refreshError ? `<div class="agenda-error" data-aviso-en-vivo role="status"><strong>Agenda sin actualizar</strong><p>Se muestra la última consulta confirmada. ${esc(errorSeguro(modelo.refreshError).message)}</p><button class="btn btn-light" data-agenda-reintentar>Reintentar consulta</button></div>` : "";
  const cuerpo = avisoRefresco + (modelo.busy ? esqueletoCalendario(estado.vistaCalendario) : modelo.error ? panelError(modelo.error, "data-agenda-reintentar") : modelo.data ? calendario(modelo.data) : "");
  return renderEncabezadoPagina("Agenda", "Consulta y da seguimiento a las citas de tu negocio.", portal) + estructuraAgenda({ titulo: tituloCalendario(estado.vistaCalendario, estado.fecha), vista: estado.vistaCalendario, refrescando: modelo.refreshing, filtros: htmlFiltros, busqueda: estado.busqueda, resumen: modelo.data?.citas, ocupado: modelo.busy, cuerpo, aviso: (usuarioActual.rol === "recepcionista" ? '<p class="agenda-aviso-catalogo">Las opciones de profesionales y sucursales proceden de citas consultadas; no constituyen un catálogo completo de asignaciones.</p>' : estado.sucursal === "none" ? '<p class="agenda-aviso-atencion" role="status">Sin sucursales asignadas. Puedes consultar otras sucursales para revisar el histórico.</p>' : "") + avisoAtencion, soloAfectadas, zonas });
}

// Detalle e historial se consultan por separado: errores de eventos no ocultan el snapshot autorizado.
function htmlDetalle(elemento) {
  // El detalle conserva el snapshot de la cita sin identificador visible.
  const campos = [ ['Paciente', elemento.nombreContacto], ['Teléfono', elemento.telefonoContacto], ['Origen', elemento.origen === 'manual' ? 'Agendamiento manual' : 'Portal de reservas'], ['Servicio', elemento.nombreServicio], ['Profesional', elemento.nombreProfesional], ['Sucursal', elemento.nombreSucursal], ['Inicio', `${elemento.fechaLocal} · ${elemento.horaInicio}`], ['Fin', `${elemento.fechaFinLocal} · ${elemento.horaFin}`], ['Zona horaria', elemento.zonaHoraria], ['Costo histórico', elemento.costoAceptado], ['Notas de consulta', elemento.motivoConsulta] ];
  return `${renderEtiquetaEstado(elemento.estado)}<dl class="agenda-campos-detalle">${campos.map(([etiqueta, valor]) => `<div><dt>${etiqueta}</dt><dd>${esc(valorHistorico(valor))}</dd></div>`).join('')}</dl>${elemento.causas?.length ? `<ul>${elemento.causas.map((causa) => `<li>${esc(textoMotivoDisponibilidad(causa.codigo))}</li>`).join('')}</ul>` : ''}`;
}
const etiquetasAcciones = { alta: 'Alta', cambio_estado: 'Cambio de estado', cancelacion: 'Cancelación', reactivacion: 'Reactivación', cambio_horario: 'Cambio de horario' };
const etiquetasValores = { estado: 'Estado', version: 'Versión', origen: 'Origen', clienteId: 'Cliente', sucursalId: 'Sucursal', servicioId: 'Servicio', personalId: 'Profesional', inicioUtc: 'Inicio UTC', finUtc: 'Fin UTC', separacionMinutos: 'Separación (minutos)', finOcupacionUtc: 'Fin de ocupación UTC', zonaHoraria: 'Zona horaria', costoAceptado: 'Costo histórico' };
const htmlValores = (valores) => valores == null ? '<p>Sin valores registrados.</p>' : `<dl>${Object.entries(valores).filter(([claveInterna]) => etiquetasValores[claveInterna]).map(([claveInterna, valor]) => `<div><dt>${etiquetasValores[claveInterna]}</dt><dd>${esc(valorHistorico(valor))}</dd></div>`).join('')}</dl>`;
export async function abrirCita(id) {
  const generacion = ++generacionDetalle;
  const ambitoAbierto = `${usuarioActual?.negocioId}:${usuarioActual?.id}:${usuarioActual?.sesionId || ''}`;
  if (!document.querySelector('#dialogo-app')?.open) focoRetornoCita = document.activeElement;
  const dialogo = modal('Detalle de la cita', '<div class="dialogo-cuerpo"><p role="status">Consultando detalle…</p></div>', true);
  // Una relectura reemplaza controles del panel; devolver el foco a la cita vigente al cerrar.
  dialogo.onclose = () => (focoRetornoCita?.isConnected ? focoRetornoCita : document.querySelector(`[data-agenda-cita="${id}"]`) || document.querySelector('[data-agenda-hoy]'))?.focus();
  // Un historial largo necesita una superficie opaca para mantener legible el texto al desplazarlo.
  dialogo.classList.add('agenda-dialogo-cita');
  dialogo.addEventListener('close', () => { if (generacion === generacionDetalle) generacionDetalle++; }, { once: true });
  const esVigente = () => Boolean(usuarioActual) && ambitoAbierto === `${usuarioActual.negocioId}:${usuarioActual.id}:${usuarioActual.sesionId || ''}`;
  const activo = () => dialogo.open && generacion === generacionDetalle && esVigente();
  try {
    const detalle = await client.consultarDetalle(id);
    if (!activo()) return;
    if (!detalle || detalle.id !== id || !detalle.zonaHoraria) throw new Error('El detalle recibido no es válido.');
    const cuerpoDetalle = dialogo.querySelector('.dialogo-cuerpo');
    let seguimientoMostrado = renderSeguimientoCita(detalle.seguimiento, detalle.zonaHoraria);
    cuerpoDetalle.innerHTML = `${htmlDetalle(detalle)}<div data-agenda-seguimiento aria-live="polite">${seguimientoMostrado}</div><section class="agenda-historial" aria-label="Historial de la cita"><h3>Historial de la cita</h3><div data-agenda-historial></div></section>`;
    // Estado e historial conservan su autoridad de servidor; solo los roles de gestión reciben editor.
    montarEditorEstado(dialogo, detalle, { role: usuarioActual.rol, scope: ambitoAbierto, request: api, isCurrent: esVigente,
      onReload: () => abrirCita(id),
      onChanged: async () => { await cargar(true); if (activo()) await abrirCita(id); },
    });
    const ambitoSesion = `${usuarioActual.negocioId}:${usuarioActual.id}:${usuarioActual.sesionId || ''}`;
    montarEditorHorario(dialogo, detalle, { role: usuarioActual.rol, scope: ambitoSesion, request: api,
      isCurrent: () => Boolean(usuarioActual) && ambitoSesion === `${usuarioActual.negocioId}:${usuarioActual.id}:${usuarioActual.sesionId || ''}`,
      onReload: () => abrirCita(id),
      onChanged: async (resultado) => {
        estado.fecha = partesEnZonaHoraria(resultado.inicioUtc, resultado.zonaHoraria).date;
        estado.busqueda = ''; estado.sucursal = estado.profesional = estado.estadoCita = 'all';
        await cargar(true); if (activo()) await abrirCita(id);
      },
    });
    observarRegistro(cuerpoDetalle, { version: detalle.version, active: activo, read: async () => {
      const vigente = await client.consultarDetalle(id);
      // Los acuses no cambian la versión de la cita. Se actualiza solo su región de lectura.
      if (activo() && vigente?.id === id && vigente.version === detalle.version) {
        const siguiente = renderSeguimientoCita(vigente.seguimiento, vigente.zonaHoraria);
        if (siguiente !== seguimientoMostrado) {
          cuerpoDetalle.querySelector('[data-agenda-seguimiento]').innerHTML = siguiente;
          seguimientoMostrado = siguiente;
        }
      }
      return vigente;
    } });
    let generacionHistorial = 0;
    async function mostrarHistorial(paginaActual = 1) {
      const revision = ++generacionHistorial, objetivo = dialogo.querySelector('[data-agenda-historial]');
      objetivo.innerHTML = '<p role="status">Consultando historial…</p>';
      try {
        const historial = await client.consultarHistorial(id, paginaActual);
        if (!activo() || revision !== generacionHistorial) return;
        if (!historial || !Array.isArray(historial.eventos) || historial.pagina !== paginaActual || typeof historial.hayMas !== 'boolean') throw new Error('El historial recibido no es válido.');
        objetivo.innerHTML = historial.eventos.length ? `<ol>${historial.eventos.map((evento) => `<li><strong>${esc(etiquetasAcciones[evento.accion] || evento.accion)}</strong><p>${esc(new Intl.DateTimeFormat('es-MX', { timeZone: detalle.zonaHoraria, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(evento.ocurridoEn)))} · ${esc(detalle.zonaHoraria)}</p><p>${esc(textoActorCita(evento))} · Versión ${esc(evento.versionResultante)} · Evento ${esc(evento.id)}</p>${evento.motivo != null ? `<p>Motivo: ${esc(evento.motivo)}</p>` : ''}<details><summary>Valores anteriores y nuevos</summary><h4>Antes</h4>${htmlValores(evento.valoresAntes)}<h4>Después</h4>${htmlValores(evento.valoresDespues)}</details></li>`).join('')}</ol>` : '<p>Sin eventos registrados.</p>';
        objetivo.insertAdjacentHTML('beforeend', `<div class="agenda-paginas-historial"><button class="btn btn-light" data-historial-anterior ${paginaActual === 1 ? 'disabled' : ''}>Página anterior</button><span>Página ${paginaActual}</span><button class="btn btn-light" data-historial-siguiente ${!historial.hayMas ? 'disabled' : ''}>Siguiente página</button></div>`);
        objetivo.querySelector('[data-historial-anterior]').onclick = () => void mostrarHistorial(paginaActual - 1);
        objetivo.querySelector('[data-historial-siguiente]').onclick = () => void mostrarHistorial(paginaActual + 1);
        // Al reemplazar los controles de página, devolver el foco al nuevo control de avance.
        if (paginaActual > 1) objetivo.querySelector('[data-historial-anterior]').focus();
      } catch (error) {
        if (!activo() || revision !== generacionHistorial) return;
        objetivo.innerHTML = panelError(error, 'data-historial-reintentar');
        objetivo.querySelector('[data-historial-reintentar]')?.addEventListener('click', () => void mostrarHistorial(paginaActual));
      }
    }
    await mostrarHistorial();
  } catch (error) {
    if (!activo()) return;
    dialogo.querySelector('.dialogo-cuerpo').innerHTML = panelError(error, 'data-detalle-reintentar');
    dialogo.querySelector('[data-detalle-reintentar]')?.addEventListener('click', () => void abrirCita(id));
  }
}

// Controles propios evitan invocar las acciones de edición y creación reservadas a la demo.
export function handleClicAgenda(evento) {
  const objetivo = evento.target.closest('[data-agenda-actualizar], [data-agenda-reintentar-atencion], [data-agenda-limpiar], [data-agenda-nueva], [data-agenda-vista], [data-agenda-mover], [data-agenda-fecha], [data-agenda-hoy], [data-agenda-reintentar], [data-agenda-cita]');
  if (!objetivo || estado.pagina !== 'agenda') return false;
  if (objetivo.hasAttribute('data-agenda-actualizar')) {
    objetivo.disabled = true; objetivo.setAttribute('aria-busy', 'true'); objetivo.querySelector('span').textContent = 'Actualizando…';
    void Promise.all([cargar(true, true), cargarAtencion(true)]); return true;
  }
  if (objetivo.hasAttribute('data-agenda-reintentar-atencion')) { void cargarAtencion(true); render(); return true; }
  if (objetivo.hasAttribute('data-agenda-limpiar')) { estado.busqueda = ''; void cargar(); render(); document.querySelector('[name=busqueda]')?.focus(); return true; }
  if (objetivo.hasAttribute('data-agenda-nueva')) {
    void abrirAltaManual({ day: estado.fecha,
      catalogs: { services: listarRegistros('services', estado.negocioId), branches: listarRegistros('branches', estado.negocioId), people: listarRegistros('professionals', estado.negocioId) },
      onSaved: async (resultado) => {
        // Reconsultar después del commit, sin insertar resultados supuestos en el calendario.
        estado.fecha = partesEnZonaHoraria(resultado.inicioUtc, resultado.zonaHoraria).date;
        estado.busqueda = ''; estado.sucursal = estado.profesional = estado.estadoCita = 'all';
        await cargar(true);
      }, onCleared: () => render(),
    }); return true;
  }
  if (objetivo.hasAttribute('data-agenda-cita')) { void abrirCita(Number(objetivo.dataset.agendaCita)); return true; }
  if (objetivo.hasAttribute('data-agenda-reintentar')) { void cargar(true); render(); return true; }
  if (objetivo.dataset.agendaVista) estado.vistaCalendario = objetivo.dataset.agendaVista;
  if (objetivo.dataset.agendaMover) estado.fecha = moverFechaCalendario(estado.vistaCalendario, estado.fecha, Number(objetivo.dataset.agendaMover));
  if (objetivo.dataset.agendaFecha) { estado.fecha = objetivo.dataset.agendaFecha; estado.vistaCalendario = 'day'; }
  if (objetivo.hasAttribute('data-agenda-hoy')) estado.fecha = hoyCivil();
  render();
  // La carcasa se vuelve a crear; conservar el foco del control que originó el cambio.
  const atributo = [...objetivo.attributes].find((attr) => attr.name.startsWith('data-agenda-'));
  if (atributo) document.querySelector(`[${atributo.name}="${atributo.value}"]`)?.focus();
  return true;
}
let temporizadorBusqueda;
function aplicarFiltros(formulario) {
  clearTimeout(temporizadorBusqueda);
  if (estado.pagina !== 'agenda' || !formulario.isConnected) return;
  const nombreEnfocado = document.activeElement?.name;
  const seleccion = document.activeElement?.selectionStart;
  const datos = new FormData(formulario);
  if ((datos.get('personalId') || 'all') !== estado.profesional) estado.historialAgenda = false;
  estado.sucursal = datos.get('sucursalId'); estado.profesional = datos.get('personalId') || 'all'; estado.estadoCita = datos.get('estado'); estado.busqueda = datos.get('busqueda').trim();
  sincronizarSucursal();
  void cargar(); render();
  const control = document.querySelector('#agenda-filtros-conectados')?.elements[nombreEnfocado || 'busqueda'];
  control?.focus();
  try { if (seleccion != null) control.setSelectionRange(seleccion, seleccion); } catch { /* Los selectores no admiten selección de texto. */ }
}
// La demo filtra al interactuar. En conectado se conserva el gesto con debounce y protección de generaciones.
document.addEventListener('submit', (evento) => {
  if (evento.target.id !== 'agenda-filtros-conectados') return;
  evento.preventDefault(); aplicarFiltros(evento.target);
});
document.addEventListener('change', (evento) => {
  if (evento.target.matches('[data-agenda-ver-historial]')) { estado.historialAgenda = evento.target.checked; sincronizarSucursal(); render(); document.querySelector('[data-agenda-ver-historial]')?.focus(); return; }
  if (evento.target.matches('[data-agenda-afectadas]')) { soloAfectadas = evento.target.checked; void cargar(); render(); document.querySelector('[data-agenda-afectadas]')?.focus(); return; }
  if (evento.target.closest('#agenda-filtros-conectados') && evento.target.tagName === 'SELECT') aplicarFiltros(evento.target.form);
});
document.addEventListener('input', (evento) => {
  if (evento.target.form?.id !== 'agenda-filtros-conectados' || evento.target.name !== 'busqueda') return;
  clearTimeout(temporizadorBusqueda);
  const formulario = evento.target.form;
  temporizadorBusqueda = setTimeout(() => aplicarFiltros(formulario), 300);
});

instalarEstadoRapido({ client, openDetail: abrirCita, refresh: () => cargar(true) });
