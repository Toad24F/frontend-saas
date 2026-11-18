// La API pública entrega el nombre, no iniciales configuradas del negocio.
export function inicialesNegocio(nombre) {
  const palabras = String(nombre ?? '').trim().split(/\s+/u)
    .map((palabra) => palabra.match(/[\p{L}\p{N}]/u)?.[0])
    .filter(Boolean);
  return [palabras[0], ...(palabras.length > 1 ? [palabras.at(-1)] : [])]
    .join('').toLocaleUpperCase('es-MX');
}
