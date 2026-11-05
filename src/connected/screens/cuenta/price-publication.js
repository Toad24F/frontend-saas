import { escape } from '../../../shared/ui.js';

// El estado solo se dibuja cuando hubo una lectura real; un fallo no supone "activado".
export function pricePublicationPanel(state) {
  const heading = '<div class="account-section-heading"><div><h2>Precios en el portal público</h2><p>Esta opción se aplica a todo el catálogo, incluidos los servicios creados después.</p></div></div>';
  if (!state.data) return `<section class="surface account-section account-price-publication">${heading}<p role="${state.error ? 'alert' : 'status'}">${escape(state.error || 'Consultando publicación de precios…')}</p><button type="button" class="btn btn-light" data-price-retry>Reintentar</button></section>`;
  const enabled = state.data.mostrarPreciosPublicos;
  const draft = typeof state.draft === 'boolean' ? state.draft : enabled;
  return `<section class="surface account-section account-price-publication">${heading}<p>Estado vigente: <strong>${enabled ? 'Precios visibles' : 'Precios ocultos'}</strong>.</p><p>El cambio afecta las respuestas públicas futuras; los importes históricos internos de las reservas se conservan.</p><form id="price-publication-form"><label for="price-publication-select">Publicar precios</label><select class="form-select" id="price-publication-select" name="mostrarPreciosPublicos" ${state.busy ? 'disabled' : ''}><option value="true" ${draft ? 'selected' : ''}>Sí, mostrar precios</option><option value="false" ${draft ? '' : 'selected'}>No, ocultar precios</option></select><button type="submit" class="btn btn-primary" ${state.busy ? 'disabled' : ''}>Guardar publicación</button></form>${state.error ? `<p role="alert">${escape(state.error)}</p>` : ''}</section>`;
}
