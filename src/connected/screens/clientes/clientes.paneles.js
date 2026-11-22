import { api, usuarioActual } from '../../backend.js';
import { escaparHtml as esc } from '../../../shared/interfaz.componentes.js';
import { renderCampo } from '../../../shared/formularios.componentes.js';
import {
  panelAgenda,
  borradorAgenda,
  guardarBorradorAgenda,
  borrarBorradorAgenda,
} from '../../../shared/screens/agenda/agenda.paneles.js';
import {
  crearClientesClient,
  crearPayloadCliente,
} from '../../modules/clientes/clientes.client.js';
import { crearMutacionVersionada } from '../../modules/agenda/agenda.mutacion-versionada.js';
import { puedeGestionarCitas } from '../../modules/agenda/agenda.contrato-manual.js';
import { observarRegistro } from '../agenda/agenda.actualizacion-viva.js';
import { errorSeguro } from '../../modules/agenda/agenda.errores.js';
import { crearIntentoUnion, leerUnionPendiente, reconocerCoincidencia, validarResultadoUnion } from '../../modules/clientes/clientes.union.js';
import '../../../shared/screens/agenda/agenda.refinamientos.css';
import '../agenda/agenda.estilos.css';

const clientesClient = crearClientesClient(api);
let generacion = 0,
  destinoFoco;
const identidadSesion = () =>
  usuarioActual ? `${usuarioActual.negocioId}:${usuarioActual.id}:${usuarioActual.sesionId || ''}` : '';
const valorHistorico = (valor) =>
  valor == null ? 'Sin registro histórico' : String(valor);
const nombreComparable = (valor) => valor.normalize('NFC').toLowerCase().normalize('NFC').replace(/[\p{White_Space}\uFEFF]+/gu, ' ').trim();
window.addEventListener('cita-sesion-expirada', () => {
  generacion++;
  destinoFoco = null;
});

