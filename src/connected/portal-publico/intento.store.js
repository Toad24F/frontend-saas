// Único dato durable del flujo: permite resolver el intento tras una recarga.
// No admite contacto, notas, CSRF, resultado o contenido normalizado.
export function crearIntentoStore(slug, obtenerAlmacenamiento = () => globalThis.sessionStorage) {
  const clave = `citalendar:public:attempt:${encodeURIComponent(slug)}`;
  const valido = (datos) => datos && !Array.isArray(datos) && Object.keys(datos).length === 3 &&
    datos.negocio === slug && Number.isSafeInteger(datos.apartadoId) && datos.apartadoId > 0 &&
    typeof datos.clave === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(datos.clave);
  const iguales = (a, b) => a.negocio === b.negocio && a.apartadoId === b.apartadoId && a.clave === b.clave;
  function leer() {
    let texto;
    try { texto = obtenerAlmacenamiento().getItem(clave); } catch { return { estado: 'no-disponible' }; }
    if (texto === null) return { estado: 'ausente' };
    try {
      const datos = JSON.parse(texto);
      return valido(datos) ? { estado: 'valido', marcador: datos } : { estado: 'corrupto' };
    } catch { return { estado: 'corrupto' }; }
  }
  return {
    clave, leer,
    guardar(marcador) {
      if (!valido(marcador)) throw new Error('Marcador de envío inválido.');
      const previo = leer();
      if (!['ausente', 'valido'].includes(previo.estado) || (previo.marcador && !iguales(previo.marcador, marcador))) throw new Error('Hay un envío pendiente que debe comprobarse.');
      obtenerAlmacenamiento().setItem(clave, JSON.stringify(marcador));
      const guardado = leer();
      if (guardado.estado !== 'valido' || !iguales(guardado.marcador, marcador)) throw new Error('No se pudo guardar el marcador de envío.');
    },
    limpiar(marcador) {
      const guardado = leer();
      if (guardado.estado === 'ausente') return true;
      if (guardado.estado !== 'valido' || !iguales(guardado.marcador, marcador)) return false;
      try { obtenerAlmacenamiento().removeItem(clave); return leer().estado === 'ausente'; } catch { return false; }
    },
  };
}
