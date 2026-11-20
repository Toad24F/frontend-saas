import { escaparHtml } from '../../../shared/interfaz.componentes.js';

// El estado solo se dibuja cuando hubo una lectura real; un fallo no supone "activado".
export function renderPublicacionPrecios(estado) {
  const encabezado = '<div class="cuenta-encabezado-seccion"><div><h2>Precios en el portal público</h2><p>Esta opción se aplica a todo el catálogo, incluidos los servicios creados después.</p></div></div>';
  if (!estado.datos) return `<section class="surface cuenta-seccion cuenta-publicacion-precios">${encabezado}<p role="${estado.error ? 'alert' : 'status'}">${escaparHtml(estado.error || 'Consultando publicación de precios…')}</p><button type="button" class="btn btn-light" data-precios-reintentar>Reintentar</button></section>`;
  const habilitado = estado.datos.mostrarPreciosPublicos;
  const borrador = typeof estado.borrador === 'boolean' ? estado.borrador : habilitado;
  return `<section class="surface cuenta-seccion cuenta-publicacion-precios">${encabezado}<p>Estado vigente: <strong>${habilitado ? 'Precios visibles' : 'Precios ocultos'}</strong>.</p><p>El cambio afecta las respuestas públicas futuras; los importes históricos internos de las reservas se conservan.</p><form id="publicacion-precios-formulario"><label for="publicacion-precios-selector">Publicar precios</label><select class="form-select" id="publicacion-precios-selector" name="mostrarPreciosPublicos" ${estado.guardando ? 'disabled' : ''}><option value="true" ${borrador ? 'selected' : ''}>Sí, mostrar precios</option><option value="false" ${borrador ? '' : 'selected'}>No, ocultar precios</option></select><button type="submit" class="btn btn-primary" ${estado.guardando ? 'disabled' : ''}>Guardar publicación</button></form>${estado.error ? `<p role="alert">${escaparHtml(estado.error)}</p>` : ''}</section>`;
}
