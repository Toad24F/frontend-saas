// La marca de retiro precede al estado operativo. Quitarla mediante restauración
// deja la cuenta o recurso inactivo hasta una activación independiente.
export function resourceStatus(item) {
  if (item?.inhabilitadoEn || item?.disabledAt) return { label: 'Inhabilitado', className: 'is-disabled' };
  const active = item?.activo ?? item?.active;
  return active === false ? { label: 'Inactivo', className: 'is-inactive' }
    : { label: 'Activo', className: 'is-active' };
}
