import { estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { listarRegistros, HOY, sumarDias, formatearFecha } from '../../../shared/aplicacion.datos.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { renderEncabezadoPagina, renderBoton } from '../../../shared/interfaz.componentes.js';
import './resumen.estilos.css';
import { resumenAgendaDemo } from '../../../shared/screens/agenda/agenda.vista.js';
import { tablaCitas } from '../../../shared/screens/agenda/agenda.tabla.js';
export function renderResumenDemo() {
  const citasHoy = listarRegistros('appointments', estadoAplicacion.negocioId).filter(
      (cita) => cita.date === HOY,
    ),
    citasNegocio = listarRegistros('appointments', estadoAplicacion.negocioId);
  return `${renderEncabezadoPagina('Buenos días, Adriana', 'Un nuevo día para hacer sentir bien a tus pacientes.', renderBoton('Nueva cita', 'nueva-cita'))}${resumenAgendaDemo()}<div class="resumen-cuadricula"><section class="surface"><div class="section-heading"><div><h2>Tu semana en perspectiva</h2><p>Citas por día · septiembre de 2026</p></div><span class="soft-tag">Esta semana</span></div><div class="resumen-grafica">${Array.from(
    { length: 7 },
    (_, indice) => {
      const dia = sumarDias(HOY, indice - 1),
        cantidad = citasNegocio.filter((cita) => cita.date === dia).length;
      return `<div class="resumen-columna"><strong>${cantidad}</strong><div class="resumen-carril"><div class="resumen-barra ${dia === HOY ? 'resumen-barra-hoy' : ''}" style="height:${Math.max(cantidad * 14, 3)}%"></div></div><span>${formatearFecha(dia, { weekday: 'short' })}</span></div>`;
    },
  ).join(
    '',
  )}</div></section><section class="resumen-destacado"><span class="resumen-icono-destacado">${renderIcono('heart')}</span><span class="eyebrow">CADA ENCUENTRO CUENTA</span><h2>El cuidado empieza<br>con una buena agenda.</h2><p>Tienes ${citasHoy.filter((cita) => cita.status === 'confirmada').length} citas confirmadas para hoy. Prepara tu jornada y dedica tiempo a lo que más importa.</p><a href="/admin/agenda" class="btn btn-light" data-nav="agenda">Ver mi agenda ${renderIcono('arrow')}</a></section></div><section class="surface resumen-citas-hoy"><div class="section-heading"><div><h2>Citas de hoy</h2><p>${formatearFecha(HOY, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><span class="soft-tag">${citasHoy.length} citas</span></div>${tablaCitas(citasHoy)}</section>`;
}
