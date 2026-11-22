import { abrirDialogo } from './interfaz.componentes.js';
import './automatizaciones.estilos.css';

const plazos = [
  { clave: 'plazoConfirmacionHoras', etiqueta: 'Plazo de confirmación', minimo: 6, maximo: 24 },
  { clave: 'recordatorioHoras', etiqueta: 'Anticipación del recordatorio', minimo: 12, maximo: 48 },
];

function enteroEnRango(valor, minimo, maximo) {
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}

export function renderAccesoAutomatizaciones() {
  return `<section class="superficie cuenta-seccion p-3 p-md-4 mb-3" aria-labelledby="automatizaciones-titulo">
    <h2 id="automatizaciones-titulo">Plazos y recordatorios</h2>
    <p>Define el plazo para confirmar y la anticipación de los recordatorios.</p>
    <button class="btn btn-light" type="button" data-configurar-plazos>Configurar plazos</button>
  </section>`;
}

export function abrirEditorAutomatizaciones({ client, demo = false }) {
  const dialogo = abrirDialogo('Plazos y recordatorios', `
    <form id="automatizaciones-formulario" novalidate>
      <div class="dialogo-cuerpo">
        ${demo ? '<p>Demostración con valores simulados para este negocio.</p>' : ''}
        <p>Las citas y recordatorios ya programados conservan su configuración.</p>
        <p data-automatizaciones-vigentes class="mb-2" hidden></p>
        <p data-automatizaciones-estado role="status" class="mb-2" hidden></p>
        <p id="automatizaciones-error" class="mb-2" role="alert" tabindex="-1" hidden></p>
        <button class="btn btn-light mb-3" type="button" data-automatizaciones-recargar hidden>Recargar valores vigentes</button>
        <fieldset class="row g-3" disabled>
          ${plazos.map(({ clave, etiqueta, minimo, maximo }) => `
            <div class="col-12 col-sm-6">
              <label class="form-label" for="automatizaciones-${clave}">${etiqueta}</label>
              <input class="form-control" type="number" id="automatizaciones-${clave}" name="${clave}"
                min="${minimo}" max="${maximo}" step="1" inputmode="numeric" required
                aria-describedby="automatizaciones-ayuda-${clave}">
              <div class="form-text" id="automatizaciones-ayuda-${clave}">Entre ${minimo} y ${maximo} horas enteras.</div>
            </div>`).join('')}
        </fieldset>
      </div>
      <div class="dialogo-pie">
        <button class="btn btn-light" type="button" data-automatizaciones-cerrar>Cerrar</button>
        <button class="btn btn-primary" type="submit" disabled>Guardar plazos</button>
      </div>
    </form>`);
  const formulario = dialogo.querySelector('#automatizaciones-formulario');
  const campos = formulario.querySelector('fieldset');
  const estado = formulario.querySelector('[data-automatizaciones-estado]');
  const resumen = formulario.querySelector('[data-automatizaciones-vigentes]');
  const error = formulario.querySelector('#automatizaciones-error');
  const recargar = formulario.querySelector('[data-automatizaciones-recargar]');
  const guardar = formulario.querySelector('[type="submit"]');
  const cerrar = formulario.querySelector('[data-automatizaciones-cerrar]');
  const cerrarCabecera = dialogo.querySelector('[data-close]');
  const entradas = plazos.map((plazo) => formulario.elements.namedItem(plazo.clave));
  const visible = () => dialogo.open && formulario.isConnected;
  let datos;
  let ocupado = false;
  let guardando = false;
  let requiereRecarga = false;

  function mostrar(destino, mensaje = '') {
    destino.textContent = mensaje;
    destino.hidden = !mensaje;
  }

  function actualizarControles() {
    campos.disabled = ocupado || !datos;
    guardar.disabled = campos.disabled || requiereRecarga;
    recargar.hidden = !requiereRecarga;
    recargar.disabled = ocupado;
    cerrar.disabled = cerrarCabecera.disabled = guardando;
  }

  function mostrarError(mensaje = '', invalidas = []) {
    mostrar(error, mensaje);
    entradas.forEach((entrada, indice) => {
      const ayuda = `automatizaciones-ayuda-${plazos[indice].clave}`;
      if (invalidas.includes(indice)) {
        entrada.setAttribute('aria-invalid', 'true');
        entrada.setAttribute('aria-describedby', `${ayuda} automatizaciones-error`);
      } else {
        entrada.removeAttribute('aria-invalid');
        entrada.setAttribute('aria-describedby', ayuda);
      }
    });
    if (mensaje) (entradas[invalidas[0]] ?? error).focus();
  }

  function mostrarConfiguracion(configuracion) {
    // Los valores vigentes salen de la respuesta, incluso después de guardar.
    if (!enteroEnRango(configuracion?.version, 0, 0xffffffff) ||
      !plazos.every(({ clave, minimo, maximo }) => enteroEnRango(configuracion[clave], minimo, maximo))) {
      throw new Error('La configuración recibida no es válida.');
    }
    datos = configuracion;
    entradas.forEach((entrada, indice) => { entrada.value = datos[plazos[indice].clave]; });
    mostrar(resumen, `Plazos vigentes de ${datos.plazoConfirmacionHoras} h para confirmar y ${datos.recordatorioHoras} h de anticipación.`);
  }

  async function consultar() {
    if (ocupado) return;
    ocupado = true;
    actualizarControles();
    mostrarError();
    mostrar(estado, 'Consultando plazos vigentes…');
    try {
      const configuracion = await client.consultar();
      if (!visible()) return;
      mostrarConfiguracion(configuracion);
      requiereRecarga = false;
    } catch (fallo) {
      if (!visible()) return;
      requiereRecarga = true;
      mostrarError(fallo.message);
    } finally {
      ocupado = false;
      if (visible()) {
        mostrar(estado);
        actualizarControles();
        if (!requiereRecarga) entradas[0].focus();
      }
    }
  }

  formulario.oninput = () => {
    if (!requiereRecarga) mostrarError();
    mostrar(estado);
  };
  formulario.onsubmit = async (evento) => {
    evento.preventDefault();
    if (guardar.disabled) return;
    mostrar(estado);
    const invalidas = plazos.flatMap(({ minimo, maximo }, indice) =>
      enteroEnRango(entradas[indice].valueAsNumber, minimo, maximo) ? [] : [indice]);
    if (invalidas.length) {
      mostrarError(invalidas.map((indice) => {
        const { etiqueta, minimo, maximo } = plazos[indice];
        return `Escribe un entero entre ${minimo} y ${maximo} en el campo ${etiqueta.toLowerCase()}.`;
      }).join(' '), invalidas);
      return;
    }

    // Reemplazamos los dos plazos con la versión de lectura y esperamos la confirmación del servidor.
    const [plazoConfirmacionHoras, recordatorioHoras] = entradas.map((entrada) => entrada.valueAsNumber);
    ocupado = guardando = true;
    actualizarControles();
    mostrarError();
    mostrar(estado, 'Guardando plazos…');
    try {
      const configuracion = await client.guardar({ version: datos.version, plazoConfirmacionHoras, recordatorioHoras });
      if (!visible()) return;
      mostrarConfiguracion(configuracion);
      mostrar(estado, 'Configuración guardada.');
    } catch (fallo) {
      if (!visible()) return;
      // Conservar el borrador ante un 409 y exigir una nueva lectura antes de otro PUT.
      requiereRecarga = fallo.status === 409;
      mostrar(estado);
      mostrarError(requiereRecarga ? `${fallo.message} Recargar valores vigentes reemplazará este borrador.` : fallo.message);
    } finally {
      ocupado = guardando = false;
      if (visible()) {
        actualizarControles();
        if (!error.textContent) guardar.focus();
      }
    }
  };
  recargar.onclick = consultar;
  cerrar.onclick = () => dialogo.close();
  dialogo.oncancel = (evento) => { if (guardando) evento.preventDefault(); };
  const cerrarPorFondo = dialogo.onclick;
  dialogo.onclick = (evento) => { if (!guardando) cerrarPorFondo(evento); };
  void consultar();
}
