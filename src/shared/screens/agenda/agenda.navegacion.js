import { posicionHoraActual } from './agenda.utilidades.js';

let pendiente = null, anterior = null, resaltado = null, retornoPendiente = null;
let raizObservada, observador, observadorEstilos;
export function reiniciarNavegacionAgenda() { pendiente = anterior = resaltado = retornoPendiente = null; }
export const puedeVolverAgenda = () => Boolean(anterior);
export function renderAgendaConservandoPosicion(render) {
  const enfocado = document.activeElement;
  const nombre = enfocado?.name;
  const atributo = [...(enfocado?.attributes || [])].find((x) => x.name.startsWith('data-'));
  const formulario = document.querySelector('#agenda-filtros-conectados');
  const borrador = formulario ? new FormData(formulario) : null;
  const desplazamiento = contenedorDesplazable();
  const limiteSuperior = window.scrollY;
  const ancla = anclaDesplazamientoAgenda();
  const posicion = desplazamiento && { top: desplazamiento.scrollTop, left: desplazamiento.scrollLeft };
  render();
  const desplazamientoSiguiente = contenedorDesplazable();
  if (posicion && desplazamientoSiguiente) { desplazamientoSiguiente.scrollTop = posicion.top; desplazamientoSiguiente.scrollLeft = posicion.left; }
  restaurarDesplazamientoAgenda(ancla, limiteSuperior);
  const formularioSiguiente = document.querySelector('#agenda-filtros-conectados');
  for (const [claveInterna, valor] of borrador || []) if (formularioSiguiente?.elements[claveInterna]) formularioSiguiente.elements[claveInterna].value = valor;
  const siguiente = nombre ? document.getElementsByName(nombre)[0] : atributo ? [...document.querySelectorAll(`[${atributo.name}]`)].find((x) => x.getAttribute(atributo.name) === atributo.value) : null;
  siguiente?.focus({ preventScroll: true });
}
const limiteSuperiorAgenda = () => (document.querySelector('.topbar')?.getBoundingClientRect().height || 0) + (matchMedia('(max-width: 767px)').matches ? ['.semana-encabezado'] : ['.agenda-barra', '.calendario-filtros', '.semana-encabezado']).reduce((suma, selector) => suma + (document.querySelector('.agenda-calendario ' + selector)?.getBoundingClientRect().height || 0), 0) + 12;
const contenedorDesplazable = () => document.querySelector('.agenda-calendario .calendario-desplazamiento');
export function handleNavegacionAgenda(evento, estado, render) {
  const grupo = evento.target.closest('[data-agenda-densidad]');
  if (grupo) {
    const desplazamiento = contenedorDesplazable();
    anterior = { fecha: estado.fecha, top: desplazamiento?.scrollTop || 0, left: desplazamiento?.scrollLeft || 0, limiteSuperior: window.scrollY, dia: grupo.dataset.grupoDia, ids: grupo.dataset.ids };
    pendiente = { ids: grupo.dataset.ids.split(',').map(Number), inicio: Number(grupo.dataset.grupoInicio), dia: grupo.dataset.grupoDia };
    estado.fecha = grupo.dataset.grupoDia; estado.vistaCalendario = 'day'; render(); return true;
  }
  if (evento.target.closest('[data-agenda-volver]') && anterior) {
    const guardado = anterior; anterior = null; resaltado = null; pendiente = null; retornoPendiente = guardado;
    estado.fecha = guardado.fecha; estado.vistaCalendario = 'week'; render();
    return true;
  }
  // Una navegación explícita distinta cancela un salto pendiente de una respuesta remota.
  if (evento.target.closest('[data-agenda-vista], [data-agenda-vista-demo], [data-agenda-mover], [data-action="periodo-anterior"], [data-action="periodo-siguiente"], [data-agenda-hoy], [data-action="agenda-hoy"], [data-agenda-fecha], [data-agenda-dia-demo]')) pendiente = resaltado = anterior = null;
  return false;
}
export function aplicarEfectosAgenda() {
  queueMicrotask(() => {
    const raiz = document.querySelector('.agenda-calendario');
    if (!raiz) return;
    montarEncabezadoAgenda(raiz);
    if (raiz !== raizObservada && typeof ResizeObserver !== 'undefined') {
      observador?.disconnect(); raizObservada = raiz;
      const capacidad = () => Math.max(1, Math.floor(((Math.max(1178, raiz.clientWidth) - 58) / 7) / 105));
      let capacidadAnterior = capacidad();
      observador = new ResizeObserver(() => {
        if (!raiz.isConnected) { observador.disconnect(); return; }
        actualizarDimensionesAgenda(raiz); ajustarEscalaAgenda(raiz); actualizarRelojAgenda();
        const siguiente = capacidad();
        if (siguiente !== capacidadAnterior) { capacidadAnterior = siguiente; window.dispatchEvent(new Event('agenda-cambio-distribucion')); }
      });
      observador.observe(raiz);
      for (const el of raiz.querySelectorAll('.agenda-barra, .calendario-filtros, .agenda-desplazamiento-encabezado')) observador.observe(el);
      const barraSuperior = document.querySelector('.topbar');
      if (barraSuperior) observador.observe(barraSuperior);
      const sonda = document.createElement('span');
      sonda.className = 'agenda-sonda-escala';
      sonda.setAttribute('aria-hidden', 'true');
      raiz.append(sonda);
      observador.observe(sonda);
      observadorEstilos?.disconnect();
      observadorEstilos = new MutationObserver(() => { ajustarEscalaAgenda(raiz); actualizarRelojAgenda(); });
      for (const objetivo of [document.documentElement, raiz]) observadorEstilos.observe(objetivo, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    actualizarDimensionesAgenda(raiz);
    ajustarEscalaAgenda(raiz);
    actualizarRelojAgenda();
    if (retornoPendiente && raiz.querySelector('.calendario-semana:not(.dia-unico)')) {
      const guardado = retornoPendiente; retornoPendiente = null;
      const desplazamiento = contenedorDesplazable();
      if (desplazamiento) { desplazamiento.scrollTop = guardado.top; desplazamiento.scrollLeft = guardado.left; }
      window.scrollTo({ top: guardado.limiteSuperior, behavior: 'instant' });
      const grupo = [...raiz.querySelectorAll('[data-agenda-densidad]')].find((x) => x.dataset.grupoDia === guardado.dia && x.dataset.ids === guardado.ids);
      (grupo || raiz.querySelector('[data-agenda-vista="week"], [data-agenda-vista-demo="week"]'))?.focus({ preventScroll: true });
    }
    const tarjetas = [...raiz.querySelectorAll('.calendario-evento[data-agenda-cita], .calendario-evento[data-cita]')];
    const id = (tarjeta) => Number(tarjeta.dataset.agendaCita || tarjeta.dataset.cita);
    if (pendiente && tarjetas.length) {
      const seleccionado = tarjetas.filter((tarjeta) => pendiente.ids.includes(id(tarjeta)));
      if (seleccionado.length) {
        const desplazamiento = contenedorDesplazable();
        if (desplazamiento) { const contenedor = seleccionado[0].getBoundingClientRect(); desplazamiento.scrollLeft += contenedor.left - desplazamiento.getBoundingClientRect().left - 70; }
        window.scrollTo({ top: window.scrollY + seleccionado[0].getBoundingClientRect().top - limiteSuperiorAgenda(), behavior: 'instant' });
        seleccionado[0].focus({ preventScroll: true });
        const anuncio = raiz.querySelector('[data-agenda-anuncio]');
        if (anuncio) anuncio.textContent = `${seleccionado.length} citas en el tramo seleccionado`;
        resaltado = { ids: pendiente.ids, hasta: Date.now() + 2200 }; pendiente = null;
      }
    }
    if (resaltado && resaltado.hasta > Date.now()) {
      for (const tarjeta of tarjetas.filter((tarjeta) => resaltado.ids.includes(id(tarjeta)))) {
        tarjeta.classList.add('agenda-resaltado');
        setTimeout(() => tarjeta.classList.remove('agenda-resaltado'), resaltado.hasta - Date.now());
      }
    }
  });
}
export function actualizarRelojAgenda() {
  for (const marcador of document.querySelectorAll('[data-agenda-reloj]')) {
    const minutos = posicionHoraActual(marcador.dataset.relojDia, [marcador.dataset.relojZona]);
    const primero = Number(marcador.dataset.relojPrimero), ultimo = Number(marcador.dataset.relojUltimo);
    marcador.hidden = minutos == null || minutos < primero || minutos >= ultimo;
    if (!marcador.hidden) { marcador.style.top = `${(minutos - primero) / 60 * Number(marcador.closest('.calendario-semana')?.style.getPropertyValue('--alto-hora').replace('px', '') || 96)}px`; marcador.setAttribute('aria-label', `Hora actual ${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`); }
  }
}
if (typeof window !== 'undefined') {
  setInterval(actualizarRelojAgenda, 60000);
  window.addEventListener('focus', actualizarRelojAgenda);
}

// Conserva la hora que se está explorando, incluso al cambiar la escala en un refresco.
export function anclaDesplazamientoAgenda() {
  const cuerpo = document.querySelector('.agenda-calendario .semana-cuerpo');
  if (!cuerpo || cuerpo.getBoundingClientRect().top > limiteSuperiorAgenda()) return null;
  const cuadricula = cuerpo.closest('.calendario-semana');
  const escala = parseFloat(cuadricula.style.getPropertyValue('--alto-hora'));
  return { minuto: Number(cuadricula.dataset.primeraHora) * 60 + (limiteSuperiorAgenda() - cuerpo.getBoundingClientRect().top) / escala * 60 };
}
export function restaurarDesplazamientoAgenda(ancla, respaldo) {
  const cuerpo = document.querySelector('.agenda-calendario .semana-cuerpo');
  if (ancla && cuerpo) {
    const cuadricula = cuerpo.closest('.calendario-semana');
    const escala = parseFloat(cuadricula.style.getPropertyValue('--alto-hora'));
    window.scrollTo({ top: window.scrollY + cuerpo.getBoundingClientRect().top + (ancla.minuto / 60 - Number(cuadricula.dataset.primeraHora)) * escala - limiteSuperiorAgenda(), behavior: 'instant' });
  } else window.scrollTo({ top: respaldo, behavior: 'instant' });
}
function montarEncabezadoAgenda(raiz) {
  const desplazamiento = raiz.querySelector('.calendario-desplazamiento'), cuadricula = desplazamiento?.querySelector('.calendario-semana');
  const encabezado = cuadricula?.querySelector('.semana-encabezado');
  if (!encabezado || desplazamiento.querySelector('[data-agenda-esqueleto]')) return;
  const contenedorPrincipal = document.createElement('div');
  contenedorPrincipal.className = 'agenda-desplazamiento-encabezado' + (cuadricula.classList.contains('dia-unico') ? ' dia-unico' : '');
  contenedorPrincipal.setAttribute('aria-label', 'Encabezado del calendario');
  contenedorPrincipal.tabIndex = 0;
  desplazamiento.before(contenedorPrincipal); contenedorPrincipal.append(encabezado);
  const sincronizar = (desdeOrigen, to) => { if (Math.abs(desdeOrigen.scrollLeft - to.scrollLeft) > 1) to.scrollLeft = desdeOrigen.scrollLeft; };
  desplazamiento.addEventListener('scroll', () => sincronizar(desplazamiento, contenedorPrincipal), { passive: true });
  contenedorPrincipal.addEventListener('scroll', () => sincronizar(contenedorPrincipal, desplazamiento), { passive: true });
}
function actualizarDimensionesAgenda(raiz) {
  const ancho = Math.max(1, ((raiz.querySelector('.calendario-desplazamiento')?.clientWidth || raiz.clientWidth) - 58) / 3);
  const alto = document.querySelector('.topbar')?.getBoundingClientRect().height || 0;
  const barra = raiz.querySelector('.agenda-barra')?.getBoundingClientRect().height || 0;
  const filtros = raiz.querySelector('.calendario-filtros')?.getBoundingClientRect().height || 0;
  const altoEncabezado = raiz.querySelector('.semana-encabezado')?.getBoundingClientRect().height || 0;
  for (const [claveInterna, valor] of [['--agenda-ancho-columna-escritorio', ancho + 'px'], ['--agenda-alto-barra-superior', alto + 'px'], ['--agenda-alto-barra', barra + 'px'], ['--agenda-alto-filtros', filtros + 'px'], ['--agenda-alto-encabezado', altoEncabezado + 'px']]) {
    if (raiz.style.getPropertyValue(claveInterna) !== valor) raiz.style.setProperty(claveInterna, valor);
  }
  const cuerpo = raiz.querySelector('.semana-cuerpo'), encabezado = raiz.querySelector('.agenda-desplazamiento-encabezado .semana-encabezado');
  if (cuerpo && encabezado) {
    encabezado.style.width = cuerpo.getBoundingClientRect().width + 'px';
    encabezado.style.gridTemplateColumns = getComputedStyle(cuerpo).gridTemplateColumns;
  }
}
function ajustarEscalaAgenda(raiz) {
  const cuadricula = raiz.querySelector('.calendario-semana');
  if (!cuadricula) return;
  const escala = parseFloat(cuadricula.style.getPropertyValue('--alto-hora'));
  const maximoInterpretado = parseFloat(getComputedStyle(raiz).getPropertyValue('--agenda-alto-hora-maximo'));
  const max = Number.isFinite(maximoInterpretado) && maximoInterpretado > 0 ? maximoInterpretado : 240;
  const tarjetas = [...cuadricula.querySelectorAll('.calendario-evento')];
  let deseado = 96;
  for (const tarjeta of tarjetas) {
    const duracion = (parseFloat(tarjeta.style.height) + 4) / escala;
    const filas = tarjeta.clientWidth >= 240 ? (tarjeta.querySelector('.evento-profesional') ? 3 : 2) : 3 + Number(Boolean(tarjeta.querySelector('.evento-profesional'))) + Number(Boolean(tarjeta.querySelector('.evento-sucursal')));
    deseado = Math.max(deseado, (20 + filas * 18 + 4) / duracion);
  }
  for (const grupo of cuadricula.querySelectorAll('.agenda-densidad')) deseado = Math.max(deseado, 72 / ((parseFloat(grupo.style.height) + 4) / escala));
  const siguiente = Math.min(max, Math.ceil(deseado));
  const proporcion = siguiente / escala;
  const ancla = anclaDesplazamientoAgenda(), limiteSuperior = window.scrollY;
  if (Math.abs(siguiente - escala) > .01) {
    for (const el of cuadricula.querySelectorAll('[style]')) {
      if (el.matches('.calendario-evento, .agenda-densidad')) {
        el.style.top = ((parseFloat(el.style.top) - 2) * proporcion + 2) + 'px';
        el.style.height = Math.max(0, (parseFloat(el.style.height) + 4) * proporcion - 4) + 'px';
      } else {
        if (el.style.top.endsWith('px')) el.style.top = parseFloat(el.style.top) * proporcion + 'px';
        if (el.style.height.endsWith('px')) el.style.height = parseFloat(el.style.height) * proporcion + 'px';
      }
    }
    cuadricula.style.setProperty('--alto-hora', siguiente + 'px');
    restaurarDesplazamientoAgenda(ancla, limiteSuperior);
  }
  for (const tarjeta of tarjetas) tarjeta.dataset.densidad = tarjeta.clientHeight < 30 ? 'tiny' : tarjeta.clientHeight < 54 ? 'brief' : 'full';
}
