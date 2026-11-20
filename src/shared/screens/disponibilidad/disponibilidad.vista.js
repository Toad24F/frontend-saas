import { renderDirectorioBloqueos } from './disponibilidad.directorio-bloqueos.js';
import { TIPOS_BLOQUEO } from './disponibilidad.filtros-bloqueos.js';
import { esDemo, mensajePendiente, usuarioActual } from '../../../connected/backend.js';
import { estadoAplicacion } from '../../aplicacion.nucleo.js';
import { listarRegistros, obtenerRecurso, obtenerNegocio, formatearFecha } from '../../aplicacion.datos.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { gruposDisponibilidad, grupoDePestanaDisponibilidad, resolverGrupoDisponibilidad } from './disponibilidad.grupos.js';
import { escaparHtml as esc, renderEncabezadoPagina, renderBoton, renderEstadoVacio } from '../../interfaz.componentes.js';
import './disponibilidad.estilos.css';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
let pestanaActiva = 'sucursales';
let alcanceBloqueos = '';

export function consultarAlcanceBloqueos() { return alcanceBloqueos; }
export function cambiarAlcanceBloqueos(valor) { alcanceBloqueos = valor === '' ? '' : String(valor); }

export function renderFranjaHorario(franja, profesionalSeleccionado, negocioId, sePuedeQuitar = false, indiceFranja = 0) {
  const dia = DIAS[franja.day];
  const sucursales = listarRegistros('branches', negocioId).filter((sucursal) => profesionalSeleccionado.branchIds.includes(sucursal.id));
  // El descanso incrustado pertenece solo a la demo; la semana real usa dos franjas.
  const descansoDemo = esDemo ? `<td data-label="Descanso opcional" data-disponibilidad-campo="horario-${franja.id}-descanso"><div class="par-horas"><input class="form-control form-control-sm" type="time" name="inicioDescanso-${franja.id}" value="${franja.breakStart || ''}" aria-label="Inicio de descanso del ${dia}" ${franja.enabled ? '' : 'disabled'}/><span>–</span><input class="form-control form-control-sm" type="time" name="finDescanso-${franja.id}" value="${franja.breakEnd || ''}" aria-label="Fin de descanso del ${dia}" ${franja.enabled ? '' : 'disabled'}/></div></td>` : '';
  return `<tr data-horario-franja data-horario-dia="${franja.day}" data-id="${franja.id}" class="horario-dia-${franja.day} ${indiceFranja > 0 ? 'horario-franja-adicional' : ''} ${franja.enabled ? '' : 'horario-franja-inactiva'}">
    <td><label class="form-check form-switch"><input class="form-check-input" type="checkbox" name="activo-${franja.id}" ${franja.enabled ? 'checked' : ''} aria-label="Activar ${dia}"/><span class="horario-dia-etiqueta">${dia}</span></label></td>
    <td data-label="Sucursal" data-disponibilidad-campo="horario-${franja.id}-sucursal"><select class="form-select form-select-sm" name="sucursal-${franja.id}" aria-label="Sucursal del ${dia}" ${franja.enabled ? '' : 'disabled'}>${!esDemo ? `<option value="" ${franja.branchId == null ? 'selected' : ''}>Selecciona sucursal</option>` : ''}${sucursales.map((sucursal) => `<option value="${sucursal.id}" ${franja.branchId === sucursal.id ? 'selected' : ''}>${esc(sucursal.name)}</option>`).join('')}</select></td>
    <td data-label="Entrada" data-disponibilidad-campo="horario-${franja.id}-entrada"><input class="form-control form-control-sm" type="time" name="entrada-${franja.id}" value="${franja.start}" aria-label="Entrada del ${dia}" ${franja.enabled ? '' : 'disabled'}/></td>
    ${descansoDemo}
    <td data-label="Salida" data-disponibilidad-campo="horario-${franja.id}-salida"><input class="form-control form-control-sm" type="time" name="salida-${franja.id}" value="${franja.end}" aria-label="Salida del ${dia}" ${franja.enabled ? '' : 'disabled'}/></td>
    <td data-label="Franjas"><div class="horario-acciones"><button type="button" class="btn btn-light horario-agregar-franja" data-agregar-franja="${franja.day}" aria-label="Agregar franja al ${dia}" title="Agregar franja">+</button>${sePuedeQuitar ? `<button type="button" class="icon-btn" data-quitar-franja="${franja.id}" aria-label="Quitar franja del ${dia}" ${franja.enabled ? '' : 'disabled'}>${renderIcono('x')}</button>` : ''}</div></td>
  </tr>`;
}

