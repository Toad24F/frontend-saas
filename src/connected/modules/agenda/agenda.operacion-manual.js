import { seleccionManual, resultadoManualValido } from './agenda.contrato-manual.js';

// El resolutor exige la MISMA selección tras una recarga. Se guarda solo en esta pestaña,
// aislada por actor/negocio y se elimina únicamente después de un resultado terminal reconocido.
export function crearOperacionManual({ scope: ambito, storage: almacenamiento, client, keyFactory: generarClave = () => crypto.randomUUID() }) {
  const claveAlmacenamiento = `citalendar:manual:v1:${ambito.negocioId}:${ambito.actorId}`;
  const estado = { status: 'idle', busy: false, marker: null, result: null, error: null };
  let enCurso = false;
  function leer() {
    try {
      const valorCrudo = almacenamiento.getItem(claveAlmacenamiento);
      if (valorCrudo == null) return;
      const marcador = JSON.parse(valorCrudo);
      if (marcador.v !== 1 || marcador.actorId !== ambito.actorId || marcador.negocioId !== ambito.negocioId || !/^[A-Za-z0-9_-]{16,64}$/.test(marcador.clave)) throw new Error('Marcador inválido.');
      const seleccion = seleccionManual(marcador.seleccion);
      if (JSON.stringify(seleccion) !== JSON.stringify(marcador.seleccion)) throw new Error('Contenido inválido.');
      estado.marker = marcador; estado.status = 'uncertain';
    } catch { estado.status = 'storage_error'; estado.error = new Error('No se puede leer el envío pendiente. No crees otra cita hasta recuperar el almacenamiento de esta pestaña.'); }
  }
  leer();
  async function ejecutar(accion) {
    if (enCurso) return;
    enCurso = true; estado.busy = true; estado.error = null;
    try { await accion(); }
    catch (error) { estado.status = 'uncertain'; estado.error = error; }
    finally { estado.busy = false; enCurso = false; }
  }
  const aceptar = (resultado) => {
    if (!resultadoManualValido(resultado)) throw new Error('No se pudo comprobar la respuesta de registro.');
    estado.result = resultado; estado.status = 'registered';
  };
  async function resolver() {
    if (!estado.marker || estado.status === 'storage_error' || ['registered', 'not_registered'].includes(estado.status)) return;
    await ejecutar(async () => {
      const respuesta = await client.resolver(estado.marker.clave, estado.marker.seleccion);
      if (respuesta?.estado === 'registrado') aceptar(respuesta.resultado);
      else if (respuesta?.estado === 'no_registrado') estado.status = 'not_registered';
      else throw new Error('El resultado sigue sin poder comprobarse.');
    });
  }
  return {
    state: estado, storageKey: claveAlmacenamiento,
    async start() { if (estado.marker) await resolver(); },
    async submit(valores) {
      if (enCurso || estado.status === 'storage_error' || ['registered', 'not_registered'].includes(estado.status)) return;
      // Otra apertura del formulario pudo persistir una clave desde que se construyó este controlador.
      // Releer antes de escribir evita sobrescribirla con una selección distinta.
      if (!estado.marker) leer();
      if (estado.status === 'storage_error') return;
      if (estado.marker) { await resolver(); return; }
      const seleccion = seleccionManual(valores);
      const marcador = { v: 1, ...ambito, clave: generarClave(), seleccion };
      try {
        if (!/^[A-Za-z0-9_-]{16,64}$/.test(marcador.clave)) throw new Error('Clave inválida.');
        // Persistir y releer ANTES de preparar impide enviar una operación que no pueda recuperarse.
        almacenamiento.setItem(claveAlmacenamiento, JSON.stringify(marcador));
        if (almacenamiento.getItem(claveAlmacenamiento) !== JSON.stringify(marcador)) throw new Error('No se guardó el marcador.');
        estado.marker = marcador;
      } catch { estado.status = 'storage_error'; estado.error = new Error('No se pudo guardar el envío. No se ha enviado una nueva cita.'); return; }
      await ejecutar(async () => {
        estado.status = 'sending';
        const preparado = await client.preparar(marcador.clave, marcador.seleccion);
        if (preparado?.clave !== marcador.clave || !['preparado', 'registrado'].includes(preparado.estado)) throw new Error('No se pudo comprobar la preparación.');
        if (preparado.estado === 'registrado') {
          const respuesta = await client.resolver(marcador.clave, marcador.seleccion);
          if (respuesta?.estado !== 'registrado') throw new Error('No se pudo recuperar la cita preparada.');
          aceptar(respuesta.resultado);
        } else aceptar(await client.registrar(marcador.clave, marcador.seleccion));
      });
    },
    resolve: resolver,
    acknowledge() {
      if (enCurso || !['registered', 'not_registered'].includes(estado.status)) throw new Error('Comprueba el resultado antes de iniciar otra cita.');
      try { almacenamiento.removeItem(claveAlmacenamiento); if (almacenamiento.getItem(claveAlmacenamiento) != null) throw new Error(); }
      catch { estado.error = new Error('No se pudo retirar el envío ya comprobado. Reintenta.'); return false; }
      Object.assign(estado, { status: 'idle', marker: null, result: null, error: null }); return true;
    },
  };
}
