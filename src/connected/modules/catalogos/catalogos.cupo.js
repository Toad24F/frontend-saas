const cuposPorRol = new Map();

export function consultarCupoRol(rol) { return cuposPorRol.get(rol) || null; }
export function limpiarCuposPorRol() { cuposPorRol.clear(); }
export async function cargarCuposPorRol(solicitar) {
  await Promise.all(['profesionales', 'recepcionistas'].map(async (rol) => {
    try {
      const datos = await solicitar(`/${rol}/cupo`);
      if (!['limite', 'activos', 'disponibles'].every((clave) => Number.isSafeInteger(datos?.[clave]) && datos[clave] >= (clave === 'limite' ? 1 : 0))) throw Error('Cupo no válido');
      cuposPorRol.set(rol, datos);
    } catch { cuposPorRol.set(rol, null); }
  }));
}