function renderSeccionHorario(profesionalSeleccionado, franjas) {
  const filas = franjas.sort((a, b) => (esDemo ? a.day - b.day : (a.day || 7) - (b.day || 7)) || a.start.localeCompare(b.start))
    .map((franja) => renderFranjaHorario(franja, profesionalSeleccionado, estadoAplicacion.negocioId, (!esDemo && franja.id > 0) || franjas.filter((elemento) => elemento.day === franja.day).length > 1, franjas.filter((elemento) => elemento.day === franja.day && elemento.start < franja.start).length)).join('');
  return `<section class="surface disponibilidad-seccion"><div class="section-heading"><div><h2>Horario semanal</h2><p>Agrega varias franjas por día; cada una puede tener otra sucursal.</p></div></div><form id="formulario-horario"><div class="table-responsive"><table class="table app-table horario-tabla ${esDemo ? 'horario-tabla--demo' : 'horario-tabla--conectado'} align-middle"><thead><tr><th>Día</th><th>Sucursal</th><th>Entrada</th>${esDemo ? '<th>Descanso opcional</th>' : ''}<th>Salida</th><th>Franjas</th></tr></thead><tbody>${filas}</tbody></table></div><p id="horario-error" class="form-error disponibilidad-error-general" role="alert" tabindex="-1" hidden></p><div class="section-form-footer"><span class="horario-ayuda">Para incluir una pausa o cambiar de sucursal, divide el día en franjas. Ejemplo: Norte de 9:00 a 13:00 y Sur de 14:00 a 18:00. Las franjas pueden ser consecutivas, pero no superponerse.</span><button class="btn btn-primary" type="submit">${renderIcono('check')}Guardar horario</button></div></form></section>`;
}

function renderSeccionModo(negocio) {
  return `<section class="surface seccion-modo-agenda disponibilidad-seccion"><div><h2>Cómo se llena tu agenda</h2><p>${esDemo ? 'Elige qué horarios podrán reservar tus pacientes.' : mensajePendiente}</p></div><div class="opciones-modo-agenda"><button type="button" data-mode="free" aria-pressed="${negocio.mode === 'free'}" class="opcion-modo-agenda ${negocio.mode === 'free' ? 'selected' : ''}">${renderIcono('grid')}<span><strong>Ventana libre</strong><small>Muestra todos los espacios disponibles.</small></span><i>${negocio.mode === 'free' ? renderIcono('check') : ''}</i></button><button type="button" data-mode="compact" aria-pressed="${negocio.mode === 'compact'}" class="opcion-modo-agenda ${negocio.mode === 'compact' ? 'selected' : ''}">${renderIcono('calendar')}<span><strong>Agenda compacta</strong><small>Prioriza citas consecutivas, día por día.</small></span><i>${negocio.mode === 'compact' ? renderIcono('check') : ''}</i></button></div></section>`;
}

function renderSeccionBloqueos() {
  const alcance = !esDemo && usuarioActual.rol === 'profesional' ? String(usuarioActual.id) : alcanceBloqueos;
  return `<section class="surface disponibilidad-seccion"><div class="section-heading"><div><h2>Bloqueos</h2><p>Vacaciones, festivos o cambios de último momento.</p></div>${renderBoton('Agregar bloqueo', 'nuevo-bloqueo', 'plus', 'btn-light')}</div>${renderDirectorioBloqueos(estadoAplicacion.negocioId, alcance, listarRegistros('blocks', estadoAplicacion.negocioId), listarRegistros('branches', estadoAplicacion.negocioId), (bloqueo) => `<div class="bloqueo-entrada"><span class="stat-icon amber">${renderIcono('lock')}</span><div><strong>${esc(bloqueo.reason)}</strong><small>${formatearFecha(bloqueo.date, { day: 'numeric', month: 'short' })}${bloqueo.endDate !== bloqueo.date ? ` – ${formatearFecha(bloqueo.endDate, { day: 'numeric', month: 'short' })}` : ''} · ${bloqueo.start ? bloqueo.start + ' – ' + bloqueo.end : 'Todo el día'} · ${bloqueo.professionalId ? esc(obtenerRecurso('professionals', bloqueo.professionalId, estadoAplicacion.negocioId).name) : 'Todo el equipo'}</small><small>${esc(TIPOS_BLOQUEO[bloqueo.type === 'feriado' ? 'dia_festivo' : bloqueo.type] || bloqueo.type)} · ${bloqueo.branchId ? esc(listarRegistros('branches', estadoAplicacion.negocioId).find((sucursal) => sucursal.id === bloqueo.branchId)?.name || 'Sucursal no disponible') : 'Todas las sucursales'}</small></div><button class="icon-btn" data-editar-bloqueo="${bloqueo.id}" ${!esDemo && usuarioActual.rol === 'profesional' && bloqueo.professionalId !== usuarioActual.id ? 'disabled' : ''} aria-label="Editar bloqueo ${esc(bloqueo.reason)}">${renderIcono('edit')}</button><button class="icon-btn" data-eliminar-bloqueo="${bloqueo.id}" ${!esDemo && usuarioActual.rol === 'profesional' && bloqueo.professionalId !== usuarioActual.id ? 'disabled' : ''} aria-label="Eliminar bloqueo ${esc(bloqueo.reason)}">${renderIcono('x')}</button></div>`)}</section>`;
}

