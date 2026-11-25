import { api, usuarioActual } from '../../backend.js';
import { estadoAplicacion, render } from '../../../shared/aplicacion.nucleo.js';
import { listarRegistros } from '../../../shared/aplicacion.datos.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { renderResumen } from '../../../shared/screens/resumen/resumen.vista.js';
import { filtrosResumen } from '../../../shared/screens/resumen/resumen.filtros.js';
import { hoyCivil, periodoCalendario } from '../../modules/agenda/agenda.calendario.js';
import { crearAgendaClient } from '../../modules/agenda/agenda.client.js';
import { errorSeguro } from '../../modules/agenda/agenda.errores.js';
import { puedeGestionarAgenda } from '../../modules/agenda/agenda.contrato-manual.js';
import { abrirCita } from '../agenda/agenda.vista.js';
import { abrirAltaManual, hayAltaManualPendiente } from '../agenda/agenda.vista-manual.js';

const client = crearAgendaClient(api);
let consulta;

export function reiniciarResumen() { consulta = undefined; }
window.addEventListener('cita-sesion-expirada', reiniciarResumen);

async function cargarResumen(hoy) {
  const actual = { usuario: usuarioActual, hoy };
  consulta = actual;
  const vigente = () => consulta === actual && usuarioActual === actual.usuario && estadoAplicacion.pagina === 'resumen';
  try {
    const semana = await client.listar(periodoCalendario('week', hoy));
    actual.citasSemana = semana.citas;
  } catch (error) {
    if (!vigente()) return;
    actual.errorSemana = errorSeguro(error).message;
    if (error.codigo === 'agenda_demasiado_amplia') {
      actual.errorSemana = 'La semana supera 1.000 citas. Consulta la semana en Agenda con filtros de sucursal o profesional.';
      render();
      try { actual.citasDia = (await client.listar(periodoCalendario('day', hoy))).citas; }
      catch (errorDia) { actual.errorDia = errorSeguro(errorDia).message; }
    } else actual.errorDia = actual.errorSemana;
  }
  if (vigente()) render();
}

export function renderResumenConectado() {
  const ahora = new Date();
  const hoy = hoyCivil(ahora);
  if (consulta?.hoy !== hoy || consulta.usuario !== usuarioActual) void cargarResumen(hoy);
  const filtros = filtrosResumen(hoy, usuarioActual);
  const fecha = consulta.errorSemana ? hoy : filtros.fecha;
  const citasDia = consulta.citasSemana?.filter((cita) => cita.fechaLocal === fecha) ?? consulta.citasDia;
  const acciones = puedeGestionarAgenda(usuarioActual.rol) ? `<button type="button" class="btn btn-primary" data-resumen-nueva>${renderIcono('plus')}${hayAltaManualPendiente(usuarioActual) ? 'Comprobar envío pendiente' : 'Nueva cita'}</button>` : '';
  return renderResumen({ ...consulta, hoy, fecha, estado: filtros.estado, citasDia, ahora, acciones, nombre: usuarioActual.nombre });
}

export function handleClicResumen(evento) {
  const objetivo = evento.target.closest('[data-resumen-reintentar], [data-resumen-nueva], [data-resumen-cita]');
  if (!objetivo) return false;
  const actualizar = () => cargarResumen(hoyCivil());
  if (objetivo.hasAttribute('data-resumen-reintentar')) { void actualizar(); render(); return true; }
  if (objetivo.hasAttribute('data-resumen-cita')) { void abrirCita(Number(objetivo.dataset.resumenCita), actualizar); return true; }
  const { negocioId } = estadoAplicacion;
  void abrirAltaManual({ day: hoyCivil(), catalogs: { services: listarRegistros('services', negocioId),
    branches: listarRegistros('branches', negocioId), people: listarRegistros('professionals', negocioId) },
    onSaved: actualizar, onCleared: render,
  });
  return true;
}
