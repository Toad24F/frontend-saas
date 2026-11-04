import { api, loadBackendData, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { TODAY, addDays } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { resourceStatus } from '../../../shared/resource-status.js';
import { escape, modal, toast } from '../../../shared/ui.js';
import { canConsultRetired, readRetiredList, readRetiredDetail, restoreRetired } from '../../modules/recursos/retired.js';
import { readResourceEffects, effectReasons } from '../../modules/recursos/affected.js';
import './retired-view.css';

const names = { profesionales: 'profesionales', recepcionistas: 'recepcionistas',
  servicios: 'servicios', sucursales: 'sucursales' };

// La sección se monta fuera del catálogo operativo. Solo el administrador
// puede solicitar estas rutas, cuyo negocio procede de su sesión en backend.
export function retiredSection(type) {
  if (!canConsultRetired(user?.rol, type)) return '';
  return `<section class="surface business-detail-section" aria-label="Inhabilitados de ${names[type]}">
    <div class="section-heading"><div><h2>Inhabilitados</h2><p>Consulta los ${names[type]} retirados de la operación. Restaurar los devuelve inactivos; activar es otro paso.</p></div></div>
    <button type="button" class="btn btn-light" data-retired-list="${type}">Consultar inhabilitados</button>
    <div data-retired-results="${type}" aria-live="polite"></div></section>`;
}

export async function handleRetiredClick(event) {
  const listButton = event.target.closest('[data-retired-list]');
  const detailButton = event.target.closest('[data-retired-detail]');
  const restoreButton = event.target.closest('[data-retired-restore]');
  const effectsButton = event.target.closest('[data-retired-effects]');
  const type = listButton?.dataset.retiredList || detailButton?.dataset.retiredType ||
    restoreButton?.dataset.retiredType || effectsButton?.dataset.retiredType;
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
          <div class="retired-actions"><button type="button" class="btn btn-light" data-retired-detail="${item.id}" data-retired-type="${type}">Ver detalle de ${escape(item.nombre)}</button>
          ${type === 'recepcionistas' ? '' : `<button type="button" class="btn btn-light" data-retired-effects="${item.id}" data-retired-type="${type}">Revisar citas afectadas de ${escape(item.nombre)}</button>`}
          <button type="button" class="btn btn-primary" data-retired-restore="${item.id}" data-retired-type="${type}">Restaurar ${escape(item.nombre)}</button></div>
          <div class="retired-effects-result" data-retired-effects-result></div></li>`).join('')}</ul>`
        : '<p>No hay recursos inhabilitados en este negocio.</p>';
    } catch (error) { target.innerHTML = `<p role="alert">${escape(error.message)}</p>`; }
    finally { listButton.disabled = false; }
    return true;
  }
  if (restoreButton) {
    const id = Number(restoreButton.dataset.retiredRestore);
    const name = restoreButton.closest('li')?.querySelector('strong')?.textContent || 'Recurso';
    // La confirmación distingue recuperar la fila de conceder acceso. El
    // servidor debe responder activo=false antes de mostrar el resultado.
    const dialog = modal('Restaurar recurso', `<div class="dialog-body"><p><strong>${escape(name)}</strong> volverá al listado habitual como inactivo. Para operar, tendrás que activarlo por separado; se volverán a validar cupos y conflictos.</p>${errorSlot}</div>
      <div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn btn-primary" data-confirm>Restaurar</button></div>`);
    dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
    dialog.querySelector('[data-confirm]').onclick = async (click) => {
      const button = click.currentTarget;
      button.disabled = true;
      try {
        await restoreRetired(type, id, api);
        await loadBackendData();
        dialog.close();
        render();
        toast('Recurso restaurado como inactivo. Actívalo por separado cuando corresponda.');
      } catch (error) {
        const slot = dialog.querySelector('#form-error');
        slot.textContent = error.message;
        slot.hidden = false;
        slot.focus();
      } finally { button.disabled = false; }
    };
    return true;
  }
  if (effectsButton) {
    const id = Number(effectsButton.dataset.retiredEffects);
    const box = effectsButton.closest('li')?.querySelector('[data-retired-effects-result]');
    if (!box) return true;
    effectsButton.disabled = true;
    box.textContent = 'Consultando causas de citas futuras…';
    try {
      const result = await readResourceEffects(type, id, TODAY, addDays(TODAY, 30), api);
      // Se presentan solo causas que el servidor asoció al recurso; consultar
      // no cancela, reprograma ni modifica ninguna cita.
      box.innerHTML = `<p>Las citas no fueron canceladas ni reprogramadas automáticamente. Consulta del ${escape(result.desde)} al ${escape(result.hasta)}.</p>${result.citas.length
        ? `<ul>${result.citas.map((item) => `<li>Cita #${escape(item.citaId)}: ${effectReasons(item).map(escape).join(' · ')}</li>`).join('')}</ul>`
        : '<p>Sin citas afectadas por este recurso en el rango consultado.</p>'}`;
    } catch (error) { box.innerHTML = `<p role="alert">${escape(error.message)}</p>`; }
    finally { effectsButton.disabled = false; }
    return true;
  }
  detailButton.disabled = true;
  try {
    const item = await readRetiredDetail(type, Number(detailButton.dataset.retiredDetail), api);
    // El detalle autorizado confirma la marca; restaurar se ejecuta solo
    // mediante su propio botón y no se confunde con reactivar.
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
