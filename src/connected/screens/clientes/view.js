import { api, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { pageHead, escape as esc, empty } from '../../../shared/ui.js';
import { icon } from '../../../shared/icons.js';
import { canManageAppointments } from '../../modules/agenda/manual-contract.js';
import { createCustomerClient } from '../../modules/clientes/client.js';
import { createAgendaStore } from '../../modules/agenda/store.js';
import { openCustomer, openCustomerEditor } from './panels.js';
import '../../../shared/screens/clientes/style.css';

const client = createCustomerClient(api),
  store = createAgendaStore(client.list);
let identity = '',
  filters = { busqueda: '', pagina: 1 };
const scope = () =>
  user ? `${user.negocioId}:${user.id}:${user.sesionId || ''}` : '';
function reset() {
  store.reset();
  identity = '';
  filters = { busqueda: '', pagina: 1 };
}
window.addEventListener('cita-session-expired', reset);

// Una generación por filtro y una identidad por sesión impiden mostrar respuestas de consultas anteriores.
async function load(force = false) {
  if (!force && store.state.key === JSON.stringify(filters)) return;
  const current = identity;
  if (await store.load({ ...filters })) {
    if (current !== scope() || state.page !== 'clientes') return;
    const input = document.querySelector('#connected-directory-search'),
      focused = input === document.activeElement;
    const draft = input?.value,
      selection = input?.selectionStart;
    render();
    const next = document.querySelector('#connected-directory-search');
    if (next && draft != null) next.value = draft;
    if (focused) {
      next?.focus();
      if (selection != null) next?.setSelectionRange(selection, selection);
    }
  }
}
function pager(data) {
  return `<div class="table-footer directory-pages"><span>${data.clientes.length} fichas en esta página · Página ${data.pagina}</span><div><button class="btn btn-light" data-directory-page="${data.pagina - 1}" ${data.pagina === 1 ? 'disabled' : ''}>Página anterior</button><button class="btn btn-light" data-directory-page="${data.pagina + 1}" ${!data.hayMas ? 'disabled' : ''}>Siguiente página</button></div></div>`;
}
const openButton = (row) =>
  `<button class="text-button" data-directory-open="${row.id}" aria-label="Ver ficha de ${esc(row.nombreCompleto)}">Ver ficha ${icon('chevron')}</button>`;
export function clients() {
  if (!canManageAppointments(user?.rol))
    return empty(
      'Acceso no disponible',
      'Tu cuenta no permite consultar el directorio.',
    );
  if (identity !== scope()) {
    reset();
    identity = scope();
  }
  void load();
  const model = store.state;
  let content = '';
  if (model.busy)
    content =
      '<div class="directory-loading" role="status" aria-label="Cargando clientes"><span class="skeleton-fill"></span><span class="skeleton-fill"></span><p>Consultando clientes…</p></div>';
  else if (model.error)
    content = `<div class="directory-loading" role="alert"><p>${esc(model.error.message)}</p><button class="btn btn-light" data-directory-retry>Reintentar consulta</button></div>`;
  else if (model.data) {
    const rows = model.data.clientes;
    content = rows.length
      ? `<div class="table-responsive directory-table"><table class="table app-table align-middle"><thead><tr><th>Nombre completo</th><th>WhatsApp</th><th>Acciones</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${esc(row.nombreCompleto)}</strong><small class="directory-id">Cliente #${row.id}</small></td><td>${esc(row.telefono)}</td><td>${openButton(row)}</td></tr>`).join('')}</tbody></table></div><div class="directory-cards">${rows.map((row) => `<article><h3>${esc(row.nombreCompleto)}</h3><p>Cliente #${row.id} · ${esc(row.telefono)}</p>${openButton(row)}</article>`).join('')}</div>`
      : empty(
          'Sin clientes',
          filters.busqueda
            ? 'Prueba otro nombre o teléfono.'
            : 'Agrega la primera ficha de tu negocio.',
        );
    content += pager(model.data);
  }
  return `${pageHead('Clientes', 'Conoce a las personas que confían en tu negocio.', '<button class="btn btn-primary" data-directory-new>Nuevo cliente</button>')}<section class="surface client-directory" aria-label="Directorio de clientes"><div class="section-heading"><h2>Tu directorio</h2><form id="connected-directory-filters"><label class="search-field">${icon('search')}<input id="connected-directory-search" name="busqueda" aria-label="Buscar clientes" placeholder="Nombre o teléfono…" type="search" maxlength="150" value="${esc(filters.busqueda)}"></label><button type="submit" class="btn btn-light">Buscar</button></form></div><div aria-busy="${model.busy}" aria-live="polite">${content}</div></section>`;
}
const reloadDirectory = async () => {
  await load(true);
};
document.addEventListener('submit', (event) => {
  if (
    event.target.id !== 'connected-directory-filters' ||
    state.page !== 'clientes' ||
    !canManageAppointments(user?.rol)
  )
    return;
  event.preventDefault();
  filters = {
    busqueda: new FormData(event.target).get('busqueda').trim(),
    pagina: 1,
  };
  void load(true);
  render();
});
document.addEventListener('click', (event) => {
  const target = event.target.closest(
    '[data-directory-new],[data-directory-open],[data-directory-page],[data-directory-retry]',
  );
  if (
    !target ||
    state.page !== 'clientes' ||
    !canManageAppointments(user?.rol) ||
    target.disabled
  )
    return;
  if (target.hasAttribute('data-directory-new')) {
    openCustomerEditor(null, reloadDirectory);
    return;
  }
  if (target.hasAttribute('data-directory-open')) {
    void openCustomer(Number(target.dataset.directoryOpen), reloadDirectory);
    return;
  }
  if (target.hasAttribute('data-directory-page'))
    filters.pagina = Number(target.dataset.directoryPage);
  void load(true);
  render();
});
