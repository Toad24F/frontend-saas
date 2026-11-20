// Sustituto de sessionStorage exclusivo de pruebas; el producto usa el almacenamiento del navegador.
export function crearAlmacenamientoEnMemoria() {
  const valores = new Map();
  return { getItem: (clave) => valores.get(clave) ?? null, setItem: (clave, valor) => valores.set(clave, String(valor)), removeItem: (clave) => valores.delete(clave) };
}
