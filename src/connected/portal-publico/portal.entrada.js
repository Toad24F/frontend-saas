import 'bootstrap/dist/css/bootstrap.min.css';
import '../../shared/global.estilos.css';
import '../../shared/tema.estilos.css';
import './portal.estilos.css';
import '../../shared/portal-publico/portal.opciones.css';
import { renderEsqueletoPortal } from '../../shared/portal-publico/portal.opciones.js';
import { crearPortalClient, ErrorPortalPublico } from './portal.http.js';
import { iniciarSesionNavegador, adquirirMutacionPublica } from './portal.sesion-navegador.js';
import { crearIntentoStore } from './intento.store.js';
import { crearReservaPortal } from './reserva.flujo.js';
import { montarReserva } from './reserva.vista.js';
import { vincularCicloReserva } from './reserva.ciclo-vida.js';
import { relojCabeceraPortal } from './portal.fechas.js';
import { renderIcono } from '../../shared/iconos.catalogo.js';
import { inicialesNegocio } from './negocio.identidad.js';

// La recuperación con marcador precede a cualquier catálogo o nueva selección.
// Toda escritura conserva la sesión pública; nunca usa autenticación del panel.
export async function iniciarPortalPublico(slug) {
  const raiz = document.querySelector('#app');
  let temaGuardado;
  try { temaGuardado = localStorage.getItem('cita-theme'); } catch { /* Preferencia opcional. */ }
  let tema = ['light', 'dark'].includes(temaGuardado) ? temaGuardado :
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  raiz.innerHTML = `<div class="portal-publico">
    <header class="portal-cabecera"><img width="176" height="42" alt="Citalendar" id="portal-logo"><span class="portal-reloj-cabecera">${renderIcono('calendar')}<span class="visually-hidden">Fecha y hora local: </span><time id="portal-reloj"></time></span>
      <button type="button" class="selector-tema boton-icono" id="portal-tema"></button></header>
    <main id="portal-principal" class="portal-contenido" aria-labelledby="portal-titulo">
      <div class="portal-encabezado-negocio"><span class="portal-iniciales-negocio" id="portal-iniciales-negocio" aria-hidden="true"></span><div><p class="portal-antetitulo">PORTAL DE RESERVAS</p><h1 id="portal-titulo">Portal de reservas</h1><p id="portal-categoria" hidden></p></div><span class="portal-etiqueta-en-linea">Reservas en línea</span></div>
      <div id="portal-estado" role="status" aria-live="polite" aria-atomic="true"></div>
      <div id="portal-esqueleto-inicial" aria-hidden="true">${renderEsqueletoPortal()}</div>
      <button type="button" class="btn btn-primary mt-3" id="portal-reintentar" hidden>Reintentar conexión</button>
      <section id="portal-seleccion" aria-label="Selección de cita" hidden></section>
    </main><footer class="portal-pie"><span>Reservas con <strong>Citalendar</strong></span></footer></div>`;
  const estado = raiz.querySelector('#portal-estado');
  const reintentar = raiz.querySelector('#portal-reintentar');
  const botonTema = raiz.querySelector('#portal-tema');
  const reloj = raiz.querySelector('#portal-reloj');
  function actualizarIdentidadNegocio(nombre) {
    raiz.querySelector('#portal-titulo').textContent = nombre;
    raiz.querySelector('#portal-iniciales-negocio').textContent = inicialesNegocio(nombre);
  }
  function actualizarReloj() {
    const actual = relojCabeceraPortal(new Date());
    reloj.dateTime = actual.dateTime;
    reloj.textContent = actual.etiqueta;
  }
  actualizarReloj();
  setInterval(actualizarReloj, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) actualizarReloj(); });
  function aplicarTema() {
    document.documentElement.dataset.theme = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'dark' ? '#1f2026' : '#f4f5f6');
    raiz.querySelector('#portal-logo').src = tema === 'dark' ? '/brand/citalendar-logo-light.svg' : '/brand/citalendar-logo.svg';
    botonTema.innerHTML = renderIcono(tema === 'dark' ? 'sun' : 'moon');
    botonTema.setAttribute('aria-label', `Activar modo ${tema === 'dark' ? 'claro' : 'oscuro'}`);
    botonTema.setAttribute('title', `Modo ${tema === 'dark' ? 'claro' : 'oscuro'}`);
    botonTema.setAttribute('aria-pressed', String(tema === 'dark'));
  }
  botonTema.addEventListener('click', () => {
    tema = tema === 'dark' ? 'light' : 'dark';
    aplicarTema();
    try { localStorage.setItem('cita-theme', tema); } catch { /* Sin persistencia, el tema sigue funcionando. */ }
  });
  aplicarTema();
  document.title = 'Reservas · Citalendar';
  if (!slug) {
    estado.textContent = 'El enlace del portal no es válido. Compruebe la dirección del negocio.';
    raiz.querySelector('#portal-esqueleto-inicial').hidden = true;
    return;
  }
  const client = crearPortalClient(slug);
  let inicializando = false;
  // Desactivar reintentos mientras esperamos evita duplicar inicializaciones en esta pestaña.
  async function inicializar() {
    if (inicializando) return;
    inicializando = true;
    raiz.querySelector('#portal-esqueleto-inicial').hidden = false;
    reintentar.hidden = true;
    raiz.querySelector('#portal-principal').setAttribute('aria-busy', 'true');
    estado.textContent = 'Conectando con el portal del negocio…';
    try {
      const { negocio } = await iniciarSesionNavegador(slug, client);
      // Los nombres recibidos se insertan como texto para impedir inyección de contenido.
      actualizarIdentidadNegocio(negocio.nombre);
      document.title = `Reservas · ${negocio.nombre}`;
      estado.textContent = '';
      raiz.querySelector('#portal-esqueleto-inicial').hidden = true;
      const contenedor = raiz.querySelector('#portal-seleccion');
      contenedor.hidden = false;
      let render;
      const canal = new BroadcastChannel(`citalendar:portal:${slug}`);
      const flujo = crearReservaPortal(client, { slug, channel: canal, adquirirMutacion: () => adquirirMutacionPublica(slug),
        alCambiar: (estado, tipo) => {
          if (estado.negocio?.nombre) {
            actualizarIdentidadNegocio(estado.negocio.nombre);
            const categoria = raiz.querySelector('#portal-categoria');
            categoria.textContent = estado.negocio.categoria || '';
            categoria.hidden = !estado.negocio.categoria;
          }
          if (estado.fase === 'resultado') {
            actualizarIdentidadNegocio(estado.resultado.nombreNegocio);
            document.title = `Reserva pendiente · ${estado.resultado.nombreNegocio}`;
          }
          render(estado, tipo);
        } });
      render = montarReserva(contenedor, flujo);
      vincularCicloReserva(flujo);
      await flujo.iniciar();
    } catch (error) {
      estado.textContent = error instanceof ErrorPortalPublico ? error.message : 'No se pudo iniciar el portal. Reintenta la conexión.';
      const pendiente = crearIntentoStore(slug).leer().estado !== 'ausente';
      if (pendiente) estado.textContent += ' Hay una recuperación pendiente; se conservará el marcador hasta poder comprobar el resultado.';
      reintentar.hidden = !pendiente && error.tipo === 'http' && [403, 404].includes(error.status);
    } finally {
      inicializando = false;
      raiz.querySelector('#portal-esqueleto-inicial').hidden = true;
      raiz.querySelector('#portal-principal').setAttribute('aria-busy', 'false');
    }
  }
  reintentar.addEventListener('click', inicializar);
  await inicializar();
}
