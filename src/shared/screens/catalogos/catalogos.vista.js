const CLAVE_VISTA = 'citalendar-catalog-view';
const CLAVES_ANTERIORES = [
  'citalendar-professionals-view',
  'citalendar-receptionists-view',
  'citalendar-services-view',
  'citalendar-branches-view',
];
const VISTAS_PERSISTIDAS = { lista: 'list', tarjetas: 'cards' };
const interpretarVista = (valor) =>
  Object.keys(VISTAS_PERSISTIDAS).find((vista) => VISTAS_PERSISTIDAS[vista] === valor);

let vistaActual = 'lista';
try {
  const guardada = interpretarVista(localStorage.getItem(CLAVE_VISTA));
  const anterior = CLAVES_ANTERIORES.map((clave) => interpretarVista(localStorage.getItem(clave))).find(Boolean);
  vistaActual = guardada || anterior || 'lista';
} catch { /* La preferencia funciona durante la sesión sin almacenamiento local. */ }

export function consultarVistaCatalogos() {
  try {
    const guardada = interpretarVista(localStorage.getItem(CLAVE_VISTA));
    if (guardada) vistaActual = guardada;
  } catch { /* Se usa la preferencia de esta sesión. */ }
  return vistaActual;
}

export function cambiarVistaCatalogos(vista) {
  if (!Object.hasOwn(VISTAS_PERSISTIDAS, vista) || matchMedia('(max-width: 767px)').matches || consultarVistaCatalogos() === vista) return false;
  vistaActual = vista;
  try { localStorage.setItem(CLAVE_VISTA, VISTAS_PERSISTIDAS[vista]); } catch { /* Preferencia temporal. */ }
  return true;
}
