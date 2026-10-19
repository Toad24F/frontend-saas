# Orden visual de Reglas del negocio

## Cambio y motivo

La pantalla de reglas separa «Modo de agenda» de «Condiciones para reservar». El modo seleccionado muestra una marca «✓ Activo» dentro de su opción, además del borde existente. Los tres límites de reserva tienen controles alineados y una explicación breve debajo de cada uno. Esto aclara la jerarquía y evita que el primer campo quede visualmente incompleto frente a los otros dos.

## Alcance y archivos

- `src/shared/screens/disponibilidad/operational.js`: estructura y textos del formulario compartido.
- `src/shared/screens/disponibilidad/operational.css`: alineación y estados visuales.
- Afecta a demo y versión conectada, en los temas claro y oscuro. Conserva los cuatro nombres de campo, radios, límites, validaciones y envío existentes. En ancho móvil, los modos y campos pasan a una columna mediante las reglas responsivas existentes.

## Comprobación y límites

`git diff --check` pasó, `npm test` pasó con 70 pruebas y `npm run build` terminó correctamente. Se inspeccionó la demo en temas oscuro y claro, se comprobó que la marca visual sigue al radio seleccionado y que «Guardar reglas» conserva el modo elegido tras volver a renderizar. La versión conectada requiere sesión de administrador; no se guardaron reglas reales. No se dispuso de control del ancho del navegador para una inspección visual móvil; se mantuvo la regla existente que apila modos y campos a una columna bajo 767 px.
