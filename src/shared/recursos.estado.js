// La marca de retiro precede al estado operativo. Quitarla mediante restauración
// deja la cuenta o recurso inactivo hasta una activación independiente.
export function estadoRecurso(recurso) {
  if (recurso?.inhabilitadoEn || recurso?.disabledAt) return { etiqueta: 'Inhabilitado', clase: 'is-disabled' };
  const activo = recurso?.activo ?? recurso?.active;
  return activo === false ? { etiqueta: 'Inactivo', clase: 'is-inactive' }
    : { etiqueta: 'Activo', clase: 'is-active' };
}