// Reemplazar detalle por editor usa el mismo panel nativo; el foco final vuelve a la ficha del directorio.
function abrirPanelCliente(titulo, contenido) {
  const anterior = document.querySelector('#dialogo-app');
  if (!anterior?.open) destinoFoco = document.activeElement;
  const dialogo = panelAgenda(titulo, contenido, true);
  dialogo.classList.add('agenda-dialogo-cita');
  const id = destinoFoco?.dataset.directorioAbrir;
  dialogo.onclose = () => {
    generacion++;
    const destino = id
      ? [...document.querySelectorAll('[data-directorio-abrir]')].find(
          (elemento) => elemento.dataset.directorioAbrir === id && elemento.offsetParent,
        )
      : document.querySelector('[data-directorio-nuevo]');
    (destinoFoco?.isConnected ? destinoFoco : destino || document.querySelector('[data-directorio-nuevo]'))?.focus();
  };
  const encabezado = dialogo.querySelector('h2');
  encabezado.tabIndex = -1;
  encabezado.focus();
  return dialogo;
}
const renderError = (error) => { const informacion = errorSeguro(error); return `<div role="alert"><strong>${informacion.title}</strong><p>${esc(informacion.message)}</p></div>${informacion.retry ? '<button class="btn btn-light" data-ficha-reintentar>Reintentar consulta</button>' : ''}`; };
function renderPaginacion(pagina, hayMas) {
  return `<div class="agenda-paginas-historial"><button class="btn btn-light" data-historial-cliente-anterior ${pagina === 1 ? 'disabled' : ''}>Página anterior</button><span>Página ${pagina}</span><button class="btn btn-light" data-historial-cliente-siguiente ${!hayMas ? 'disabled' : ''}>Siguiente página</button></div>`;
}
export async function abrirFichaCliente(id, alCambiar) {
  if (!puedeGestionarCitas(usuarioActual?.rol)) return;
  const revisionPanel = ++generacion,
    identidad = identidadSesion();
  const dialogo = abrirPanelCliente(
    'Ficha del cliente',
    '<div class="dialogo-cuerpo"><p role="status">Consultando ficha…</p></div>',
  );
  const vigente = () =>
    dialogo.open && revisionPanel === generacion && identidad === identidadSesion();
  try {
    const ficha = await clientesClient.consultar(id);
    if (!vigente()) return;
    dialogo.querySelector('.dialogo-cuerpo').innerHTML =
      `<dl class="agenda-campos-detalle"><div><dt>Nombre completo</dt><dd>${esc(ficha.nombreCompleto)}</dd></div><div><dt>Teléfono</dt><dd>${esc(ficha.telefono)}</dd></div><div><dt>Cliente</dt><dd>#${ficha.id}</dd></div><div><dt>Versión</dt><dd>${ficha.version}</dd></div></dl><button class="btn btn-primary" data-ficha-corregir>Corregir ficha</button> <button class="btn btn-light" data-ficha-coincidencias>Revisar coincidencias</button><div data-ficha-coincidencias-resultado aria-live="polite"></div><section class="historial-cliente" aria-label="Historial del cliente"><h3>Historial de citas</h3><p class="ayuda-campo">Los contactos y costos de cada cita conservan su registro histórico, aunque se corrija esta ficha.</p><div data-ficha-historial></div></section>`;
    dialogo.querySelector('[data-ficha-corregir]').onclick = () =>
      abrirEditorCliente(ficha, alCambiar);
    dialogo.querySelector('[data-ficha-coincidencias]').onclick = async () => {
      const contenedor = dialogo.querySelector('[data-ficha-coincidencias-resultado]');
      contenedor.innerHTML = '<p role="status">Revisando fichas activas…</p>';
      try {
        // El directorio paginado ya aplica permiso y negocio; se recorren todas las páginas
        // porque una búsqueda textual podría omitir espacios distintos en grupos heredados.
        const candidatas = new Map();
        for (let pagina = 1; ; pagina++) {
          const resultado = await clientesClient.listar({ pagina, limite: 100 });
          if (!vigente()) return;
          for (const candidata of resultado.clientes)
            if (candidata.id !== ficha.id && candidata.telefono === ficha.telefono &&
              nombreComparable(candidata.nombreCompleto) === nombreComparable(ficha.nombreCompleto))
              candidatas.set(candidata.id, candidata);
          if (!resultado.hayMas) break;
        }
        contenedor.innerHTML = candidatas.size
          ? `<p>Elige expresamente la ficha que conservará sus datos. Las citas de esta ficha pasarán a ella sin cambiar sus contactos históricos.</p>${[...candidatas.values()].map((candidata) => `<button type="button" class="btn btn-light" data-elegir-coincidencia="${candidata.id}">Elegir ficha #${candidata.id}: ${esc(candidata.nombreCompleto)}</button>`).join(' ')}`
          : '<p>No hay otras fichas activas con el mismo nombre y teléfono normalizados.</p>';
        for (const candidata of candidatas.values())
          contenedor.querySelector(`[data-elegir-coincidencia="${candidata.id}"]`).onclick = () =>
            abrirEditorCliente(ficha, alCambiar, candidata);
      } catch (error) {
        if (vigente()) contenedor.innerHTML = renderError(error);
      }
    };
    let generacionHistorial = 0;
    async function cargarHistorial(pagina = 1) {
      const consulta = ++generacionHistorial,
        destino = dialogo.querySelector('[data-ficha-historial]');
      destino.innerHTML = '<p role="status">Consultando historial…</p>';
      try {
        const resultado = await clientesClient.consultarHistorial(id, pagina);
        if (!vigente() || consulta !== generacionHistorial) return;
        // Cada línea procede del snapshot de esa cita. No se deduce el contacto a partir de la ficha actual.
        destino.innerHTML = resultado.citas.length
          ? `<ol>${resultado.citas
              .map(
                (cita) =>
                  `<li><strong>${esc(valorHistorico(cita.folio))}</strong><p>${esc(cita.fechaLocal || cita.inicioUtc)} · ${esc(cita.horaInicio || '')} · ${esc(cita.zonaHoraria)}</p><dl class="agenda-campos-detalle">${[
                    ['Contacto histórico', cita.nombreContacto],
                    ['Teléfono histórico', cita.telefonoContacto],
                    ['Servicio', cita.nombreServicio],
                    ['Profesional', cita.nombreProfesional],
                    ['Sucursal', cita.nombreSucursal],
                    ['Estado', cita.estado],
                    ['Costo histórico', cita.costoAceptado],
                  ]
                    .map(
                      ([etiqueta, valor]) =>
                        `<div><dt>${etiqueta}</dt><dd>${esc(valorHistorico(valor))}</dd></div>`,
                    )
                    .join('')}</dl></li>`,
              )
              .join('')}</ol>`
          : '<p>Sin citas registradas para esta ficha.</p>';
        destino.insertAdjacentHTML('beforeend', renderPaginacion(pagina, resultado.hayMas));
        destino.querySelector('[data-historial-cliente-anterior]').onclick = () =>
          void cargarHistorial(pagina - 1);
        destino.querySelector('[data-historial-cliente-siguiente]').onclick = () =>
          void cargarHistorial(pagina + 1);
        if (pagina > 1)
          destino.querySelector('[data-historial-cliente-anterior]').focus();
      } catch (error) {
        if (!vigente() || consulta !== generacionHistorial) return;
        destino.innerHTML = renderError(error);
        destino.querySelector('[data-ficha-reintentar]')?.addEventListener('click', () =>
          void cargarHistorial(pagina)
        );
      }
    }
    await cargarHistorial();
  } catch (error) {
    if (!vigente()) return;
    dialogo.querySelector('.dialogo-cuerpo').innerHTML = renderError(error);
    dialogo.querySelector('[data-ficha-reintentar]')?.addEventListener('click', () => void abrirFichaCliente(id, alCambiar));
  }
}
export function abrirEditorCliente(ficha, alCambiar, destinoHeredado = null) {
  if (!puedeGestionarCitas(usuarioActual?.rol)) return;
  // Una respuesta incierta de otra ficha debe resolverse antes de iniciar otra mutación.
  const pendienteAjena = leerUnionPendiente(identidadSesion());
  if (pendienteAjena && pendienteAjena.origenId !== ficha?.id) {
    const aviso = abrirPanelCliente('Unión pendiente', '<div class="dialogo-cuerpo"><p>Recupera la unión pendiente desde el directorio antes de crear o corregir otra ficha.</p><button type="button" class="btn btn-light" data-union-cerrar>Cerrar</button></div>');
    aviso.querySelector('[data-union-cerrar]').onclick = () => aviso.close();
    return;
  }
  const revisionPanel = ++generacion,
    identidad = identidadSesion(),
    clave = `cliente:${identidad}:${ficha?.id ?? 'nuevo'}`,
    borrador = borradorAgenda(clave);
  const dialogo = abrirPanelCliente(
    ficha ? 'Corregir ficha' : 'Nuevo cliente',
    `<form><div class="dialogo-cuerpo"><p class="introduccion-formulario">${ficha ? 'Corrige los datos actuales de esta persona. Las citas anteriores no se modifican.' : 'Crea una ficha independiente. Dos personas pueden compartir el mismo teléfono.'}</p>${renderCampo('Nombre completo', 'nombreCompleto', borrador?.nombreCompleto ?? ficha?.nombreCompleto ?? '', 'text', 'required autocomplete="off"')}${renderCampo('Teléfono', 'telefono', borrador?.telefono ?? ficha?.telefono ?? '', 'tel', 'required autocomplete="off" inputmode="tel"')}<p class="ayuda-campo">Nombre: hasta 150 caracteres. Teléfono: diez dígitos; puedes incluir +52, espacios o guiones.</p><p class="error-formulario" data-ficha-error role="alert" tabindex="-1" hidden></p><section data-ficha-coincidencia role="status" hidden></section><p class="ayuda-campo aviso-cliente" data-ficha-alta-incierta hidden>El alta puede haberse guardado aunque no se reciba confirmación. Revisa elemento directorio antes de descartar este borrador y crear otra ficha.</p><button type="button" class="btn btn-light" data-ficha-releer hidden>${ficha ? 'Releer ficha' : 'Revisar directorio'}</button>${!ficha ? '<button type="button" class="btn btn-light" data-ficha-descartar hidden>Descartar borrador</button>' : ''}</div><div class="dialogo-pie"><button type="button" class="btn btn-light" data-ficha-cerrar>Cerrar</button><button type="submit" class="btn btn-primary">Guardar ficha</button></div></form>`,
  );
  const formulario = dialogo.querySelector('form'),
    guardar = formulario.querySelector('[type="submit"]'),
    avisoError = formulario.querySelector('[data-ficha-error]'),
    releer = formulario.querySelector('[data-ficha-releer]'),
    avisoCoincidencia = formulario.querySelector('[data-ficha-coincidencia]');
  let coincidencia = destinoHeredado, intentoUnion = null, unionEnCurso = false;
  let propuestaDeEdicion = !destinoHeredado;
  let valoresUnion = null;
  const claveUnion = ficha ? `union-cliente:${identidad}:${ficha.id}` : '';
  // El intento se conserva antes del POST para repetir su mismo cuerpo si la respuesta se pierde.
  if (claveUnion) {
    try { intentoUnion = JSON.parse(sessionStorage.getItem(claveUnion) || 'null'); }
    catch { intentoUnion = null; }
  }
  function mostrarUnion(mensaje = '') {
    if (!ficha || (!coincidencia && !intentoUnion)) { avisoCoincidencia.hidden = true; return; }
    avisoCoincidencia.hidden = false;
    avisoCoincidencia.innerHTML = intentoUnion
      ? `<p>${esc(mensaje || 'Hay una unión pendiente de comprobar. Reintenta con la misma clave antes de modificar otra ficha.')}</p><button type="button" class="btn btn-primary" data-union-reintentar ${unionEnCurso ? 'disabled' : ''}>Reintentar unión</button>`
      : `<p>Los datos propuestos coinciden con la ficha #${coincidencia.id}: <strong>${esc(coincidencia.nombreCompleto)}</strong>. Si aceptas, sus citas e historial pasarán a esa ficha; los datos históricos de cada cita se conservan. No se cambió ninguna ficha todavía.</p><button type="button" class="btn btn-primary" data-union-aceptar>Aceptar unión</button> <button type="button" class="btn btn-light" data-union-volver>Volver a editar</button>`;
    avisoCoincidencia.querySelector('[data-union-aceptar]')?.addEventListener('click', () => {
      const valores = propuestaDeEdicion ? valoresUnion : null;
      intentoUnion = crearIntentoUnion(ficha, coincidencia, valores
        ? { nombreCompleto: valores.nombreCompleto, telefono: valores.telefono } : null);
      try { sessionStorage.setItem(claveUnion, JSON.stringify(intentoUnion)); }
      catch { /* La repetición sigue disponible mientras esta pestaña permanezca abierta. */ }
      coincidencia = null;
      sincronizar();
      void enviarUnion();
    });
    avisoCoincidencia.querySelector('[data-union-volver]')?.addEventListener('click', () => {
      coincidencia = null;
      mutacion.state.stale = false;
      mostrarUnion(); sincronizar();
      formulario.elements.nombreCompleto.focus();
    });
    avisoCoincidencia.querySelector('[data-union-reintentar]')?.addEventListener('click', () => void enviarUnion());
  }
  async function enviarUnion() {
    if (!vigente() || !intentoUnion || unionEnCurso) return;
    unionEnCurso = true;
    mostrarUnion('Comprobando la unión con la misma clave…');
    try {
      const resultado = validarResultadoUnion(await clientesClient.unir(ficha.id, intentoUnion), intentoUnion);
      if (!vigente()) return;
      sessionStorage.removeItem(claveUnion);
      intentoUnion = null;
      borrarBorradorAgenda(clave);
      await alCambiar();
      if (vigente()) await abrirFichaCliente(resultado.destinoId, alCambiar);
    } catch (error) {
      if (!vigente()) return;
      // Red/503 son inciertos; 400/409 confirmados exigen relectura antes de un intento nuevo.
      if ([400, 409].includes(error.status)) {
        sessionStorage.removeItem(claveUnion);
        intentoUnion = null;
        mutacion.state.stale = true;
        sincronizar('La unión fue rechazada. Conservamos el borrador; relee ambas fichas antes de volver a intentar.');
      } else mostrarUnion('No se pudo confirmar la unión. Reintenta la misma operación.');
    } finally {
      unionEnCurso = false;
      if (vigente()) mostrarUnion();
    }
  }
  const vigente = () =>
    dialogo.open && revisionPanel === generacion && identidad === identidadSesion();
  const mutacion = crearMutacionVersionada(
    ficha?.version,
    (valores) =>
      ficha ? clientesClient.corregir(ficha.id, valores) : clientesClient.crear(valores),
    (resultado) =>
      resultado.negocioId === usuarioActual?.negocioId &&
      (!ficha || resultado.version >= ficha.version),
  );
  mutacion.state.stale = Boolean(
    borrador && (borrador.stale || borrador.version !== ficha?.version),
  );
  const recordarBorrador = () => {
    if (identidad === identidadSesion())
      guardarBorradorAgenda(clave, {
        nombreCompleto: formulario.elements.nombreCompleto.value,
        telefono: formulario.elements.telefono.value,
        version: ficha?.version,
        stale: mutacion.state.busy || mutacion.state.stale,
      });
  };
  function sincronizar(mensaje) {
    guardar.disabled = mutacion.state.busy || mutacion.state.stale;
    formulario.querySelectorAll('input').forEach((entrada) => {
      entrada.disabled = mutacion.state.busy || Boolean(coincidencia) || Boolean(intentoUnion);
    });
    releer.hidden = !mutacion.state.stale;
    if (!ficha) {
      formulario.querySelector('[data-ficha-alta-incierta]').hidden =
        !mutacion.state.stale;
      formulario.querySelector('[data-ficha-descartar]').hidden =
        !mutacion.state.stale;
    }
    if (mensaje) {
      avisoError.textContent = mensaje;
      avisoError.hidden = false;
    }
  }
  sincronizar(
    mutacion.state.stale
      ? 'Hay un conflicto o un resultado sin confirmar. Revisa los datos antes de volver a guardar.'
      : '',
  );
  if (intentoUnion) { mutacion.state.stale = true; sincronizar(); mostrarUnion(); }
  else if (coincidencia) { mutacion.state.stale = true; sincronizar(); releer.hidden = true; mostrarUnion(); }
  formulario.elements.nombreCompleto.focus();
  formulario.oninput = recordarBorrador;
  // Una ficha abierta no cambia de versión silenciosamente: preserva lo escrito y exige relectura explícita.
  formulario.addEventListener('registro-desactualizado', (evento) => {
    mutacion.state.stale = true; recordarBorrador();
    sincronizar(evento.detail.kind === 'stale' ? 'La ficha cambió en otra sesión. Conservamos tu borrador; relee antes de guardar.' : 'No se pudo comprobar la versión vigente. Relee la ficha antes de guardar.');
  });
  if (ficha) observarRegistro(formulario, { version: ficha.version, read: () => clientesClient.consultar(ficha.id), active: vigente });
  dialogo.addEventListener(
    'close',
    () => {
      if (formulario.isConnected) recordarBorrador();
    },
    { once: true },
  );
  formulario.querySelector('[data-ficha-cerrar]').onclick = () => dialogo.close();
  releer.onclick = () => {
    if (mutacion.state.busy || !vigente()) return;
    if (ficha) {
      borrarBorradorAgenda(clave);
      void abrirFichaCliente(ficha.id, alCambiar);
    } else {
      dialogo.close();
      void alCambiar();
    }
  };
  if (!ficha)
    formulario.querySelector('[data-ficha-descartar]').onclick = () => {
      if (!mutacion.state.busy && vigente()) {
        borrarBorradorAgenda(clave);
        abrirEditorCliente(null, alCambiar);
      }
    };
  formulario.onsubmit = async (evento) => {
    evento.preventDefault();
    if (!vigente() || mutacion.state.busy || mutacion.state.stale) return;
    const valores = Object.fromEntries(new FormData(formulario));
    try {
      valoresUnion = crearPayloadCliente({ ...valores, version: ficha?.version }, Boolean(ficha));
    } catch (error) {
      sincronizar(error.message);
      avisoError.focus();
      return;
    }
    const envio = mutacion.submit(valores);
    recordarBorrador();
    sincronizar();
    avisoError.hidden = true;
    await envio;
    if (!vigente()) return;
    if (mutacion.state.result) {
      borrarBorradorAgenda(clave);
      // Primero confirmar con la respuesta validada; después releer directorio, ficha e historial por ID.
      await alCambiar();
      if (vigente()) await abrirFichaCliente(mutacion.state.result.id, alCambiar);
      return;
    }
    coincidencia = ficha ? reconocerCoincidencia(mutacion.state.error) : null;
    propuestaDeEdicion = true;
    if (coincidencia) {
      sincronizar();
      avisoError.hidden = true;
      releer.hidden = true;
      mostrarUnion();
      avisoCoincidencia.querySelector('[data-union-aceptar]').focus();
      return;
    }
    recordarBorrador();
    sincronizar(
      `${errorSeguro(mutacion.state.error).title}. ${errorSeguro(mutacion.state.error).message} Conservamos tu borrador.`,
    );
    avisoError.focus();
  };
}
