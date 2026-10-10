export function catalogPayload(table, values) {
  return table === 'services'
    ? { nombre: values.name, descripcion: values.description || '', costo: String(values.price), duracionMinutos: values.duration }
    : { nombre: values.name, direccion: values.address, telefono: values.phone, notasLlegada: values.notes || null, zonaHoraria: values.timezone, urlGoogleMaps: values.maps || null };
}
