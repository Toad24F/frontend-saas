import { esDemo, api, usuarioActual, etiquetaRol, cerrarSesion, urlSegunModo } from '../../../connected/backend.js';
import { estadoAplicacion, render } from '../../aplicacion.nucleo.js';
import { datosAplicacion, obtenerNegocio } from '../../aplicacion.datos.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { abrirDialogo, mostrarAviso, escaparHtml as escapar, avatar } from '../../interfaz.componentes.js';
import { renderCampo as campo, abrirFormulario } from '../../formularios.componentes.js';
import { estadoReportes } from '../../../demo/screens/reportes/reportes.estado.js';
export function cambiarEspacioTrabajo() {
  if (!esDemo) { abrirDialogo('Tu espacio de trabajo', `<div class="dialogo-cuerpo"><p>${escapar(usuarioActual.nombre)} · ${escapar(etiquetaRol(usuarioActual.rol))}</p><a class="btn btn-light" href="${urlSegunModo(location.pathname.includes('/cuenta') ? '/admin/agenda' : location.pathname.includes('/negocio/') ? '/admin/plataforma' : location.pathname, true)}">Ver demo para comparar</a><button class="btn btn-light" id="cerrar-sesion-espacio">Cerrar sesión</button></div>`); document.querySelector('#cerrar-sesion-espacio').onclick = async () => { try { await cerrarSesion(); location.reload(); } catch (error) { mostrarAviso(error.message); } }; return; }
  const dialogo = abrirDialogo(
    'Cambiar espacio de trabajo',
    `<div class="dialogo-cuerpo"><p class="mb-4">Explora dos negocios independientes con datos ficticios. Este selector solo existe en el prototipo.</p><div class="opciones-negocio">${datosAplicacion.tenants.map((negocio) => `<button class="opcion-negocio ${negocio.id === estadoAplicacion.negocioId ? 'seleccionada' : ''}" data-elegir-negocio="${negocio.id}" ${negocio.suspended ? 'disabled' : ''}>${avatar(negocio.initials, 'menta')}<span><strong>${escapar(negocio.name)}</strong><small>${negocio.suspended ? 'Suspendido' : escapar(negocio.category)}</small></span>${negocio.id === estadoAplicacion.negocioId ? renderIcono('check') : renderIcono('chevron')}</button>`).join('')}</div></div>`,
  );
  dialogo.querySelectorAll('[data-elegir-negocio]').forEach(
    (boton) =>
      (boton.onclick = () => {
        estadoAplicacion.negocioId = Number(boton.dataset.elegirNegocio);
        estadoAplicacion.sucursal = estadoAplicacion.profesional = estadoAplicacion.estadoCita = 'all';
        estadoAplicacion.profesionalHorario = null;
        estadoReportes.sucursal = 'todas';
        dialogo.close();
        render();
        mostrarAviso(`Espacio actual: ${obtenerNegocio(estadoAplicacion.negocioId).name}`);
      }),
  );
}
export function registrarNegocio() {
  abrirFormulario(
    esDemo ? 'Registrar negocio de ejemplo' : 'Registrar negocio',
    `${campo('Nombre del negocio', 'nombre', '', 'text', 'required maxlength="150"')}${campo('Slug del portal', 'identificador', '', 'text', 'required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="mi-consultorio"')}${campo(esDemo ? 'Correo de contacto' : 'Correo del administrador', 'correo', '', 'email', 'required')}${esDemo ? '' : campo('RFC', 'rfc', '', 'text', 'required maxlength="13"') + campo('Límite de sucursales', 'limite', 1, 'number', 'required min="1" step="1"')}`,
    (formulario) => {
      if (!esDemo) return api('/negocios', 'POST', { nombre: formulario.get('nombre').trim(), identificadorPublico: formulario.get('identificador'), emailAdministrador: formulario.get('correo'), rfc: formulario.get('rfc'), limiteSucursales: Number(formulario.get('limite')) });
      if (datosAplicacion.tenants.some((negocio) => negocio.slug === formulario.get('identificador')))
        throw new Error('Ese enlace ya está asignado a otro negocio.');
      const nombre = formulario.get('nombre').trim();
      if (!nombre) throw new Error('Escribe el nombre del negocio.');
      datosAplicacion.tenants.push({
        id: Math.max(...datosAplicacion.tenants.map((negocio) => negocio.id)) + 1,
        name: nombre,
        slug: formulario.get('identificador'),
        email: formulario.get('correo'),
        phone: '6145550300',
        category: 'Nuevo negocio',
        initials: nombre
          .split(' ')
          .slice(0, 2)
          .map((parte) => parte[0])
          .join(''),
        mode: 'free',
        horasRecordatorio: 24,
      });
    },
  );
}
