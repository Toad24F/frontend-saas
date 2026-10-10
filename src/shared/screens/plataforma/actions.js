import { isDemo, api, user, roleLabel, logout, modeUrl } from '../../../connected/backend.js';
import { state, render } from '../../app.js';
import { db, tenantById } from '../../data.js';
import { icon } from '../../icons.js';
import { modal, toast, escape as esc, avatar } from '../../ui.js';
import { field, basicForm } from '../../forms.js';
import { reportState } from '../../../demo/screens/reportes/state.js';
export function switchTenant() {
  if (!isDemo) { modal('Tu espacio de trabajo', `<div class="dialog-body"><p>${esc(user.nombre)} · ${esc(roleLabel(user.rol))}</p><a class="btn btn-light" href="${modeUrl(location.pathname.includes('/cuenta') ? '/admin/agenda' : location.pathname.includes('/negocio/') ? '/admin/plataforma' : location.pathname, true)}">Ver demo para comparar</a><button class="btn btn-light" id="logout-session">Cerrar sesión</button></div>`); document.querySelector('#logout-session').onclick = async () => { try { await logout(); location.reload(); } catch (error) { toast(error.message); } }; return; }
  const el = modal(
    'Cambiar espacio de trabajo',
    `<div class="dialog-body"><p class="mb-4">Explora dos negocios independientes con datos ficticios. Este selector solo existe en el prototipo.</p><div class="tenant-options">${db.tenants.map((t) => `<button class="tenant-option ${t.id === state.tenantId ? 'selected' : ''}" data-choose-tenant="${t.id}" ${t.suspended ? 'disabled' : ''}>${avatar(t.initials, 'mint')}<span><strong>${esc(t.name)}</strong><small>${t.suspended ? 'Suspendido' : esc(t.category)}</small></span>${t.id === state.tenantId ? icon('check') : icon('chevron')}</button>`).join('')}</div></div>`,
  );
  el.querySelectorAll('[data-choose-tenant]').forEach(
    (btn) =>
      (btn.onclick = () => {
        state.tenantId = Number(btn.dataset.chooseTenant);
        state.branch = state.professional = state.status = 'all';
        state.scheduleProfessional = null;
        reportState.branch = 'all';
        el.close();
        render();
        toast(`Espacio actual: ${tenantById(state.tenantId).name}`);
      }),
  );
}
export function newTenant() {
  basicForm(
    isDemo ? 'Registrar negocio de ejemplo' : 'Registrar negocio',
    `${field('Nombre del negocio', 'name', '', 'text', 'required maxlength="150"')}${field('Slug del portal', 'slug', '', 'text', 'required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="mi-consultorio"')}${field(isDemo ? 'Correo de contacto' : 'Correo del administrador', 'email', '', 'email', 'required')}${isDemo ? '' : field('RFC', 'rfc', '', 'text', 'required maxlength="13"') + field('Límite de sucursales', 'limit', 1, 'number', 'required min="1" step="1"')}`,
    (f) => {
      if (!isDemo) return api('/negocios', 'POST', { nombre: f.get('name').trim(), identificadorPublico: f.get('slug'), emailAdministrador: f.get('email'), rfc: f.get('rfc'), limiteSucursales: Number(f.get('limit')) });
      if (db.tenants.some((t) => t.slug === f.get('slug')))
        throw new Error('Ese enlace ya está asignado a otro negocio.');
      const name = f.get('name').trim();
      if (!name) throw new Error('Escribe el nombre del negocio.');
      db.tenants.push({
        id: Math.max(...db.tenants.map((t) => t.id)) + 1,
        name,
        slug: f.get('slug'),
        email: f.get('email'),
        phone: '6145550300',
        category: 'Nuevo negocio',
        initials: name
          .split(' ')
          .slice(0, 2)
          .map((x) => x[0])
          .join(''),
        mode: 'free',
        reminder: 24,
      });
    },
  );
}
