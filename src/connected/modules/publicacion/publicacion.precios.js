import { api } from '../autenticacion/sesion.estado.js';

// El servidor resuelve el negocio a partir del token; no enviamos un ID elegido por la UI.
export async function leerPublicacionPrecios(solicitar = api) {
  const datos = await solicitar('/negocios/publicacion-catalogo');
  if (typeof datos?.mostrarPreciosPublicos !== 'boolean') throw new Error('La respuesta de publicación de precios no es válida.');
  return datos;
}

// PATCH parcial conserva categoría, teléfono y publicación de contacto existentes.
export async function guardarPublicacionPrecios(habilitado, solicitar = api) {
  if (typeof habilitado !== 'boolean') throw new Error('Selecciona un estado de publicación válido.');
  const datos = await solicitar('/negocios/publicacion-catalogo', 'PATCH', { mostrarPreciosPublicos: habilitado });
  if (datos?.mostrarPreciosPublicos !== habilitado) throw new Error('El servidor no confirmó el estado de publicación. Actualiza la vista.');
  return datos;
}
