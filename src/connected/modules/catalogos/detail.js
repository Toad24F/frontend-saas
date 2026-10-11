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
    const [person, branchIds, services, catalogServices, catalogBranches] = await Promise.all([
      request(`/profesionales/${id}`),
      request(`/profesionales/${id}/sucursales`),
      request(`/profesionales/${id}/servicios`),
      request('/servicios'),
      request('/sucursales'),
    ]);
    return { ...existing, name: person.nombre, email: person.correo, specialty: person.especialidad || '', active: person.activo, branchIds, serviceIds: services.filter((service) => service.seleccionado).map((service) => service.id), catalogServices: catalogServices.map((service) => ({ id: service.id, name: service.nombre, active: service.activo })), catalogBranches: catalogBranches.map((branch) => ({ id: branch.id, name: branch.nombre })) };
  }
  throw new Error('Tipo de registro no válido.');
}
