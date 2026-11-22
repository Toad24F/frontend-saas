import { abrirDialogo, mostrarAviso } from './interfaz.componentes.js';
import { aplicarAcentoPortal, esColorHexadecimalPortal, rutaLogoPortal } from './personalizacion.marca.js';
import './personalizacion.estilos.css';

const limiteLogo = 2 * 1024 * 1024;
const errorAcento = 'Usa un color de acento hexadecimal opaco (#RRGGBB).';

async function validarLogo(archivo) {
  if (archivo.size > limiteLogo) throw new Error('El logo debe pesar como máximo 2 MiB.');
  const bytes = await archivo.arrayBuffer();
  const firma = new Uint8Array(bytes);
  const fragmento = (inicio, fin) => String.fromCharCode(...firma.slice(inicio, fin));
  const mime = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, indice) => firma[indice] === byte) ? 'image/png'
    : firma[0] === 255 && firma[1] === 216 && firma[2] === 255 ? 'image/jpeg'
      : fragmento(0, 4) === 'RIFF' && fragmento(8, 12) === 'WEBP' ? 'image/webp' : null;
  if (!mime || mime !== archivo.type) throw new Error('El formato del logo debe coincidir con PNG, JPEG o WebP.');
  const ilegible = () => new Error('No se pudo decodificar el logo.');
  const animado = () => new Error('El logo debe ser una imagen sin animación.');
  const contenedor = new DataView(bytes);
  // Los navegadores pueden decodificar solo el primer cuadro. Inspeccionamos
  // los bloques de animación y el final del contenedor antes de mostrarlo.
  if (mime === 'image/png') {
    let completo = false;
    for (let posicion = 8; posicion + 12 <= bytes.byteLength;) {
      const longitud = contenedor.getUint32(posicion);
      const tipo = fragmento(posicion + 4, posicion + 8);
      posicion += longitud + 12;
      if (posicion > bytes.byteLength) break;
      if (['acTL', 'fcTL', 'fdAT'].includes(tipo)) throw animado();
      if (tipo === 'IEND' && longitud === 0) { completo = true; break; }
    }
    if (!completo) throw ilegible();
  }
  if (mime === 'image/webp') {
    if (contenedor.getUint32(4, true) + 8 > bytes.byteLength) throw ilegible();
    if (fragmento(12, 16) === 'VP8X' && (firma[20] & 2)) throw animado();
  }
  const imagen = await createImageBitmap(archivo).catch(() => { throw ilegible(); });
  try {
    if (imagen.width > 2048 || imagen.height > 2048) throw new Error('El logo debe medir como máximo 2048 × 2048 píxeles.');
  } finally { imagen.close(); }
}

