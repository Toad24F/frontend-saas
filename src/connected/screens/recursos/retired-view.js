import { api, user } from '../../backend.js';
import { state } from '../../../shared/app.js';
import { resourceStatus } from '../../../shared/resource-status.js';
import { escape, modal } from '../../../shared/ui.js';
import { canConsultRetired, readRetiredList, readRetiredDetail } from '../../modules/recursos/retired.js';
import './retired-view.css';

const names = { profesionales: 'profesionales', recepcionistas: 'recepcionistas',
  servicios: 'servicios', sucursales: 'sucursales' };

// La sección se monta fuera del catálogo operativo. Solo el administrador
// puede solicitar estas rutas, cuyo negocio procede de su sesión en backend.
export function retiredSection(type) {
  if (!canConsultRetired(user?.rol, type)) return '';
  return `<section class="surface business-detail-section" aria-label="Inhabilitados de ${names[type]}">
    <div class="section-heading"><div><h2>Inhabilitados</h2><p>Consulta los ${names[type]} retirados de la operación. Restaurar y activar son pasos separados.</p></div></div>
    <button type="button" class="btn btn-light" data-retired-list="${type}">Consultar inhabilitados</button>
    <div data-retired-results="${type}" aria-live="polite"></div></section>`;
}

export async function handleRetiredClick(event) {
  const listButton = event.target.closest('[data-retired-list]');
  const detailButton = event.target.closest('[data-retired-detail]');
  const type = listButton?.dataset.retiredList || detailButton?.dataset.retiredType;
  if (!type) return false;
  if (!canConsultRetired(user?.rol, type) || type !== state.page) return true;
  const target = document.querySelector(`[data-retired-results="${type}"]`);
  if (!target) return true;
  if (listButton) {
    listButton.disabled = true;
    target.textContent = 'Consultando inhabilitados…';
    try {
      const items = await readRetiredList(type, api);
      // El servidor ya filtra por negocio; aquí se evita que una respuesta
      // malformada convierta una fila sin marca en un recurso inhabilitado.
      if (items.some((item) => !Number.isSafeInteger(item?.id) || !item.inhabilitadoEn)) {
        throw new Error('La lista de inhabilitados no es válida.');
      }
      target.innerHTML = items.length ? `<ul class="retired-list">${items.map((item) =>
        `<li><span><strong>${escape(item.nombre)}</strong> <span class="professional-status ${resourceStatus(item).className}"><i></i>${resourceStatus(item).label}</span></span>
          <button type="button" class="btn btn-light" data-retired-detail="${item.id}" data-retired-type="${type}">Ver detalle de ${escape(item.nombre)}</button></li>`).join('')}</ul>`
        : '<p>No hay recursos inhabilitados en este negocio.</p>';
    } catch (error) { target.innerHTML = `<p role="alert">${escape(error.message)}</p>`; }
    finally { listButton.disabled = false; }
    return true;
  }
  detailButton.disabled = true;
  try {
    const item = await readRetiredDetail(type, Number(detailButton.dataset.retiredDetail), api);
    // El detalle autorizado confirma la marca y se presenta como lectura:
    // el comando restaurar pertenece a la siguiente tarea del plan.
    const dialog = modal('Detalle inhabilitado', `<div class="dialog-body"><p><strong>${escape(item.nombre)}</strong></p>
      <p>Estado: ${resourceStatus(item).label}. Restaurarlo lo dejará inactivo; activar requiere otra acción.</p>
      ${item.email || item.correo ? `<p>Correo: ${escape(item.email || item.correo)}</p>` : ''}
      <p>Inhabilitado: ${escape(new Date(item.inhabilitadoEn).toLocaleDateString('es-MX'))}</p></div>
      <div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cerrar</button></div>`);
    dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  } catch (error) { target.innerHTML = `<p role="alert">${escape(error.message)}</p>`; }
  finally { detailButton.disabled = false; }
  return true;
}
