// Adaptador temporal: las vistas actuales filtran en memoria hasta que T038 conecte el paginador.
export async function consultarEnviosCompletos(solicitar, negocioId) {
  const ruta = (pagina) => `/negocios/${negocioId}/envios?pagina=${pagina}&limite=100`;
  const primera = await solicitar(ruta(1));
  if (Array.isArray(primera)) return primera; // Tolera el contrato anterior durante despliegues escalonados.
  const validar = (respuesta, pagina, total) => {
    if (!respuesta || respuesta.pagina !== pagina || respuesta.limite !== 100 ||
      !Number.isSafeInteger(respuesta.total) || respuesta.total < 0 ||
      (total !== null && respuesta.total !== total) || !Array.isArray(respuesta.envios)) {
      throw new Error('El historial de correos recibido no es válido.');
    }
    return respuesta.envios;
  };
  const total = primera?.total;
  const envios = [...validar(primera, 1, null)];
  // Una página tardía fallida o desplazada impide mostrar las primeras filas como historial íntegro.
  for (let pagina = 2; pagina <= Math.ceil(total / 100); pagina++) {
    envios.push(...validar(await solicitar(ruta(pagina)), pagina, total));
  }
  if (envios.length !== total || new Set(envios.map((envio) => envio.id)).size !== total) {
    throw new Error('El historial de correos cambió durante la consulta. Actualiza para reintentar.');
  }
  return envios;
}
