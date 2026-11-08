import { api } from '../auth/session.js';

export async function loadEditableResource(type, existing, request = api) {
  const id = existing?.id;
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Registro no válido.');
  if (type === 'services') {
    const service = await request(`/servicios/${id}`);
    return { ...existing, name: service.nombre, description: service.descripcion || '', duration: service.duracionMinutos, price: Number(service.costo), active: service.activo, creatorId: service.creadorPersonalId };
  }
  if (type === 'branches') {
    const branch = await request(`/sucursales/${id}`);
    return { ...existing, name: branch.nombre, address: branch.direccion, phone: branch.telefono, timezone: branch.zonaHoraria, maps: branch.urlGoogleMaps || '', notes: branch.notasLlegada || '', active: branch.activo };
  }
  if (type === 'professionals') {
    const person = await request(`/profesionales/${id}`);
    return { ...existing, name: person.nombre, email: person.correo, specialty: person.especialidad || '', active: person.activo };
  }
  throw new Error('Tipo de registro no válido.');
}
