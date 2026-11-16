// Un catálogo desconocido nunca se interpreta como ausencia de asignaciones.
export function resolveAgendaBranches({ branches, professionals, professional = 'all', branch = 'all', initial = false, history = false }) {
  const ordered = [...branches].sort((a, b) => a.name.localeCompare(b.name, 'es') || Number(a.id) - Number(b.id));
  const person = professionals.find((p) => String(p.id) === String(professional));
  const known = professional === 'all' || Array.isArray(person?.branchIds);
  const options = professional === 'all' || !known || history ? ordered : ordered.filter((b) => person.branchIds.includes(b.id));
  let next = String(branch);
  if (initial) next = String(options.find((b) => String(b.id) === next && b.active !== false)?.id ?? options.find((b) => b.active !== false)?.id ?? (known ? 'none' : branch));
  else if (known && !history && professional !== 'all') {
    if (!options.length) next = 'none';
    else if (options.length === 1 || (next !== 'all' && !options.some((b) => String(b.id) === next))) next = String(options[0].id);
  }
  return { branch: next, options, known };
}
