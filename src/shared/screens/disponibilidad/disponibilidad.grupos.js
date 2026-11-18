export const gruposDisponibilidad = [
  { id: 'equipo', etiqueta: 'Equipo', pestanas: ['sucursales', 'horario', 'oferta', 'bloqueos', 'equipo-vacio'] },
  { id: 'negocio', etiqueta: 'Reglas del negocio', pestanas: ['configuracion'] },
  { id: 'comprobar', etiqueta: 'Comprobar', pestanas: ['proyeccion', 'horarios', 'afectadas'] },
];

export function gruposDisponibilidadPermitidos(demo, rol) {
  if (demo || rol === 'admin_negocio') return gruposDisponibilidad;
  if (rol === 'profesional') return gruposDisponibilidad.filter((grupo) => grupo.id !== 'negocio');
  if (rol === 'recepcionista') return gruposDisponibilidad.filter((grupo) => grupo.id === 'comprobar');
  return [];
}

export function resolverGrupoDisponibilidad(grupo, demo, rol) {
  const permitidos = gruposDisponibilidadPermitidos(demo, rol);
  return permitidos.find((elemento) => elemento.id === grupo)?.id || permitidos[0]?.id || '';
}

export function grupoDePestanaDisponibilidad(pestanaId) {
  return gruposDisponibilidad.find((grupo) => grupo.pestanas.includes(pestanaId))?.id || '';
}
