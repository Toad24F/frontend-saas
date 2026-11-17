import { api, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { pageHead, escape as esc, empty } from '../../../shared/ui.js';
import { icon } from '../../../shared/icons.js';
import { canManageAppointments } from '../../modules/agenda/manual-contract.js';
import { crearClientesClient } from '../../modules/clientes/clientes.client.js';
import { createAgendaStore } from '../../modules/agenda/store.js';
import { abrirFichaCliente, abrirEditorCliente } from './clientes.paneles.js';
import '../../../shared/screens/clientes/clientes.estilos.css';
import { privateError } from '../../modules/agenda/errors.js';

const clientesClient = crearClientesClient(api),
  directorioStore = createAgendaStore(clientesClient.listar);
let identidad = '',
  filtros = { busqueda: '', pagina: 1 };
let direccionFocoPendiente = null;
const identidadSesion = () =>
  user ? `${user.negocioId}:${user.id}:${user.sesionId || ''}` : '';
function reiniciar() {
  directorioStore.reset();
  identidad = '';
  filtros = { busqueda: '', pagina: 1 };
}
window.addEventListener('cita-session-expired', reiniciar);

// Una generación por filtro y una identidad por sesión impiden mostrar respuestas de consultas anteriores.
async function cargarDirectorio(forzar = false) {
  if (!forzar && directorioStore.state.key === JSON.stringify(filtros)) return;
  const identidadConsulta = identidad;
  if (await directorioStore.load({ ...filtros })) {
    if (identidadConsulta !== identidadSesion() || state.page !== 'clientes') return;
    const entrada = document.querySelector('#busqueda-directorio-conectado'),
      teniaFoco = entrada === document.activeElement;
    const textoIngresado = entrada?.value,
      cursor = entrada?.selectionStart;
    const direccionFoco = document.activeElement === document.body ? direccionFocoPendiente : null;
    direccionFocoPendiente = null;
    render();
    const entradaNueva = document.querySelector('#busqueda-directorio-conectado');
    if (entradaNueva && textoIngresado != null) entradaNueva.value = textoIngresado;
    if (teniaFoco) {
      entradaNueva?.focus();
      if (cursor != null) entradaNueva?.setSelectionRange(cursor, cursor);
    }
    // Los controles de página se reconstruyen tras la consulta: conservar la dirección usada con teclado.
    if (direccionFoco && !document.querySelector('#app-dialog')?.open) {
      const boton = document.querySelector(`[data-directorio-pagina="${filtros.pagina + direccionFoco}"]:not(:disabled)`);
      const destinoAlternativo = document.querySelector('.directorio-paginacion button:not(:disabled), #busqueda-directorio-conectado');
      (boton || destinoAlternativo)?.focus();
    }
  }
}
function renderPaginador(datos) {
  return `<div class="table-footer directorio-paginacion"><span>${datos.clientes.length} fichas en esta página · Página ${datos.pagina}</span><div><button class="btn btn-light" data-directorio-pagina="${datos.pagina - 1}" ${datos.pagina === 1 ? 'disabled' : ''}>Página anterior</button><button class="btn btn-light" data-directorio-pagina="${datos.pagina + 1}" ${!datos.hayMas ? 'disabled' : ''}>Siguiente página</button></div></div>`;
}
const renderBotonFicha = (ficha) =>
  `<button class="text-button" data-directorio-abrir="${ficha.id}" aria-label="Ver ficha de ${esc(ficha.nombreCompleto)}">Ver ficha ${icon('chevron')}</button>`;
export function clientes() {
  if (!canManageAppointments(user?.rol))
    return empty(
      'Acceso no disponible',
      'Tu cuenta no permite consultar el directorio.',
    );
  if (identidad !== identidadSesion()) {
    reiniciar();
    identidad = identidadSesion();
  }
  void cargarDirectorio();
  const modelo = directorioStore.state;
  let contenido = '';
  if (modelo.busy)
    contenido =
      '<div class="directorio-carga" role="status" aria-label="Cargando clientes"><span class="skeleton-fill"></span><span class="skeleton-fill"></span><p>Consultando clientes…</p></div>';
  else if (modelo.error) {
    const informacion = privateError(modelo.error);
    contenido = `<div class="directorio-carga" role="alert"><strong>${informacion.title}</strong><p>${esc(informacion.message)}</p>${informacion.retry ? '<button class="btn btn-light" data-directorio-reintentar>Reintentar consulta</button>' : ''}</div>`;
  }
  else if (modelo.data) {
    const fichas = modelo.data.clientes;
    contenido = fichas.length
      ? `<div class="table-responsive directorio-tabla"><table class="table app-table align-middle"><thead><tr><th>Nombre completo</th><th>WhatsApp</th><th>Acciones</th></tr></thead><tbody>${fichas.map((ficha) => `<tr><td><strong>${esc(ficha.nombreCompleto)}</strong><small class="directorio-identificador">Cliente #${ficha.id}</small></td><td>${esc(ficha.telefono)}</td><td>${renderBotonFicha(ficha)}</td></tr>`).join('')}</tbody></table></div><div class="directorio-tarjetas">${fichas.map((ficha) => `<article><h3>${esc(ficha.nombreCompleto)}</h3><p>Cliente #${ficha.id} · ${esc(ficha.telefono)}</p>${renderBotonFicha(ficha)}</article>`).join('')}</div>`
      : empty(
          'Sin clientes',
          filtros.busqueda
            ? 'Prueba otro nombre o teléfono.'
            : 'Agrega la primera ficha de tu negocio.',
        );
    contenido += renderPaginador(modelo.data);
  }
  return `${pageHead('Clientes', 'Conoce a las personas que confían en tu negocio.', '<button class="btn btn-primary" data-directorio-nuevo>Nuevo cliente</button>')}<section class="surface directorio-clientes" aria-label="Directorio de clientes"><div class="section-heading"><h2>Tu directorio</h2><form id="filtros-directorio-conectado"><label class="search-field">${icon('search')}<input id="busqueda-directorio-conectado" name="busqueda" aria-label="Buscar clientes" placeholder="Nombre o teléfono…" type="search" maxlength="150" value="${esc(filtros.busqueda)}"></label><button type="submit" class="btn btn-light">Buscar</button></form></div><div aria-busy="${modelo.busy}" aria-live="polite">${contenido}</div></section>`;
}
const recargarDirectorio = async () => {
  await cargarDirectorio(true);
};
document.addEventListener('submit', (evento) => {
  if (
    evento.target.id !== 'filtros-directorio-conectado' ||
    state.page !== 'clientes' ||
    !canManageAppointments(user?.rol)
  )
    return;
  evento.preventDefault();
  const busquedaConFoco = document.activeElement?.id === 'busqueda-directorio-conectado';
  filtros = {
    busqueda: new FormData(evento.target).get('busqueda').trim(),
    pagina: 1,
  };
  void cargarDirectorio(true);
  render();
  if (busquedaConFoco) document.querySelector('#busqueda-directorio-conectado')?.focus();
});
document.addEventListener('click', (evento) => {
  const control = evento.target.closest(
    '[data-directorio-nuevo],[data-directorio-abrir],[data-directorio-pagina],[data-directorio-reintentar]',
  );
  if (
    !control ||
    state.page !== 'clientes' ||
    !canManageAppointments(user?.rol) ||
    control.disabled
  )
    return;
  if (control.hasAttribute('data-directorio-nuevo')) {
    abrirEditorCliente(null, recargarDirectorio);
    return;
  }
  if (control.hasAttribute('data-directorio-abrir')) {
    void abrirFichaCliente(Number(control.dataset.directorioAbrir), recargarDirectorio);
    return;
  }
  if (control.hasAttribute('data-directorio-pagina')) {
    direccionFocoPendiente = Number(control.dataset.directorioPagina) > filtros.pagina ? 1 : -1;
    filtros.pagina = Number(control.dataset.directorioPagina);
  }
  void cargarDirectorio(true);
  render();
});
