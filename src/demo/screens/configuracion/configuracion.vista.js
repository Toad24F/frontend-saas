import { estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { obtenerNegocio } from '../../../shared/aplicacion.datos.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { escaparHtml as escapar, avatar, renderEncabezadoPagina } from '../../../shared/interfaz.componentes.js';
import './configuracion.estilos.css';
import { renderPortalCuenta, vincularPortalCuenta } from '../../../shared/cuenta.portal.js';
import '../../../shared/cuenta.portal.css';
import { abrirMarcaDemo } from './personalizacion.demo.js';
import { abrirEditorAutomatizaciones, renderAccesoAutomatizaciones } from '../../../shared/automatizaciones.editor.js';

const plazosDemo = new Map();

function abrirPlazosDemo(negocioId) {
  // Cada negocio ficticio conserva sus propios valores en memoria durante la sesión de la demo.
  const client = {
    consultar: () => plazosDemo.get(negocioId) ?? { version: 0, plazoConfirmacionHoras: 12, recordatorioHoras: 24 },
    guardar(payload) {
      const siguiente = { ...payload, version: payload.version + 1 };
      plazosDemo.set(negocioId, siguiente);
      return siguiente;
    },
  };
  abrirEditorAutomatizaciones({ client, demo: true });
}

document.addEventListener('click', (evento) => {
  if (evento.target.closest('[data-cuenta-marca]')) abrirMarcaDemo(obtenerNegocio(estadoAplicacion.negocioId));
  if (evento.target.closest('[data-configurar-plazos]')) abrirPlazosDemo(estadoAplicacion.negocioId);
});
export function renderConfiguracionDemo() {
  vincularPortalCuenta(document);
  const negocio = obtenerNegocio(estadoAplicacion.negocioId);
  return `${renderEncabezadoPagina('Configuración', 'Los detalles que hacen de este espacio tu negocio.')}<div class="configuracion-cuadricula"><section class="superficie"><div class="encabezado-seccion"><h2>Información del negocio</h2></div><form id="formulario-negocio-demo" class="configuracion-formulario"><div class="configuracion-identidad">${avatar(negocio.initials, 'menta', 'avatar-grande')}<div><strong>${escapar(negocio.name)}</strong><p>${escapar(negocio.category)}</p></div></div><div class="campo-formulario"><label class="form-label" for="configuracion-nombre">Nombre del negocio</label><input id="configuracion-nombre" name="nombre" class="form-control" value="${escapar(negocio.name)}" required maxlength="150"/></div><div class="formulario-dos-columnas"><div class="campo-formulario"><label class="form-label" for="configuracion-correo">Correo de contacto</label><input id="configuracion-correo" name="correo" class="form-control" type="email" value="${escapar(negocio.email)}" required/></div><div class="campo-formulario"><label class="form-label" for="configuracion-telefono">Teléfono</label><input id="configuracion-telefono" name="telefono" class="form-control" value="${escapar(negocio.phone)}" pattern="[0-9]{10}" required inputmode="numeric"/></div></div><div class="campo-formulario"><label class="form-label" for="configuracion-zona-horaria">Zona horaria</label><input id="configuracion-zona-horaria" class="form-control" value="America/Chihuahua · GMT-6" readonly/></div><button class="btn btn-primary" type="submit">Guardar cambios</button></form></section><div>${renderPortalCuenta({ usuario: { rol: 'admin_negocio', negocioId: negocio.id }, negocio: negocio, origen: location.origin, demo: true, editorMarca: true })}${renderAccesoAutomatizaciones()}<section class="superficie configuracion-demo"><h2>Explorar el prototipo</h2><p>Cambia entre dos negocios ficticios o revisa la pantalla de administración de la plataforma.</p><button class="boton-texto" data-action="cambiar-espacio-trabajo">Cambiar negocio ${renderIcono('arrow')}</button><a class="boton-texto mt-3" href="/admin/plataforma" data-nav="plataforma">Administración de plataforma ${renderIcono('arrow')}</a></section></div></div><div class="nota-informativa">${renderIcono('shield')} Los cambios duran durante esta sesión. El prototipo no incluye autenticación ni garantiza aislamiento de datos; esa validación corresponde al backend.</div>`;
}
