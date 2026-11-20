import { isDemo, api, user, etiquetaRol, cerrarSesion, modeUrl } from '../../../connected/backend.js';
import { state, render } from '../../app.js';
import { db, tenantById } from '../../data.js';
import { icon } from '../../icons.js';
import { modal, toast, escape as escapar, avatar } from '../../ui.js';
import { field as campo, basicForm } from '../../forms.js';
import { estadoReportes } from '../../../demo/screens/reportes/reportes.estado.js';
export function cambiarEspacioTrabajo() {
  if (!isDemo) { modal('Tu espacio de trabajo', `<div class="dialog-body"><p>${escapar(user.nombre)} · ${escapar(etiquetaRol(user.rol))}</p><a class="btn btn-light" href="${modeUrl(location.pathname.includes('/cuenta') ? '/admin/agenda' : location.pathname.includes('/negocio/') ? '/admin/plataforma' : location.pathname, true)}">Ver demo para comparar</a><button class="btn btn-light" id="cerrar-sesion-espacio">Cerrar sesión</button></div>`); document.querySelector('#cerrar-sesion-espacio').onclick = async () => { try { await cerrarSesion(); location.reload(); } catch (error) { toast(error.message); } }; return; }
  const dialogo = modal(
    'Cambiar espacio de trabajo',
    `<div class="dialog-body"><p class="mb-4">Explora dos negocios independientes con datos ficticios. Este selector solo existe en el prototipo.</p><div class="opciones-negocio">${db.tenants.map((negocio) => `<button class="opcion-negocio ${negocio.id === state.tenantId ? 'seleccionada' : ''}" data-elegir-negocio="${negocio.id}" ${negocio.suspended ? 'disabled' : ''}>${avatar(negocio.initials, 'mint')}<span><strong>${escapar(negocio.name)}</strong><small>${negocio.suspended ? 'Suspendido' : escapar(negocio.category)}</small></span>${negocio.id === state.tenantId ? icon('check') : icon('chevron')}</button>`).join('')}</div></div>`,
  );
  dialogo.querySelectorAll('[data-elegir-negocio]').forEach(
    (boton) =>
      (boton.onclick = () => {
        state.tenantId = Number(boton.dataset.elegirNegocio);
        state.branch = state.professional = state.status = 'all';
        state.profesionalHorario = null;
        estadoReportes.sucursal = 'todas';
        dialogo.close();
        render();
        toast(`Espacio actual: ${tenantById(state.tenantId).name}`);
      }),
  );
}
export function registrarNegocio() {
  basicForm(
    isDemo ? 'Registrar negocio de ejemplo' : 'Registrar negocio',
    `${campo('Nombre del negocio', 'nombre', '', 'text', 'required maxlength="150"')}${campo('Slug del portal', 'identificador', '', 'text', 'required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="mi-consultorio"')}${campo(isDemo ? 'Correo de contacto' : 'Correo del administrador', 'correo', '', 'email', 'required')}${isDemo ? '' : campo('RFC', 'rfc', '', 'text', 'required maxlength="13"') + campo('Límite de sucursales', 'limite', 1, 'number', 'required min="1" step="1"')}`,
    (formulario) => {
      if (!isDemo) return api('/negocios', 'POST', { nombre: formulario.get('nombre').trim(), identificadorPublico: formulario.get('identificador'), emailAdministrador: formulario.get('correo'), rfc: formulario.get('rfc'), limiteSucursales: Number(formulario.get('limite')) });
      if (db.tenants.some((negocio) => negocio.slug === formulario.get('identificador')))
        throw new Error('Ese enlace ya está asignado a otro negocio.');
      const nombre = formulario.get('nombre').trim();
      if (!nombre) throw new Error('Escribe el nombre del negocio.');
      db.tenants.push({
        id: Math.max(...db.tenants.map((negocio) => negocio.id)) + 1,
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
