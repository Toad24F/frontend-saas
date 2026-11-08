# Campos de franjas desactivadas

## Qué cambió y por qué

En **Disponibilidad > Equipo > Horario semanal**, una franja desactivada conserva a la vista su sucursal y sus horas, pero bloquea la edición de esos campos y la acción **Quitar franja**. El interruptor sigue disponible para reactivarla. **Agregar franja** permanece disponible porque crea otra franja para el día, sin modificar la que está desactivada.

Los controles deshabilitados no forman parte de `FormData`. El guardado ahora lee los valores directamente de cada fila para conservar la configuración de las franjas inactivas en el envío y al volver a activarlas.

## Alcance

- **Conectado y demo:** mismo componente compartido, tanto al mostrar una franja ya desactivada como al cambiar su interruptor sin recargar.
- **Temas y tamaños:** se conservan los estilos actuales en claro y oscuro; funciona en tabla de escritorio y tarjetas móviles.
- **Backend:** sin cambios. Se conservan sus validaciones y el contrato de horario.

## Archivos afectados

`src/shared/screens/disponibilidad/{view.js,schedule-rows.js}`, `src/shared/actions.js` y `tests/horario-franja-inactiva.test.js`.

## Comprobación y límites

`npm test` (70 pruebas), `npm run build` y `git diff --check` terminaron correctamente. En la demo se comprobó que desactivar una franja bloquea sucursal, entrada, descanso, salida y quitar; al reactivarla vuelven a estar disponibles con los mismos valores. Se revisó escritorio y móvil, en tema claro y oscuro. La versión conectada no se probó visualmente porque requería iniciar sesión; no se guardaron cambios reales de horario.
