// La navegación refleja los permisos del panel; la autorización definitiva sigue en servidor.
const paginas = {
  superadmin: ['plataforma', 'negocio', 'cuenta'],
  admin_negocio: ['agenda', 'resumen', 'clientes', 'profesionales', 'recepcionistas', 'servicios', 'sucursales', 'disponibilidad', 'reportes', 'cuenta'],
  profesional: ['agenda', 'resumen', 'servicios', 'sucursales', 'disponibilidad', 'cuenta'],
  recepcionista: ['agenda', 'resumen', 'clientes', 'disponibilidad', 'cuenta'],
};
export const paginasPorRol = (rol) => [...(paginas[rol] || [])];
