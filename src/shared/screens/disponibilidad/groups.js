export const availabilityGroups = [
  { id: 'equipo', label: 'Equipo', tabs: ['branches', 'schedule', 'offering', 'changes', 'team-empty'] },
  { id: 'negocio', label: 'Reglas del negocio', tabs: ['configuration'] },
  { id: 'comprobar', label: 'Comprobar', tabs: ['projection', 'slots', 'affected'] },
];

export function allowedAvailabilityGroups(demo, role) {
  if (demo || role === 'admin_negocio') return availabilityGroups;
  if (role === 'profesional') return availabilityGroups.filter((group) => group.id !== 'negocio');
  if (role === 'recepcionista') return availabilityGroups.filter((group) => group.id === 'comprobar');
  return [];
}

export function resolveAvailabilityGroup(group, demo, role) {
  const allowed = allowedAvailabilityGroups(demo, role);
  return allowed.find((item) => item.id === group)?.id || allowed[0]?.id || '';
}

export function groupForAvailabilityTab(tabId) {
  return availabilityGroups.find((group) => group.tabs.includes(tabId))?.id || '';
}