function renderContextoProfesional(profesionales, profesionalSeleccionado, pestanaId) {
  const esEquipo = pestanaId === 'bloqueos' && (esDemo || usuarioActual.rol === 'admin_negocio') && !alcanceBloqueos;
  const persona = pestanaId === 'bloqueos' && !esDemo && usuarioActual.rol === 'profesional'
    ? profesionales.find((elemento) => elemento.id === usuarioActual.id) || profesionalSeleccionado
    : pestanaId === 'bloqueos' && alcanceBloqueos ? profesionales.find((elemento) => String(elemento.id) === alcanceBloqueos) || profesionalSeleccionado : profesionalSeleccionado;
  const valorSeleccionado = esEquipo ? '' : String(persona.id);
  const id = { horario: 'profesional-horario', bloqueos: 'profesional-bloqueos', oferta: 'profesional-oferta', proyeccion: 'profesional-proyeccion' }[pestanaId];
  const etiqueta = pestanaId === 'bloqueos' ? 'Ver bloqueos de' : pestanaId === 'oferta' ? 'Ver oferta de' : pestanaId === 'proyeccion' ? 'Ver proyección de' : 'Ver horario de';
  const inicial = esEquipo ? renderIcono('users') : esc(persona.name.trim().charAt(0).toUpperCase());
  const nombre = esEquipo ? 'Todo el equipo' : esc(persona.name);
  const detalle = esEquipo ? `${profesionales.length} profesionales` : `${persona.branchIds?.length || 0} sucursales asignadas`;
  const profesionalesElegibles = pestanaId === 'bloqueos' && !esDemo && usuarioActual.rol === 'profesional' ? [persona] : profesionales;
  const opciones = `${pestanaId === 'bloqueos' && (esDemo || usuarioActual.rol === 'admin_negocio') ? '<option value="">Todo el equipo</option>' : ''}${profesionalesElegibles.map((elemento) => `<option value="${elemento.id}" ${String(elemento.id) === valorSeleccionado ? 'selected' : ''}>${esc(elemento.name)}</option>`).join('')}`;
  return `<div class="disponibilidad-contexto-profesional"><span class="disponibilidad-avatar-profesional" aria-hidden="true">${inicial}</span><div class="disponibilidad-datos-profesional"><strong>${nombre}</strong><small>${detalle}</small></div><label class="disponibilidad-selector-profesional" for="${id}"><span>${etiqueta}</span><select class="form-select" id="${id}" data-disponibilidad-profesional="${pestanaId}">${opciones}</select></label></div>`;
}

function renderPestanas(pestanas, profesionales, profesionalSeleccionado) {
  const grupoId = resolverGrupoDisponibilidad(estadoAplicacion.grupoDisponibilidad, esDemo, usuarioActual?.rol);
  const grupo = gruposDisponibilidad.find((elemento) => elemento.id === grupoId);
  const visible = pestanas.filter((pestana) => grupoDePestanaDisponibilidad(pestana.id) === grupoId)
    .sort((a, b) => grupo.pestanas.indexOf(a.id) - grupo.pestanas.indexOf(b.id));
  if (!visible.some((pestana) => pestana.id === pestanaActiva)) pestanaActiva = visible[0]?.id || '';
  const pestanaUnica = visible.length === 1;
  return `<div class="disponibilidad-espacio">${visible.filter((pestana) => pestana.contexto !== false).map((pestana) => `<div data-disponibilidad-contexto="${pestana.id}" ${pestana.id === pestanaActiva ? '' : 'hidden'}>${renderContextoProfesional(profesionales, profesionalSeleccionado, pestana.id)}</div>`).join('')}${pestanaUnica ? visible[0].contenido : `<nav class="disponibilidad-pestanas" role="tablist" aria-label="Opciones de ${grupo.etiqueta}">${visible.map((pestana) => `<button type="button" role="tab" id="disponibilidad-pestana-${pestana.id}" aria-controls="disponibilidad-panel-${pestana.id}" aria-selected="${pestana.id === pestanaActiva}" tabindex="${pestana.id === pestanaActiva ? '0' : '-1'}" data-disponibilidad-pestana="${pestana.id}" class="${pestana.id === pestanaActiva ? 'is-selected' : ''}">${pestana.etiqueta}</button>`).join('')}</nav>${visible.map((pestana) => `<div role="tabpanel" id="disponibilidad-panel-${pestana.id}" aria-labelledby="disponibilidad-pestana-${pestana.id}" data-disponibilidad-panel="${pestana.id}" ${pestana.id === pestanaActiva ? '' : 'hidden'}>${pestana.contenido}</div>`).join('')}`}</div>`;
}

