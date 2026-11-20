import { api, cargarDatosBackend, usuarioActual } from '../../backend.js';
import { ejecutarAccionProfesional } from '../../modules/profesionales/profesionales.operaciones.js';
import { render, estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { obtenerRecurso } from '../../../shared/aplicacion.datos.js';
import { espacioErrorFormulario } from '../../../shared/formularios.componentes.js';
import { escaparHtml, abrirDialogo, mostrarAviso } from '../../../shared/interfaz.componentes.js';
import { leerCupoRolPropio, renderAvisoCupoPropio } from '../negocio/usuarios.cupo.js';

const operaciones = {
  desactivar: { titulo: 'Desactivar profesional', etiqueta: 'Desactivar', mensaje: 'Se cerrarán sus sesiones. Se conservan su perfil, horarios, asignaciones e historial.', exito: 'Profesional desactivado.' },
  reactivar: { titulo: 'Reactivar profesional', etiqueta: 'Reactivar', mensaje: 'Podrá iniciar sesión de nuevo. Las sesiones anteriores no se restauran.', exito: 'Profesional reactivado.' },
  inhabilitar: { titulo: 'Inhabilitar profesional', etiqueta: 'Inhabilitar', mensaje: 'Se retirará de los listados operativos y se cerrarán sus sesiones. Podrás consultarlo en Inhabilitados y restaurarlo como inactivo más adelante.', exito: 'Profesional inhabilitado.' },
};

export async function accionProfesional(accion, id) {
  if (usuarioActual?.rol !== 'admin_negocio' || estadoAplicacion.pagina !== 'profesionales' || !operaciones[accion]) return;
  const persona = obtenerRecurso('professionals', id, estadoAplicacion.negocioId);
  if (accion === 'desactivar' && persona.active === false || accion === 'reactivar' && persona.active !== false) {
    mostrarAviso('El estado de este profesional cambió. Actualiza la lista.');
    return;
  }
  const operacion = operaciones[accion];
  let introduccionCupo = '';
  if (accion === 'reactivar') {
    // La reactivación puede consumir un lugar; se consulta el cupo propio justo
    // antes de confirmar y la respuesta final sigue siendo autoridad del servidor.
    try { introduccionCupo = renderAvisoCupoPropio('profesionales', await leerCupoRolPropio('profesionales', api)); }
    catch { introduccionCupo = '<p class="introduccion-formulario">No se pudo consultar el cupo vigente. El servidor lo comprobará al reactivar.</p>'; }
  }
  // El retiro conserva historial y no equivale a desactivar ni a borrar.
  const dialogo = abrirDialogo(operacion.titulo, `<div class="dialogo-cuerpo">${introduccionCupo}<p><strong>${escaparHtml(persona.name)}</strong>: ${operacion.mensaje}</p>${espacioErrorFormulario}</div><div class="dialogo-pie"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn ${accion === 'reactivar' ? 'btn-primary' : accion === 'inhabilitar' ? 'accion-peligro' : 'accion-precaucion'}" data-confirm>${operacion.etiqueta}</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const boton = evento.currentTarget;
    boton.disabled = true;
    const etiqueta = boton.textContent;
    boton.textContent = 'Procesando…';
    try {
      await ejecutarAccionProfesional(persona.id, accion);
      if (accion === 'inhabilitar' && estadoAplicacion.profesionalHorario === persona.id) estadoAplicacion.profesionalHorario = null;
      dialogo.close();
      try { await cargarDatosBackend(); render(); mostrarAviso(operacion.exito); }
      catch (error) { mostrarAviso(`${operacion.exito} No se pudo actualizar la lista: ${error.message}`); }
    } catch (error) {
      const destino = dialogo.querySelector('#error-formulario');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally {
      boton.disabled = false;
      boton.textContent = etiqueta;
    }
  };
}
