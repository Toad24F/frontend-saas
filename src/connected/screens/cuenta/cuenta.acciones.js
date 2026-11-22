import { api, olvidarSesion, cerrarSesion, usuarioActual } from '../../backend.js';
import { validarContrasenaNueva } from '../../modules/autenticacion/contrasena.politica.js';
import { renderCampo as campo, espacioErrorFormulario } from '../../../shared/formularios.componentes.js';
import { abrirDialogo, mostrarAviso } from '../../../shared/interfaz.componentes.js';
import { consultarPublicacionPrecios, actualizarPublicacionPrecios } from './cuenta.vista.js';
import { datosAplicacion } from '../../../shared/aplicacion.datos.js';
import { abrirEditorMarca } from '../../../shared/personalizacion.editor.js';
import { rutaBaseMarca } from '../../../shared/personalizacion.marca.js';
import { abrirEditorAutomatizaciones } from '../../../shared/automatizaciones.editor.js';

// Usa la misma sesión autenticada del panel. El servidor resuelve el negocio desde el actor.
const marcaClient = {
  consultar: () => api(rutaBaseMarca),
  cargar(version, archivo) {
    const cuerpo = new FormData();
    cuerpo.append('version', String(version));
    cuerpo.append('archivo', archivo);
    return api(`${rutaBaseMarca}/logos`, 'POST', cuerpo);
  },
  publicar: (payload) => api(rutaBaseMarca, 'PUT', payload),
  restaurar: (version) => api(`${rutaBaseMarca}/restaurar`, 'POST', { version }),
};

// La API deduce el negocio de la sesión. Solo se envían la versión y los dos plazos del editor.
const rutaAutomatizaciones = '/negocio/automatizaciones';
const automatizacionesClient = {
  consultar: () => api(rutaAutomatizaciones),
  guardar: (payload) => api(rutaAutomatizaciones, 'PUT', payload),
};

// Eventos delegados sobreviven a los renderizados de Mi cuenta.
document.addEventListener('click', (evento) => {
  if (evento.target.closest('[data-precios-reintentar]')) void consultarPublicacionPrecios();
  if (evento.target.closest('[data-configurar-plazos]') && usuarioActual?.rol === 'admin_negocio') {
    abrirEditorAutomatizaciones({ client: automatizacionesClient });
  }
  if (evento.target.closest('[data-cuenta-marca]') && usuarioActual?.rol === 'admin_negocio') {
    const negocio = datosAplicacion.tenants.find(({ id }) => id === usuarioActual.negocioId);
    abrirEditorMarca({ client: marcaClient, slug: negocio?.slug, nombre: negocio?.name ?? usuarioActual.nombreNegocio });
  }
});
document.addEventListener('submit', (evento) => {
  if (evento.target.id !== 'publicacion-precios-formulario') return;
  evento.preventDefault();
  void actualizarPublicacionPrecios(new FormData(evento.target).get('mostrarPreciosPublicos') === 'true');
});

export function cambiarContrasena() {
  const dialogo = abrirDialogo('Cambiar contraseña', `<form id="cuenta-formulario-contrasena"><div class="dialogo-cuerpo"><p class="introduccion-formulario">Después de guardar tendrás que iniciar sesión de nuevo.</p>${campo('Contraseña actual', 'contrasenaActual', '', 'password', 'required autocomplete="current-password"')}${campo('Nueva contraseña', 'contrasenaNueva', '', 'password', 'required minlength="12" autocomplete="new-password"')}${campo('Confirmar nueva contraseña', 'confirmacion', '', 'password', 'required minlength="12" autocomplete="new-password"')}${espacioErrorFormulario}</div><div class="dialogo-pie"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="submit" class="btn btn-primary">Guardar contraseña</button></div></form>`);
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
      const destino = dialogo.querySelector('#error-formulario');
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
  } catch (error) { mostrarAviso(error.message); }
}
