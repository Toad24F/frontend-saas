import { api, cargarDatosBackend, usuarioActual as usuario } from '../../backend.js';
import { estadoAplicacion as estado, render } from '../../../shared/aplicacion.nucleo.js';
import { renderCampo as campo, abrirFormulario, espacioErrorFormulario } from '../../../shared/formularios.componentes.js';
import { abrirDialogo, mostrarAviso, escaparHtml } from '../../../shared/interfaz.componentes.js';
import { datosDetalleNegocio, invalidarDetalleNegocio } from './negocio.vista.js';
import { crearOperacionesLicencia, validarPlazoSuspension } from './licencia.operaciones.js';
import { guardarLimitesUsuarios } from './usuarios.cupo.js';

const operacionesLicencia = () => crearOperacionesLicencia({ api, actorId: usuario.id });

async function ejecutarAccionNegocio(solicitar, mensaje) {
  const resultado = await solicitar();
  invalidarDetalleNegocio();
  try { await cargarDatosBackend(); }
  catch (error) { mostrarAviso('Cambio guardado. No se pudo actualizar el panel: ' + error.message); }
  render();
  mostrarAviso(mensaje);
  return resultado;
}

function confirmarAccionNegocio(titulo, descripcion, etiqueta, solicitar, mensajeExito) {
  const dialogo = abrirDialogo(titulo, `<div class="dialogo-cuerpo"><p>${descripcion}</p>${espacioErrorFormulario}</div><div class="dialogo-pie"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn btn-primary" data-confirm>${etiqueta}</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const botonEnviar = evento.currentTarget;
    botonEnviar.disabled = true;
    try {
      await ejecutarAccionNegocio(solicitar, mensajeExito);
      dialogo.close();
    } catch (error) {
      const destino = dialogo.querySelector('#error-formulario');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally {
      botonEnviar.disabled = false;
    }
  };
}

export function accionNegocio(accion, valor = null) {
  if (usuario?.rol !== 'superadmin') return;
  const id = Number(estado.detalleNegocioId);
  if (!Number.isSafeInteger(id) || id < 1) return;
  const detalle = datosDetalleNegocio();
  if (accion === 'correo') {
    abrirFormulario('Corregir correo de invitación', `<p class="introduccion-formulario">Se invalidará el código anterior y se encolará un nuevo correo si cambias el destinatario.</p>${campo('Nuevo correo del administrador', 'correo', detalle?.negocio.administrador?.email || detalle?.negocio.emailContacto || '', 'email', 'required autocomplete="email"')}`, async (formulario) => {
      await api(`/negocios/${id}/correo-administrador`, 'PATCH', { correo: formulario.get('correo').trim() });
      invalidarDetalleNegocio();
    });
  }
  if (accion === 'limite') {
    abrirFormulario('Cambiar límite de sucursales', campo('Sucursales activas permitidas', 'limiteSucursales', detalle?.cupoSucursales.limiteSucursalesActivas || 1, 'number', 'required min="1" step="1"'), async (formulario) => {
      await api(`/negocios/${id}/limite-sucursales`, 'PATCH', { limiteSucursales: Number(formulario.get('limiteSucursales')) });
      invalidarDetalleNegocio();
    });
  }
  if (accion === 'limites-usuarios' && detalle?.cupoUsuarios) {
    // El diálogo conserva el borrador ante 400/409. Nunca sustituye el cupo
    // leído del servidor por una cuenta calculada desde listas locales.
    abrirFormulario('Cambiar cupos de usuarios', `<p class="introduccion-formulario">El mínimo de cada rol es uno. No puedes reducir un límite por debajo de las cuentas activas.</p>
      ${campo('Límite de profesionales activos', 'profesionales', detalle.cupoUsuarios.profesionales.limite, 'number', 'required min="1" step="1"')}
      ${campo('Límite de recepcionistas activos', 'recepcionistas', detalle.cupoUsuarios.recepcionistas.limite, 'number', 'required min="1" step="1"')}`, async (formulario) => {
      await guardarLimitesUsuarios(id, { profesionales: Number(formulario.get('profesionales')),
        recepcionistas: Number(formulario.get('recepcionistas')) }, api);
      invalidarDetalleNegocio();
    });
  }
  if (accion === 'reemitir') confirmarAccionNegocio('Reemitir código', 'El código anterior dejará de funcionar y se encolará otra invitación. El envío se confirma por separado.', 'Reemitir código', () => api(`/negocios/${id}/reemitir-codigo`, 'POST', {}), 'Invitación encolada.');
  if (accion === 'recuperacion') confirmarAccionNegocio('Autorizar recuperación', 'Se encolará un código de un solo uso para el administrador activado. Los códigos anteriores dejarán de funcionar.', 'Autorizar', async () => {
    const negocio = await api(`/negocios/${id}`);
    if (!negocio.administrador?.id || !negocio.administrador?.activadoEn) throw new Error('El administrador aún no está activado.');
    return api(`/auth/administradores/${negocio.administrador.id}/autorizar-recuperacion`, 'POST', {});
  }, 'Recuperación encolada.');
  if (accion === 'suspender' && detalle?.vigencia?.estado === 'vigente') {
    // Se muestra un borrador; el cuerpo exacto queda congelado al primer POST.
    const dialogo = abrirDialogo('Programar suspensión', `<form id="licencia-formulario-suspension" class="dialogo-cuerpo"><p>El plazo inicia en dos días. Cero bloquea el acceso inmediatamente; el bloqueo programado que responda el servidor será la fecha efectiva.</p><label for="licencia-plazo">Plazo en días</label><input class="form-control" id="licencia-plazo" name="plazoDias" type="number" min="0" max="30" step="1" value="2" required>${espacioErrorFormulario}<div class="dialogo-pie"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="submit" class="btn btn-danger negocio-boton-suspender">Programar suspensión</button></div></form>`);
    dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
    dialogo.querySelector('form').onsubmit = async (evento) => {
      evento.preventDefault();
      const botonEnviar = dialogo.querySelector('[type="submit"]'); botonEnviar.disabled = true;
      try {
        const dias = validarPlazoSuspension(Number(dialogo.querySelector('#licencia-plazo').value));
        await ejecutarAccionNegocio(() => operacionesLicencia().ejecutar('suspender', id, detalle.negocio.licencia.id,
          { plazoDias: dias }), 'Suspensión solicitada. Consulta el historial para comprobar el correo.');
        dialogo.close();
      } catch (error) {
        const destino = dialogo.querySelector('#error-formulario'); destino.textContent = error.message;
        destino.hidden = false; destino.focus();
      } finally { botonEnviar.disabled = false; }
    };
  }
  if (accion === 'reactivar' && ['suspendida', 'suspension_pendiente'].includes(detalle?.vigencia?.estado))
    confirmarAccionNegocio('Reactivar licencia', 'Se reanudará la licencia con el tiempo conservado. Las cuentas desactivadas no se reactivan por esta acción.', 'Reactivar licencia',
      () => operacionesLicencia().ejecutar('reactivar', id, detalle.negocio.licencia.id, {}), 'Licencia reactivada. Consulta el historial para comprobar el correo.');
  if (accion === 'renovar' && detalle?.vigencia && detalle.vigencia.estado !== 'pendiente')
    confirmarAccionNegocio('Renovar licencia', 'Se añadirá un año calendario. Renovar no elimina una suspensión activa; el nuevo estado lo confirma el servidor.', 'Renovar un año',
      () => operacionesLicencia().ejecutar('renovar', id, detalle.negocio.licencia.id, {}), 'Renovación registrada. Consulta el historial para comprobar el correo.');
  if (accion === 'reintentar' && typeof valor === 'string' && /^\d+$/.test(valor)) confirmarAccionNegocio('Reintentar correo', `Se volverá a dejar pendiente el envío ${escaparHtml(valor)} si su código y destinatario siguen vigentes.`, 'Reintentar', () => api(`/negocios/${id}/reintentar-envio`, 'POST', { envioId: valor }), 'Correo encolado para reintento.');
}

export async function reintentarOperacionLicencia() {
  if (usuario?.rol !== 'superadmin') return;
  try { await ejecutarAccionNegocio(() => operacionesLicencia().reintentar(), 'Operación comprobada. Consulta el historial para comprobar el correo.'); }
  catch (error) { mostrarAviso(error.message); }
}
