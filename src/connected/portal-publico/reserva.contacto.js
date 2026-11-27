import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { PAISES_TELEFONO } from '../../shared/paises.telefono.js';

// Mismos países y normalización que contacto-reserva-publica.ts del servidor.
// Se cuentan puntos de código Unicode tras trim, sin truncar lo escrito.
export function validarContacto(entrada) {
  const errores = {};
  const nombre = typeof entrada.nombre === 'string' ? entrada.nombre.trim() : '';
  const pais = entrada.pais ?? 'MX';
  const telefonoOriginal = typeof entrada.telefono === 'string' ? entrada.telefono.trim() : '';
  const paisAdmitido = PAISES_TELEFONO.some((opcion) => opcion.codigo === pais);
  const formatoAdmitido = telefonoOriginal.length <= 40 && /^\+?[\d\s().-]+$/.test(telefonoOriginal);
  const numero = paisAdmitido && formatoAdmitido
    ? parsePhoneNumberFromString(telefonoOriginal, { defaultCountry: pais, extract: false }) : null;
  const telefono = numero?.country === 'MX' ? numero.nationalNumber : numero?.number;
  const notas = typeof entrada.notas === 'string' ? entrada.notas.trim() : '';
  // Solo el checkbox marcado expresa autorización; la ausencia mantiene la reserva sin mensajes.
  const autorizaWhatsapp = entrada.autorizaWhatsapp === true;
  if (entrada.autorizaWhatsapp !== undefined && typeof entrada.autorizaWhatsapp !== 'boolean') errores.autorizaWhatsapp = 'Revisa la autorización de WhatsApp.';
  if (!nombre || [...nombre].length > 150) errores.nombre = 'Escribe tu nombre: máximo 150 caracteres.';
  if (!paisAdmitido || !numero?.isValid() || numero.country !== pais) {
    errores.telefono = 'Revisa el país y los dígitos del teléfono; escribe el número sin extensión.';
  }
  if ((entrada.notas !== undefined && entrada.notas !== null && typeof entrada.notas !== 'string') || [...notas].length > 2000) {
    errores.notas = 'Las notas deben tener como máximo 2000 caracteres.';
  }
  if (new TextEncoder().encode(JSON.stringify(entrada)).byteLength > 32768) errores.formulario = 'El formulario excede 32 KiB. Reduce el texto sin perder los datos necesarios.';
  return { valido: Object.keys(errores).length === 0, errores,
    valor: { nombre, telefono, notas: notas || null, autorizaWhatsapp } };
}
