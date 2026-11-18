// Un catálogo desconocido nunca se interpreta como ausencia de asignaciones.
export function resolverSucursalesAgenda({ sucursales, profesionales, profesional: profesional = 'all', sucursal: sucursal = 'all', inicial: inicial = false, historial: historial = false }) {
  const ordenado = [...sucursales].sort((a, b) => a.name.localeCompare(b.name, 'es') || Number(a.id) - Number(b.id));
  const persona = profesionales.find((p) => String(p.id) === String(profesional));
  const conocido = profesional === 'all' || Array.isArray(persona?.branchIds);
  const opciones = profesional === 'all' || !conocido || historial ? ordenado : ordenado.filter((b) => persona.branchIds.includes(b.id));
  let siguiente = String(sucursal);
  if (inicial) siguiente = String(opciones.find((b) => String(b.id) === siguiente && b.active !== false)?.id ?? opciones.find((b) => b.active !== false)?.id ?? (conocido ? 'none' : sucursal));
  else if (conocido && !historial && profesional !== 'all') {
    if (!opciones.length) siguiente = 'none';
    else if (opciones.length === 1 || (siguiente !== 'all' && !opciones.some((b) => String(b.id) === siguiente))) siguiente = String(opciones[0].id);
  }
  return { sucursal: siguiente, opciones, conocido };
}
