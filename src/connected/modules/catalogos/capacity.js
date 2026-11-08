const cache = new Map();
export function roleCapacity(role) { return cache.get(role) || null; }
export function clearRoleCapacities() { cache.clear(); }
export async function loadRoleCapacities(request) {
  await Promise.all(['profesionales', 'recepcionistas'].map(async (role) => {
    try {
      const data = await request(`/${role}/cupo`);
      if (!['limite', 'activos', 'disponibles'].every((key) => Number.isSafeInteger(data?.[key]) && data[key] >= (key === 'limite' ? 1 : 0))) throw Error('Cupo no válido');
      cache.set(role, data);
    } catch { cache.set(role, null); }
  }));
}
