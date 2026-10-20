// Único dato durable del flujo: permite resolver el intento tras una recarga.
// No admite contacto, notas, CSRF, resultado o contenido normalizado.
export function createAttemptStore(slug, getStorage = () => globalThis.sessionStorage) {
  const key = `citalendar:public:attempt:${encodeURIComponent(slug)}`;
  const valid = (data) => data && !Array.isArray(data) && Object.keys(data).length === 3 &&
    data.negocio === slug && Number.isSafeInteger(data.apartadoId) && data.apartadoId > 0 &&
    typeof data.clave === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(data.clave);
  const same = (a, b) => a.negocio === b.negocio && a.apartadoId === b.apartadoId && a.clave === b.clave;
  function read() {
    let raw;
    try { raw = getStorage().getItem(key); } catch { return { status: 'unavailable' }; }
    if (raw === null) return { status: 'missing' };
    try {
      const data = JSON.parse(raw);
      return valid(data) ? { status: 'valid', marker: data } : { status: 'corrupt' };
    } catch { return { status: 'corrupt' }; }
  }
  return {
    key, read,
    write(marker) {
      if (!valid(marker)) throw new Error('Marcador de envío inválido.');
      const previous = read();
      if (!['missing', 'valid'].includes(previous.status) || (previous.marker && !same(previous.marker, marker))) throw new Error('Hay un envío pendiente que debe comprobarse.');
      getStorage().setItem(key, JSON.stringify(marker));
      const saved = read();
      if (saved.status !== 'valid' || !same(saved.marker, marker)) throw new Error('No se pudo guardar el marcador de envío.');
    },
    clear(marker) {
      const saved = read();
      if (saved.status === 'missing') return true;
      if (saved.status !== 'valid' || !same(saved.marker, marker)) return false;
      try { getStorage().removeItem(key); return read().status === 'missing'; } catch { return false; }
    },
  };
}