export function renderDisponibilidadSemanal({ panelesAdicionales = [] } = {}) {
  const negocio = obtenerNegocio(estadoAplicacion.negocioId);
  const profesionales = listarRegistros('professionals', estadoAplicacion.negocioId);
  if (alcanceBloqueos && !profesionales.some((persona) => String(persona.id) === alcanceBloqueos)) alcanceBloqueos = '';
  const profesionalSeleccionado = profesionales.find((persona) => persona.id === Number(estadoAplicacion.profesionalHorario)) || profesionales[0];
  if (!profesionalSeleccionado && !panelesAdicionales.length) return `${renderEncabezadoPagina('Disponibilidad', 'Organiza horarios y fechas de atención.')}${renderEstadoVacio('Agrega a tu primer profesional', 'Después podrás configurar sus horarios.')}`;
  const pestanas = [];
  if (profesionalSeleccionado) {
    const franjas = listarRegistros('schedules', estadoAplicacion.negocioId).filter((franja) => franja.professionalId === profesionalSeleccionado.id);
    if (!esDemo) for (const dia of [1, 2, 3, 4, 5, 6, 0]) {
      if (!franjas.some((franja) => franja.day === dia)) franjas.push({ id: -100 - dia, day: dia, branchId: profesionalSeleccionado.branchIds[0], enabled: false, start: '', end: '', breakStart: '', breakEnd: '' });
    }
    pestanas.push(
      { id: 'horario', etiqueta: 'Horario semanal', contenido: renderSeccionHorario(profesionalSeleccionado, franjas) + (esDemo && !panelesAdicionales.length ? renderSeccionModo(negocio) : '') },
      // Los cambios por fecha se gestionan con Bloqueos; la pestaña no ofrece excepciones.
      { id: 'bloqueos', etiqueta: 'Bloqueos', contenido: renderSeccionBloqueos() },
    );
  } else if (estadoAplicacion.grupoDisponibilidad === 'equipo') {
    pestanas.push({ id: 'equipo-vacio', etiqueta: 'Equipo', contexto: false, contenido: renderEstadoVacio('Agrega a tu primer profesional', usuarioActual?.rol === 'admin_negocio' || esDemo ? 'Después podrás asignar sucursales y configurar sus horarios.' : 'Pide a administración que configure tu perfil.', usuarioActual?.rol === 'admin_negocio' || esDemo ? '<a class="btn btn-light" href="/admin/profesionales" data-nav="profesionales">Ir a profesionales</a>' : '') });
  }
  pestanas.push(...panelesAdicionales);
  const descripcion = {
    equipo: esDemo ? 'Configura sucursales, horarios y cambios de atención.' : 'Configura sucursales, servicios, horarios y cambios de atención.',
    negocio: 'Define las reglas de agenda que se aplican a todo el negocio.',
    comprobar: 'Consulta horarios y revisa el efecto de los cambios en las citas.',
  }[resolverGrupoDisponibilidad(estadoAplicacion.grupoDisponibilidad, esDemo, usuarioActual?.rol)];
  return `${renderEncabezadoPagina('Disponibilidad', descripcion)}${renderPestanas(pestanas, profesionales, profesionalSeleccionado)}`;
}

export function cambiarPestanaDisponibilidad(pestanaId, enfocar = false) {
  const raiz = document.querySelector('.disponibilidad-espacio');
  const pestana = raiz?.querySelector(`[data-disponibilidad-pestana="${pestanaId}"]`);
  if (!pestana) return;
  pestanaActiva = pestanaId;
  raiz.querySelectorAll('[data-disponibilidad-pestana]').forEach((elemento) => {
    const profesionalSeleccionado = elemento === pestana;
    elemento.classList.toggle('is-selected', profesionalSeleccionado);
    elemento.setAttribute('aria-selected', String(profesionalSeleccionado));
    elemento.tabIndex = profesionalSeleccionado ? 0 : -1;
  });
  raiz.querySelectorAll('[data-disponibilidad-panel]').forEach((panel) => { panel.hidden = panel.dataset.disponibilidadPanel !== pestanaId; });
  raiz.querySelectorAll('[data-disponibilidad-contexto]').forEach((contexto) => { contexto.hidden = contexto.dataset.disponibilidadContexto !== pestanaId; });
  if (enfocar) pestana.focus();
}
