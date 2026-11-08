import { api } from '../auth/session.js';

// El servidor resuelve el negocio a partir del token; no enviamos un ID elegido por la UI.
export async function readPricePublication(request = api) {
  const data = await request('/negocios/publicacion-catalogo');
  if (typeof data?.mostrarPreciosPublicos !== 'boolean') throw new Error('La respuesta de publicación de precios no es válida.');
  return data;
}

// PATCH parcial conserva categoría, teléfono y publicación de contacto existentes.
export async function savePricePublication(enabled, request = api) {
  if (typeof enabled !== 'boolean') throw new Error('Selecciona un estado de publicación válido.');
  const data = await request('/negocios/publicacion-catalogo', 'PATCH', { mostrarPreciosPublicos: enabled });
  if (data?.mostrarPreciosPublicos !== enabled) throw new Error('El servidor no confirmó el estado de publicación. Actualiza la vista.');
  return data;
}
