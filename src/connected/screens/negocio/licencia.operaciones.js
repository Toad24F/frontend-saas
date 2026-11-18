const acciones = new Set(['suspender', 'reactivar', 'renovar']);
const patronClave = /^[A-Za-z0-9_-]{16,64}$/;

export function validarPlazoSuspension(valor) {
  if (!Number.isInteger(valor) || valor < 0 || valor > 30) throw new Error('El plazo debe ser un entero de 0 a 30 días.');
  return valor;
}

// Un único intento por superadministrador permanece en sessionStorage hasta
// recibir tanto la respuesta idempotente como una nueva lectura de vigencia.
export function crearOperacionesLicencia({ api, almacenamiento = globalThis.sessionStorage, actorId,
  generarClave = () => crypto.randomUUID() }) {
  const claveAlmacenamiento = `citalendar:license:pending:${actorId}`;
  const idValido = (valor) => Number.isSafeInteger(valor) && valor > 0;
  const valido = (elemento) => elemento && acciones.has(elemento.action) && idValido(elemento.businessId) && idValido(elemento.licenseId) &&
    patronClave.test(elemento.key) && elemento.body && !Array.isArray(elemento.body) &&
    (elemento.action === 'suspender'
      ? Object.keys(elemento.body).length === 1 && validarPlazoSuspension(elemento.body.plazoDias) >= 0
      : Object.keys(elemento.body).length === 0);
  function pendiente() {
    const texto = almacenamiento.getItem(claveAlmacenamiento);
    if (texto === null) return null;
    try {
      const elemento = JSON.parse(texto);
      if (valido(elemento)) return elemento;
    } catch { /* Un marcador ilegible bloquea nuevas operaciones. */ }
    throw new Error('Hay una operación de licencia guardada que no se puede comprobar.');
  }
  async function reintentar() {
    const elemento = pendiente();
    if (!elemento) throw new Error('No hay una operación de licencia pendiente.');
    // La misma ruta, clave y representación JSON evitan duplicar la anualidad
    // aunque el primer POST haya hecho commit y se pierda su respuesta.
    await api(`/licencias/${elemento.licenseId}/${elemento.action}`, 'POST', elemento.body,
      { headers: { 'Idempotency-Key': elemento.key } });
    const vigencia = await api(`/licencias/${elemento.licenseId}/vigencia`);
    almacenamiento.removeItem(claveAlmacenamiento);
    return vigencia;
  }
  async function ejecutar(accion, negocioId, licenciaId, cuerpo) {
    if (pendiente()) throw new Error('Hay una operación de licencia pendiente. Comprueba su resultado antes de iniciar otra.');
    if (!acciones.has(accion) || !idValido(negocioId) || !idValido(licenciaId)) throw new Error('Operación de licencia inválida.');
    const cuerpoExacto = accion === 'suspender' ? { plazoDias: validarPlazoSuspension(cuerpo?.plazoDias) } : {};
    const clave = generarClave();
    if (!patronClave.test(clave)) throw new Error('No se pudo generar una clave de operación válida.');
    const elemento = { action: accion, businessId: negocioId, licenseId: licenciaId, body: cuerpoExacto, key: clave };
    almacenamiento.setItem(claveAlmacenamiento, JSON.stringify(elemento));
    if (!pendiente()) throw new Error('No se pudo guardar la operación antes de enviarla.');
    return reintentar();
  }
  return { pendiente, ejecutar, reintentar };
}
