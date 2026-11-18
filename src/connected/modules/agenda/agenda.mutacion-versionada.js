// Una escritura usa siempre la versión observada. Solo un 400 confirmado permite corregir sin releer.
export function crearMutacionVersionada(version, escribir, validar = () => true) {
  const estado = { busy: false, stale: false, error: null, result: null };
  return {
    state: estado,
    async submit(valores) {
      if (estado.busy || estado.stale) return;
      estado.busy = true;
      estado.error = null;
      estado.result = null;
      try {
        const resultado = await escribir({ ...valores, version });
        if (!validar(resultado))
          throw new Error('No se pudo comprobar la respuesta del servidor.');
        estado.result = resultado;
        estado.stale = true;
      } catch (error) {
        estado.error = error;
        estado.stale = error.status !== 400;
      } finally {
        estado.busy = false;
      }
    },
  };
}