export function abrirEditorMarca({ client, slug, nombre, demo = false }) {
  const dialogo = abrirDialogo('Personalizar portal', `
    <form class="personalizacion-formulario" novalidate>
      <div class="dialogo-cuerpo personalizacion-cuerpo">
        ${demo ? '<p>Demostración. Los cambios duran en esta pantalla y no se publican en un portal real.</p>' : ''}
        <p data-marca-estado role="status"></p>
        <p id="marca-aviso" data-marca-error role="alert" tabindex="-1" hidden></p>
        <button class="btn btn-light" type="button" data-marca-recargar hidden>Recargar marca publicada</button>
        <div class="personalizacion-cuadricula" data-marca-cuadricula hidden>
          <fieldset data-marca-campos disabled>
            <legend class="h6">Acento y logo</legend>
            <p id="marca-formato" class="form-text">Pega un código HEX o abre la paleta junto al campo.</p>
            <div class="personalizacion-campo-color">
              <label class="form-label" for="marca-acento">Color de acento</label>
              <div class="personalizacion-controles-color">
                <input class="form-control" id="marca-acento" autocapitalize="off"
                  autocomplete="off" spellcheck="false" aria-describedby="marca-formato">
                <input type="color" id="marca-selector-acento" class="personalizacion-selector-color"
                  aria-label="Paleta de acento" title="Abrir paleta de acento">
              </div>
            </div>
            <label class="form-label" for="marca-archivo">Logo del negocio</label>
            <input class="form-control" type="file" id="marca-archivo" accept="image/png,image/jpeg,image/webp" aria-describedby="marca-limite">
            <p id="marca-limite" class="form-text">PNG, JPEG o WebP. Hasta 2 MiB y 2048 × 2048 píxeles.</p>
            <button class="btn btn-light" type="button" data-marca-quitar>Quitar logo</button>
          </fieldset>
          <section class="personalizacion-muestra" aria-labelledby="marca-muestra-titulo">
            <h3 id="marca-muestra-titulo" class="h6">Vista previa</h3>
            <div class="personalizacion-ficha">
              <img data-marca-logo alt="Logo del negocio" width="64" height="64" hidden>
              <strong data-marca-nombre></strong>
              <p>Elige un servicio para reservar.</p>
              <span class="personalizacion-muestra-boton" aria-hidden="true">Continuar</span>
            </div>
          </section>
        </div>
      </div>
      <div class="dialogo-pie personalizacion-pie">
        <button class="btn btn-light" type="button" data-marca-descartar>Descartar cambios</button>
        <button class="btn btn-light" type="button" data-marca-restaurar disabled>Previsualizar predeterminados</button>
        <button class="btn btn-light" type="button" data-marca-cancelar hidden>Cancelar restauración</button>
        <button class="btn btn-primary" type="submit" disabled>Guardar marca</button>
      </div>
    </form>`, true);
  const buscar = (selector) => dialogo.querySelector(selector);
  const formulario = buscar('form');
  const campos = buscar('[data-marca-campos]');
  const muestra = buscar('.personalizacion-ficha');
  const logo = buscar('[data-marca-logo]');
  const entradaArchivo = buscar('#marca-archivo');
  const estado = buscar('[data-marca-estado]');
  const aviso = buscar('[data-marca-error]');
  const recargar = buscar('[data-marca-recargar]');
  const restaurar = buscar('[data-marca-restaurar]');
  const cancelar = buscar('[data-marca-cancelar]');
  const guardar = buscar('[type="submit"]');
  const quitar = buscar('[data-marca-quitar]');
  const entradaAcento = buscar('#marca-acento');
  const selectorAcento = buscar('#marca-selector-acento');
  buscar('[data-marca-nombre]').textContent = nombre || 'Tu negocio';

  let publicada;
  let borrador;
  let restaurando = false;
  let ocupado = false;
  let recargaNecesaria = false;
  let logoLocal;
  let revisionLogo = 0;
  let validandoLogo = false;
  let provisional;
  const sigueAbierto = () => dialogo.open && formulario.isConnected;

  function renovarControles() {
    campos.disabled = ocupado || restaurando || recargaNecesaria;
    restaurar.hidden = restaurando;
    restaurar.disabled = !publicada || ocupado || validandoLogo || recargaNecesaria;
    cancelar.hidden = !restaurando;
    cancelar.disabled = ocupado;
    guardar.disabled = restaurar.disabled;
    guardar.textContent = restaurando ? 'Aplicar predeterminados' : 'Guardar marca';
    quitar.disabled = !borrador?.logoId && !logoLocal && !validandoLogo;
    recargar.hidden = !recargaNecesaria;
    recargar.disabled = ocupado;
    buscar('[data-marca-descartar]').disabled = ocupado;
    buscar('[data-close]').disabled = ocupado;
  }

  function mostrarError(mensaje = '', enfocar = false) {
    aviso.textContent = mensaje;
    aviso.hidden = !mensaje;
    if (mensaje && enfocar) aviso.focus();
  }

  function borrarLogoLocal() {
    if (logoLocal) URL.revokeObjectURL(logoLocal.url);
    logoLocal = null;
    provisional = null;
  }

  // La restauración sustituye temporalmente la muestra. El borrador sigue disponible al cancelar.
  function mostrarBorrador() {
    const acento = restaurando ? publicada.acentoPredeterminado : borrador.acento;
    const valido = esColorHexadecimalPortal(acento);
    if (!restaurando && valido) borrador.ultimoAcento = acento.toLowerCase();
    const acentoVisible = restaurando ? publicada.acentoPredeterminado : borrador.ultimoAcento;
    if (entradaAcento.value !== acento) entradaAcento.value = acento;
    if (selectorAcento.value !== acentoVisible) selectorAcento.value = acentoVisible;
    if (valido) {
      entradaAcento.removeAttribute('aria-invalid');
      entradaAcento.setAttribute('aria-describedby', 'marca-formato');
    } else {
      entradaAcento.setAttribute('aria-invalid', 'true');
      entradaAcento.setAttribute('aria-describedby', 'marca-formato marca-aviso');
    }
    aplicarAcentoPortal(muestra, acentoVisible, publicada.acentoPredeterminado);
    const ruta = !restaurando && (logoLocal?.url || (demo ? borrador.logoId : rutaLogoPortal(slug, borrador.logoId)));
    logo.hidden = !ruta;
    if (ruta) {
      if (logo.getAttribute('src') !== ruta) logo.src = ruta;
    } else logo.removeAttribute('src');
    renovarControles();
    return valido ? '' : errorAcento;
  }

  async function consultar() {
    ocupado = true;
    estado.textContent = 'Consultando marca publicada…';
    mostrarError();
    renovarControles();
    try {
      const datos = await client.consultar();
      if (!sigueAbierto()) return;
      if (!Number.isInteger(datos?.version) || !esColorHexadecimalPortal(datos.acento) ||
        !esColorHexadecimalPortal(datos.acentoPredeterminado)) throw new Error('El servidor devolvió una marca no válida.');
      publicada = { ...datos, acentoPredeterminado: datos.acentoPredeterminado.toLowerCase() };
      borrarLogoLocal();
      entradaArchivo.value = '';
      borrador = { acento: datos.acento, ultimoAcento: datos.acento.toLowerCase(), logoId: datos.logoId };
      restaurando = false;
      recargaNecesaria = false;
      buscar('[data-marca-cuadricula]').hidden = false;
      mostrarBorrador();
    } catch (error) {
      if (sigueAbierto()) {
        recargaNecesaria = true;
        mostrarError(error.message, true);
      }
    } finally {
      ocupado = false;
      if (sigueAbierto()) {
        estado.textContent = '';
        renovarControles();
        if (!recargaNecesaria) entradaAcento.focus();
      }
    }
  }

  entradaAcento.oninput = selectorAcento.oninput = (evento) => {
    if (restaurando) return;
    borrador.acento = evento.target.value;
    mostrarError(mostrarBorrador());
  };
  entradaAcento.addEventListener('paste', (evento) => {
    if (restaurando) return;
    const pegado = evento.clipboardData?.getData('text/plain').trim();
    const codigo = pegado?.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
    if (!codigo) return;

    // El borrador y la API siempre reciben seis dígitos opacos con almohadilla.
    evento.preventDefault();
    const completo = codigo.length === 3 ? [...codigo].map((digito) => digito.repeat(2)).join('') : codigo;
    evento.target.value = `#${completo.toLowerCase()}`;
    evento.target.dispatchEvent(new Event('input', { bubbles: true }));
  });
  entradaArchivo.onchange = async () => {
    const archivo = entradaArchivo.files[0];
    if (!archivo) return;
    const actual = ++revisionLogo;
    validandoLogo = true;
    renovarControles();
    try {
      await validarLogo(archivo);
      if (!sigueAbierto() || actual !== revisionLogo) return;
      borrarLogoLocal();
      logoLocal = { archivo, url: URL.createObjectURL(archivo) };
      mostrarError();
    } catch (error) {
      if (sigueAbierto() && actual === revisionLogo) {
        entradaArchivo.value = '';
        mostrarError(error.message, true);
      }
    } finally {
      if (sigueAbierto() && actual === revisionLogo) {
        validandoLogo = false;
        mostrarBorrador();
      }
    }
  };
  quitar.onclick = () => {
    revisionLogo++;
    validandoLogo = false;
    borrarLogoLocal();
    borrador.logoId = null;
    entradaArchivo.value = '';
    mostrarError(mostrarBorrador());
    entradaArchivo.focus();
  };
  restaurar.onclick = () => {
    restaurando = true;
    mostrarBorrador();
    mostrarError();
    estado.textContent = 'Vista previa de los valores predeterminados.';
    cancelar.focus();
  };
  cancelar.onclick = () => {
    restaurando = false;
    estado.textContent = '';
    mostrarError(mostrarBorrador());
    restaurar.focus();
  };
  recargar.onclick = consultar;
  buscar('[data-marca-descartar]').onclick = () => dialogo.close();
  dialogo.oncancel = (evento) => {
    if (ocupado || restaurando) evento.preventDefault();
    if (!ocupado && restaurando) cancelar.click();
  };
  const cerrarPorFondo = dialogo.onclick;
  dialogo.onclick = (evento) => { if (!ocupado) cerrarPorFondo(evento); };
  const restaurarFoco = dialogo.onclose;
  dialogo.onclose = () => {
    borrarLogoLocal();
    restaurarFoco();
    if (document.activeElement === document.body) document.querySelector('[data-cuenta-marca]')?.focus();
  };

  formulario.onsubmit = async (evento) => {
    evento.preventDefault();
    if (guardar.disabled) return;
    if (!restaurando && !esColorHexadecimalPortal(borrador.acento)) { mostrarError(errorAcento, true); return; }
    ocupado = true;
    renovarControles();
    mostrarError();
    estado.textContent = restaurando ? 'Restaurando marca…' : 'Guardando marca…';
    try {
      // El servidor sanea el archivo al convertirlo en provisional. El PUT es el único paso que lo publica.
      const version = publicada.version;
      if (restaurando) await client.restaurar(version);
      else {
        if (logoLocal && !provisional) provisional = await client.cargar(version, logoLocal.archivo);
        if (!sigueAbierto()) return;
        await client.publicar({ version, acento: borrador.acento.toLowerCase(), logoId: provisional?.id ?? borrador.logoId });
      }
      if (sigueAbierto()) {
        dialogo.close();
        mostrarAviso(demo ? 'Vista previa guardada en esta demostración.' : 'Marca del portal actualizada.');
      }
    } catch (error) {
      if (!sigueAbierto()) return;
      recargaNecesaria = [0, 409].includes(error.status) || error.status >= 500;
      if (error.status === 404) provisional = null;
      mostrarError(recargaNecesaria ? `${error.message} Recarga la marca publicada para comprobar el resultado.` : error.message, true);
    } finally {
      ocupado = false;
      if (sigueAbierto()) {
        renovarControles();
        estado.textContent = '';
      }
    }
  };
  void consultar();
}
