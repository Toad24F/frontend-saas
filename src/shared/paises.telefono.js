import { getCountryCallingCode, getExampleNumber } from 'libphonenumber-js';
import ejemplos from 'libphonenumber-js/examples.mobile.json';

// Países y regiones de América Latina, Estados Unidos y Canadá admitidos por el servidor.
export const PAISES_TELEFONO = [
  ['MX', 'México'], ['AR', 'Argentina'], ['BO', 'Bolivia'], ['BR', 'Brasil'],
  ['BZ', 'Belice'], ['CL', 'Chile'], ['CO', 'Colombia'], ['CR', 'Costa Rica'],
  ['CU', 'Cuba'], ['DO', 'República Dominicana'], ['EC', 'Ecuador'],
  ['SV', 'El Salvador'], ['GT', 'Guatemala'], ['HN', 'Honduras'],
  ['HT', 'Haití'], ['NI', 'Nicaragua'], ['PA', 'Panamá'], ['PY', 'Paraguay'],
  ['PE', 'Perú'], ['UY', 'Uruguay'], ['VE', 'Venezuela'],
  ['GF', 'Guayana Francesa'], ['GP', 'Guadalupe'], ['GY', 'Guyana'],
  ['MQ', 'Martinica'], ['PR', 'Puerto Rico'], ['SR', 'Surinam'],
  ['US', 'Estados Unidos'], ['CA', 'Canadá'],
].map(([codigo, nombre]) => ({ codigo, nombre, prefijo: `+${getCountryCallingCode(codigo)}` }));

export function ayudaTelefono(codigo) {
  const ejemplo = getExampleNumber(codigo, ejemplos);
  return `Escribe el número del país seleccionado, sin extensión.${ejemplo ? ` Ejemplo: ${ejemplo.formatNational()}.` : ''}`;
}
