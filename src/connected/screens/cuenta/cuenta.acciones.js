import { api, olvidarSesion, cerrarSesion } from '../../backend.js';
import { validarContrasenaNueva } from '../../modules/autenticacion/contrasena.politica.js';
import { field as campo, errorSlot } from '../../../shared/forms.js';
import { modal, toast } from '../../../shared/ui.js';
import { consultarPublicacionPrecios, actualizarPublicacionPrecios } from './cuenta.vista.js';

// Eventos delegados sobreviven a los renderizados de Mi cuenta.
document.addEventListener('click', (evento) => {
  if (evento.target.closest('[data-precios-reintentar]')) void consultarPublicacionPrecios();
});
document.addEventListener('submit', (evento) => {
  if (evento.target.id !== 'publicacion-precios-formulario') return;
  evento.preventDefault();
  void actualizarPublicacionPrecios(new FormData(evento.target).get('mostrarPreciosPublicos') === 'true');
});

export function cambiarContrasena() {
  const dialogo = modal('Cambiar contraseña', `<form id="cuenta-formulario-contrasena"><div class="dialog-body"><p class="form-intro">Después de guardar tendrás que iniciar sesión de nuevo.</p>${campo('Contraseña actual', 'contrasenaActual', '', 'password', 'required autocomplete="current-password"')}${campo('Nueva contraseña', 'contrasenaNueva', '', 'password', 'required minlength="12" autocomplete="new-password"')}${campo('Confirmar nueva contraseña', 'confirmacion', '', 'password', 'required minlength="12" autocomplete="new-password"')}${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="submit" class="btn btn-primary">Guardar contraseña</button></div></form>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('form').onsubmit = async (evento) => {
    evento.preventDefault();
    const botonEnviar = evento.currentTarget.querySelector('[type="submit"]');
    botonEnviar.disabled = true;
    try {
      const formulario = new FormData(evento.currentTarget);
      const contrasenaNueva = formulario.get('contrasenaNueva');
      validarContrasenaNueva(contrasenaNueva, formulario.get('confirmacion'));
      await api('/auth/cambiar-contrasena', 'POST', { passwordActual: formulario.get('contrasenaActual'), nuevaPassword: contrasenaNueva });
      olvidarSesion();
      dialogo.close();
      location.reload();
    } catch (error) {
      const destino = dialogo.querySelector('#form-error');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally { botonEnviar.disabled = false; }
  };
}

export async function cerrarSesionCuenta() {
  try {
    await cerrarSesion();
    location.reload();
  } catch (error) { toast(error.message); }
}
