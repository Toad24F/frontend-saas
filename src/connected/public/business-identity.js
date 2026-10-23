// La API pública entrega el nombre, no iniciales configuradas del negocio.
export function businessInitials(name) {
  const words = String(name ?? '').trim().split(/\s+/u)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
    .filter(Boolean);
  return [words[0], ...(words.length > 1 ? [words.at(-1)] : [])]
    .join('').toLocaleUpperCase('es-MX');
}
