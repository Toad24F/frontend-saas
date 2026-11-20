// La navegación refleja el contrato M4; la autorización definitiva sigue en servidor.
const paginas = {
  superadmin: ['plataforma', 'negocio', 'cuenta'],
  admin_negocio: ['agenda', 'clientes', 'profesionales', 'recepcionistas', 'servicios', 'sucursales', 'disponibilidad', 'cuenta'],
  profesional: ['agenda', 'servicios', 'sucursales', 'disponibilidad', 'cuenta'],
  recepcionista: ['agenda', 'clientes', 'disponibilidad', 'cuenta'],
};
export const paginasPorRol = (rol) => [...(paginas[rol] || [])];
