import { user, roleLabel } from '../../backend.js';
import { icon } from '../../../shared/icons.js';
import { escape, pageHead } from '../../../shared/ui.js';

export function account() {
  return `${pageHead('Mi cuenta', 'Consulta los datos de tu acceso a la plataforma.')}<section class="surface"><div class="section-heading"><h2>Datos de acceso</h2><span class="soft-tag">${escape(roleLabel(user.rol))}</span></div><div class="dialog-body"><div class="form-field"><span class="form-label">Nombre</span><p>${escape(user.nombre)}</p></div><div class="form-field"><span class="form-label">Correo</span><p>${escape(user.email)}</p></div><button type="button" class="btn btn-light" data-action="switch-tenant">${icon('down')}Opciones de sesión</button></div></section>`;
}
