import { api } from '../auth/session.js';

export async function consultarRegistroEditable(tipo, existente, solicitar = api) {
  const id = existente?.id;
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Registro no válido.');
  if (tipo === 'services') {
    const servicio = await solicitar(`/servicios/${id}`);
    return { ...existente, name: servicio.nombre, description: servicio.descripcion || '', duration: servicio.duracionMinutos, price: Number(servicio.costo), active: servicio.activo, creatorId: servicio.creadorPersonalId };
  }
  if (tipo === 'branches') {
    const sucursal = await solicitar(`/sucursales/${id}`);
    return { ...existente, name: sucursal.nombre, address: sucursal.direccion, phone: sucursal.telefono, timezone: sucursal.zonaHoraria, maps: sucursal.urlGoogleMaps || '', notes: sucursal.notasLlegada || '', active: sucursal.activo };
  }
  if (tipo === 'professionals') {
    const persona = await solicitar(`/profesionales/${id}`);
    return { ...existente, name: persona.nombre, email: persona.correo, specialty: persona.especialidad || '', active: persona.activo };
  }
  throw new Error('Tipo de registro no válido.');
}
