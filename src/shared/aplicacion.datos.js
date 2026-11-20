/** Modelo en memoria para ambos modos. La demo lo llena con datos ficticios.
 * El filtrado local organiza la vista y el backend autoriza los datos conectados. */
export const HOY = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') !== '1'
  ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chihuahua' })
  : import.meta.env?.VITE_DEMO_TODAY || '2026-09-08';
export const crearFecha = (diaIso) => new Date(`${diaIso}T12:00:00`);
export const fechaIso = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
export const sumarDias = (dia, cantidad) => {
  const fecha = crearFecha(dia);
  fecha.setDate(fecha.getDate() + cantidad);
  return fechaIso(fecha);
};
export const horaAMinutos = (hora) => {
  const [horas, minutosReloj] = hora.split(':').map(Number);
  return horas * 60 + minutosReloj;
};
export const minutosAHora = (minutosReloj) =>
  `${String(Math.floor(minutosReloj / 60)).padStart(2, '0')}:${String(minutosReloj % 60).padStart(2, '0')}`;
export const formatearFecha = (
  dia,
  opciones = { day: 'numeric', month: 'long', year: 'numeric' },
) => crearFecha(dia).toLocaleDateString('es-MX', opciones);
export const formatearMoneda = (cantidad) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(cantidad);
export const etiquetasEstadoCita = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
};
export let datosAplicacion;
export function reemplazarDatos(datos) { datosAplicacion = datos; }
export const listarRegistros = (coleccion, negocioId) =>
  datosAplicacion[coleccion].filter((registro) => registro.tenantId === Number(negocioId));
export function obtenerRecurso(coleccion, id, negocioId) {
  const registro = datosAplicacion[coleccion].find(
    (registro) => registro.id === Number(id) && registro.tenantId === Number(negocioId),
  );
  if (!registro) throw new Error('El recurso no está disponible en este negocio.');
  return registro;
}
export const obtenerNegocio = (id) => datosAplicacion.tenants.find((negocio) => negocio.id === Number(id));
export const ampliarDatosCita = (cita) => ({
  ...cita,
  // Las correcciones de ficha de la demo no reescriben el contacto de citas ya creadas.
  client: cita.contactoHistorico || obtenerRecurso('clients', cita.clientId, cita.tenantId),
  service: obtenerRecurso('services', cita.serviceId, cita.tenantId),
  professional: obtenerRecurso('professionals', cita.professionalId, cita.tenantId),
  branch: obtenerRecurso('branches', cita.branchId, cita.tenantId),
});
