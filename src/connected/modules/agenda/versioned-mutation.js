// Una escritura usa siempre la versión observada. Solo un 400 confirmado permite corregir sin releer.
export function createVersionedMutation(version, write, validate = () => true) {
  const state = { busy: false, stale: false, error: null, result: null };
  return {
    state,
    async submit(values) {
      if (state.busy || state.stale) return;
      state.busy = true;
      state.error = null;
      state.result = null;
      try {
        const result = await write({ ...values, version });
        if (!validate(result))
          throw new Error('No se pudo comprobar la respuesta del servidor.');
        state.result = result;
        state.stale = true;
      } catch (error) {
        state.error = error;
        state.stale = error.status !== 400;
      } finally {
        state.busy = false;
      }
    },
  };
}
