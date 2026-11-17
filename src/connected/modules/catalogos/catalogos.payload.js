export function crearPayloadCatalogo(tipo, valores) {
  return tipo === 'services'
    ? { nombre: valores.name, descripcion: valores.description || '', costo: String(valores.price), duracionMinutos: valores.duration }
    : { nombre: valores.name, direccion: valores.address, telefono: valores.phone, notasLlegada: valores.notes || null, zonaHoraria: valores.timezone, urlGoogleMaps: valores.maps || null };
}
