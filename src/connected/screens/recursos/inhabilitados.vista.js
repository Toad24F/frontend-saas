import { api, loadBackendData, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { TODAY, addDays } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { resourceStatus } from '../../../shared/resource-status.js';
import { escape, modal, toast } from '../../../shared/ui.js';
import { puedeConsultarInhabilitados, listarInhabilitados, consultarDetalleInhabilitado, restaurarInhabilitado } from '../../modules/recursos/recursos.inhabilitados.js';
import { consultarCitasAfectadas, motivosAfectacion } from '../../modules/recursos/recursos.afectaciones.js';
import './inhabilitados.estilos.css';

const nombres = { profesionales: 'profesionales', recepcionistas: 'recepcionistas',
  servicios: 'servicios', sucursales: 'sucursales' };

// La sección se monta fuera del catálogo operativo. Solo el administrador
// puede solicitar estas rutas, cuyo negocio procede de su sesión en backend.
let busquedaInhabilitados = '';
let recursosInhabilitados = [];
let tipoActual = '';
let versionConsulta = 0;

export function renderAccesoInhabilitados(tipo) {
  return puedeConsultarInhabilitados(user?.rol, tipo) ? `<button type="button" class="btn btn-light" data-inhabilitados-abrir="${tipo}">Inhabilitados</button>` : '';
}
function abrirPanel(titulo, contenido) {
  const dialogo = modal(titulo, contenido);
  dialogo.classList.add('inhabilitados-panel');
  dialogo.onclose = () => document.querySelector(`[data-inhabilitados-abrir="${tipoActual}"]`)?.focus();
  return dialogo;
}
function renderFilas(tipo, recursos) {
  return recursos.length ? `<ul class="inhabilitados-lista">${recursos.map((recurso) => `<li><span><strong>${escape(recurso.nombre)}</strong> <span class="profesional-estado ${resourceStatus(recurso).className}">${resourceStatus(recurso).label}</span></span><div class="inhabilitados-acciones"><button type="button" class="btn btn-light" data-inhabilitados-detalle="${recurso.id}" data-inhabilitados-tipo="${tipo}">Ver detalle de ${escape(recurso.nombre)}</button>${tipo === 'recepcionistas' ? '' : `<button type="button" class="btn btn-light" data-inhabilitados-afectaciones="${recurso.id}" data-inhabilitados-tipo="${tipo}">Revisar citas afectadas de ${escape(recurso.nombre)}</button>`}<button type="button" class="btn btn-primary" data-inhabilitados-restaurar="${recurso.id}" data-inhabilitados-tipo="${tipo}">Restaurar ${escape(recurso.nombre)}</button></div><div class="inhabilitados-resultado-afectaciones" data-inhabilitados-resultado-afectaciones></div></li>`).join('')}</ul>` : '<p>No hay coincidencias en los inhabilitados.</p>';
}
function filtrarFilas() {
  const destino = document.querySelector('[data-inhabilitados-resultados]');
  if (!destino) return;
  const busqueda = busquedaInhabilitados.trim().toLocaleLowerCase('es');
  destino.innerHTML = recursosInhabilitados.length ? renderFilas(tipoActual, recursosInhabilitados.filter((recurso) => [recurso.nombre, recurso.email, recurso.correo].join(' ').toLocaleLowerCase('es').includes(busqueda))) : '<p>No hay recursos inhabilitados en este negocio.</p>';
}
async function abrirInhabilitados(tipo, conservarBusqueda = false) {
  if (!conservarBusqueda) busquedaInhabilitados = '';
  tipoActual = tipo;
  recursosInhabilitados = [];
  const version = ++versionConsulta;
  const pagina = state.page;
  const actor = user.id;
  const dialogo = abrirPanel('Inhabilitados de ' + nombres[tipo], `<div class="dialog-body"><p>Restaurar devuelve el recurso como inactivo; activar es una acción aparte.</p><label class="inhabilitados-busqueda">Buscar inhabilitados<input class="form-control" type="search" value="${escape(busquedaInhabilitados)}" data-inhabilitados-busqueda></label><div data-inhabilitados-resultados="${tipo}" aria-live="polite">Consultando inhabilitados…</div></div>`);
  const destino = dialogo.querySelector('[data-inhabilitados-resultados]');
  try {
    const recursos = await listarInhabilitados(tipo, api);
    if (version !== versionConsulta || !dialogo.open || state.page !== pagina || user?.id !== actor) return;
    if (recursos.some((recurso) => !Number.isSafeInteger(recurso?.id) || !recurso.inhabilitadoEn)) throw Error('La lista de inhabilitados no es válida.');
    recursosInhabilitados = recursos;
    filtrarFilas();
  } catch (error) {
    if (version === versionConsulta && dialogo.open && destino.isConnected) destino.innerHTML = `<p role="alert">${escape(error.message)}</p><button type="button" class="btn btn-light" data-inhabilitados-abrir="${tipo}">Reintentar</button>`;
  }
}
document.addEventListener('input', (evento) => {
  if (evento.target.matches('[data-inhabilitados-busqueda]')) { busquedaInhabilitados = evento.target.value; filtrarFilas(); }
});
document.addEventListener('click', (evento) => {
  const volver = evento.target.closest('[data-inhabilitados-volver]');
  if (volver && puedeConsultarInhabilitados(user?.rol, tipoActual) && state.page === tipoActual) void abrirInhabilitados(tipoActual, true);
});

export async function handleClicInhabilitados(evento) {
  const abrir = evento.target.closest('[data-inhabilitados-abrir]');
  if (abrir) {
    const tipo = abrir.dataset.inhabilitadosAbrir;
    if (puedeConsultarInhabilitados(user?.rol, tipo) && tipo === state.page) await abrirInhabilitados(tipo);
    return true;
  }
  const botonLista = evento.target.closest('[data-inhabilitados-lista]');
  const botonDetalle = evento.target.closest('[data-inhabilitados-detalle]');
  const botonRestaurar = evento.target.closest('[data-inhabilitados-restaurar]');
  const botonAfectaciones = evento.target.closest('[data-inhabilitados-afectaciones]');
  const tipo = botonLista?.dataset.inhabilitadosLista || botonDetalle?.dataset.inhabilitadosTipo ||
    botonRestaurar?.dataset.inhabilitadosTipo || botonAfectaciones?.dataset.inhabilitadosTipo;
  if (!tipo) return false;
  if (!puedeConsultarInhabilitados(user?.rol, tipo) || tipo !== state.page) return true;
  const destino = document.querySelector(`[data-inhabilitados-resultados="${tipo}"]`);
  if (!destino) return true;
  if (botonRestaurar) {
    const id = Number(botonRestaurar.dataset.inhabilitadosRestaurar);
    const nombre = botonRestaurar.closest('li')?.querySelector('strong')?.textContent || 'Recurso';
    // La confirmación distingue recuperar la fila de conceder acceso. El
    // servidor debe responder activo=false antes de mostrar el resultado.
    const dialogo = abrirPanel('Restaurar recurso', `<div class="dialog-body"><p><strong>${escape(nombre)}</strong> volverá al listado habitual como inactivo. Para operar, tendrás que activarlo por separado; se volverán a validar cupos y conflictos.</p>${errorSlot}</div>
      <div class="dialog-footer"><button type="button" class="btn btn-light" data-inhabilitados-volver>Volver a inhabilitados</button><button type="button" class="btn btn-primary" data-confirm>Restaurar</button></div>`);

    dialogo.querySelector('[data-confirm]').onclick = async (clic) => {
      const boton = clic.currentTarget;
      boton.disabled = true;
      try {
        await restaurarInhabilitado(tipo, id, api);
        await loadBackendData();
        dialogo.close();
        render();
        toast('Recurso restaurado como inactivo. Actívalo por separado cuando corresponda.');
      } catch (error) {
        const aviso = dialogo.querySelector('#form-error');
        aviso.textContent = error.message;
        aviso.hidden = false;
        aviso.focus();
      } finally { boton.disabled = false; }
    };
    return true;
  }
  if (botonAfectaciones) {
    const id = Number(botonAfectaciones.dataset.inhabilitadosAfectaciones);
    const contenedor = botonAfectaciones.closest('li')?.querySelector('[data-inhabilitados-resultado-afectaciones]');
    if (!contenedor) return true;
    botonAfectaciones.disabled = true;
    contenedor.textContent = 'Consultando causas de citas futuras…';
    try {
      const resultado = await consultarCitasAfectadas(tipo, id, TODAY, addDays(TODAY, 30), api);
      // Se presentan solo causas que el servidor asoció al recurso; consultar
      // no cancela, reprograma ni modifica ninguna cita.
      contenedor.innerHTML = `<p>Las citas no fueron canceladas ni reprogramadas automáticamente. Consulta del ${escape(resultado.desde)} al ${escape(resultado.hasta)}.</p>${resultado.citas.length
        ? `<ul>${resultado.citas.map((cita) => `<li>Cita #${escape(cita.citaId)}: ${motivosAfectacion(cita).map(escape).join(' · ')}</li>`).join('')}</ul>`
        : '<p>Sin citas afectadas por este recurso en el rango consultado.</p>'}`;
    } catch (error) { contenedor.innerHTML = `<p role="alert">${escape(error.message)}</p>`; }
    finally { botonAfectaciones.disabled = false; }
    return true;
  }
  botonDetalle.disabled = true;
  const versionDetalle = ++versionConsulta;
  const dialogoDetalle = document.querySelector('#app-dialog');
  try {
    const recurso = await consultarDetalleInhabilitado(tipo, Number(botonDetalle.dataset.inhabilitadosDetalle), api);
    if (versionDetalle !== versionConsulta || !dialogoDetalle.open || state.page !== tipo) return true;
    // El detalle autorizado confirma la marca; restaurar se ejecuta solo
    // mediante su propio botón y no se confunde con reactivar.
    const dialogo = abrirPanel('Detalle inhabilitado', `<div class="dialog-body"><p><strong>${escape(recurso.nombre)}</strong></p>
      <p>Estado: ${resourceStatus(recurso).label}. Restaurarlo lo dejará inactivo; activar requiere otra acción.</p>
      ${recurso.email || recurso.correo ? `<p>Correo: ${escape(recurso.email || recurso.correo)}</p>` : ''}
      <p>Inhabilitado: ${escape(new Date(recurso.inhabilitadoEn).toLocaleDateString('es-MX'))}</p></div>
      <div class="dialog-footer"><button type="button" class="btn btn-light" data-inhabilitados-volver>Volver a inhabilitados</button></div>`);

  } catch (error) { if (versionDetalle === versionConsulta && dialogoDetalle.open && state.page === tipo) abrirPanel('No se pudo consultar el detalle', `<div class="dialog-body"><p role="alert">${escape(error.message)}</p><button type="button" class="btn btn-light" data-inhabilitados-volver>Volver a inhabilitados</button></div>`); }
  finally { botonDetalle.disabled = false; }
  return true;
}
