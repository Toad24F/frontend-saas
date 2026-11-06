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
let retiredQuery = '';
let retiredItems = [];
let activeType = '';
let requestVersion = 0;

export function retiredSection(type) {
  return canConsultRetired(user?.rol, type) ? `<button type="button" class="btn btn-light" data-retired-open="${type}">Inhabilitados</button>` : '';
}
function drawer(title, content) {
  const dialog = modal(title, content);
  dialog.classList.add('retired-drawer');
  dialog.onclose = () => document.querySelector(`[data-retired-open="${activeType}"]`)?.focus();
  return dialog;
}
function listRows(type, items) {
  return items.length ? `<ul class="retired-list">${items.map((item) => `<li><span><strong>${escape(item.nombre)}</strong> <span class="professional-status ${resourceStatus(item).className}">${resourceStatus(item).label}</span></span><div class="retired-actions"><button type="button" class="btn btn-light" data-retired-detail="${item.id}" data-retired-type="${type}">Ver detalle de ${escape(item.nombre)}</button>${type === 'recepcionistas' ? '' : `<button type="button" class="btn btn-light" data-retired-effects="${item.id}" data-retired-type="${type}">Revisar citas afectadas de ${escape(item.nombre)}</button>`}<button type="button" class="btn btn-primary" data-retired-restore="${item.id}" data-retired-type="${type}">Restaurar ${escape(item.nombre)}</button></div><div class="retired-effects-result" data-retired-effects-result></div></li>`).join('')}</ul>` : '<p>No hay coincidencias en los inhabilitados.</p>';
}
function filterRows() {
  const target = document.querySelector('[data-retired-results]');
  if (!target) return;
  const query = retiredQuery.trim().toLocaleLowerCase('es');
  target.innerHTML = retiredItems.length ? listRows(activeType, retiredItems.filter((item) => [item.nombre, item.email, item.correo].join(' ').toLocaleLowerCase('es').includes(query))) : '<p>No hay recursos inhabilitados en este negocio.</p>';
}
async function openRetired(type, keepQuery = false) {
  if (!keepQuery) retiredQuery = '';
  activeType = type;
  retiredItems = [];
  const version = ++requestVersion;
  const page = state.page;
  const actor = user.id;
  const dialog = drawer('Inhabilitados de ' + names[type], `<div class="dialog-body"><p>Restaurar devuelve el recurso como inactivo; activar es una acción aparte.</p><label class="retired-search">Buscar inhabilitados<input class="form-control" type="search" value="${escape(retiredQuery)}" data-retired-search></label><div data-retired-results="${type}" aria-live="polite">Consultando inhabilitados…</div></div>`);
  const target = dialog.querySelector('[data-retired-results]');
  try {
    const items = await readRetiredList(type, api);
    if (version !== requestVersion || !dialog.open || state.page !== page || user?.id !== actor) return;
    if (items.some((item) => !Number.isSafeInteger(item?.id) || !item.inhabilitadoEn)) throw Error('La lista de inhabilitados no es válida.');
    retiredItems = items;
    filterRows();
  } catch (error) {
    if (version === requestVersion && dialog.open && target.isConnected) target.innerHTML = `<p role="alert">${escape(error.message)}</p><button type="button" class="btn btn-light" data-retired-open="${type}">Reintentar</button>`;
  }
}
document.addEventListener('input', (event) => {
  if (event.target.matches('[data-retired-search]')) { retiredQuery = event.target.value; filterRows(); }
});
document.addEventListener('click', (event) => {
  const back = event.target.closest('[data-retired-back]');
  if (back && canConsultRetired(user?.rol, activeType) && state.page === activeType) void openRetired(activeType, true);
});

export async function handleRetiredClick(event) {
  const open = event.target.closest('[data-retired-open]');
  if (open) {
    const type = open.dataset.retiredOpen;
    if (canConsultRetired(user?.rol, type) && type === state.page) await openRetired(type);
    return true;
  }
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
  if (restoreButton) {
    const id = Number(restoreButton.dataset.retiredRestore);
    const name = restoreButton.closest('li')?.querySelector('strong')?.textContent || 'Recurso';
    // La confirmación distingue recuperar la fila de conceder acceso. El
    // servidor debe responder activo=false antes de mostrar el resultado.
    const dialog = drawer('Restaurar recurso', `<div class="dialog-body"><p><strong>${escape(name)}</strong> volverá al listado habitual como inactivo. Para operar, tendrás que activarlo por separado; se volverán a validar cupos y conflictos.</p>${errorSlot}</div>
      <div class="dialog-footer"><button type="button" class="btn btn-light" data-retired-back>Volver a inhabilitados</button><button type="button" class="btn btn-primary" data-confirm>Restaurar</button></div>`);

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
  const detailVersion = ++requestVersion;
  const detailDialog = document.querySelector('#app-dialog');
  try {
    const item = await readRetiredDetail(type, Number(detailButton.dataset.retiredDetail), api);
    if (detailVersion !== requestVersion || !detailDialog.open || state.page !== type) return true;
    // El detalle autorizado confirma la marca; restaurar se ejecuta solo
    // mediante su propio botón y no se confunde con reactivar.
    const dialog = drawer('Detalle inhabilitado', `<div class="dialog-body"><p><strong>${escape(item.nombre)}</strong></p>
      <p>Estado: ${resourceStatus(item).label}. Restaurarlo lo dejará inactivo; activar requiere otra acción.</p>
      ${item.email || item.correo ? `<p>Correo: ${escape(item.email || item.correo)}</p>` : ''}
      <p>Inhabilitado: ${escape(new Date(item.inhabilitadoEn).toLocaleDateString('es-MX'))}</p></div>
      <div class="dialog-footer"><button type="button" class="btn btn-light" data-retired-back>Volver a inhabilitados</button></div>`);

  } catch (error) { if (detailVersion === requestVersion && detailDialog.open && state.page === type) drawer('No se pudo consultar el detalle', `<div class="dialog-body"><p role="alert">${escape(error.message)}</p><button type="button" class="btn btn-light" data-retired-back>Volver a inhabilitados</button></div>`); }
  finally { detailButton.disabled = false; }
  return true;
}
