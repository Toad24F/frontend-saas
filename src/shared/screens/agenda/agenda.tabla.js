import { esDemo, mensajePendiente as pendiente, usuarioActual } from '../../../connected/backend.js';
import { estadoAplicacion as estado } from '../../aplicacion.nucleo.js';
import { datosAplicacion, listarRegistros, obtenerRecurso, ampliarDatosCita, obtenerNegocio, HOY, sumarDias, formatearFecha, formatearMoneda } from '../../aplicacion.datos.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { escaparHtml as esc, avatar, renderEtiquetaEstado, renderEncabezadoPagina, renderBoton, renderEstadoVacio } from '../../interfaz.componentes.js';
export function tablaCitas(citas) {
  if (!citas.length)
    return renderEstadoVacio(
      'Sin citas para mostrar',
      'Prueba otra fecha o agrega una nueva cita.',
    );
  return `<div class="table-responsive"><table class="table tabla-app align-middle"><thead><tr><th>Paciente</th><th>Servicio y profesional</th><th>Fecha y hora</th><th>Sucursal</th><th>Estado</th><th><span class="visually-hidden">Acciones</span></th></tr></thead><tbody>${citas
    .map((a) => {
      const e = ampliarDatosCita(a);
      return `<tr><td><div class="celda-persona">${avatar(
        e.client.name
          .split(' ')
          .map((p) => p[0])
          .slice(0, 2)
          .join(''),
        'menta',
      )}<span><strong>${esc(e.client.name)}</strong></span></div></td><td><strong>${esc(e.service.name)}</strong><small>${esc(e.professional.name)}</small></td><td><strong>${formatearFecha(a.date, { day: 'numeric', month: 'short' })}</strong><small>${a.start} – ${a.end}</small></td><td>${esc(e.branch.name)}</td><td>${renderEtiquetaEstado(a.status)}</td><td><button class="boton-icono" data-cita="${a.id}" aria-label="Ver cita de ${esc(e.client.name)}">${renderIcono('chevron')}</button></td></tr>`;
    })
    .join('')}</tbody></table></div>`;
}
